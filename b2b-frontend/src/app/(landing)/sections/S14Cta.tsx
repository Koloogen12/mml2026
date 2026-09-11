/* СГЕНЕРИРОВАНО scripts/dc-to-tsx.mjs — не править руками.
   Источник: design-handoff/ru-landing/MakeMeLook Landing.dc.html */

import type { LandingVals } from '../useLandingVals';

export function S14Cta({ v }: { v: LandingVals }) {
  return (
    <section id="form" data-screen-label="14 CTA" style={{ padding: "200px 12px 12px" }}>
      <div style={{ position: "relative", borderRadius: "28px", overflow: "hidden", minHeight: "680px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", background: "#0E1014" }}>
        <img src="/landing/ru/cta-bg.f077cc44.webp" alt="" aria-hidden="true" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 50%" }} />
        {" "}
        <div style={{ position: "absolute", inset: "0", background: "linear-gradient(90deg,rgba(10,14,22,.72) 0%,rgba(10,14,22,.6) 34%,rgba(10,14,22,.12) 62%,rgba(10,14,22,0) 100%)" }}></div>
        {" "}
        <div style={{ position: "relative", padding: "clamp(32px,5vw,64px) clamp(20px,4vw,56px)", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", gap: "24px" }}>
          {(v.hasBets) ? (
            <>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", padding: "12px 18px", borderRadius: "999px", background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.22)", backdropFilter: "blur(14px)", alignSelf: "flex-start", maxWidth: "100%" }}>
                <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "20px", fontWeight: "300", color: "#fff", whiteSpace: "nowrap" }}>
                  {v.correctCount} / {v.betCount}
                </span>
                {" "}
                <span style={{ fontSize: "14px", lineHeight: "1.4", color: "#fff" }}>
                  вы отличили примерку от съёмки — и вы искали подвох. Ваш покупатель не ищет.
                </span>
              </div>
            </>
          ) : null}
          {" "}
          <h2 style={{ margin: "0", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "clamp(30px,3.4vw,52px)", lineHeight: "1.04", letterSpacing: "-.03em", textWrap: "balance" }}>
            {"Посмотрите на "}
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontWeight: "400", fontSize: "1.15em" }}>
              своих
            </span>
            {" товарах"}
          </h2>
          {" "}
          <p style={{ margin: "0", maxWidth: "440px", fontSize: "17px", lineHeight: "1.55", color: "#fff" }}>
            Пришлите ссылку на каталог — соберём примерку на ваших вещах и покажем результат. Без интеграции, без оплаты и без обязательств.
          </p>
        </div>
        {" "}
        <div style={{ position: "relative", padding: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {(v.notSent) ? (
            <>
              <form onSubmit={v.submit} style={{ width: "min(440px,100%)", background: "#fff", borderRadius: "28px", padding: "28px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", color: "#565E6B" }}>
                  Ссылка на каталог или сайт
                  <input className="scp7" required placeholder="https://" style={{ height: "52px", borderRadius: "16px", border: "1px solid rgba(18,20,23,.12)", padding: "0 16px", fontSize: "17px", fontFamily: "'Golos Text',sans-serif", color: "#121417", outline: "none" }} />
                </label>
                {" "}
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", color: "#565E6B" }}>
                  Как с вами связаться
                  <input className="scp7" required placeholder="Телефон, почта или Telegram" style={{ height: "52px", borderRadius: "16px", border: "1px solid rgba(18,20,23,.12)", padding: "0 16px", fontSize: "17px", fontFamily: "'Golos Text',sans-serif", color: "#121417", outline: "none" }} />
                </label>
                {" "}
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", color: "#565E6B" }}>
                  Имя
                  <input className="scp7" required placeholder="Как к вам обращаться" style={{ height: "52px", borderRadius: "16px", border: "1px solid rgba(18,20,23,.12)", padding: "0 16px", fontSize: "17px", fontFamily: "'Golos Text',sans-serif", color: "#121417", outline: "none" }} />
                </label>
                {" "}
                <button className="scp8" type="submit" style={{ height: "54px", borderRadius: "999px", background: "#121417", color: "#fff", border: "none", fontFamily: "'Golos Text',sans-serif", fontSize: "17px", fontWeight: "500", cursor: "pointer", marginTop: "6px" }}>
                  {v.submitLabel}
                </button>
                {" "}
                {v.formError ? (
                  <span role="alert" style={{ fontSize: "13px", color: "#B3261E", textAlign: "center" }}>
                    {v.formError}
                  </span>
                ) : null}
                <span style={{ fontSize: "12px", color: "#6B7380", textAlign: "center" }}>
                  Отвечаем в течение рабочего дня. Ничего не устанавливаем и не списываем, пока вы не увидите результат.
                </span>
              </form>
            </>
          ) : null}
          {" "}
          {(v.sent) ? (
            <>
              <div style={{ width: "min(440px,100%)", background: "#fff", borderRadius: "28px", padding: "clamp(24px,3vw,40px) 28px", textAlign: "center", fontSize: "20px", lineHeight: "1.45" }}>
                Приняли. Соберём примерку на ваших товарах и вернёмся в течение рабочего дня.
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
