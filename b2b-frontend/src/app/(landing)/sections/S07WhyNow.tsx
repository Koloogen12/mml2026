/* СГЕНЕРИРОВАНО scripts/dc-to-tsx.mjs — не править руками.
   Источник: design-handoff/ru-landing/MakeMeLook Landing.dc.html */

import { Fragment } from 'react';

import type { LandingVals } from '../useLandingVals';

export function S07WhyNow({ v }: { v: LandingVals }) {
  return (
    <section data-screen-label="07 Why now" data-anim="chart" style={{ padding: "120px 12px 0" }}>
      <div style={{ position: "relative", borderRadius: "28px", overflow: "hidden", minHeight: "640px", background: "#0E1014", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
        <div style={{ position: "relative", minHeight: "420px" }}>
          <img src="/landing/ru/look-6.jpg" alt="Покупатель в пальто — кадр к блоку о сокращении офлайна" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 30%" }} />
          <div style={{ position: "absolute", inset: "0", background: "linear-gradient(90deg,rgba(15,17,21,0) 60%,rgba(15,17,21,1) 100%)" }}></div>
        </div>
        {" "}
        <div style={{ padding: "clamp(32px,5vw,64px) clamp(20px,4vw,56px)", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "40px" }}>
          <div>
            <h2 style={{ margin: "0", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "clamp(30px,3.4vw,52px)", lineHeight: "1.04", letterSpacing: "-.03em" }}>
              {"Примерка переехала "}
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontWeight: "400", fontSize: "1.15em", whiteSpace: "nowrap" }}>
                в логистику
              </span>
            </h2>
            {" "}
            <p style={{ margin: "22px 0 0", maxWidth: "460px", fontSize: "17px", lineHeight: "1.55", color: "rgba(255,255,255,.72)" }}>
              Примерочная не исчезла — она переехала в пункт выдачи. Но там примеряют после заказа: вещь уже поехала, доставка уже оплачена, и каждая неподошедшая — оплаченный рейс туда и обратно.
            </p>
            {" "}
            <p style={{ margin: "22px 0 0", maxWidth: "460px", fontSize: "17px", lineHeight: "1.55", color: "rgba(255,255,255,.72)" }}>
              С марта 2026 Wildberries и Ozon начали ограничивать покупателей с низким выкупом. Причина названа прямо: пункты выдачи используют как бесплатную примерочную, и это слишком дорого.
            </p>
            {" "}
            {v.whyNowHref ? (
              <a href={v.whyNowHref} style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "18px", minHeight: "44px", fontSize: "14px", color: "rgba(255,255,255,.6)", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                Читать полностью →
              </a>
            ) : null}
          </div>
          {" "}
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {(v.bars ?? []).map((b, i0) => (
                <Fragment key={i0}>
                  <div style={{ display: "grid", gridTemplateColumns: "64px 1fr auto", gap: "16px", alignItems: "center" }}>
                    <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "13px", color: "rgba(255,255,255,.55)" }}>
                      {b.year}
                    </span>
                    {" "}
                    <span style={{ position: "relative", height: b.thickness, borderRadius: "999px", background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
                      <span style={{ position: "absolute", left: "0", top: "0", bottom: "0", width: b.w, borderRadius: "999px", background: b.color, transition: `width 900ms cubic-bezier(.2,.8,.2,1) ${b.delay}` }}></span>
                    </span>
                    {" "}
                    <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: b.labelSize, fontWeight: "300", color: b.labelColor, whiteSpace: "nowrap", minWidth: "74px", textAlign: "right" }}>
                      {b.label}
                    </span>
                  </div>
                </Fragment>
              ))}
            </div>
            {" "}
            <div style={{ marginTop: "16px", fontSize: "12px", color: "rgba(255,255,255,.5)" }}>
              Доля сетевых fashion-операторов, сокративших офлайн. РБК Исследования рынков, выборка 1110 сетей
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
