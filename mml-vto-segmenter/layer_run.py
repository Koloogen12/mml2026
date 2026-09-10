"""Тест на перекрытие слоёв: переживает ли ОДЕЖДА цепочку проходов.

Личность цепочку уже переживает — это померено. Здесь другой вопрос: на втором
проходе модель получает композит (родная голова на сгенерированном теле) и
обязана увидеть надетое на первом проходе и сохранить, а не заменить.

Три прохода по РАЗНЫМ зонам (верх / низ / верхняя одежда). Так и есть реальный
ближайший сценарий «собери образ», и так правило replacement only, которое пока
не снято, не мешает: оно про замену внутри зоны.
"""
import base64, io, json, os, re, sys, time, requests
from PIL import Image
sys.path[:0] = ["/opt/mml-seg", "/root/chain"]
import regions, face_metric

KEY = os.environ["COMETAPI_KEY"]
BASE = "https://api.cometapi.com/v1/images/edits"
MODEL = "gpt-image-2.5-sunburst"
TPL = open("/root/chain/prompt_multi.txt").read()

LAYERS = [
    ("garments/plaid_shirt.png",      "Top/shirt",       "Рубашка фланелевая в клетку", "красно-чёрная клетка", "100% хлопок"),
    ("garments/bottoms_trousers.jpg", "Bottoms/pants",   "Брюки Vector",  "Чёрный", "70% полиэстер, 20% район, 10% шерсть"),
    ("garments/outerwear_jacket.jpg", "Outerwear/jacket","Куртка STYLISH","Чёрный", "85% полиэстер, 15% хлопок"),
]

def prompt_for(layer):
    _, label, name, color, mat = layer
    out, done = [], False
    for ln in TPL.split("\n"):
        if re.match(r"^- Image [2-5]:", ln):
            if not done:
                out.append(f"- Image 2: {label} (name: {name}, color: {color}, material: {mat})")
                done = True
            continue
        out.append(ln)
    return "\n".join(out)

def to_png(pil, max_side=1024):
    w, h = pil.size; k = max_side / max(w, h)
    if k < 1: pil = pil.resize((round(w*k), round(h*k)), Image.LANCZOS)
    b = io.BytesIO(); pil.convert("RGB").save(b, "PNG"); return b.getvalue()

COST = {"in": 4/1e6, "out": 24/1e6}
spent = [0.0]

def generate(person_png, garment_path, layer):
    mime = "image/png" if garment_path.endswith(".png") else "image/jpeg"
    files = [("image[]", ("person.png", person_png, "image/png")),
             ("image[]", (os.path.basename(garment_path), open("/root/chain/"+garment_path,"rb").read(), mime))]
    data = {"model": MODEL, "prompt": prompt_for(layer), "size": "auto"}
    for _ in range(3):
        r = requests.post(BASE, headers={"Authorization": "Bearer "+KEY}, data=data, files=files, timeout=300)
        if r.status_code == 200:
            j = r.json(); u = j.get("usage") or {}
            spent[0] += u.get("input_tokens",0)*COST["in"] + u.get("output_tokens",0)*COST["out"]
            return Image.open(io.BytesIO(base64.b64decode(j["data"][0]["b64_json"]))).convert("RGB")
        time.sleep(4)
    raise RuntimeError(f"generate failed {r.status_code}: {r.text[:300]}")

def run(photo, tag, with_composite):
    orig = Image.open("/root/chain/photos/"+photo).convert("RGB")
    anchor = Image.open(io.BytesIO(to_png(orig)))
    box = face_metric.face_box(anchor, pad=0.08)
    cur = to_png(orig); rows = []
    for i, layer in enumerate(LAYERS, 1):
        gen = generate(cur, layer[0], layer)
        if with_composite:
            final, st = regions.composite(anchor, gen)
            rec = {"pass": i, "garment": layer[1], "face_found": st["face_found"],
                   "invariant_ok": st["invariant"]["ok"]}
        else:
            final = gen; rec = {"pass": i, "garment": layer[1]}
        rec["cos"] = face_metric.cosine(anchor, final, box)
        final.save(f"/root/chain/layers/{tag}-p{i}.png")
        cur = to_png(final); rows.append(rec)
        print(json.dumps({"tag": tag, **rec}, ensure_ascii=False), flush=True)
    return rows

if __name__ == "__main__":
    os.makedirs("/root/chain/layers", exist_ok=True)
    res = {}
    for p in sys.argv[1].split(","):
        n = p.replace(".png","")
        res[n] = {"with_composite": run(p, n+"-L", True),
                  "no_composite":   run(p, n+"-N", False)}
        json.dump(res, open("/root/chain/layers.json","w"), ensure_ascii=False, indent=1)
        print(f"### {n} готово, потрачено ~${spent[0]:.2f}", flush=True)
    print(f"ИТОГО ~${spent[0]:.2f}")
