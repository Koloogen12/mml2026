import { useEffect, useState } from "react";
import { sx } from "../sx";
import { useApp } from "../appStore";
import { useAuth, type PassportPrefs } from "../authStore";
import { imgOf } from "../product-utils";
import { Logo } from "../components/Logo";
// Всё, что зависит от пола, — из общего словаря: три копии уже разъезжались.
import { PRESETS, SIZES, type Gender } from "../wardrobe";

/*
 * Онбординг — порт hi-fi макета "Onboarding Desktop.dc.html" (контракт 1:1).
 * Разметка / классы / inline-стили — дословно, dc-runtime → React-стейт,
 * canned demo → реальный API (authStore), placeholder-картинки → каталог.
 * Отличия от макета (санкционированы задачей):
 *   • Шаг 5 — вход по EMAIL, не по телефону (решение основателя). Один email-инпут.
 *   • OTP — 6 ячеек (реальный код бэка 6-значный; в макете было 5).
 *   • Копия «код из SMS» → «код из письма».
 *   • Martina Plantijn → Spectral.
 */

// Бренды — из справочника вкуса (/taste-brands), а не вшитый список и НЕ наш
// каталог. «Любимые бренды» — сигнал вкуса: человек носит Burberry, наша
// задача понять вкус и показать аналог, а не молчать, потому что Burberry у нас
// нет. Наличие решает разметка аналогов, а не этот шаг.
interface OnbBrand { id: string; mono: string; name: string; grade: string }
const monoOf = (name: string) =>
  (name.replace(/[^A-Za-zА-Яа-я0-9]/g, "").slice(0, 2) || "•").toUpperCase();

const LIFE_OPTS = ["редко", "иногда", "часто"];
const TOTAL = 6;
const AUTH = 5;

/*
 * Черновик ответов в localStorage.
 *
 * Вход через Google/Яндекс — это window.location.href, то есть полный уход со
 * страницы: весь useState умирает вместе с вкладкой, и человек возвращался в
 * пустой онбординг, потеряв все ответы. Код по почте этим не страдал, потому
 * что остаётся на странице.
 *
 * Поэтому перед уходом к провайдеру ответы складываем сюда, а на возврате
 * (сессия уже есть, паспорта ещё нет) — молча дописываем паспорт и уводим
 * человека на главную. Переспрашивать то, что он уже ответил, нельзя.
 */
const OB_DRAFT = "mml_ob_draft";

interface Draft {
  step: number; gender: Gender; name: string;
  life: Record<string, string>; aesthetics: string[]; brands: string[];
  sizes: Record<string, string>; budget: number;
}

const readDraft = (): Draft | null => {
  try {
    const raw = localStorage.getItem(OB_DRAFT);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;                 // повреждённый черновик не должен ронять вход
  }
};
const dropDraft = () => {
  try { localStorage.removeItem(OB_DRAFT); } catch { /* noop */ }
};

const money = (n: number) => n.toLocaleString("ru-RU").replace(/,/g, " ") + " ₽";
const emailOk = (v: string) => /.+@.+\..+/.test(v.trim());

