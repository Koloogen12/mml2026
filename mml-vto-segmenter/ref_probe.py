"""Тест 2: решает ли эталон.

Инструкции «как носить» НЕТ ни в одном варианте, правило replacement only на
месте, вход тот же. Отличается ровно одно — карточка вещи: застёгнутая
раскладка против той же куртки, снятой распахнутой.

Вариант с застёгнутой раскладкой уже посчитан в основном прогоне (файл -L-p3),
поэтому здесь только распахнутая.
"""
import sys, io
sys.path[:0] = ["/opt/mml-seg", "/root/chain"]
sys.argv = [sys.argv[0], ""]
exec(open("/root/chain/rule_probe2.py").read().split('if __name__')[0])
from PIL import Image
import regions
photos = ["06-danil-gallery-neutral", "04-danil-beanie-street"]
for n in photos:
    anchor = Image.open(io.BytesIO(to_png(Image.open(f"/root/chain/photos/{n}.png").convert("RGB"))))
    base = Image.open(f"/root/chain/layers/{n}-L-p2.png").convert("RGB")
    g = gen(to_png(base), prompt(False), garment="/root/chain/garments/jacket_open.jpg")
    out, _ = regions.composite(anchor, g)
    out.save(f"/root/chain/layers/{n}-openref.png")
    print(n, "готово", flush=True)
print(f"ИТОГО ~${spent[0]:.2f}")
