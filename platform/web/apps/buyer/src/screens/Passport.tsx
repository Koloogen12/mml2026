import { useEffect, useMemo, useState } from "react";
import { sx } from "../sx";
import { useApp } from "../appStore";
import { SIZES as WARDROBE_SIZES, BUDGET_ROWS, genderOf } from "../wardrobe";
import { useAuth } from "../authStore";

// Паспорт стиля (P1) — разметка/копия 1:1 из макета; данные — с сервера
// (/api/v1/passport, /api/v1/consents, /api/v1/biometric). Правки → PUT /passport.
// Пусто = говорим «не заполнено», а не показываем чужие demo-значения:
// раньше стиль-код «Спокойно · Дорого · Женственно», бренды 12 STOREEZ/LIME/…
// и «стиль-иконы» были захардкожены и показывались всем, включая мужчин.

const PRESET_NAME: Record<string, string> = {
  min: "Минимализм", rom: "Романтика", clas: "Классика",
  resort: "Курортный", street: "Городской", boho: "Бохо",
};
const BRAND_BG = ["#E4E0D6", "#DAD5C8", "#E0DACE", "#D8D3CB", "#DED8CC", "#E2DCCF"];

const parseBudget = (label: string) => parseInt(label.replace(/\D/g, ""), 10) || 0;
const monoOf = (name: string) => {
  const clean = name.replace(/[^A-Za-zА-Яа-я0-9]/g, "");
  return clean.slice(0, 2).toUpperCase() || "•";
};

