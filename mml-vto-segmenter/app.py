"""
HTTP-обёртка сервиса композита примерки.

Контракт с бэкендом простой: отдаёшь исходное фото покупателя и результат
генерации — получаешь склеенный кадр. Вся работа с изображениями остаётся
здесь, Go-сторона просто постит два файла.

Сервис обязан быть необязательным: если он лёг или не уложился в таймаут,
бэкенд отдаёт генерацию как есть. Поэтому тут нет ни очередей, ни ретраев —
быстрый ответ или ошибка.
"""
import io, logging, time
from fastapi import FastAPI, File, UploadFile, HTTPException, Response
from PIL import Image

import regions

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("vto-segmenter")

app = FastAPI(title="MML VTO segmenter", version="1.0")

MAX_BYTES = 20 * 1024 * 1024


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/composite")
async def composite(original: UploadFile = File(...), generated: UploadFile = File(...),
                    measure: int = 0):
    t0 = time.time()
    ob, gb = await original.read(), await generated.read()
    if len(ob) > MAX_BYTES or len(gb) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="image too large")
    try:
        o = Image.open(io.BytesIO(ob))
        g = Image.open(io.BytesIO(gb))
        o.load(); g.load()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"cannot decode image: {e}")

    try:
        out, stats = regions.composite(o, g)
    except ValueError as e:
        # Осознанный отказ, а не поломка: входы несовместимы.
        log.warning("composite refused: %s", e)
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        # Падение сегментации не должно выглядеть как «нет ответа»: отвечаем
        # явной ошибкой, бэкенд по ней отдаст генерацию без композита.
        log.exception("composite failed")
        raise HTTPException(status_code=500, detail=f"composite failed: {e}")

    cos = {}
    if measure:
        # Выборочный замер идентичности. ArcFace тяжелее сегментации, и на
        # каждом запросе он не нужен: тревога — это сигнал тренда. Замер не
        # имеет права уронить ответ, поэтому обёрнут отдельно.
        try:
            import face_metric
            box, src = face_metric.face_box_with_source(o, pad=0.08)
            if box is not None:
                cos = {"gen": face_metric.cosine(o, g, box),
                       "comp": face_metric.cosine(o, out, box), "box": src}
        except Exception:
            log.exception("measure failed, отдаём композит без замера")

    buf = io.BytesIO()
    out.save(buf, format="PNG")
    ms = int((time.time() - t0) * 1000)
    inv = stats["invariant"]
    if not inv["ok"]:
        # Инвариант нарушен — компоновка сломана, а не «качество похуже».
        # Отвечаем ошибкой: бэкенд отдаст генерацию, мы увидим это в логе.
        log.error("composite invariant broken: %s", inv)
        raise HTTPException(status_code=500, detail=f"composite invariant broken: {inv}")
    log.info("composite ok in %dms face_found=%s kept=%.1f%% per_class=%s",
             ms, stats["face_found"], stats["kept_from_original_pct"], stats["per_class_kept_pct"])
    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={
            "X-Face-Found": str(stats["face_found"]).lower(),
            "X-Kept-Pct": str(stats["kept_from_original_pct"]),
            "X-Latency-Ms": str(ms),
            "X-Invariant-Ok": str(inv["ok"]).lower(),
            **({"X-Cos-Generated": f"{cos['gen']:.4f}",
                "X-Cos-Composite": f"{cos['comp']:.4f}",
                "X-Cos-Box": cos["box"]} if cos else {}),
        },
    )
