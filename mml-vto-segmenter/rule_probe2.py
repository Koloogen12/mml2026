"""Тест 1 по правке Данила: четыре геометрических утверждения вместо цели.

Отличие от предыдущего прогона РОВНО ОДНО — инструкция третьего прохода.
Правило replacement only оставлено на месте, вход тот же (результат прохода 2),
модель, размер, всё остальное совпадает.

Единственная правка в тексте Данила — притяжательное местоимение: у него текст
писался под женскую съёмку («her plaid shirt»), а покупатель здесь мужчина, и
чужое местоимение рискует поспорить с блоком SINGLE-PERSON LOCK. Поставлено
нейтральное «the customer's». Четыре утверждения — дословно.
"""
import base64, io, os, re, sys, time, requests
from PIL import Image
sys.path[:0] = ["/opt/mml-seg", "/root/chain"]
import regions

KEY = os.environ["COMETAPI_KEY"]
TPL = open("/root/chain/prompt_multi.txt").read()

GARMENT_LINE = "- Image 2: Outerwear/jacket (name: Куртка STYLISH, color: Чёрный, material: 85% полиэстер, 15% хлопок)"

HOW_WORN = """  HOW THIS GARMENT IS WORN IN THE OUTPUT:
  Worn OPEN and unbuttoned as an outer layer OVER the customer's plaid shirt.
  The plaid shirt underneath MUST stay clearly visible:
    · its check shows as a wide band down the centre of the torso
      between the open jacket panels,
    · its collar shows above the jacket collar,
    · its cuffs show past the jacket sleeves,
    · its hem shows below the jacket's elasticated hem."""

def prompt(with_how_worn):
    out, done = [], False
    for ln in TPL.split("\n"):
        if re.match(r"^- Image [2-5]:", ln):
            if not done:
                out.append(GARMENT_LINE)
                if with_how_worn:
                    out.append(HOW_WORN)
                done = True
            continue
        out.append(ln)
    return "\n".join(out)

def to_png(pil, m=1024):
    w, h = pil.size; k = m/max(w, h)
    if k < 1: pil = pil.resize((round(w*k), round(h*k)), Image.LANCZOS)
    b = io.BytesIO(); pil.convert("RGB").save(b, "PNG"); return b.getvalue()

spent = [0.0]
def gen(person_png, p, garment="/root/chain/garments/outerwear_jacket.jpg"):
    mime = "image/png" if garment.endswith(".png") else "image/jpeg"
    files = [("image[]", ("p.png", person_png, "image/png")),
             ("image[]", (os.path.basename(garment), open(garment, "rb").read(), mime))]
    for _ in range(3):
        r = requests.post("https://api.cometapi.com/v1/images/edits",
            headers={"Authorization": "Bearer "+KEY},
            data={"model": "gpt-image-2.5-sunburst", "prompt": p, "size": "auto"},
            files=files, timeout=300)
        if r.status_code == 200:
            j = r.json(); u = j.get("usage") or {}
            spent[0] += u.get("input_tokens",0)*4/1e6 + u.get("output_tokens",0)*24/1e6
            return Image.open(io.BytesIO(base64.b64decode(j["data"][0]["b64_json"]))).convert("RGB")
        time.sleep(4)
    raise RuntimeError(f"{r.status_code}: {r.text[:200]}")

if __name__ == "__main__":
    for ph in sys.argv[1].split(","):
        n = ph.replace(".png", "")
        anchor = Image.open(io.BytesIO(to_png(Image.open("/root/chain/photos/"+ph).convert("RGB"))))
        base = Image.open(f"/root/chain/layers/{n}-L-p2.png").convert("RGB")
        g = gen(to_png(base), prompt(True))
        out, _ = regions.composite(anchor, g)
        out.save(f"/root/chain/layers/{n}-howworn.png")
        print(n, "готово", flush=True)
    print(f"ИТОГО ~${spent[0]:.2f}")
