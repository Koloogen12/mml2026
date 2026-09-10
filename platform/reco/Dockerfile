# Reco-сайдкар — FastAPI + e5 (текст) + Marqo-FashionSigLIP (фото/fashion-текст).
# В проде GPU нет (MPS — только Mac), поэтому torch ставим CPU-only: код сам
# выбирает cpu, когда нет mps/cuda. Образ крупный (~2 ГБ из-за torch+модели) —
# это норма для инференс-сайдкара.
FROM python:3.11-slim

WORKDIR /app
ENV PIP_NO_CACHE_DIR=1 \
    HF_HOME=/app/.hf \
    TOKENIZERS_PARALLELISM=false

RUN apt-get update && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

# CPU-only torch И torchvision — обязательно ПАРОЙ и с одного индекса.
# Иначе torch приезжает отсюда, а torchvision тянется как зависимость
# open_clip_torch из обычного PyPI, собранный под другую версию torch, и всё
# рушится в рантайме: «operator torchvision::nms does not exist».
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app.py .

# (Опционально) прогреть модели в образ, чтобы не качать на первом запросе.
# По умолчанию — ленивая загрузка в рантайме (меньше образ, дольше первый вызов).
# ARG PRELOAD=0
# RUN [ "$PRELOAD" = "1" ] && python -c "import open_clip; open_clip.create_model_from_pretrained('hf-hub:Marqo/marqo-fashionSigLIP')" || true

EXPOSE 8091
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8091"]