export function Passport() {
  const app = useApp();

  // Реально делимся ссылкой: Web Share API → буфер обмена. Раньше тост врал,
  // что скопировал, ничего не копируя.
  const sharePassport = async () => {
    const url = window.location.origin + "/passport";
    try {
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
      if (nav.share) {
        await nav.share({ title: "Мой паспорт стиля · MakeMeLook", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      app.showToast("Ссылка на паспорт скопирована");
    } catch {
      app.showToast("Не удалось поделиться");
    }
  };
  const prefs = useAuth((s) => s.prefs);

  // Пол — из паспорта: у мужчины не должно быть ни «Платьев» в бюджете, ни
  // женской сетки размеров. Раньше здесь лежала своя вшитая копия — женская.
  const gender = genderOf(prefs?.for_whom);
  const SIZES: Record<string, string[]> = {
    top: WARDROBE_SIZES[gender]["Верх"],
    bottom: WARDROBE_SIZES[gender]["Низ"],
    shoe: WARDROBE_SIZES[gender]["Обувь"],
    height: WARDROBE_SIZES[gender]["Рост"],
  };
  const budgetRows = BUDGET_ROWS[gender];

  const consents = useAuth((s) => s.consents);
  const loggedIn = useApp((s) => s.loggedIn);
  const obName = useAuth((s) => s.onboardingName);
  const user = useAuth((s) => s.user);

  const [bgIdx, setBgIdx] = useState<Record<string, number>>({ dress: 2, outer: 3, shoe: 2, bag: 2 });
  const [szIdx, setSzIdx] = useState<Record<string, number>>({ top: 1, bottom: 2, shoe: 2, height: 2 });
  const [confirmDel, setConfirmDel] = useState(false);

  // Гидратация паспорта и согласий при заходе на вкладку.
  useEffect(() => {
    if (!loggedIn) return;
    void useAuth.getState().loadPassport();
    void useAuth.getState().loadConsents();
    void useAuth.getState().loadStyleCode();
  }, [loggedIn]);

  // Инициализация ползунков из реальных предпочтений.
  useEffect(() => {
    if (!prefs) return;
    const sz = prefs.size_by_category || {};
    setSzIdx((prev) => {
      const next = { ...prev };
      (["top", "bottom", "shoe"] as const).forEach((k) => {
        const v = sz[k];
        if (v) {
          const i = SIZES[k].indexOf(v);
          if (i >= 0) next[k] = i;
        }
      });
      return next;
    });
    const bud = prefs.budget_by_category || {};
    setBgIdx((prev) => {
      const next = { ...prev };
      BUDGET_ROWS[genderOf(prefs.for_whom)].forEach((row) => {
        // Значение по умолчанию для ключа, которого нет в стартовом состоянии
        // (у мужчин это «top»): без него был бы undefined и падение.
        if (next[row.key] === undefined) next[row.key] = 2;
        const v = bud[row.key];
        if (typeof v === "number") {
          const i = row.steps.findIndex((lbl) => parseBudget(lbl) === v);
          if (i >= 0) next[row.key] = i;
        }
      });
      return next;
    });
  }, [prefs]);

  const displayName = obName || user?.email?.split("@")[0] || "Профиль";
  const initial = (displayName[0] || "П").toUpperCase();
  const avatarUrl = useAuth((st) => st.avatarUrl);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const pickAvatar = async (f: File) => {
    // 5 МБ — тот же порог, что и на бэке; проверяем до отправки, чтобы человек
    // не ждал загрузку ради отказа.
    if (f.size > 5 << 20) {
      app.showToast("Файл больше 5 МБ");
      return;
    }
    setAvatarBusy(true);
    const ok = await useAuth.getState().uploadAvatar(f);
    setAvatarBusy(false);
    app.showToast(ok ? "Фото обновлено" : "Не удалось загрузить");
  };

  const styleTags = useMemo(() => {
    const blend = prefs?.style_persona_blend;
    return blend?.length ? blend.map((id) => PRESET_NAME[id] ?? id) : [];
  }, [prefs]);

  // Стиль-код собирает модель по ответам онбординга (см. loadStyleCode).
  const styleCode = useAuth((st) => st.styleCode);

  /*
   * Витрина есть только у брендов, которые реально в каталоге. «Любимые» — это
   * сигнал вкуса (человек носит Burberry), и у большинства из них витрины у нас
   * нет. Раньше клик звал go("brand") вообще без указания бренда — открывался
   * тот, что был открыт последним, то есть всегда одна и та же чужая витрина.
   */
  const catalog = useApp((st) => st.catalog);
  const brandList = useMemo(() => {
    const love = prefs?.brands_love ?? [];
    return love.map((name, i) => {
      const inCatalog = catalog.find((p) => p.brand.name.toLowerCase() === name.toLowerCase());
      return {
        name, mono: monoOf(name), bg: BRAND_BG[i % BRAND_BG.length], id: name,
        shop: inCatalog ? inCatalog.brand : null,   // null → витрины нет, клика нет
      };
    });
  }, [prefs, catalog]);

  const sizeRows: Array<[string, string]> = [["Верх", "top"], ["Низ", "bottom"], ["Обувь", "shoe"], ["Рост", "height"]];

  // Сохранение правок на сервер (SCD-2 версионирование — на бэке).
  const persistSizes = (next: Record<string, number>) => {
    if (!loggedIn) return;
    void useAuth.getState().savePassport({
      size_by_category: { top: SIZES.top[next.top], bottom: SIZES.bottom[next.bottom], shoe: SIZES.shoe[next.shoe] },
    });
  };
  const persistBudget = (next: Record<string, number>) => {
    if (!loggedIn) return;
    void useAuth.getState().savePassport({
      budget_by_category: Object.fromEntries(
        budgetRows.map((row) => [row.key, parseBudget(row.steps[next[row.key] ?? 2] ?? "")]),
      ),
    });
  };

  const deleteBiometric = async () => {
    const ok = await useAuth.getState().deleteBiometric();
    setConfirmDel(false);
    app.showToast(ok ? "Биометрия удалена" : "Не удалось удалить");
  };

  // Фидбек-петля «Обновить мой вкус» — POST /passport/refine.
  const [refining, setRefining] = useState(false);
  const refineTaste = async () => {
    if (refining) return;
    setRefining(true);
    const { ok, addedBrands } = await useAuth.getState().refineTaste();
    setRefining(false);
    if (!ok) {
      app.showToast("Не получилось обновить — попробуйте позже");
      return;
    }
    app.showToast(
      addedBrands.length
        ? `Добавили в ваш вкус: ${addedBrands.join(", ")}`
        : "Ваш вкус уже актуален",
    );
  };

  return (
    <div className="dp-fade dp-pass" style={sx("max-width:1080px;margin:0 auto")}>
      {/* header */}
      <div className="dp-pass-head" style={sx("display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:40px")}>
        <div className="dp-pass-id" style={sx("display:flex;align-items:center;gap:22px")}>
          {/* Аватар: клик открывает выбор файла, наведение — подсказку. Пока
              фото нет, остаётся инициал — это не заглушка, а нормальный вид. */}
          <label
            className="dp-irid dp-btn"
            title={avatarUrl ? "Заменить фото" : "Загрузить фото"}
            style={sx(`position:relative;width:84px;height:84px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:500 32px 'Spectral',Georgia,serif;color:#000;flex:none;overflow:hidden;cursor:pointer;${avatarUrl ? `background-image:url('${avatarUrl}');background-size:cover;background-position:center` : ""}`)}
          >
            {!avatarUrl && !avatarBusy && initial}
            {avatarBusy && <span style={sx("font:500 12px 'Inter',sans-serif")}>…</span>}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";           // тот же файл можно выбрать повторно
                if (f) void pickAvatar(f);
              }}
              style={sx("position:absolute;inset:0;opacity:0;cursor:pointer")}
            />
          </label>
          {avatarUrl && (
            <span
              className="dp-btn"
              onClick={() => void useAuth.getState().removeAvatar()}
              style={sx("font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.45);cursor:pointer;align-self:flex-end;padding-bottom:6px")}
            >
              убрать
            </span>
          )}
          <div>
            <h1 className="dp-f46" style={sx("font:400 46px 'Spectral',Georgia,serif;margin:0 0 4px;line-height:1")}>Паспорт стиля</h1>
            <p style={sx("font:400 14.5px 'Inter',sans-serif;color:rgba(0,0,0,.55);margin:0")}>{displayName} · обновлён сегодня · ассистент опирается на него в каждом подборе</p>
          </div>
        </div>
        <div className="dp-pass-acts" style={sx("display:flex;align-items:center;gap:12px;flex:none")}>
          <span className="dp-btn" onClick={() => app.go("favorites")} style={sx("display:inline-flex;align-items:center;gap:9px;font:500 13.5px 'Inter',sans-serif;color:#000;background:#fff;border:1px solid rgba(0,0,0,.14);border-radius:999px;padding:11px 18px")}>
            <svg width="15" height="14" viewBox="0 0 15 14" fill="#000"><path d="M7.5 12.5S1.5 8.8 1.5 4.9C1.5 2.9 3 1.5 4.8 1.5c1.1 0 2.1.5 2.7 1.4.6-.9 1.6-1.4 2.7-1.4 1.8 0 3.3 1.4 3.3 3.4 0 3.9-6 7.6-6 7.6z"></path></svg>Избранное · {app.favIds.length}
          </span>
          <span className="dp-btn" onClick={() => void sharePassport()} style={sx("display:inline-flex;align-items:center;gap:9px;font:500 13.5px 'Inter',sans-serif;color:rgba(0,0,0,.6);background:#fff;border:1px solid rgba(0,0,0,.14);border-radius:999px;padding:11px 18px")}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="3.5" r="2"></circle><circle cx="4" cy="8" r="2"></circle><circle cx="12" cy="12.5" r="2"></circle><path d="M5.8 7l4.4-2.5M5.8 9l4.4 2.5"></path></svg>Поделиться
          </span>
        </div>
      </div>

      {/* STYLE DNA hero */}
      <div className="dp-pass-hero" style={sx("position:relative;background:#000;color:#F4F1EA;border-radius:20px;overflow:hidden;margin-bottom:26px")}>
        <div className="dp-irid" style={sx("position:absolute;top:-40%;right:-8%;width:440px;height:440px;border-radius:50%;filter:blur(20px);opacity:.5;-webkit-mask:radial-gradient(circle at 50% 50%,#000 30%,transparent 70%);mask:radial-gradient(circle at 50% 50%,#000 30%,transparent 70%);pointer-events:none")}></div>
        <div style={sx("position:relative")}>
          <div style={sx("display:flex;align-items:center;gap:8px;font:600 11px 'Inter',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,244,239,.55);margin-bottom:14px")}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.2 3.6L12 5.8 8.2 7 7 10.6 5.8 7 2 5.8l3.8-1.2z" fill="#a6b4fc"></path></svg>Ваш стиль-код
          </div>
          {styleCode ? (
            <>
              <div className="dp-style-code" style={sx("font:400 46px 'Spectral',Georgia,serif;font-style:italic;line-height:1.1;margin-bottom:10px")}>
                {styleCode.title}
              </div>
              {styleCode.body && (
                <p style={sx("font:400 14px/1.6 'Inter',sans-serif;color:rgba(246,244,239,.7);margin:0 0 22px;max-width:560px")}>{styleCode.body}</p>
              )}
              {/* Оси характера стиля — читаются, не редактируются: их ставит
                  модель по ответам, а не человек ползунком. */}
              <div className="dp-axes" style={sx("display:grid;grid-template-columns:1fr 1fr;gap:16px 34px;max-width:640px;margin-bottom:22px")}>
                {styleCode.axes.map((a) => (
                  <div key={a.key}>
                    <div style={sx("position:relative;height:4px;border-radius:999px;background:rgba(246,244,239,.16)")}>
                      <span style={sx(`position:absolute;top:50%;left:${a.value}%;transform:translate(-50%,-50%);width:11px;height:11px;border-radius:50%;background:#a6b4fc`)}></span>
                    </div>
                    <div style={sx("display:flex;justify-content:space-between;gap:10px;font:400 11px 'Inter',sans-serif;color:rgba(246,244,239,.5);padding-top:7px")}>
                      <span>{a.left}</span><span>{a.right}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="dp-style-code" style={sx("font:400 32px 'Spectral',Georgia,serif;font-style:italic;line-height:1.15;color:rgba(246,244,239,.45);margin-bottom:22px")}>
              Стиль-код ещё не собран
            </div>
          )}
          <div style={sx("display:flex;flex-wrap:wrap;gap:9px;max-width:640px")}>
            {styleTags.map((t) => (
              <span key={t} style={sx("font:400 13.5px 'Inter',sans-serif;background:rgba(246,244,239,.1);border:1px solid rgba(246,244,239,.16);color:#F4F1EA;border-radius:999px;padding:8px 15px")}>{t}</span>
            ))}
            <span className="dp-chip dp-btn" onClick={() => app.runSearch("Уточни мой стиль — задай пару вопросов")} style={sx("font:400 13.5px 'Inter',sans-serif;border:1px dashed rgba(246,244,239,.3);color:rgba(246,244,239,.8);border-radius:999px;padding:8px 15px;background:transparent;cursor:pointer")}>+ уточнить</span>
          </div>
          {/* Подпись обязана соответствовать тому, что выше: под «ещё не собран»
              стояло «Собрано из онбординга…» — два взаимоисключающих утверждения
              подряд. */}
          <p style={sx("font:400 13.5px 'Inter',sans-serif;color:rgba(246,244,239,.55);margin:22px 0 0;max-width:560px;line-height:1.6")}>
            {styleCode
              ? "Собрано из онбординга и того, что вы сохраняли и примеряли. Правьте в любой момент — следующая выдача учтёт правки."
              : "Соберётся, когда ассистент обработает ваши ответы. Пока показываем то, что вы указали сами."}
          </p>
        </div>
      </div>

      {/* FAVORITE BRANDS */}
      <div style={sx("background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:16px;padding:28px 30px;margin-bottom:26px")}>
        <div style={sx("display:flex;align-items:baseline;justify-content:space-between;margin-bottom:22px")}>
          <div style={sx("font:500 11px 'Inter',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(0,0,0,.5)")}>Любимые бренды</div>
          <div style={sx("display:flex;align-items:center;gap:18px")}>
            {loggedIn && (
              <span className="dp-btn" onClick={() => void refineTaste()} style={sx(`display:inline-flex;align-items:center;gap:7px;font:500 13px 'Inter',sans-serif;color:${refining ? "rgba(0,0,0,.4)" : "rgba(0,0,0,.6)"};cursor:pointer`)}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9"></path><path d="M13.5 2v3h-3"></path></svg>
                {refining ? "Обновляем…" : "Обновить мой вкус"}
              </span>
            )}
            <span className="dp-btn" onClick={() => app.runSearch("Бренды в моём стиле")} style={sx("font:500 13px 'Inter',sans-serif;color:#2B2BCC;cursor:pointer")}>Найти бренды →</span>
          </div>
        </div>
        {brandList.length === 0 && (
          <p style={sx("font:400 13.5px 'Inter',sans-serif;color:rgba(0,0,0,.45);margin:0 0 18px")}>
            Любимых брендов пока нет. Сохраняйте вещи и примеряйте — ассистент подтянет бренды сам, или добавьте вручную.
          </p>
        )}
        <div className="dp-r5" style={sx("display:grid;grid-template-columns:repeat(5,1fr);gap:20px")}>
          {brandList.map((b) => {
            const following = !app.unfollowed.includes(b.id);
            return (
              <div key={b.id} style={sx("display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center")}>
                <div
                  onClick={() => b.shop && app.openBrand(b.shop)}
                  className={b.shop ? "dp-prod dp-irid-ring" : "dp-irid-ring"}
                  title={b.shop ? `Открыть витрину ${b.name}` : "Витрины этого бренда у нас пока нет"}
                  style={sx(`width:78px;height:78px;border-radius:50%;background:${b.bg};display:flex;align-items:center;justify-content:center;font:600 18px 'Spectral',Georgia,serif;color:#000;cursor:${b.shop ? "pointer" : "default"}`)}
                >{b.mono}</div>
                <div style={sx("font:500 13px 'Inter',sans-serif;line-height:1.2")}>{b.name}</div>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    useApp.setState({
                      unfollowed: following ? app.unfollowed.concat(b.id) : app.unfollowed.filter((x) => x !== b.id),
                    });
                  }}
                  className="dp-btn"
                  style={sx(`font:600 10px 'Inter',sans-serif;letter-spacing:.06em;border-radius:999px;padding:6px 13px;background:${following ? "#000" : "#fff"};color:${following ? "#fff" : "#000"};border:1px solid ${following ? "#000" : "rgba(0,0,0,.2)"}`)}
                >
                  {following ? "ВЫ ПОДПИСАНЫ" : "ПОДПИСАТЬСЯ"}
                </span>
              </div>
            );
          })}
          <div onClick={() => app.runSearch("Бренды в моём стиле")} className="dp-prod" style={sx("cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center")}>
            <div style={sx("width:78px;height:78px;border-radius:50%;border:1.5px dashed rgba(0,0,0,.22);display:flex;align-items:center;justify-content:center;font:400 26px 'Inter',sans-serif;color:rgba(0,0,0,.5)")}>+</div>
            <div style={sx("font:500 13px 'Inter',sans-serif;color:rgba(0,0,0,.55)")}>Ещё бренд</div>
          </div>
        </div>
      </div>

      {/* Блок «На кого равняетесь» убран: поля в паспорте нет, сохранить
          выбор некуда, а «Ирина Г./Рената Л.» были выдуманы. Вернём, когда
          заведём под это данные. */}

      {/* BUDGET + SIZES */}
      <div className="dp-c-budget" style={sx("display:grid;grid-template-columns:1.35fr 1fr;gap:26px;margin-bottom:26px")}>
        <div style={sx("background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:16px;padding:28px 30px")}>
          <div style={sx("font:500 11px 'Inter',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(0,0,0,.5);margin-bottom:24px")}>Бюджет гардероба</div>
          <div style={sx("display:flex;flex-direction:column;gap:22px")}>
            {budgetRows.map(({ key, label: cat, steps }) => {
              const i = bgIdx[key] ?? 2;
              const pct = Math.round(((i + 1) / steps.length) * 100) + "%";
              return (
                <div key={key} className="dp-prod" onClick={() => { const next = { ...bgIdx, [key]: (i + 1) % steps.length }; setBgIdx(next); persistBudget(next); }} style={sx("cursor:pointer")}>
                  <div style={sx("display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px")}>
                    <span style={sx("font:400 15px 'Inter',sans-serif;color:rgba(0,0,0,.7)")}>{cat}</span>
                    <span style={sx("font:500 15px 'Inter',monospace")}>{steps[i]}</span>
                  </div>
                  <div style={sx("height:6px;border-radius:999px;background:#ECE9E0;position:relative")}>
                    <span style={sx(`position:absolute;left:0;top:0;bottom:0;width:${pct};background:#2B2BCC;border-radius:999px`)}></span>
                    <span style={sx(`position:absolute;left:${pct};top:50%;transform:translate(-50%,-50%);width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid #2B2BCC;box-shadow:0 1px 4px rgba(43,43,204,.35)`)}></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={sx("background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:16px;padding:28px 30px")}>
          <div style={sx("font:500 11px 'Inter',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(0,0,0,.5);margin-bottom:20px")}>Размеры</div>
          <div style={sx("display:flex;flex-direction:column")}>
            {sizeRows.map(([cat, key]) => {
              const i = szIdx[key];
              return (
                <div key={key} className="dp-prod" onClick={() => { const next = { ...szIdx, [key]: (i + 1) % SIZES[key].length }; setSzIdx(next); persistSizes(next); }} style={sx("cursor:pointer;display:flex;justify-content:space-between;align-items:center;font:400 15px 'Inter',sans-serif;padding:13px 0;border-top:1px solid rgba(0,0,0,.07)")}>
                  <span style={sx("color:rgba(0,0,0,.6)")}>{cat}</span>
                  <span style={sx("display:flex;align-items:center;gap:8px")}>
                    <span style={sx("font-family:'Inter',monospace")}>{SIZES[key][i]}</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="1.5"><path d="M5 3l4 4-4 4"></path></svg>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CONSENT — реальный журнал согласий + удаление биометрии (152-ФЗ).
          Примерку ведёт встроенный виджет со своим согласием; здесь остаётся
          право на просмотр и удаление данных, собранных платформой. */}
      {loggedIn && (
        <div style={sx("background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:16px;padding:26px 30px;margin-top:26px")}>
          <div style={sx("font:500 11px 'Inter',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(0,0,0,.5);margin-bottom:18px")}>Согласия и биометрия · 152-ФЗ</div>
          {consents.length === 0 ? (
            <p style={sx("font:400 13.5px 'Inter',sans-serif;color:rgba(0,0,0,.5);margin:0 0 20px")}>Согласий пока нет.</p>
          ) : (
            <div style={sx("display:flex;flex-direction:column;gap:10px;margin-bottom:22px")}>
              {consents.map((c, i) => (
                <div key={i} style={sx("display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 0;border-top:1px solid rgba(0,0,0,.07)")}>
                  <div>
                    <div style={sx("font:500 14px 'Inter',sans-serif")}>{c.kind}{c.version ? ` · v${c.version}` : ""}</div>
                    <div style={sx("font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.45)")}>{c.created_at}</div>
                  </div>
                  <span style={sx(`font:600 10px 'Inter',sans-serif;letter-spacing:.06em;border-radius:999px;padding:6px 13px;background:${c.granted ? "rgba(63,122,78,.12)" : "rgba(0,0,0,.06)"};color:${c.granted ? "#3F7A4E" : "rgba(0,0,0,.5)"}`)}>{c.granted ? "ВЫДАНО" : "ОТОЗВАНО"}</span>
                </div>
              ))}
            </div>
          )}
          {!confirmDel ? (
            <span className="dp-btn" onClick={() => setConfirmDel(true)} style={sx("display:inline-flex;align-items:center;gap:9px;font:500 13.5px 'Inter',sans-serif;color:#C0392B;background:#fff;border:1px solid rgba(192,57,43,.35);border-radius:999px;padding:11px 18px")}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#C0392B" strokeWidth="1.6" strokeLinecap="round"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"></path></svg>Удалить биометрические данные
            </span>
          ) : (
            <div style={sx("display:flex;align-items:center;gap:12px;flex-wrap:wrap")}>
              <span style={sx("font:400 13.5px 'Inter',sans-serif;color:rgba(0,0,0,.7)")}>Удалить безвозвратно?</span>
              <span className="dp-btn" onClick={() => void deleteBiometric()} style={sx("font:600 12px 'Inter',sans-serif;color:#fff;background:#C0392B;border-radius:999px;padding:9px 18px")}>Да, удалить</span>
              <span className="dp-btn" onClick={() => setConfirmDel(false)} style={sx("font:500 12px 'Inter',sans-serif;color:rgba(0,0,0,.6);background:#fff;border:1px solid rgba(0,0,0,.2);border-radius:999px;padding:9px 18px")}>Отмена</span>
            </div>
          )}
        </div>
      )}

      {/* Выход переехал сюда из шапки: в хедере он стоял рядом с именем и
          отвлекал на каждом экране, а нужен раз в сто заходов. */}
      <div style={sx("display:flex;justify-content:center;padding:34px 0 8px")}>
        <span className="dp-btn" onClick={() => void useAuth.getState().logout()} style={sx("display:inline-flex;align-items:center;gap:8px;font:500 13.5px 'Inter',sans-serif;color:rgba(0,0,0,.55);background:#fff;border:1px solid rgba(0,0,0,.14);border-radius:999px;padding:11px 22px")}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="rgba(0,0,0,.55)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 14H3.5A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2H6M10.5 11 14 8l-3.5-3M14 8H6"></path></svg>
          Выйти из аккаунта
        </span>
      </div>
    </div>
  );
}
