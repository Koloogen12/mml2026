#!/bin/sh
# Веса для сегментации, детекта лица и метрики идентичности.
#
# curl без --fail молча сохраняет страницу ошибки как файл: в первой версии
# так и вышло — arcface.onnx приехал девятибайтовым огрызком, onnxruntime упал
# на разборе protobuf, а замер идентичности тихо отключился. Поэтому здесь
# --fail и обязательная сверка sha256: битая загрузка обязана падать здесь,
# а не всплывать отсутствующей метрикой через неделю.
set -e
cd "$(dirname "$0")"

get() {  # url файл sha256
  curl -sSL --fail -o "$2" "$1"
  echo "$3  $2" | sha256sum -c - >/dev/null || { echo "битая загрузка: $2" >&2; exit 1; }
}

get https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite \
    selfie_multiclass_256x256.tflite \
    c6748b1253a99067ef71f7e26ca71096cd449baefa8f101900ea23016507e0e0
get https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite \
    blaze_face_short_range.tflite \
    b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f
# ArcFace нужен гейту и выборочному замеру в рантайме.
get https://huggingface.co/immich-app/buffalo_l/resolve/main/recognition/model.onnx \
    arcface.onnx \
    4c06341c33c2ca1f86781dab0e829f88ad5b64be9fba56e56bc9ebdefc619e43
