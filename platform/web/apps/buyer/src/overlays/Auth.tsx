import { useState } from "react";
import { sx } from "../sx";
import { useApp } from "../appStore";
import { useAuth } from "../authStore";
import { Logo } from "../components/Logo";

// Auth-модалка. Разметка/чрома — 1:1 из макета; вход по EMAIL-коду
// (решение основателя), поле телефона заменено на email, добавлен ввод кода.
const emailOk = (v: string) => /.+@.+\..+/.test(v.trim());

export function Auth() {
  const app = useApp();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(false);
  const [code, setCode] = useState("");
  const [codeErr, setCodeErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const ready = emailOk(email);
  const close = () => useApp.setState({ authOpen: false });

  const sendCode = async () => {
    if (!ready || busy) return;
    setErr("");
    setBusy(true);
    const r = await useAuth.getState().requestCode(email.trim());
    setBusy(false);
    if (!r.ok) {
      setErr(r.error ?? "Не удалось отправить код");
      return;
    }
    setCode("");
    setCodeErr(false);
    setOtp(true);
  };

  const verify = async () => {
    if (code.length < 6 || busy) return;
    setBusy(true);
    const r = await useAuth.getState().verify(email.trim(), code);
    if (!r.ok) {
      setBusy(false);
      setCodeErr(true);
      return;
    }
    await useAuth.getState().loadPassport();
    setBusy(false);
    useApp.setState({ authOpen: false });
    app.showToast("Вход выполнен");
  };

  const cells = [0, 1, 2, 3, 4, 5].map((i) => {
    const ch = code[i] || "";
    const active = i === code.length && !codeErr;
    const border = codeErr ? "#C0392B" : active ? "#2B2BCC" : ch ? "rgba(0,0,0,.35)" : "rgba(0,0,0,.16)";
    const bg = codeErr ? "#FDEEEC" : active ? "rgba(43,43,204,.05)" : "#fff";
    return { ch, border, bg };
  });

  return (
    <div className="dp-scrim" style={sx("position:fixed;inset:0;z-index:75;display:flex;align-items:center;justify-content:center;padding:24px;overflow-y:auto")} onClick={close}>
      {/* Размытие отдельным слоем (см. .dp-scrim-blur). У окна входа затемнение
          плотнее и блюр сильнее — это -strong. */}
      <div className="dp-scrim-blur dp-scrim-blur-strong" aria-hidden="true"></div>
      <div className="dp-fade" onClick={(e) => e.stopPropagation()} style={sx("width:min(460px,96vw);background:#fff;border-radius:22px;padding:40px 40px 30px;box-shadow:0 40px 100px rgba(0,0,0,.35);position:relative;margin:auto")}>
        <span className="dp-btn" onClick={close} style={sx("position:absolute;top:20px;right:20px;width:34px;height:34px;border-radius:50%;background:rgba(0,0,0,.05);display:flex;align-items:center;justify-content:center")}>
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3l9 9M12 3l-9 9"></path></svg>
        </span>

        <div style={sx("display:flex;justify-content:center;margin-bottom:22px")}>
          <Logo width={150} height={26} />
        </div>

        {!otp && (
          <>
            {app.authMode === "signup" && (
              <>
                <div style={sx("text-align:center;font:500 11px 'Inter',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:rgba(0,0,0,.5)")}>Сохраните профиль</div>
                <h2 style={sx("text-align:center;font:400 26px 'Spectral',Georgia,serif;margin:8px 0 20px")}>Зафиксируйте предпочтения.</h2>
                <div style={sx("display:flex;gap:8px;margin-bottom:24px;overflow:hidden")}>
                  <div style={sx("flex:1;height:120px;background:#DAD5C8;border-radius:8px")}></div>
                  <div style={sx("flex:1;height:120px;background:#E4E0D6;border-radius:8px")}></div>
                  <div style={sx("flex:1;height:120px;background:#E0DACE;border-radius:8px")}></div>
                  <div style={sx("flex:1;height:120px;background:#D8D3CB;border-radius:8px")}></div>
                </div>
              </>
            )}
            {app.authMode === "signin" && (
              <p style={sx("text-align:center;font:400 16px/1.55 'Inter',sans-serif;color:rgba(0,0,0,.7);margin:0 0 26px")}>
                Ваш личный ИИ-стилист. Подбор для женщин и мужчин. <b style={sx("color:#000")}>Попробуйте MakeMeLook.</b>
              </p>
            )}

            <div style={sx("display:flex;gap:0;border:1px solid rgba(0,0,0,.16);border-radius:12px;overflow:hidden;margin-bottom:14px")}>
              <input
                className="dp-auth-input"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErr(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") void sendCode(); }}
                placeholder="Электронная почта"
                inputMode="email"
                style={sx("flex:1;border:none;outline:none;background:transparent;padding:15px 16px;font:400 16px 'Inter',sans-serif;color:#000")}
              />
            </div>
            <span
              className="dp-btn"
              onClick={() => void sendCode()}
              style={sx(`display:block;text-align:center;background:${ready ? "#000" : "rgba(0,0,0,.12)"};color:${ready ? "#fff" : "rgba(0,0,0,.38)"};border-radius:12px;padding:16px 0;font:500 15px 'Inter',sans-serif;cursor:${ready ? "pointer" : "not-allowed"}`)}
            >
              {busy ? "Отправляем…" : "Продолжить"}
            </span>
            {err && <div style={sx("margin-top:12px;text-align:center;font:500 13px 'Inter',sans-serif;color:#C0392B")}>{err}</div>}

            <div style={sx("display:flex;align-items:center;gap:14px;margin:20px 0")}>
              <span style={sx("flex:1;height:1px;background:rgba(0,0,0,.12)")}></span>
              <span style={sx("font:500 12px 'Inter',sans-serif;color:rgba(0,0,0,.45)")}>ИЛИ</span>
              <span style={sx("flex:1;height:1px;background:rgba(0,0,0,.12)")}></span>
            </div>

            <div style={sx("display:flex;gap:12px")}>
              <span className="dp-btn" onClick={() => { window.location.href = "/api/v1/auth/oauth/google/start"; }} style={sx("flex:1;display:flex;align-items:center;justify-content:center;gap:10px;background:#000;color:#fff;border-radius:12px;padding:15px 0;font:500 15px 'Inter',sans-serif")}>
                <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.6 9.2c0-.6-.05-1.2-.15-1.7H9v3.3h4.8c-.2 1.1-.85 2-1.8 2.6v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.4z" fill="#4285F4" /><path d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3C2.4 15.9 5.5 18 9 18z" fill="#34A853" /><path d="M3.9 10.7c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7V5H.9C.3 6.2 0 7.5 0 9s.3 2.8.9 4l3-2.3z" fill="#FBBC05" /><path d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6C13.5.9 11.4 0 9 0 5.5 0 2.4 2.1.9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" fill="#EA4335" /></svg>
                Google
              </span>
              <span className="dp-btn" onClick={() => { window.location.href = "/api/v1/auth/oauth/yandex/start"; }} style={sx("flex:1;display:flex;align-items:center;justify-content:center;gap:10px;background:#000;color:#fff;border-radius:12px;padding:15px 0;font:500 15px 'Inter',sans-serif")}>
                <svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#FC3F1D" /><path d="M13.3 6.4h-1.2c-2.1 0-3.6 1.3-3.6 3.3 0 1.4.6 2.3 1.8 3l-2.1 3.6h1.6l1.9-3.3h.9v3.3h1.4V6.4h-.7zm-.7 5.4h-.6c-1 0-1.7-.5-1.7-1.6 0-1.1.6-1.6 1.6-1.6h.7v3.2z" fill="#fff" /></svg>
                Яндекс ID
              </span>
            </div>

            <p style={sx("font:400 11.5px/1.6 'Inter',sans-serif;color:rgba(0,0,0,.5);margin:22px 0 0")}>
              Продолжая, вы соглашаетесь с <a href="https://makemelook.ai/legal/terms.html" target="_blank" rel="noopener" style={sx("color:#000;text-decoration:underline;cursor:pointer")}>условиями сервиса</a> и подтверждаете, что прочли <a href="https://makemelook.ai/legal/privacy.html" target="_blank" rel="noopener" style={sx("color:#000;text-decoration:underline;cursor:pointer")}>политику конфиденциальности</a>. Оператор — ООО МОНОРУС.
            </p>
          </>
        )}

        {otp && (
          <>
            <span onClick={() => setOtp(false)} style={sx("display:inline-flex;align-items:center;gap:7px;font:500 13px 'Inter',sans-serif;color:#737373;cursor:pointer;margin-bottom:14px")}>
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="#737373" strokeWidth="1.7" strokeLinecap="round"><path d="M11 3.5L6 9l5 5.5"></path></svg>Изменить почту
            </span>
            <h2 style={sx("text-align:center;font:400 24px 'Spectral',Georgia,serif;margin:0 0 8px")}>Введите код из письма</h2>
            <p style={sx("text-align:center;font:400 14px/1.55 'Inter',sans-serif;color:rgba(0,0,0,.6);margin:0 0 22px")}>Отправили 6-значный код на <b style={sx("color:#000")}>{email.trim()}</b></p>
            <div style={sx("position:relative;width:fit-content;margin:0 auto 6px")}>
              <input value={code} onChange={(e) => { setCode((e.target.value || "").replace(/\D/g, "").slice(0, 6)); setCodeErr(false); }} inputMode="numeric" maxLength={6} autoFocus style={sx("position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:text;border:0")} />
              <div style={sx("display:flex;gap:10px;pointer-events:none")}>
                {cells.map((c, i) => (
                  <div key={i} style={sx(`width:48px;height:60px;border:2px solid ${c.border};border-radius:12px;display:flex;align-items:center;justify-content:center;font:400 26px 'Spectral',Georgia,serif;color:#16150F;background:${c.bg}`)}>{c.ch}</div>
                ))}
              </div>
            </div>
            {codeErr && <div style={sx("margin:14px 0 0;text-align:center;font:500 13px 'Inter',sans-serif;color:#C0392B")}>Неверный код. Проверьте письмо и попробуйте снова.</div>}
            <span
              className="dp-btn"
              onClick={() => void verify()}
              style={sx(`display:block;margin-top:20px;text-align:center;background:${code.length === 6 ? "#000" : "rgba(0,0,0,.12)"};color:${code.length === 6 ? "#fff" : "rgba(0,0,0,.38)"};border-radius:12px;padding:16px 0;font:500 15px 'Inter',sans-serif`)}
            >
              {busy ? "Проверяем…" : "Подтвердить"}
            </span>
            <p style={sx("font:400 11.5px/1.6 'Inter',sans-serif;color:rgba(0,0,0,.4);margin:16px 0 0;text-align:center")}>Dev: код входа печатается в лог сервера.</p>
          </>
        )}
      </div>
    </div>
  );
}
