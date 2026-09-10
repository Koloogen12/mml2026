"""Метрика идентичности: косинус эмбеддингов ArcFace. Устойчива к ресайзу."""
import numpy as np, onnxruntime as ort
from PIL import Image
import regions
from regions import parse, FACE, HAIR

_s = None
def _sess(p="arcface.onnx"):
    global _s
    if _s is None: _s = ort.InferenceSession(p, providers=["CPUExecutionProvider"])
    return _s


def face_box_with_source(pil, pad=0.08):
    """Бокс лица покупателя И чем он померен.

    Сначала пробуем детектор: он возвращает ОДНО лицо. Сегментация этого не
    умеет — класс FACE она ставит всем, кто попал в кадр, и на снимке с людьми
    на фоне бокс растягивается на всю ширину, захватывая чужие головы. Косинус
    тогда сравнивает «три головы против трёх голов» и перестаёт что-либо
    значить (замерено: бокс занимал 25.6% кадра вместо лица).

    Сегментация остаётся фолбэком — на кадрах, где детектор молчит, лучше
    широкий бокс, чем никакого.
    """
    W, H = pil.size
    res = regions._detector().detect(
        __import__("mediapipe").Image(
            image_format=__import__("mediapipe").ImageFormat.SRGB,
            data=np.asarray(pil.convert("RGB"))))
    if res.detections:
        d = max(res.detections, key=lambda x: x.categories[0].score).bounding_box
        x0, y0, x1, y1 = d.origin_x, d.origin_y, d.origin_x + d.width, d.origin_y + d.height
        src = "detector"
    else:
        c = parse(pil); m = np.isin(c, [FACE, HAIR])
        ys, xs = np.where(m)
        if len(xs) < 50: return None, None
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        src = "segmentation"
    w, h = x1 - x0, y1 - y0
    px, py = int(w * pad), int(h * pad)
    box = (max(0, x0 - px), max(0, y0 - py), min(W, x1 + px), min(H, y1 + py))
    return box, src


def face_box(pil, pad=0.08):
    return face_box_with_source(pil, pad)[0]


def embed(pil, box):
    f = pil.convert("RGB").crop(box).resize((112, 112), Image.LANCZOS)
    a = np.asarray(f, dtype=np.float32)
    a = (a - 127.5) / 127.5
    a = np.transpose(a, (2, 0, 1))[None, ...]
    e = _sess().run(None, {_sess().get_inputs()[0].name: a})[0][0]
    return e / (np.linalg.norm(e) + 1e-9)


def cosine(ref_pil, test_pil, box=None):
    """Бокс берём ОДИН на всех — из эталона, чтобы геометрия сравнения совпадала."""
    if box is None: box = face_box(ref_pil)
    if box is None: return None
    W, H = ref_pil.size
    t = test_pil.convert("RGB").resize((W, H), Image.LANCZOS)
    return float(np.dot(embed(ref_pil, box), embed(t, box)))
