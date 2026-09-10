/* СГЕНЕРИРОВАНО scripts/dc-to-tsx.mjs — не править руками.
   Источник: design-handoff/ru-landing/MakeMeLook Landing.dc.html */

import { Fragment } from 'react';

import type { LandingVals } from '../useLandingVals';

export function S11Alternatives({ v }: { v: LandingVals }) {
  return (
    <section data-screen-label="11 Alternatives" style={{ padding: "200px 24px 0", maxWidth: "1288px", margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", alignItems: "end", gap: "24px 48px", marginBottom: "32px" }}>
        <div>
          <span style={{ display: "inline-flex", height: "28px", alignItems: "center", padding: "0 12px", borderRadius: "999px", background: "#fff", fontSize: "12px", fontWeight: "500", color: "#565E6B", whiteSpace: "nowrap" }}>
            Альтернативы
          </span>
          <h2 style={{ margin: "18px 0 0", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "clamp(28px,3vw,44px)", lineHeight: "1.08", letterSpacing: "-.03em" }}>
            {"Почему мы, "}
            <span style={{ fontWeight: "400", color: "#565E6B" }}>
              а не
            </span>
          </h2>
        </div>
        {" "}
        <p style={{ margin: "0", maxWidth: "420px", fontSize: "17px", lineHeight: "1.5", color: "#565E6B", justifySelf: "end" }}>
          Пять вариантов, которые вы уже рассматривали. По каждому — что именно ломается.
        </p>
      </div>
      {" "}
      <div style={{ background: "#fff", borderRadius: "28px", padding: "8px clamp(20px,3vw,40px)" }}>
        {(v.alternatives ?? []).map((a, i0) => (
          <Fragment key={i0}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "20px 48px", padding: "32px 0", borderBottom: "1px solid rgba(18,20,23,.08)" }}>
              <div style={{ fontSize: "22px", lineHeight: "1.3", color: "#6B7380", maxWidth: "340px", letterSpacing: "-.01em" }}>
                {a.q}
              </div>
              {" "}
              <div style={{ fontSize: "17px", lineHeight: "1.55", maxWidth: "640px" }}>
                {a.answer}
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    </section>
  );
}
