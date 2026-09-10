import { useEffect, useRef, useState } from "react";
import { sx } from "../sx";
import { usePartner } from "../store";

// Порт hi-fi макета "Partner Apply.dc.html" (контракт 1:1).
// Разметка / классы / inline-стили — дословно; dc-runtime → React-стейт.
// Реальный API там, где он существует:
//   • переход к вводу кода и «отправить повторно» → /partner/auth/request-code;
//   • «Подтвердить» → /partner/auth/verify (на 404/offline — demo-правило макета:
//     любой код кроме 000000 проходит, TODO(Ф6));
//   • успех → surface='cabinet'.
// Пароль (setpass/reset) и «Вход по паролю» остаются UI-заглушкой макета —
// у партнёрского бэка вход по email-коду; TODO(Ф6): убрать пароль/Яндекс ID.

type View = "signup" | "setpass" | "code" | "signin" | "recover" | "reset";

const emailValidOf = (v: string) => /.+@.+\..+/.test((v || "").trim());

export function Apply() {
  const setSurface = usePartner((s) => s.setSurface);
  const requestCode = usePartner((s) => s.requestCode);
  const verify = usePartner((s) => s.verify);

  const [view, setView] = useState<View>("signup");
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [signinPass, setSigninPass] = useState("");
  const [signinErrShow, setSigninErrShow] = useState(false);
  const [code, setCode] = useState("");
  const [codeErr, setCodeErr] = useState(false);
  const [codeExpired, setCodeExpired] = useState(false);
  const [resendIn, setResendIn] = useState(59);
  const [toast, setToast] = useState("");

  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      clearInterval(timer.current);
      clearTimeout(toastTimer.current);
    },
    [],
  );

  const finish = () => setSurface("cabinet");
  const go = (v: View) => {
    clearInterval(timer.current);
    setCode("");
    setCodeErr(false);
    setCodeExpired(false);
    setSigninErrShow(false);
    setView(v);
  };
  const startCode = () => {
    clearInterval(timer.current);
    setResendIn(59);
    setCodeExpired(false);
    setCode("");
    setCodeErr(false);
    timer.current = setInterval(() => {
      setResendIn((v) => {
        if (v <= 1) {
          clearInterval(timer.current);
          setCodeExpired(true);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  };
  const toastMsg = (m: string) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  };

  const emailValid = emailValidOf(email);
  const passErr =
    pass.length > 0 && pass.length < 8
      ? "Минимум 8 символов"
      : pass2.length > 0 && pass !== pass2
        ? "Пароли не совпадают"
        : "";
  const passOk = pass.length >= 8 && pass === pass2;

  const codeArr = (code || "").split("");
  const cells = [0, 1, 2, 3, 4, 5].map((i) => {
    const ch = codeArr[i] || "";
    const active = i === codeArr.length && !codeErr;
    const border = codeErr ? "#C0392B" : active ? "#2E16CB" : ch ? "rgba(0,0,0,.3)" : "rgba(0,0,0,.18)";
    const bg = codeErr ? "#FDEEEC" : active ? "rgba(46,22,203,.05)" : "rgba(255,255,255,.7)";
    return { ch, border, bg };
  });

  const passType = showPass ? "text" : "password";
  const toggleShow = () => setShowPass((v) => !v);
  const chkBg = agree ? "#2E16CB" : "rgba(255,255,255,.9)";
  const chkBd = agree ? "#2E16CB" : "#000";

  const next = async () => {
    // Реальный вход партнёра — email-код (без пароля). Сразу шлём код.
    if (emailValid && agree) {
      await requestCode(email);
      startCode();
      setView("code");
    }
  };
  const setPassNext = async () => {
    if (!passOk) return;
    await requestCode(email); // реальный код письмом; offline → demo (любой код)
    startCode();
    setView("code");
  };
  const resend = async () => {
    if (resendIn === 0) {
      await requestCode(email);
      startCode();
    }
  };
  const verifyCode = async () => {
    if (code.length < 6) return;
    const r = await verify(email, code);
    if (r.ok) {
      clearInterval(timer.current);
      finish();
      return;
    }
    if (r.error === "offline") {
      // Fallback demo-правило макета: 000000 → ошибка, иначе вход.
      if (code === "000000") {
        setCodeErr(true);
        return;
      }
      clearInterval(timer.current);
      finish();
      return;
    }
    setCodeErr(true);
  };
  const signinGo = () => {
    // TODO(Ф6): партнёрский вход через email-код; пока demo-заглушка макета.
    if (!emailValid || signinPass.length < 1 || signinPass === "000000") {
      setSigninErrShow(true);
      return;
    }
    finish();
  };
  const recoverGo = () => {
    if (emailValid) {
      setPass("");
      setPass2("");
      go("reset");
    }
  };
  const resetGo = () => {
    if (passOk) {
      toastMsg("Пароль обновлён — войдите с новым паролем");
      setView("signin");
      setPass("");
      setPass2("");
      setSigninPass("");
    }
  };
  const google = () => finish();

  const logoRow = (w1: number, h1: number, w2: number, h2: number) => (
    <>
      <img src={`${import.meta.env.BASE_URL}mml-logo.svg`} width={w1} height={h1} alt="MakeMeLook" style={{ display: "block" }} />
      <img src={`${import.meta.env.BASE_URL}partner-badge.svg`} width={w2} height={h2} alt="PARTNER" style={{ display: "block" }} />
    </>
  );

  return (
    <div className="si-stage" style={sx(`position:relative;min-height:100vh;width:100%;background:radial-gradient(115% 85% at 32% 42%,rgba(255,255,255,.6) 0%,rgba(255,255,255,0) 52%),linear-gradient(90deg,#F5F6FA 0%,rgba(245,246,250,0.5) 46%,rgba(245,246,250,0) 70%),url('${import.meta.env.BASE_URL}signin-bg.png') 50% 42% / cover no-repeat;background-color:#EEF1FA;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px`)}>

      <a onClick={() => setSurface("marketing")} className="si-link" aria-label="Закрыть" style={sx("position:absolute;top:34px;right:36px;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#111")}><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 5l10 10M15 5L5 15"></path></svg></a>

      {/* ===== SIGNUP ===== */}
      {view === "signup" && (
        <div className="si-card" style={sx("width:320px")}>
          <div style={sx("display:flex;align-items:center;justify-content:center;gap:8px;height:45px")}>{logoRow(182, 45, 64, 18)}</div>
          <p style={sx("width:100%;margin:24px 0 40px;text-align:center;font:400 15.6px/24px 'Inter',sans-serif;color:#000")}>Зарегистрируйтесь по корпоративной почте, чтобы создать партнёрский аккаунт MakeMeLook.</p>
          <div style={sx("width:100%;display:flex;flex-direction:column")}>
            <label htmlFor="si-email" className="si-lab">Корпоративная почта</label>
            <input id="si-email" className="si-in" type="email" value={email} onInput={(e) => { setEmail((e.target as HTMLInputElement).value); setSigninErrShow(false); }} placeholder="Введите email" />
            <div style={sx("display:flex;gap:8px;padding:14px 0 4px;align-items:flex-start")}>
              <span className="si-chk" onClick={() => setAgree((v) => !v)} role="checkbox" aria-checked={agree} tabIndex={0} style={sx(`width:20px;height:20px;border-radius:4px;background:${chkBg};border:2px solid ${chkBd};display:flex;align-items:center;justify-content:center;margin-top:3px`)}>{agree && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.2L5 8.7l4.5-5.4"></path></svg>}</span>
              <span style={sx("font:400 11.8px/17px 'Inter',sans-serif;color:rgba(0,0,0,.62)")}>Продолжая, вы соглашаетесь с <a className="si-link" href="https://makemelook.ai/legal/partner-terms.html" target="_blank" rel="noopener" style={sx("color:#2E16CB")}>Условиями сервиса</a> и подтверждаете, что прочитали нашу <a className="si-link" href="https://makemelook.ai/legal/privacy.html" target="_blank" rel="noopener" style={sx("color:#2E16CB")}>Политику конфиденциальности</a></span>
            </div>
            <div style={sx("padding:22px 0 0")}>
              <span className="si-btn si-primary" onClick={next} style={sx(`opacity:${emailValid && agree ? 1 : 0.2}`)}><span>Далее</span></span>
            </div>
            <div style={sx("display:flex;align-items:center;gap:0;padding:22px 0 0")}>
              <span style={sx("flex:1;height:1px;background:rgba(0,0,0,.2)")}></span>
              <span style={sx("padding:0 16px;font:600 12px/12px 'Inter',sans-serif;letter-spacing:-.3px;color:#000")}>ИЛИ</span>
              <span style={sx("flex:1;height:1px;background:rgba(0,0,0,.2)")}></span>
            </div>
            <div style={sx("padding:16px 0 8px")}>
              <span className="si-btn" onClick={google} style={sx("display:flex;height:45px;border-radius:24px;background:#000;align-items:center;justify-content:center;gap:11px;padding:12px 24px")}>
                <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="11" fill="#FC3F1D"></circle><text x="11" y="15.6" textAnchor="middle" fontFamily="Inter,Arial,sans-serif" fontWeight="700" fontSize="13.5" fill="#fff">Я</text></svg>
                <span style={sx("font:600 15px/21px 'Inter',sans-serif;color:#fff;white-space:nowrap")}>Войти с Яндекс ID</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ===== CREATE PASSWORD ===== */}
      {view === "setpass" && (
        <div className="si-card">
          <div style={sx("display:flex;align-items:center;justify-content:center;gap:8px;height:45px;margin-bottom:6px")}>{logoRow(150, 37, 60, 17)}</div>
          <span className="si-back si-link" onClick={() => go("signup")} style={sx("margin-top:14px")}><svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M11 3.5L6 9l5 5.5"></path></svg>Назад</span>
          <h2 className="si-h">Создайте пароль</h2>
          <p className="si-sub">Аккаунт для <b style={sx("color:#000;font-weight:600")}>{email}</b></p>
          <label className="si-lab">Пароль</label>
          <div style={sx("position:relative;width:100%")}>
            <input className="si-in" type={passType} value={pass} onInput={(e) => setPass((e.target as HTMLInputElement).value)} placeholder="Минимум 8 символов" style={sx("padding-right:44px")} />
            <span className="si-link" onClick={toggleShow} style={sx("position:absolute;right:14px;top:50%;transform:translateY(-50%);color:rgba(0,0,0,.5)")}><svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6z"></path><circle cx="10" cy="10" r="2.5"></circle></svg></span>
          </div>
          <label className="si-lab" style={sx("margin-top:16px")}>Повторите пароль</label>
          <input className="si-in" type={passType} value={pass2} onInput={(e) => setPass2((e.target as HTMLInputElement).value)} placeholder="Повторите пароль" />
          {passErr && (
            <div style={sx("align-self:flex-start;margin-top:12px;display:flex;align-items:center;gap:7px;font:500 13px 'Inter',sans-serif;color:#C0392B")}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#C0392B" strokeWidth="1.7"><circle cx="8" cy="8" r="6.5"></circle><path d="M8 4.5v4M8 11h.01" strokeLinecap="round"></path></svg>{passErr}</div>
          )}
          <div style={sx("width:100%;padding:24px 0 0")}>
            <span className="si-btn si-primary" onClick={setPassNext} style={sx(`opacity:${passOk ? 1 : 0.2}`)}><span>Продолжить</span></span>
          </div>
        </div>
      )}

      {/* ===== EMAIL CODE ===== */}
      {view === "code" && (
        <div className="si-card">
          <div style={sx("display:flex;align-items:center;justify-content:center;gap:8px;height:45px;margin-bottom:6px")}>{logoRow(150, 37, 60, 17)}</div>
          <span className="si-back si-link" onClick={() => go("setpass")} style={sx("margin-top:14px")}><svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M11 3.5L6 9l5 5.5"></path></svg>Назад</span>
          <h2 className="si-h">Подтвердите почту</h2>
          <p className="si-sub">Отправили 6-значный код на <b style={sx("color:#000;font-weight:600")}>{email}</b></p>
          <div style={sx("position:relative;width:fit-content;align-self:flex-start")}>
            <input value={code} onInput={(e) => { setCode(((e.target as HTMLInputElement).value || "").replace(/\D/g, "").slice(0, 6)); setCodeErr(false); }} inputMode="numeric" maxLength={6} autoFocus style={sx("position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:text;border:0")} />
            <div style={sx("display:flex;gap:10px;pointer-events:none")}>
              {cells.map((c, i) => (
                <div key={i} style={sx(`width:46px;height:56px;border:2px solid ${c.border};border-radius:10px;display:flex;align-items:center;justify-content:center;font:600 24px 'Inter',sans-serif;color:#111;background:${c.bg}`)}>{c.ch}</div>
              ))}
            </div>
          </div>
          {codeErr && (
            <div style={sx("align-self:flex-start;margin-top:14px;display:flex;align-items:center;gap:7px;font:500 13px 'Inter',sans-serif;color:#C0392B")}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#C0392B" strokeWidth="1.7"><circle cx="8" cy="8" r="6.5"></circle><path d="M8 4.5v4M8 11h.01" strokeLinecap="round"></path></svg>Неверный код. Проверьте письмо и попробуйте снова.</div>
          )}
          {codeExpired && (
            <div style={sx("align-self:flex-start;margin-top:12px;font:400 12.5px 'Inter',sans-serif;color:#B7791F")}>Срок действия кода истёк — запросите новый.</div>
          )}
          <div style={sx("align-self:flex-start;margin-top:20px;font:400 13.5px 'Inter',sans-serif;color:rgba(0,0,0,.6)")}>{resendIn > 0 ? "Отправить код повторно можно через 0:" + String(resendIn).padStart(2, "0") : "Не пришёл код?"} {resendIn === 0 && <span className="si-link" onClick={resend} style={sx("color:#2E16CB;font-weight:600;text-decoration:underline")}>Отправить повторно</span>}</div>
          <div style={sx("width:100%;padding:26px 0 0")}>
            <span className="si-btn si-primary" onClick={verifyCode} style={sx(`opacity:${code.length === 6 ? 1 : 0.4}`)}><span>Подтвердить</span></span>
          </div>
        </div>
      )}

      {/* ===== SIGN IN ===== */}
      {view === "signin" && (
        <div className="si-card" style={sx("width:320px")}>
          <div style={sx("display:flex;align-items:center;justify-content:center;gap:8px;height:45px")}>{logoRow(182, 45, 64, 18)}</div>
          <h2 className="si-h" style={sx("align-self:center;margin:26px 0 24px")}>Вход для партнёров</h2>
          <div style={sx("width:100%;display:flex;flex-direction:column")}>
            <label className="si-lab">Корпоративная почта</label>
            <input className="si-in" type="email" value={email} onInput={(e) => { setEmail((e.target as HTMLInputElement).value); setSigninErrShow(false); }} placeholder="Введите email" />
            <div style={sx("display:flex;justify-content:space-between;align-items:baseline;margin:16px 0 8px")}>
              <label className="si-lab" style={sx("margin:0")}>Пароль</label>
              <span className="si-link" onClick={() => go("recover")} style={sx("font:500 12.5px 'Inter',sans-serif;color:#2E16CB")}>Забыли пароль?</span>
            </div>
            <div style={sx("position:relative;width:100%")}>
              <input className="si-in" type={passType} value={signinPass} onInput={(e) => { setSigninPass((e.target as HTMLInputElement).value); setSigninErrShow(false); }} placeholder="Введите пароль" style={sx("padding-right:44px")} />
              <span className="si-link" onClick={toggleShow} style={sx("position:absolute;right:14px;top:50%;transform:translateY(-50%);color:rgba(0,0,0,.5)")}><svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6z"></path><circle cx="10" cy="10" r="2.5"></circle></svg></span>
            </div>
            {signinErrShow && (
              <div style={sx("margin-top:12px;display:flex;align-items:center;gap:7px;font:500 13px 'Inter',sans-serif;color:#C0392B")}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#C0392B" strokeWidth="1.7"><circle cx="8" cy="8" r="6.5"></circle><path d="M8 4.5v4M8 11h.01" strokeLinecap="round"></path></svg>Неверный email или пароль</div>
            )}
            <div style={sx("padding:22px 0 0")}>
              <span className="si-btn si-primary" onClick={signinGo}><span>Войти</span></span>
            </div>
            <div style={sx("display:flex;align-items:center;gap:0;padding:22px 0 0")}>
              <span style={sx("flex:1;height:1px;background:rgba(0,0,0,.2)")}></span>
              <span style={sx("padding:0 16px;font:600 12px/12px 'Inter',sans-serif;color:#000")}>ИЛИ</span>
              <span style={sx("flex:1;height:1px;background:rgba(0,0,0,.2)")}></span>
            </div>
            <div style={sx("padding:16px 0 8px")}>
              <span className="si-btn" onClick={google} style={sx("display:flex;height:45px;border-radius:24px;background:#000;align-items:center;justify-content:center;gap:11px;padding:12px 24px")}>
                <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="11" fill="#FC3F1D"></circle><text x="11" y="15.6" textAnchor="middle" fontFamily="Inter,Arial,sans-serif" fontWeight="700" fontSize="13.5" fill="#fff">Я</text></svg>
                <span style={sx("font:600 15px/21px 'Inter',sans-serif;color:#fff;white-space:nowrap")}>Войти с Яндекс ID</span>
              </span>
            </div>
            <p style={sx("text-align:center;margin:14px 0 0;font:400 13px 'Inter',sans-serif;color:rgba(0,0,0,.6)")}>Нет аккаунта? <span className="si-link" onClick={() => go("signup")} style={sx("color:#2E16CB;font-weight:600")}>Регистрация</span></p>
            </div>
        </div>
      )}

      {/* ===== RECOVER (request) ===== */}
      {view === "recover" && (
        <div className="si-card">
          <div style={sx("display:flex;align-items:center;justify-content:center;gap:8px;height:45px;margin-bottom:6px")}>{logoRow(150, 37, 60, 17)}</div>
          <span className="si-back si-link" onClick={() => go("signin")} style={sx("margin-top:14px")}><svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M11 3.5L6 9l5 5.5"></path></svg>К входу</span>
          <h2 className="si-h">Восстановление пароля</h2>
          <p className="si-sub">Укажите корпоративную почту — пришлём ссылку для сброса пароля.</p>
          <label className="si-lab">Корпоративная почта</label>
          <input className="si-in" type="email" value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} placeholder="Введите email" />
          <div style={sx("width:100%;padding:24px 0 0")}>
            <span className="si-btn si-primary" onClick={recoverGo} style={sx(`opacity:${emailValid ? 1 : 0.2}`)}><span>Отправить ссылку</span></span>
          </div>
        </div>
      )}

      {/* ===== RESET (new password) ===== */}
      {view === "reset" && (
        <div className="si-card">
          <div style={sx("display:flex;align-items:center;justify-content:center;gap:8px;height:45px;margin-bottom:6px")}>{logoRow(150, 37, 60, 17)}</div>
          <h2 className="si-h" style={sx("margin-top:26px")}>Новый пароль</h2>
          <p className="si-sub">Придумайте новый пароль для <b style={sx("color:#000;font-weight:600")}>{email}</b></p>
          <label className="si-lab">Новый пароль</label>
          <div style={sx("position:relative;width:100%")}>
            <input className="si-in" type={passType} value={pass} onInput={(e) => setPass((e.target as HTMLInputElement).value)} placeholder="Минимум 8 символов" style={sx("padding-right:44px")} />
            <span className="si-link" onClick={toggleShow} style={sx("position:absolute;right:14px;top:50%;transform:translateY(-50%);color:rgba(0,0,0,.5)")}><svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6z"></path><circle cx="10" cy="10" r="2.5"></circle></svg></span>
          </div>
          <label className="si-lab" style={sx("margin-top:16px")}>Повторите пароль</label>
          <input className="si-in" type={passType} value={pass2} onInput={(e) => setPass2((e.target as HTMLInputElement).value)} placeholder="Повторите пароль" />
          {passErr && (
            <div style={sx("align-self:flex-start;margin-top:12px;display:flex;align-items:center;gap:7px;font:500 13px 'Inter',sans-serif;color:#C0392B")}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#C0392B" strokeWidth="1.7"><circle cx="8" cy="8" r="6.5"></circle><path d="M8 4.5v4M8 11h.01" strokeLinecap="round"></path></svg>{passErr}</div>
          )}
          <div style={sx("width:100%;padding:24px 0 0")}>
            <span className="si-btn si-primary" onClick={resetGo} style={sx(`opacity:${passOk ? 1 : 0.2}`)}><span>Сохранить пароль</span></span>
          </div>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div style={sx("position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:#111;color:#fff;border-radius:999px;padding:13px 24px;box-shadow:0 8px 30px rgba(0,0,0,.24);z-index:90;font:500 13.5px 'Inter',sans-serif;display:flex;align-items:center;gap:10px")}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#7CE0A0" strokeWidth="1.9" strokeLinecap="round"><path d="M3 8.5L6.5 12 13 4.5"></path></svg>{toast}</div>
      )}
    </div>
  );
}
