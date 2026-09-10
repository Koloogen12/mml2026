"""mml-reco — инференс-сайдкар платформы.

Два эмбеддера:
  • e5 (multilingual-e5-small, 384d) — текст-текст семантика, силён в русском.
  • Marqo-FashionSigLIP (768d) — фото товара и текст в общем fashion-пространстве.
    Text-энкодер англоязычный → запросы в него подаём переведёнными на EN
    (де-риск: RU 53% → EN 70% match@5). Фото — языко-независимый сильный сигнал.

Ретривал платформы — гибрид: e5 (лексика RU) ∪ Marqo image (визуал/cold-start),
сверху LLM-реранк с паспортом стиля.

Контракт:
  POST /embed              {"texts":[...], "kind":"query"|"passage"} -> e5 384d
  POST /embed-image        {"image_urls":[...]}                     -> Marqo 768d
  POST /embed-fashion-text {"texts":[...]}                          -> Marqo 768d
  GET  /healthz
"""

import io
import threading
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

E5_MODEL = "intfloat/multilingual-e5-small"
FASHION_MODEL = "hf-hub:Marqo/marqo-fashionSigLIP"

_e5 = None

# Marqo грузим лениво (≈600 МБ, нужен не на каждый запрос). Под локом, чтобы
# параллельные первые запросы не грузили модель дважды.
_fashion = None  # (model, preprocess, tokenizer, device)
_fashion_lock = threading.Lock()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _e5
    from sentence_transformers import SentenceTransformer

    _e5 = SentenceTransformer(E5_MODEL)
    yield


app = FastAPI(title="mml-reco", lifespan=lifespan)


def _get_fashion():
    global _fashion
    if _fashion is not None:
        return _fashion
    with _fashion_lock:
        if _fashion is None:
            import open_clip
            import torch

            device = "mps" if torch.backends.mps.is_available() else (
                "cuda" if torch.cuda.is_available() else "cpu")
            model, preprocess = open_clip.create_model_from_pretrained(FASHION_MODEL)
            tokenizer = open_clip.get_tokenizer(FASHION_MODEL)
            model = model.to(device).eval()
            _fashion = (model, preprocess, tokenizer, device)
    return _fashion


# ─────────────────────────── e5 (текст) ───────────────────────────

class EmbedRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=256)
    kind: str = "passage"  # e5 требует префиксы query:/passage:


class EmbedResponse(BaseModel):
    vectors: list[list[float]]
    model: str
    dim: int


@app.get("/healthz")
def healthz():
    return {"ok": True, "e5": E5_MODEL, "fashion_loaded": _fashion is not None}


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest):
    prefix = "query: " if req.kind == "query" else "passage: "
    vecs = _e5.encode(
        [prefix + t for t in req.texts],
        normalize_embeddings=True,
        batch_size=64,
    )
    return EmbedResponse(vectors=vecs.tolist(), model=E5_MODEL, dim=len(vecs[0]))


# ─────────────────────────── Marqo (фото + fashion-текст) ───────────

class ImageEmbedRequest(BaseModel):
    image_urls: list[str] = Field(min_length=1, max_length=128)


class FashionTextRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=256)


def _load_image(url: str):
    from PIL import Image

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "mml-reco/1.0"})
        data = urllib.request.urlopen(req, timeout=20).read()
        return Image.open(io.BytesIO(data)).convert("RGB")
    except Exception:
        return None


@app.post("/embed-image", response_model=EmbedResponse)
def embed_image(req: ImageEmbedRequest):
    import torch

    model, preprocess, _, device = _get_fashion()

    with ThreadPoolExecutor(max_workers=16) as ex:
        imgs = list(ex.map(_load_image, req.image_urls))
    if any(im is None for im in imgs):
        # Явно сообщаем, какие URL не скачались — ETL пометит товар, а не молча
        # запишет мусорный вектор.
        bad = [u for u, im in zip(req.image_urls, imgs) if im is None]
        raise HTTPException(status_code=422, detail={"unfetchable": bad})

    with torch.no_grad():
        px = torch.stack([preprocess(im) for im in imgs]).to(device)
        emb = model.encode_image(px)
        emb = emb / emb.norm(dim=-1, keepdim=True)
    vecs = emb.cpu().tolist()
    return EmbedResponse(vectors=vecs, model=FASHION_MODEL, dim=len(vecs[0]))


@app.post("/embed-fashion-text", response_model=EmbedResponse)
def embed_fashion_text(req: FashionTextRequest):
    import torch

    model, _, tokenizer, device = _get_fashion()
    with torch.no_grad():
        tok = tokenizer(req.texts).to(device)
        emb = model.encode_text(tok)
        emb = emb / emb.norm(dim=-1, keepdim=True)
    vecs = emb.cpu().tolist()
    return EmbedResponse(vectors=vecs, model=FASHION_MODEL, dim=len(vecs[0]))
