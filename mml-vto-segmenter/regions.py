"""
Композит примерки по таблице регионов.

Задача: генеративная модель перерисовывает кадр целиком, включая лицо, руки и
фон. Маска через API OpenAI это не решает (замерено: при нескольких image[]
она перестаёт помогать). Поэтому личность возвращаем на своей стороне —
собираем итог из двух источников по семантической сегментации.
"""
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mpy
from mediapipe.tasks.python import vision
from PIL import Image, ImageDraw, ImageFilter

BG, HAIR, SKIN, FACE, CLOTHES, ACC = 0, 1, 2, 3, 4, 5
CLASS_NAMES = {BG:"background", HAIR:"hair", SKIN:"body-skin",
               FACE:"face-skin", CLOTHES:"clothes", ACC:"accessories"}

_O, _G = True, False   # True = пиксель из ОРИГИНАЛА, False = из ГЕНЕРАЦИИ

# Таблица источников. Строка — класс в оригинале, столбец — класс в генерации.
#
# Правило намеренно НЕсимметричное:
#   • строка CLOTHES — всегда генерация. Это зона, которую мы и меняем; старая
#     одежда покупателя не может вернуться ни при какой ошибке сегментации.
#   • столбец CLOTHES — генерация. Новая вещь имеет право вылезти за прежний
#     силуэт (оверсайз), закрыть волосы (шапка), предплечье (рукав), аксессуар.
#   • клетка FACE × CLOTHES — единственное исключение, и оно ЧАСТИЧНОЕ:
#     оригинал побеждает только внутри ЯДРА лица (глаза, нос, рот). По
#     подбородку, челюсти и шее выигрывает одежда — иначе водолазка под горло,
#     шарф, капюшон и воротник-стойка стирались бы с подбородка, а это половина
#     осенней коллекции, а не редкий край. Личность живёт в ядре.
SRC_TABLE = {
    BG:      {BG:_O, HAIR:_O, SKIN:_O, FACE:_O, CLOTHES:_G, ACC:_O},
    HAIR:    {BG:_O, HAIR:_O, SKIN:_O, FACE:_O, CLOTHES:_G, ACC:_O},
    SKIN:    {BG:_O, HAIR:_O, SKIN:_O, FACE:_O, CLOTHES:_G, ACC:_O},
    FACE:    {BG:_O, HAIR:_O, SKIN:_O, FACE:_O, CLOTHES:_G, ACC:_O},  # см. ядро ниже
    CLOTHES: {BG:_G, HAIR:_G, SKIN:_G, FACE:_G, CLOTHES:_G, ACC:_G},
    ACC:     {BG:_O, HAIR:_O, SKIN:_O, FACE:_O, CLOTHES:_G, ACC:_O},
}

_seg = _det = None

def _segmenter():
    global _seg
    if _seg is None:
        _seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
            base_options=mpy.BaseOptions(model_asset_path="selfie_multiclass_256x256.tflite"),
            output_category_mask=True))
    return _seg

def _detector():
    global _det
    if _det is None:
        _det = vision.FaceDetector.create_from_options(vision.FaceDetectorOptions(
            base_options=mpy.BaseOptions(model_asset_path="blaze_face_short_range.tflite")))
    return _det

def parse(pil):
    """Карта классов. Копия обязательна: numpy_view() — вид на буфер,
    который переиспользуется следующим вызовом."""
    a = np.asarray(pil.convert("RGB"))
    m = _segmenter().segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=a)).category_mask.numpy_view()
    return np.squeeze(np.array(m, copy=True))

def face_core_mask(pil):
    """Ядро лица — глаза, нос, рот. Эллипс по ключевым точкам детектора.
    None, если лицо не найдено или точек не хватило. Что делать в этом
    случае — решает build_keep_mask, см. ветку «ландмарок нет»."""
    W, H = pil.size
    a = np.asarray(pil.convert("RGB"))
    res = _detector().detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=a))
    if not res.detections:
        return None
    kp = res.detections[0].keypoints
    if len(kp) < 4:
        return None
    (ex1, ey1), (ex2, ey2) = (kp[0].x*W, kp[0].y*H), (kp[1].x*W, kp[1].y*H)
    mx, my = kp[3].x*W, kp[3].y*H                      # рот
    eye_cx, eye_cy = (ex1+ex2)/2, (ey1+ey2)/2
    eye_d = max(abs(ex1-ex2), abs(ey1-ey2), W*0.02)    # межзрачковое, с полом
    span = max(abs(my-eye_cy), eye_d*0.6)              # глаза → рот
    # По вертикали: выше бровей и чуть ниже рта, но НЕ до подбородка.
    top    = eye_cy - span*0.95
    bottom = my     + span*0.30
    half_w = eye_d*1.35
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).ellipse([eye_cx-half_w, top, eye_cx+half_w, bottom], fill=255)
    return np.asarray(m) > 127