export function Onboarding() {
  const catalog = useApp((s) => s.catalog);
  const showToast = useApp((s) => s.showToast);

  // Читаем один раз при монтировании: после возврата от провайдера стейт
  // поднимается из черновика, а не с нуля.
  const [draft] = useState<Draft | null>(() => readDraft());
  const accessToken = useAuth((st) => st.accessToken);

  const [step, setStep] = useState(draft?.step ?? 0);
  const [gender, setGenderState] = useState<Gender>(draft?.gender ?? "women");
  // Пол переключает не только вопросы, но и витрину: полоса товаров на шаге
  // входа берётся из каталога, а он фильтруется полом на уровне приложения.
  // Ответы прошлого пола сбрасываем — «46 / L» женского верха не равен мужскому,
  // а «Бохо» в мужском наборе просто нет.
  const setGender = (g: Gender) => {
    if (g === gender) return;
    setGenderState(g);
    setAesthetics([]);
    setSizes({ Верх: "", Низ: "", Обувь: "" });
    useApp.getState().setGender(g);
  };
  const [name, setName] = useState(draft?.name ?? "");
  const [email, setEmail] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [allBrands, setAllBrands] = useState<OnbBrand[]>([]);
  const [life, setLife] = useState<Record<string, string>>(draft?.life ?? { Работа: "", Повседневное: "", "Выход в свет": "" });
  const [aesthetics, setAesthetics] = useState<string[]>(draft?.aesthetics ?? []);
  const [brands, setBrands] = useState<string[]>(draft?.brands ?? []);
  const [sizes, setSizes] = useState<Record<string, string>>(draft?.sizes ?? { Верх: "", Низ: "", Обувь: "" });
  const [budget, setBudget] = useState(draft?.budget ?? 15000);

  const [otpMode, setOtpMode] = useState(false);
  const [code, setCode] = useState("");
  const [codeErr, setCodeErr] = useState(false);
  const [codeExpired, setCodeExpired] = useState(false);
  const [resendIn, setResendIn] = useState(59);
  const [resendNonce, setResendNonce] = useState(0);
  const [reqErr, setReqErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Обратный отсчёт «отправить код повторно» (59с → 0), как в макете.
  // Бренды под выбранный пол: женщине незачем предлагать мужские марки.
  useEffect(() => {
    void (async () => {
      try {
        const g = gender === "men" ? "male" : "female";
        const res = await fetch(`/api/v1/taste-brands?gender=${g}`);
        if (!res.ok) return;
        const d = (await res.json()) as { items: Array<{ name: string; grade: string }> | null };
        setAllBrands((d.items ?? []).map((b) => ({ id: b.name, mono: monoOf(b.name), name: b.name, grade: b.grade })));
      } catch {
        setAllBrands([]); // не доехало — покажем честную пустоту, а не выдумку
      }
    })();
  }, [gender]);

  useEffect(() => {
    if (!otpMode) return;
    setResendIn(59);
    setCodeExpired(false);
    const t = setInterval(() => {
      setResendIn((v) => {
        if (v <= 1) {
          clearInterval(t);
          setCodeExpired(true);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [otpMode, resendNonce]);

  // Плитки стилей — снятые под каждый пол кадры, а не первые попавшиеся товары
  // каталога (так было в макете-заглушке: мужчине показывало женские платья).
  const styleImg = (g: Gender, key: string) => `/app/onboarding/${g}-${key}.jpg`;
  const catalogImg = (i: number) => imgOf(catalog[i] ?? ({ images: [] } as never)) || "";

  // Уход к провайдеру убивает вкладку — складываем ответы до, а не после.
  const goOAuth = (provider: "google" | "yandex") => {
    try {
      localStorage.setItem(OB_DRAFT, JSON.stringify({ step, gender, name, life, aesthetics, brands, sizes, budget }));
    } catch {
      /* приватный режим — переживём, просто спросим заново */
    }
    window.location.href = `/api/v1/auth/oauth/${provider}/start`;
  };


  const skip = () => {
    dropDraft();
    useAuth.getState().finishOnboarding();
    useApp.getState().go("home");
  };

  const next = () => {
    if (step < AUTH) setStep(step + 1);
  };
  const back = () => {
    if (step > 0) setStep(Math.max(0, step - 1));
  };

  const buildPrefs = (): PassportPrefs => {
    const size: Record<string, string> = {};
    if (sizes["Верх"]) size.top = sizes["Верх"];
    if (sizes["Низ"]) size.bottom = sizes["Низ"];
    if (sizes["Обувь"]) size.shoe = sizes["Обувь"];
    const life_alloc: Record<string, string> = {};
    for (const [k, v] of Object.entries(life)) if (v) life_alloc[k] = v;
    return {
      for_whom: gender,
      display_name: name.trim(),
      style_persona_blend: aesthetics,
      brands_love: brands,
      budget_by_category: { item: budget },
      size_by_category: size,
      lifestyle_allocation: life_alloc,
    };
  };

  // Вернулись от провайдера: сессия есть, паспорта нет, ответы лежат в черновике
  // → дописываем паспорт и уходим на главную, ничего не переспрашивая.
  // Стоит ПОСЛЕ buildPrefs: эффект на него ссылается, и объявление обязано быть
  // выше по файлу, а не «случайно работать» из-за порядка выполнения.
  const [resuming, setResuming] = useState(false);
  useEffect(() => {
    if (!draft || resuming || !accessToken) return;   // ещё гость — обычный онбординг
    setResuming(true);
    void (async () => {
      await useAuth.getState().savePassport(buildPrefs());
      useAuth.setState({ onboardingName: draft.name.trim() });
      dropDraft();
      useAuth.getState().finishOnboarding();
      useApp.getState().go("home");
      showToast("Профиль сохранён — лента собрана ✨");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, accessToken, resuming]);

  const enterOtp = async () => {
    setReqErr("");
    setBusy(true);
    const r = await useAuth.getState().requestCode(email.trim());
    setBusy(false);
    if (!r.ok) {
      setReqErr(r.error ?? "Не удалось отправить код");
      return;
    }
    setCode("");
    setCodeErr(false);
    setOtpMode(true);
  };

  const authSubmit = () => {
    if (!emailOk(email) || busy) return;
    void enterOtp();
  };

  const verifyCode = async () => {
    if (code.length < 6 || busy) return;
    setBusy(true);
    const r = await useAuth.getState().verify(email.trim(), code);
    if (!r.ok) {
      setBusy(false);
      setCodeErr(true);
      return;
    }
    await useAuth.getState().savePassport(buildPrefs());
    useAuth.setState({ onboardingName: name.trim() });
    dropDraft();
    setBusy(false);
    useAuth.getState().finishOnboarding();
    useApp.getState().go("home");
    showToast("Профиль сохранён — лента собрана ✨");
  };

  const resend = () => {
    if (resendIn > 0) return;
    setReqErr("");
    void useAuth.getState().requestCode(email.trim());
    setCode("");
    setCodeErr(false);
    setResendNonce((n) => n + 1);
  };

  const backToEmail = () => setOtpMode(false);

  const seg = (active: boolean) => ({ bg: active ? "#000" : "transparent", color: active ? "#fff" : "rgba(0,0,0,.6)" });
  const canNext = step === 0 ? !!name.trim() : step === 2 ? aesthetics.length > 0 : true;
  const labels = ["Далее", "Далее", "Далее", "Сохранить бренды", "Далее"];
  const nextLabel = labels[step] || "Далее";
  const nextBg = canNext ? "#000" : "rgba(0,0,0,.12)";
  const nextColor = canNext ? "#fff" : "rgba(0,0,0,.4)";
  const progressPct = Math.round(((step + 1) / TOTAL) * 100) + "%";

  const filteredBrands = allBrands.filter((b) => !brandSearch || b.name.toLowerCase().includes(brandSearch.toLowerCase()));

  const authReady = emailOk(email);
  const cells = [0, 1, 2, 3, 4, 5].map((i) => {
    const ch = code[i] || "";
    const active = i === code.length && !codeErr;
    const border = codeErr ? "#C0392B" : active ? "#2B2BCC" : ch ? "rgba(0,0,0,.35)" : "rgba(0,0,0,.16)";
    const bg = codeErr ? "#FDEEEC" : active ? "rgba(43,43,204,.05)" : "#fff";
    return { ch, border, bg };
  });

  return (
    <div style={sx("min-height:100vh;display:flex;flex-direction:column;background:#fff")}>
      {/* header: logo + progress */}
      <div className="ob-head" style={sx("padding:26px 40px 0;display:flex;flex-direction:column;align-items:center;gap:22px")}>
        <div style={sx("color:#000")}>
          <Logo width={150} height={25} />
        </div>
        <div style={sx("width:100%;max-width:760px;display:flex;align-items:center;gap:16px")}>
          {step > 0 && (
            <span onClick={back} className="ob-btn" style={sx("display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:999px;border:1px solid rgba(0,0,0,.14);flex:none")}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="#000" strokeWidth="1.6" strokeLinecap="round"><path d="M9 3L4.5 7.5 9 12"></path></svg>
            </span>
          )}
          <div style={sx("flex:1;height:4px;border-radius:999px;background:#F0F0F0;overflow:hidden")}>
            <div style={sx(`height:100%;background:#000;border-radius:999px;width:${progressPct};transition:width .4s cubic-bezier(.2,.7,.2,1)`)}></div>
          </div>
          <span style={sx("font:500 12px 'Inter',sans-serif;color:rgba(0,0,0,.5);white-space:nowrap")}>Шаг {step + 1} из {TOTAL}</span>
          <span onClick={skip} className="ob-btn" style={sx("font:500 13px 'Inter',sans-serif;color:rgba(0,0,0,.4)")}>Пропустить</span>
        </div>
      </div>

      {/* content */}
      <div className="ob-content" style={sx("flex:1;display:flex;flex-direction:column;align-items:center;padding:48px 40px 40px")}>
        <div style={sx("width:100%;max-width:760px")}>

          {/* STEP 0 · INTRO */}
          {step === 0 && (
            <div className="ob-fade">
              <h1 style={sx("margin:0 0 10px;font:400 44px/1.08 'Spectral',Georgia,serif;letter-spacing:-.015em")}>Давайте познакомимся</h1>
              <p style={sx("margin:0 0 32px;font:400 14px 'Inter',sans-serif;color:#737373")}>Пара деталей — и соберём вашу ленту.</p>
              <div style={sx("font:700 11px 'Inter',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#737373;margin-bottom:12px")}>Как вас зовут</div>
              <input className="ob-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" style={sx("width:100%;border:1px solid rgba(0,0,0,.16);border-radius:14px;padding:18px 20px;font:400 18px 'Spectral',Georgia,serif;outline:none;margin-bottom:28px")} />
              <div style={sx("font:700 11px 'Inter',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#737373;margin-bottom:12px")}>Вы покупаете</div>
              <div style={sx("display:inline-flex;background:#F0F0F0;border-radius:999px;padding:4px")}>
                {[{ label: "Женское", key: "women" }, { label: "Мужское", key: "men" }].map((g) => (
                  <span key={g.key} onClick={() => setGender(g.key as "women" | "men")} className="ob-seg" style={sx(`padding:11px 34px;border-radius:999px;font:500 14px 'Inter',sans-serif;background:${gender === g.key ? "#000" : "transparent"};color:${gender === g.key ? "#fff" : "rgba(0,0,0,.6)"}`)}>{g.label}</span>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1 · LIFESTYLE */}
          {step === 1 && (
            <div className="ob-fade">
              <h1 style={sx("margin:0 0 10px;font:400 44px/1.08 'Spectral',Georgia,serif;letter-spacing:-.015em")}>Расскажите, как проходит ваша неделя</h1>
              <p style={sx("margin:0 0 30px;font:400 14px 'Inter',sans-serif;color:#737373")}>Это задаёт, чего в гардеробе должно быть больше.</p>
              <div style={sx("font:700 11px 'Inter',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#737373;margin-bottom:14px")}>Сколько времени занимает</div>
              <div style={sx("display:flex;flex-direction:column;gap:12px")}>
                {Object.keys(life).map((cat) => (
                  // gap+flex-wrap вместо space-between: длинная подпись
                  // («Повседневное») выдавливала переключатель за экран —
                  // на 375px страница уезжала в горизонтальный скролл.
                  <div key={cat} className="ob-life" style={sx("display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border:1px solid #E0E0E0;border-radius:14px;padding:18px 20px")}>
                    <span style={sx("font:400 18px 'Spectral',Georgia,serif")}>{cat}</span>
                    <div style={sx("display:inline-flex;flex:none;background:#F4F1EA;border-radius:999px;padding:3px")}>
                      {LIFE_OPTS.map((o) => {
                        const c = seg(life[cat] === o);
                        return <span key={o} onClick={() => setLife((st) => ({ ...st, [cat]: o }))} className="ob-seg" style={sx(`padding:8px 16px;border-radius:999px;font:500 13px 'Inter',sans-serif;background:${c.bg};color:${c.color}`)}>{o}</span>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2 · AESTHETICS */}
          {step === 2 && (
            <div className="ob-fade">
              <h1 style={sx("margin:0 0 10px;font:400 44px/1.08 'Spectral',Georgia,serif;letter-spacing:-.015em")}>Какой стиль вам ближе?</h1>
              <p style={sx("margin:0 0 28px;font:400 14px 'Inter',sans-serif;color:#737373")}>Выберите 1–3 — ассистент будет искать в этом настроении.</p>
              <div className="ob-grid3" style={sx("display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px")}>
                {PRESETS[gender].map((p) => {
                  const on = aesthetics.indexOf(p.name) >= 0;
                  return (
                    <div
                      key={p.name}
                      onClick={() =>
                        setAesthetics((arr) => {
                          const has = arr.indexOf(p.name) >= 0;
                          if (has) return arr.filter((x) => x !== p.name);
                          if (arr.length < 3) return arr.concat(p.name);
                          return arr;
                        })
                      }
                      className="ob-card"
                      style={sx(`position:relative;border-radius:4px;overflow:hidden;height:260px;outline:${on ? "2px solid #2B2BCC" : "2px solid transparent"};outline-offset:-2px`)}
                    >
                      <div style={sx(`position:absolute;inset:0;background-image:url('${styleImg(gender, p.img)}');background-size:cover;background-position:center;background-color:#F4F1EA`)}></div>
                      <div style={sx("position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.55),transparent 55%)")}></div>
                      {on && (
                        <span style={sx("position:absolute;top:12px;right:12px;width:26px;height:26px;border-radius:999px;background:#2B2BCC;display:flex;align-items:center;justify-content:center")}>
                          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.5L5 9l4.5-5.5"></path></svg>
                        </span>
                      )}
                      <div style={sx("position:absolute;left:0;right:0;bottom:0;padding:16px;color:#fff")}>
                        <div style={sx("font:400 20px 'Spectral',Georgia,serif")}>{p.name}</div>
                        <div style={sx("font:400 12px 'Inter',sans-serif;color:rgba(255,255,255,.8)")}>{p.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3 · BRANDS */}
          {step === 3 && (
            <div className="ob-fade">
              <div style={sx("font:700 11px 'Inter',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#737373;margin-bottom:10px")}>Бренды</div>
              <h1 style={sx("margin:0 0 8px;font:400 44px/1.08 'Spectral',Georgia,serif;letter-spacing:-.015em")}>Какие бренды в вашей ротации?</h1>
              <p style={sx("margin:0 0 26px;font:400 14px 'Inter',sans-serif;color:#737373")}>Что носите и что хотите. Отметьте всё — добавим в ленту и покажем новые.</p>
              <div className="ob-grid3" style={sx("display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px")}>
                {filteredBrands.map((b) => {
                  const on = brands.indexOf(b.id) >= 0;
                  return (
                    <div key={b.id} onClick={() => setBrands((st) => (st.indexOf(b.id) >= 0 ? st.filter((x) => x !== b.id) : st.concat(b.id)))} className="ob-brand" style={sx(`display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid ${on ? "#2B2BCC" : "rgba(0,0,0,.12)"};border-radius:14px;background:#fff`)}>
                      <div style={sx("width:36px;height:36px;border-radius:999px;background:#F4F1EA;display:flex;align-items:center;justify-content:center;font:600 12px 'Spectral',Georgia,serif;color:#000;flex:none")}>{b.mono}</div>
                      <span style={sx("flex:1;font:500 13px 'Inter',sans-serif;line-height:1.2")}>{b.name}</span>
                      <span style={sx(`width:24px;height:24px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;background:${on ? "#2B2BCC" : "#fff"};border:1.5px solid ${on ? "#2B2BCC" : "rgba(0,0,0,.2)"}`)}>
                        {on && <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.5L5 9l4.5-5.5"></path></svg>}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={sx("position:relative;margin-top:22px")}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="rgba(0,0,0,.4)" strokeWidth="1.6" style={sx("position:absolute;left:20px;top:50%;transform:translateY(-50%)")}><circle cx="8.5" cy="8.5" r="6"></circle><path d="M17 17l-4-4" strokeLinecap="round"></path></svg>
                <input className="ob-input" value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} placeholder="Найти или добавить любой бренд…" style={sx("width:100%;border:1px solid rgba(0,0,0,.16);border-radius:999px;padding:15px 20px 15px 48px;font:400 15px 'Inter',sans-serif;outline:none")} />
              </div>
            </div>
          )}

          {/* STEP 4 · SIZES + BUDGET */}
          {step === 4 && (
            <div className="ob-fade">
              <h1 style={sx("margin:0 0 10px;font:400 44px/1.08 'Spectral',Georgia,serif;letter-spacing:-.015em")}>Размеры и бюджет</h1>
              <p style={sx("margin:0 0 30px;font:400 14px 'Inter',sans-serif;color:#737373")}>Чтобы показывать только то, что подойдёт и по карману.</p>
              <div style={sx("display:flex;flex-direction:column;gap:22px;margin-bottom:34px")}>
                {["Верх", "Низ", "Обувь"].map((cat) => (
                  <div key={cat} style={sx("display:flex;align-items:center;justify-content:space-between")}>
                    <span style={sx("font:400 18px 'Spectral',Georgia,serif")}>{cat}</span>
                    <div style={sx("display:inline-flex;gap:8px")}>
                      {SIZES[gender][cat].map((o) => {
                        const a = sizes[cat] === o;
                        return <span key={o} onClick={() => setSizes((st) => ({ ...st, [cat]: o }))} className="ob-seg" style={sx(`min-width:54px;text-align:center;padding:10px 14px;border-radius:10px;font:500 14px 'Inter',sans-serif;border:1px solid ${a ? "#000" : "rgba(0,0,0,.16)"};background:${a ? "#000" : "#fff"};color:${a ? "#fff" : "rgba(0,0,0,.8)"}`)}>{o}</span>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div style={sx("border-top:1px solid #E0E0E0;padding-top:26px")}>
                <div style={sx("display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px")}>
                  <span style={sx("font:400 18px 'Spectral',Georgia,serif")}>Комфортный бюджет за вещь</span>
                  <span style={sx("font:600 20px 'Inter',sans-serif;color:#2B2BCC")}>до {money(budget)}</span>
                </div>
                {/* До 150 000: потолок в 40 000 не покрывал даже медиану женской
                    витрины (113 000) — выставить реальный бюджет было нечем. */}
                <input type="range" min={3000} max={150000} step={budget < 30000 ? 1000 : 5000} value={budget} onChange={(e) => setBudget(parseInt(e.target.value, 10))} style={sx("width:100%;accent-color:#2B2BCC;height:6px;cursor:pointer")} />
                <div style={sx("display:flex;justify-content:space-between;font:400 11.5px 'Inter',sans-serif;color:rgba(0,0,0,.4);padding-top:6px")}>
                  <span>3 000 ₽</span><span>150 000 ₽+</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5 · AUTH (email-код) */}
          {step === 5 && (
            <div className="ob-fade">
              {!otpMode && (
                <>
                  <div style={sx("font:700 11px 'Inter',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#737373;margin-bottom:10px")}>Сохраните профиль</div>
                  <h1 style={sx("margin:0 0 24px;font:400 44px/1.08 'Spectral',Georgia,serif;letter-spacing:-.015em")}>Закрепите предпочтения.</h1>
                  <div style={sx("display:flex;gap:10px;overflow:hidden;margin-bottom:30px")}>
                    {[0, 1, 2, 3, 4].map((i) => {
                      const p = catalog[i];
                      return (
                        <div key={i} style={sx("flex:none;width:150px;height:190px;border-radius:6px;overflow:hidden;position:relative;background:#F4F1EA")}>
                          <div style={sx(`position:absolute;inset:0;background-image:url('${catalogImg(i)}');background-size:cover;background-position:center`)}></div>
                          <span style={sx("position:absolute;left:10px;bottom:10px;font:700 9px 'Inter',sans-serif;letter-spacing:.06em;background:#fff;border-radius:999px;padding:5px 11px")}>{p?.brand?.name ?? "MakeMeLook"}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={sx("display:flex;gap:16px;margin-bottom:22px")}>
                    <span className="ob-btn" onClick={() => goOAuth("google")} style={sx("flex:1;height:56px;border-radius:999px;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font:600 15px 'Inter',sans-serif")}>
                      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"></path><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"></path><path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"></path><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.9 35.9 44 30.4 44 24c0-1.3-.1-2.3-.4-3.5z"></path></svg>Google
                    </span>
                    <span className="ob-btn" onClick={() => goOAuth("yandex")} style={sx("flex:1;height:56px;border-radius:999px;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;gap:8px;font:600 15px 'Inter',sans-serif")}>
                      <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#FC3F1D" /><path d="M13.3 6.4h-1.2c-2.1 0-3.6 1.3-3.6 3.3 0 1.4.6 2.3 1.8 3l-2.1 3.6h1.6l1.9-3.3h.9v3.3h1.4V6.4h-.7zm-.7 5.4h-.6c-1 0-1.7-.5-1.7-1.6 0-1.1.6-1.6 1.6-1.6h.7v3.2z" fill="#fff" /></svg>Яндекс ID
                    </span>
                  </div>
                  <div style={sx("display:flex;align-items:center;gap:16px;margin-bottom:24px")}><div style={sx("flex:1;height:1px;background:#E0E0E0")}></div><span style={sx("font:600 12px 'Inter',sans-serif;color:#737373")}>ИЛИ</span><div style={sx("flex:1;height:1px;background:#E0E0E0")}></div></div>
                  <div style={sx("font:700 11px 'Inter',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#737373;margin-bottom:10px")}>Электронная почта</div>
                  <input className="ob-input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setReqErr(""); }} placeholder="you@email.com" inputMode="email" style={sx("width:100%;border:1px solid rgba(0,0,0,.16);border-radius:12px;padding:16px 18px;font:400 15px 'Inter',sans-serif;outline:none;margin-bottom:24px")} />
                  <div style={sx("border-top:1px solid #E0E0E0;padding-top:20px;display:flex;justify-content:flex-end")}>
                    <span onClick={authSubmit} className="ob-btn" style={sx(`display:inline-flex;align-items:center;gap:9px;font:500 15px 'Inter',sans-serif;color:${authReady ? "#fff" : "rgba(0,0,0,.4)"};background:${authReady ? "#000" : "rgba(0,0,0,.12)"};border-radius:999px;padding:15px 30px`)}>{busy ? "Отправляем…" : "Продолжить"} <span style={sx("font-size:16px")}>→</span></span>
                  </div>
                  {reqErr && <div style={sx("margin-top:14px;font:500 13px 'Inter',sans-serif;color:#C0392B")}>{reqErr}</div>}
                  <p style={sx("margin:18px 0 0;font:400 12px/1.6 'Inter',sans-serif;color:#737373")}>Продолжая, вы соглашаетесь с <a href="https://makemelook.ai/legal/terms.html" target="_blank" rel="noopener" style={sx("font-weight:600;color:rgba(0,0,0,.8)")}>Условиями сервиса</a> и подтверждаете, что прочитали нашу <a href="https://makemelook.ai/legal/privacy.html" target="_blank" rel="noopener" style={sx("font-weight:600;color:rgba(0,0,0,.8)")}>Политику конфиденциальности</a>. Данные под защитой 152-ФЗ.</p>
                </>
              )}

              {otpMode && (
                <>
                  <span onClick={backToEmail} style={sx("display:inline-flex;align-items:center;gap:7px;font:500 13px 'Inter',sans-serif;color:#737373;cursor:pointer;margin-bottom:18px")}><svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="#737373" strokeWidth="1.7" strokeLinecap="round"><path d="M11 3.5L6 9l5 5.5"></path></svg>Изменить почту</span>
                  <div style={sx("font:700 11px 'Inter',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#737373;margin-bottom:10px")}>Подтверждение</div>
                  <h1 style={sx("margin:0 0 14px;font:400 44px/1.08 'Spectral',Georgia,serif;letter-spacing:-.015em")}>Введите код из письма.</h1>
                  <p style={sx("margin:0 0 4px;font:400 15px/1.55 'Inter',sans-serif;color:#737373")}>Отправили 6-значный код на <b style={sx("font-weight:600;color:#16150F")}>{email.trim()}</b></p>
                  <div style={sx("position:relative;width:fit-content;margin:26px 0 0")}>
                    <input value={code} onChange={(e) => { setCode((e.target.value || "").replace(/\D/g, "").slice(0, 6)); setCodeErr(false); }} inputMode="numeric" maxLength={6} autoFocus style={sx("position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:text;border:0")} />
                    <div style={sx("display:flex;gap:12px;pointer-events:none")}>
                      {cells.map((c, i) => (
                        <div key={i} style={sx(`width:60px;height:72px;border:2px solid ${c.border};border-radius:14px;display:flex;align-items:center;justify-content:center;font:400 32px 'Spectral',Georgia,serif;color:#16150F;background:${c.bg}`)}>{c.ch}</div>
                      ))}
                    </div>
                  </div>
                  {codeErr && (
                    <div style={sx("margin-top:16px;display:flex;align-items:center;gap:8px;font:500 13.5px 'Inter',sans-serif;color:#C0392B")}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#C0392B" strokeWidth="1.7"><circle cx="8" cy="8" r="6.5"></circle><path d="M8 4.5v4M8 11h.01" strokeLinecap="round"></path></svg>Неверный код. Проверьте письмо и попробуйте снова.</div>
                  )}
                  {codeExpired && (
                    <div style={sx("margin-top:14px;font:400 13px 'Inter',sans-serif;color:#B7791F")}>Срок действия кода истёк — запросите новый.</div>
                  )}
                  <div style={sx("margin-top:22px;font:400 13.5px 'Inter',sans-serif;color:#737373")}>{resendIn > 0 ? "Запросить код повторно можно через 0:" + String(resendIn).padStart(2, "0") : "Не пришёл код?"} {resendIn === 0 && <span onClick={resend} style={sx("color:#2B2BCC;font-weight:600;cursor:pointer;text-decoration:underline")}>Отправить повторно</span>}</div>
                  <div style={sx("border-top:1px solid #E0E0E0;margin-top:26px;padding-top:20px;display:flex;justify-content:flex-end")}>
                    <span onClick={verifyCode} className="ob-btn" style={sx(`display:inline-flex;align-items:center;gap:9px;font:500 15px 'Inter',sans-serif;color:${code.length === 6 ? "#fff" : "rgba(0,0,0,.4)"};background:${code.length === 6 ? "#000" : "rgba(0,0,0,.12)"};border-radius:999px;padding:15px 30px`)}>{busy ? "Проверяем…" : "Подтвердить"} <span style={sx("font-size:16px")}>→</span></span>
                  </div>
                  <p style={sx("margin:16px 0 0;font:400 12px/1.6 'Inter',sans-serif;color:#9a9a9a")}>Dev: код входа печатается в лог сервера (email отправляется в проде).</p>
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {/* footer continue */}
      {step < AUTH && (
        <div className="ob-foot" style={sx("position:sticky;bottom:0;background:linear-gradient(to top,#fff 60%,rgba(255,255,255,0));padding:20px 40px 32px;display:flex;justify-content:center")}>
          <div style={sx("width:100%;max-width:760px;display:flex;justify-content:flex-end")}>
            <span onClick={() => canNext && next()} className="ob-btn" style={sx(`display:inline-flex;align-items:center;gap:10px;font:500 15px 'Inter',sans-serif;color:${nextColor};background:${nextBg};border-radius:999px;padding:15px 30px;box-shadow:0 6px 18px rgba(0,0,0,.1)`)}>{nextLabel} <span style={sx("font-size:16px")}>→</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
