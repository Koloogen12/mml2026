"""Регрессионный гейт композита. Два уровня, разной природы.

Уровень 1 — детерминированный, на всех фикстурах. Проверяет утверждения,
которые либо истинны, либо нет; порогов здесь нет вообще. Работает и на тех
кадрах, где лицо закрыто козырьком или отвёрнуто — то есть ровно там, где
ArcFace шумит и статистикой мерить нечего.

Уровень 2 — статистический, только на кадрах с открытым лицом. Косинус ArcFace
против записанного базового уровня; падение больше DROP роняет сборку.

Фикстура — это ПАРА готовых файлов (original.jpg + generated.jpg: фото
покупателя и сохранённая генерация). JPEG, а не PNG, только ради веса репозитория —
декодирование детерминированное, на инвариант это не влияет.
Генерации не перезапрашиваются: гейт обязан быть детерминированным и бесплатным,
иначе он меряет настроение модели, а не наш код.

  python ci_gate.py --fixtures ../mml-saas-backend/testdata/vto-identity/fixtures
  python ci_gate.py --fixtures <dir> --update-baselines   # перезаписать эталон
"""
import argparse, json, os, sys
import numpy as np
from PIL import Image

import regions
from regions import FACE, CLOTHES, SRC_TABLE

DROP = 0.02          # допустимая просадка косинуса против базового уровня
BASELINES = os.path.join(os.path.dirname(__file__), "baselines.json")


def level1(orig, gen):
    """Детерминированные утверждения о компоновке. Возвращает список нарушений."""
    W, H = gen.size
    o = orig.convert("RGB").resize((W, H), Image.LANCZOS)
    g = gen.convert("RGB")
    co, cg = regions.parse(o), regions.parse(g)
    core = regions.face_core_mask(o)
    keep = regions.build_keep_mask(co, cg, core)

    out, stats = regions.composite(orig, gen)
    bad = []

    # 1. Побитовое равенство там, где маска насыщена. Ловит порядок каналов,
    #    лишний ресемплинг, съехавший на пиксель композит.
    inv = stats["invariant"]
    if not inv["ok"]:
        bad.append(f"инвариант нарушен: {inv['mismatch_original_px']} px разошлись "
                   f"с оригиналом, {inv['mismatch_generated_px']} px с генерацией")

    # 2. Ландмарок нет — весь класс FACE обязан прийти из оригинала.
    #    Это регресс-тест на ветку, из-за которой на кадрах без детекта
    #    сгенерённое лицо оставалось везде, где сегментация звала его одеждой.
    if core is None:
        leaked = int(((co == FACE) & ~keep).sum())
        if leaked:
            bad.append(f"лицо не найдено, но {leaked} px класса FACE ушли в генерацию")

    # 3. Силуэт имеет право меняться. Ни один пиксель, где генерация
    #    нарисовала кожу, а в оригинале был фон, не должен браться из
    #    оригинала — иначе сгенерированное тело обрезается по силуэту старой
    #    одежды и на кадре остаются призрачные контуры. Регресс-тест на
    #    дефект, найденный 10.09.2026: короткая юбка поверх длинных брюк.
    from regions import BG, SKIN as SKIN_CLS
    grown = (co == BG) & (cg == SKIN_CLS)
    clipped = int((grown & keep).sum())
    if clipped:
        bad.append(f"сгенерированное тело обрезано фоном оригинала: {clipped} px "
                   f"в клетке фон x кожа")

    # 4. Аксессуар не висит в воздухе. Если генерация нарисовала на этом
    #    месте фон или голую кожу, значит прежнего аксессуара там нет:
    #    рукав стал у́же, рука открылась. Регресс-тест на дефект от
    #    10.09.2026 — золотой манжет рубашки, уцелевший рядом с рукавом
    #    кожаной куртки.
    from regions import ACC as ACC_CLS
    hanging = (co == ACC_CLS) & ((cg == BG) | (cg == SKIN_CLS))
    left = int((hanging & keep).sum())
    if left:
        bad.append(f"аксессуар из оригинала висит там, где генерация дала фон "
                   f"или кожу: {left} px")

    # 5. Соответствие таблице. Каждая клетка, объявленная как «оригинал»,
    #    обязана быть в маске — кроме FACE x CLOTHES, где действует ядро.
    for o_cls, row in SRC_TABLE.items():
        for g_cls, take_orig in row.items():
            if not take_orig or (o_cls == FACE and g_cls == CLOTHES):
                continue
            cell = (co == o_cls) & (cg == g_cls)
            miss = int((cell & ~keep).sum())
            if miss:
                bad.append(f"клетка {o_cls}x{g_cls} объявлена как оригинал, "
                           f"но {miss} px не попали в маску")
    return out, stats, bad


