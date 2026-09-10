#!/usr/bin/env python3
"""
Reel Visual Analyzer — Gemini Files API
Использование:
  pip install google-generativeai
  python analyze_reel.py --key AIza... --video ./reel.mp4
"""

import argparse
import time
import sys
import pathlib
import google.generativeai as genai

PROMPT = """You are a professional video director analyzing a fashion/tech product video (Instagram Reel) for recreation purposes.

Analyze this video and produce a detailed VISUAL SCENE BREAKDOWN. Focus ONLY on:
- Visual effects (morphing, transitions, glitch, speed ramps, zoom, dissolve, warp)
- Camera movement (static, pan, zoom in/out, handheld, push in, pull back, orbital)
- Subject and action on screen (what is shown, what changes, what transforms)
- Color grading and mood (warm/cool, saturated/muted, contrast level)
- Transition type to next scene (hard cut, morph, dissolve, whip pan, flash, fade to black)
- Approximate duration of each scene in seconds
- On-screen text, UI elements, logos, or product interfaces if visible

DO NOT describe audio, music, or speech.

Format your response EXACTLY as:

SCENE [N] — [0:00–0:03]
• Subject: [what's on screen]
• Effect: [visual effect applied]
• Camera: [camera movement/angle]
• Transition out: [how it cuts to next]
• Mood/grade: [color, lighting feel]

Be specific and technical. This breakdown will be used to recreate the video with AI generation tools (Seedance 2.0)."""


def upload_and_analyze(api_key: str, video_path: str, model_name: str) -> str:
    genai.configure(api_key=api_key)

    path = pathlib.Path(video_path)
    if not path.exists():
        raise FileNotFoundError(f"Файл не найден: {video_path}")

    print(f"[1/3] Загружаю файл: {path.name} ({path.stat().st_size / 1024 / 1024:.1f} MB)")
    video_file = genai.upload_file(path=str(path))
    print(f"      URI: {video_file.uri}")

    print("[2/3] Жду обработки файла Gemini...")
    for i in range(60):
        video_file = genai.get_file(video_file.name)
        if video_file.state.name == "ACTIVE":
            print("      Файл готов.")
            break
        elif video_file.state.name == "FAILED":
            raise RuntimeError("Gemini не смог обработать файл")
        time.sleep(2)
        print(f"      Ожидание... ({(i+1)*2}с)", end="\r")
    else:
        raise TimeoutError("Таймаут ожидания файла")

    print(f"[3/3] Анализирую сцены через {model_name}...")
    model = genai.GenerativeModel(model_name)
    response = model.generate_content(
        [PROMPT, video_file],
        generation_config={"temperature": 0.2, "max_output_tokens": 4096}
    )

    return response.text


def main():
    parser = argparse.ArgumentParser(description="Reel Visual Analyzer via Gemini")
    parser.add_argument("--key", required=True, help="Google AI Studio API ключ")
    parser.add_argument("--video", required=True, help="Путь к видео файлу (MP4)")
    parser.add_argument("--model", default="gemini-2.0-flash", help="Модель Gemini")
    parser.add_argument("--output", default=None, help="Сохранить результат в файл (опционально)")
    args = parser.parse_args()

    try:
        result = upload_and_analyze(args.key, args.video, args.model)

        print("\n" + "="*60)
        print("РАСКАДРОВКА")
        print("="*60)
        print(result)
        print("="*60)

        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(result)
            print(f"\nСохранено в: {args.output}")

    except KeyboardInterrupt:
        print("\nПрервано.")
        sys.exit(0)
    except Exception as e:
        print(f"\nОшибка: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
