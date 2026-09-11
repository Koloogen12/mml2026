/* СГЕНЕРИРОВАНО scripts/dc-to-tsx.mjs — не править руками.
   Источник: design-handoff/ru-landing/MakeMeLook Landing.dc.html */

import { Fragment } from 'react';

import type { LandingVals } from '../useLandingVals';

export function S15Footer({ v }: { v: LandingVals }) {
  return (
    <footer style={{ padding: "clamp(72px,8vw,120px) 12px 12px" }}>
      <div style={{ position: "relative", borderRadius: "28px", overflow: "hidden", background: "#0E1014", color: "#fff", padding: "clamp(28px,4vw,56px) clamp(20px,3.4vw,48px) 0" }}>
        <div style={{ position: "absolute", inset: "0", background: "radial-gradient(60% 55% at 12% 0%, rgba(47,90,230,.26) 0%, rgba(14,16,20,0) 70%),radial-gradient(50% 50% at 92% 40%, rgba(143,176,255,.12) 0%, rgba(14,16,20,0) 70%)", pointerEvents: "none" }}></div>
        {" "}
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "clamp(28px,4vw,64px)", paddingBottom: "clamp(32px,4vw,56px)", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "22px", maxWidth: "460px" }}>
            <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: "rgba(255,255,255,.55)" }}>
              ОДНО ДЕЙСТВИЕ
            </span>
            {" "}
            <span style={{ fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "clamp(24px,2.6vw,36px)", lineHeight: "1.1", letterSpacing: "-.03em", textWrap: "balance" }}>
              Пришлите ссылку на каталог — соберём примерку на ваших вещах
            </span>
            {" "}
            <a className="scp1" href="#form" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: "56px", padding: "0 26px", borderRadius: "999px", boxSizing: "border-box", background: "#fff", color: "#121417", fontSize: "16px", fontWeight: "500", textDecoration: "none", whiteSpace: "nowrap", alignSelf: "flex-start" }}>
              Показать на моих товарах
            </a>
          </div>
          {" "}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "28px 24px", alignContent: "start" }}>
            {(v.footerCols ?? []).map((col, i0) => (
              <Fragment key={i0}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "0" }}>
                  <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "11px", letterSpacing: ".04em", color: "rgba(255,255,255,.45)", paddingBottom: "8px" }}>
                    {col.title}
                  </span>
                  {" "}
                  {(col.links ?? []).map((l, i1) => (
                    <Fragment key={i1}>
                      <a className="scp5" href={l.href} style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", fontSize: "15px", color: "rgba(255,255,255,.78)", textDecoration: "none", transition: "color 180ms" }}>
                        {l.label}
                      </a>
                    </Fragment>
                  ))}
                </div>
              </Fragment>
            ))}
          </div>
        </div>
        {" "}
        <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: "16px 32px", justifyContent: "space-between", alignItems: "center", padding: "22px 0" }}>
          <span style={{ display: "flex", flexWrap: "wrap", gap: "10px 22px", fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "11px", letterSpacing: ".04em", color: "rgba(255,255,255,.55)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: "#8FB0FF" }}></span>
              ОТВЕЧАЕМ В ТЕЧЕНИЕ РАБОЧЕГО ДНЯ
            </span>
            {" "}
            <span style={{ whiteSpace: "nowrap" }}>
              МОСКВА · МСК
            </span>
            {" "}
            <span style={{ whiteSpace: "nowrap" }}>
              ДАННЫЕ ХРАНЯТСЯ В РФ · 152-ФЗ
            </span>
          </span>
          {" "}
          <span style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <a className="scp9" href="#" style={{ display: "inline-flex", alignItems: "center", height: "40px", padding: "0 16px", borderRadius: "999px", background: "rgba(255,255,255,.08)", color: "#fff", fontSize: "14px", textDecoration: "none", whiteSpace: "nowrap" }}>
              Telegram
            </a>
            {" "}
            <a className="scp9" href="mailto:hello@makemelook.ai" style={{ display: "inline-flex", alignItems: "center", height: "40px", padding: "0 16px", borderRadius: "999px", background: "rgba(255,255,255,.08)", color: "#fff", fontSize: "14px", textDecoration: "none", whiteSpace: "nowrap" }}>
              hello@makemelook.ai
            </a>
          </span>
        </div>
        {" "}
        <div style={{ position: "relative", margin: "clamp(10px,2vw,22px) calc(-1 * clamp(20px,3.4vw,48px)) 0", paddingBottom: "0", fontSize: "0", lineHeight: "0" }}>
          <svg viewBox="0 0 1000 100" preserveAspectRatio="none" width="100%" height="clamp(58px,11vw,168px)" role="img" aria-label="MakeMeLook" style={{ display: "block", overflow: "hidden" }}>
            <text x="0" y="100" textLength="1000" lengthAdjust="spacingAndGlyphs" fontFamily="Unbounded, sans-serif" fontWeight="500" fontSize="118" fill="rgba(255,255,255,0.1)">
              MakeMeLook
            </text>
          </svg>
        </div>
      </div>
      {" "}
      <div style={{ maxWidth: "1288px", margin: "0 auto", padding: "20px 12px 8px", display: "flex", flexWrap: "wrap", gap: "8px 24px", justifyContent: "space-between", fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "11px", letterSpacing: ".04em", color: "#565E6B" }}>
        <span style={{ display: "inline-flex", alignItems: "center", minHeight: "44px" }}>
          MAKEMELOOK · ООО «МОНОРУС» · 2026
        </span>
        {" "}
        <span style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <a className="scpa" href="#" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", color: "#565E6B", textDecoration: "none" }}>
            ПОЛИТИКА ДАННЫХ
          </a>
          <a className="scpa" href="#" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", color: "#565E6B", textDecoration: "none" }}>
            УСЛОВИЯ
          </a>
        </span>
      </div>
    </footer>
  );
}
