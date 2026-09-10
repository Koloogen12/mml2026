"""Точечная проверка: правило ли replacement only стирает рубашку.

Берём результат ВТОРОГО прохода (рубашка + брюки уже на теле) и делаем третий
проход с курткой дважды: с правилом и без него. Всё остальное совпадает, значит
разница — это правило, а не модель и не композит.
"""
import base64, io, json, os, re, sys, time, requests
from PIL import Image
sys.path[:0] = ["/opt/mml-seg", "/root/chain"]
import regions

KEY = os.environ["COMETAPI_KEY"]
TPL = open("/root/chain/prompt_multi.txt").read()
RULE = "✗ Layer the new garment ON TOP of the customer's original clothing in the same zone — replacement only"
REPL = ("✓ The customer may already be wearing garments put on by a previous pass. "
        "KEEP them and layer the new garment naturally OVER them — an open jacket must "
        "show the shirt underneath. Replace a garment only when the new one occupies the "
        "exact same zone AND cannot be worn over it.")

def prompt_for(keep_rule):
    out, done = [], False
    for ln in TPL.split("\n"):
        if re.match(r"^- Image [2-5]:", ln):
            if not done:
                out.append("- Image 2: Outerwear/jacket (name: Куртка STYLISH, color: Чёрный, material: 85% полиэстер, 15% хлопок)")
                done = True
            continue
        if ln.strip() == RULE.strip():
            out.append(RULE if keep_rule else REPL)
            continue
        out.append(ln)
    return "\n".join(out)

def to_png(pil, m=1024):
    w,h=pil.size; k=m/max(w,h)
    if k<1: pil=pil.resize((round(w*k),round(h*k)),Image.LANCZOS)
    b=io.BytesIO(); pil.convert("RGB").save(b,"PNG"); return b.getvalue()

spent=[0.0]
def gen(person_png, prompt):
    files=[("image[]",("p.png",person_png,"image/png")),
           ("image[]",("j.jpg",open("/root/chain/garments/outerwear_jacket.jpg","rb").read(),"image/jpeg"))]
    for _ in range(3):
        r=requests.post("https://api.cometapi.com/v1/images/edits",
            headers={"Authorization":"Bearer "+KEY},
            data={"model":"gpt-image-2.5-sunburst","prompt":prompt,"size":"auto"},
            files=files,timeout=300)
        if r.status_code==200:
            j=r.json(); u=j.get("usage") or {}
            spent[0]+=u.get("input_tokens",0)*4/1e6+u.get("output_tokens",0)*24/1e6
            return Image.open(io.BytesIO(base64.b64decode(j["data"][0]["b64_json"]))).convert("RGB")
        time.sleep(4)
    raise RuntimeError(f"{r.status_code}: {r.text[:200]}")

for ph in sys.argv[1].split(","):
    n=ph.replace(".png","")
    anchor=Image.open(io.BytesIO(to_png(Image.open("/root/chain/photos/"+ph).convert("RGB"))))
    base=Image.open(f"/root/chain/layers/{n}-L-p2.png").convert("RGB")
    for keep,label in ((True,"rule"),(False,"norule")):
        g=gen(to_png(base), prompt_for(keep))
        out,_=regions.composite(anchor,g)
        out.save(f"/root/chain/layers/{n}-probe-{label}.png")
        print(n,label,"готово",flush=True)
print(f"ИТОГО ~${spent[0]:.2f}")
