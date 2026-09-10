FROM python:3.12-slim

# opencv тянется mediapipe и в headless-среде требует эти системные библиотеки
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgl1 libglib2.0-0 libxcb1 curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Модели вшиты в образ: сервис не должен ходить в интернет на старте.
# Один источник правды со скриптом — и sha256 внутри него, чтобы битая
# загрузка роняла сборку, а не всплывала отсутствующей метрикой в проде.
COPY fetch_models.sh .
RUN ./fetch_models.sh

COPY app.py regions.py face_metric.py ci_gate.py baselines.json ./
EXPOSE 8000
CMD ["uvicorn","app:app","--host","0.0.0.0","--port","8000","--workers","1"]