def face_open(stats):
    """Мерить косинусом можно только там, где есть что мерить."""
    return stats["face_found"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fixtures", required=True)
    ap.add_argument("--update-baselines", action="store_true")
    a = ap.parse_args()

    sys.path.insert(0, os.path.dirname(__file__))
    import face_metric

    # В режиме перезаписи эталонов сравнивать не с чем и незачем.
    base = {} if a.update_baselines else (
        json.load(open(BASELINES)) if os.path.exists(BASELINES) else {})
    fresh, failures, skipped = {}, [], []

    for name in sorted(os.listdir(a.fixtures)):
        d = os.path.join(a.fixtures, name)
        po, pg = os.path.join(d, "original.jpg"), os.path.join(d, "generated.jpg")
        if not (os.path.isdir(d) and os.path.exists(po) and os.path.exists(pg)):
            continue
        orig, gen = Image.open(po).convert("RGB"), Image.open(pg).convert("RGB")

        out, stats, bad = level1(orig, gen)
        for b in bad:
            failures.append(f"[L1] {name}: {b}")

        if not face_open(stats):
            skipped.append(name)
            print(f"L1 ok  L2 —   {name}  (лицо не найдено, косинус не считаем)")
            continue

        box, src = face_metric.face_box_with_source(orig, pad=0.08)
        cos = face_metric.cosine(orig, out, box)
        fresh[name] = {"cos": round(cos, 4), "box": src}
        ref = base.get(name)
        mark = "ok "
        if ref is not None:
            # Источник бокса — часть измерения, а не примечание к нему. Бокс
            # детектора и бокс сегментации несопоставимы: второй на многолюдном
            # кадре растягивается на чужие головы. Сравнивать число, померенное
            # одним, с эталоном, померенным другим, — значит однажды уронить
            # сборку из-за того, что детектор моргнул, а не из-за нашего кода.
            if ref["box"] != src:
                failures.append(f"[L2] {name}: сменился источник бокса — эталон померен "
                                f"по «{ref['box']}», сейчас «{src}». Число несопоставимо, "
                                f"это не регресс кода. Перезапиши эталон осознанно.")
                mark = "БОКС"
            elif cos < ref["cos"] - DROP:
                failures.append(f"[L2] {name}: косинус {cos:.4f} против эталона {ref['cos']:.4f} "
                                f"(просадка {ref['cos']-cos:.4f} > {DROP})")
                mark = "FAIL"
        tail = f" (эталон {ref['cos']:.4f}/{ref['box']})" if ref else " (нет эталона)"
        print(f"L1 ok  L2 {mark} {name}  cos={cos:.4f} бокс={src}" + tail)

    if a.update_baselines:
        json.dump(fresh, open(BASELINES, "w"), indent=1, sort_keys=True)
        print(f"\nэталоны перезаписаны: {len(fresh)} фикстур")
        return 0

    if failures:
        print("\n".join(["", "ПРОВАЛ:"] + failures))
        return 1
    print(f"\nвсё зелено: L1 на {len(fresh)+len(skipped)} фикстурах, "
          f"L2 на {len(fresh)} (пропущено по закрытому лицу: {len(skipped)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