def build_keep_mask(co, cg, core=None):
    """True = взять пиксель из ОРИГИНАЛА.

    Ландмарок нет (core is None) — весь класс FACE отходит оригиналу, включая
    клетку FACE x CLOTHES. Иначе на кадрах, где детектор промолчал, сгенерённое
    лицо осталось бы везде, где сегментация назвала его одеждой, — ровно та
    беда, ради которой всё и затевалось. Цена страховки — воротник водолазки,
    срезанный с подбородка на паре процентов снимков. Лицо дороже воротника.
    """
    keep = np.zeros(co.shape, bool)
    for o_cls, row in SRC_TABLE.items():
        for g_cls, take_orig in row.items():
            if take_orig:
                keep |= (co == o_cls) & (cg == g_cls)
    if core is not None:
        # Ядро лица побеждает одежду; периферия лица (подбородок, челюсть) — нет.
        keep |= (co == FACE) & (cg == CLOTHES) & core
    else:
        keep |= (co == FACE)
    return keep


def verify_invariant(o, g, out, alpha):
    """Детерминированная проверка компоновки — без порогов и без статистики.

    Утверждение: там, где маска насыщена, результат обязан быть побитово равен
    источнику. alpha==255 -> оригинал, alpha==0 -> генерация. Промежуточные
    значения — зона пера, её этот уровень не трогает.

    Ловит перепутанный порядок каналов, лишний ресемплинг, съехавший на пиксель
    композит, чужой цветовой профиль — то есть всё, что ArcFace размажет в шум
    вместо того, чтобы уронить сборку.
    """
    ao, ag, ax = (np.asarray(x, dtype=np.uint8) for x in (o, g, out))
    full, none = alpha == 255, alpha == 0
    bad_o = int((full & np.any(ax != ao, axis=2)).sum())
    bad_g = int((none & np.any(ax != ag, axis=2)).sum())
    return {
        "ok": bad_o == 0 and bad_g == 0,
        "checked_original_px": int(full.sum()),
        "checked_generated_px": int(none.sum()),
        "mismatch_original_px": bad_o,
        "mismatch_generated_px": bad_g,
    }


AR_TOLERANCE = 0.02


def composite(orig_pil, gen_pil, feather=4):
    """Возвращает (итоговое изображение, статистика)."""
    W, H = gen_pil.size
    ow, oh = orig_pil.size
    # Композит совмещает два кадра по пикселям. Если пропорции разошлись,
    # ресайз оригинала под размер генерации его растянет, карты классов
    # перестанут соответствовать друг другу, и на выходе будет не лицо
    # покупателя, а лицо покупателя не на своём месте. Такой случай надо
    # не «сгладить», а отдать наверх: бэкенд вернёт генерацию как есть.
    if abs((ow / oh) / (W / H) - 1) > AR_TOLERANCE:
        raise ValueError(
            f"пропорции не совпадают: оригинал {ow}x{oh}, генерация {W}x{H} — "
            "композит совместил бы кадры с промахом по геометрии")
    o = orig_pil.convert("RGB").resize((W, H), Image.LANCZOS)
    g = gen_pil.convert("RGB")
    co, cg = parse(o), parse(g)
    core = face_core_mask(o)
    keep = build_keep_mask(co, cg, core)
    m = Image.fromarray((keep*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(feather))
    out = Image.composite(o, g, m)
    stats = {
        "invariant": verify_invariant(o, g, out, np.asarray(m)),
        "face_found": core is not None,
        "kept_from_original_pct": round(float(keep.mean()*100), 2),
        "per_class_kept_pct": {
            CLASS_NAMES[k]: round(float(keep[co == k].mean()*100), 2)
            for k in CLASS_NAMES if (co == k).sum() > 500
        },
    }
    return out, stats
