"""Сколько каждого слоя осталось на теле после трёх проходов.

Метод. Для каждой вещи строим цветовую модель по её каталожному снимку
(k-means по пикселям вещи в Lab). Дальше каждый пиксель класса «одежда» на
итоговом кадре относим к ближайшей модели — либо к «ничьей», если он далеко от
всех. Доля пикселей по слоям и есть ответ на вопрос «все три вещи на теле или
только последняя».

Порядок наслоения меряем зонально: верхняя одежда обязана доминировать на
плечах и рукавах, а рубашка — быть видна в центральной полосе торса. Это не
идеальная замена глазам, поэтому рядом всегда контактный лист.
"""
import sys, json, os; sys.path[:0] = ["/opt/mml-seg", "/root/chain"]
import numpy as np
from PIL import Image
import regions
from regions import CLOTHES

def to_lab(a):
    a = a.astype(np.float64)/255.0
    m = a > 0.04045
    a = np.where(m, ((a+0.055)/1.055)**2.4, a/12.92)
    M = np.array([[.4124,.3576,.1805],[.2126,.7152,.0722],[.0193,.1192,.9505]])
    xyz = a @ M.T / np.array([.95047,1.0,1.08883])
    f = np.where(xyz > .008856, np.cbrt(xyz), 7.787*xyz + 16/116)
    return np.stack([116*f[...,1]-16, 500*(f[...,0]-f[...,1]), 200*(f[...,1]-f[...,2])], -1)

def kmeans(X, k=4, it=25, seed=0):
    rng = np.random.default_rng(seed)
    C = X[rng.choice(len(X), k, replace=False)]
    for _ in range(it):
        lab = np.argmin(((X[:,None,:]-C[None])**2).sum(-1), 1)
        for j in range(k):
            if (lab==j).any(): C[j] = X[lab==j].mean(0)
    return C

def garment_model(path, k=4, cap=20000):
    im = Image.open(path).convert("RGB")
    im.thumbnail((320,320))
    a = np.asarray(im)
    # фон каталожного снимка — светлый и несатурированный, выбрасываем
    lab = to_lab(a)
    keep = ~((lab[...,0] > 88) & (np.abs(lab[...,1]) < 8) & (np.abs(lab[...,2]) < 8))
    X = lab[keep]
    if len(X) > cap: X = X[np.random.default_rng(0).choice(len(X), cap, replace=False)]
    return kmeans(X, k)

def assign(img, models, names, thresh=22.0):
    c = regions.parse(img)
    m = c == CLOTHES
    if m.sum() < 500: return None, None, None
    lab = to_lab(np.asarray(img.convert("RGB")))
    X = lab[m]
    d = np.stack([np.min(((X[:,None,:]-C[None])**2).sum(-1), 1)**0.5 for C in models], 1)
    best = np.argmin(d, 1); mind = d[np.arange(len(d)), best]
    best = np.where(mind > thresh, -1, best)
    full = np.full(c.shape, -2, np.int8); full[m] = best
    share = {names[i]: round(float((best==i).mean()*100),1) for i in range(len(names))}
    share["ничья"] = round(float((best==-1).mean()*100),1)
    return share, full, m

NAMES = ["рубашка в клетку", "брюки", "куртка"]
PATHS = ["/root/chain/garments/plaid_shirt.png",
         "/root/chain/garments/bottoms_trousers.jpg",
         "/root/chain/garments/outerwear_jacket.jpg"]
models = [garment_model(p) for p in PATHS]

R = json.load(open("/root/chain/layers.json"))
out = {}
for ph, arms in R.items():
    out[ph] = {}
    for arm, letter in (("with_composite","L"), ("no_composite","N")):
        out[ph][arm] = {}
        for p in (1,2,3):
            f = f"/root/chain/layers/{ph}-{letter}-p{p}.png"
            if not os.path.exists(f): continue
            im = Image.open(f).convert("RGB")
            share, full, m = assign(im, models, NAMES)
            rec = {"доли": share}
            if p == 3 and full is not None:
                ys, xs = np.where(m)
                y0, y1 = ys.min(), ys.max()
                band = full[y0:y0+int((y1-y0)*0.22)]          # плечи и верх рукавов
                b = band[band >= -1]
                if len(b):
                    rec["плечи"] = {NAMES[i]: round(float((b==i).mean()*100),1) for i in range(3)}
            out[ph][arm][f"проход {p}"] = rec
            print(ph, arm, p, rec, flush=True)
json.dump(out, open("/root/chain/layer_scores.json","w"), ensure_ascii=False, indent=1)
