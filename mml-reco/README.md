# mml-reco — сервис инференса (паспорт стиля + рекомендации)

Python-сервис рядом с Go-ядром (`mml-saas-backend`). Отвечает за то, что не место в Go:
колориметрия, эмбеддинги, ретривал, реранк, оценка моделей.

Спроектирован по [REC_BUILD_PLAN.md](../MakeMeLook/chat-shopping/docs/REC_BUILD_PLAN.md) и
[STYLE_PASSPORT_AND_RECS.md](../MakeMeLook/chat-shopping/docs/STYLE_PASSPORT_AND_RECS.md).

## Что уже работает (Спринт 0)

`passport/` — **детерминированное ядро паспорта** (Tier 1, без каталога и LLM):
- `body.py` — тип фигуры по правилам 5%/25% + пропорция + масштаб. Хранит непрерывные ratio как истину, ярлык — производный.
- `color.py` — колориметрия из CIE Lab → undertone / value / chroma / контраст → сезон-подсказка (Tier 2) с confidence. **Честность by design:** ярлык сезона — редактируемая гипотеза, не диагноз; движковая истина — непрерывные признаки.

```bash
# запустить тесты (stdlib, без зависимостей)
python3 -m unittest discover -s tests -v
```

Пример:
```python
from passport import analyze_body, analyze_color
analyze_body({"bust":90,"waist":66,"hips":92,"height":168,"wrist":15}).body_shape  # "hourglass"
analyze_color(skin=(72,12,24), hair=(66,8,20), eyes=(58,-2,8)).season_family        # "spring"
```

## Дорожная карта (следующее)

| Модуль | Что | Блокер |
|---|---|---|
| `passport/essence.py` | бленд эссенций + yin/yang из онбординга | — (buildable) |
| `colorimetry/` | фото → face-parsing → CIE Lab (питает `color.py`) | dep (mediapipe/BiSeNet) + аудит на тёмной коже |
| `retrieval/` | FashionCLIP-эмбеддинги + ANN-поиск (pgvector) | 🔴 каталог (B1) |
| `rules/style_grammar.yaml` | сезон/тело/эссенция → бусты атрибутов товара | — (конфиг) |
| `rerank/` | эвристика → learned (CatBoost/DeepFM) → SDM long/short | поведенческие данные |
| `eval/` | offline (recall@k, palette-match, constraint-violations) + LLM-judge + human | gold-set (стилист) |

## Принципы

- **Tier-модель честности:** движок на измеримом (ratio, Lab, контраст); типологии (сезон/Kibbe/эссенция) — редактируемый UX-ярлык, не жёсткий вход.
- **Пороги — именованные константы** (см. верх `body.py`/`color.py`): это конвенции, не законы; калибруются на реальных данных и аудите биаса.
- **2-осевой тон кожи** (lightness+hue), не Fitzpatrick — против евроцентричного биаса.
