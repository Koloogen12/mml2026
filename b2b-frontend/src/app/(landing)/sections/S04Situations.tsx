/* СГЕНЕРИРОВАНО scripts/dc-to-tsx.mjs — не править руками.
   Источник: design-handoff/ru-landing/MakeMeLook Landing.dc.html */

import { Fragment } from 'react';

import type { LandingVals } from '../useLandingVals';

export function S04Situations({ v }: { v: LandingVals }) {
  return (
    <section data-screen-label="04 Situations" style={{ padding: "120px 24px 0", maxWidth: "1288px", margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", alignItems: "end", gap: "24px 48px", marginBottom: "40px" }}>
        <div>
          <span style={{ display: "inline-flex", height: "28px", alignItems: "center", padding: "0 12px", borderRadius: "999px", background: "#fff", fontSize: "12px", fontWeight: "500", color: "#565E6B", whiteSpace: "nowrap" }}>
            Три ситуации
          </span>
          <h2 style={{ margin: "18px 0 0", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "clamp(28px,3vw,44px)", lineHeight: "1.08", letterSpacing: "-.03em" }}>
            {"Найдите "}
            <span style={{ fontWeight: "400", color: "#565E6B" }}>
              свою
            </span>
          </h2>
        </div>
        {" "}
        <p style={{ margin: "0", maxWidth: "420px", fontSize: "17px", lineHeight: "1.5", color: "#565E6B", justifySelf: "end" }}>
          Дальше страница говорит с вами. Цитаты — из разговоров с владельцами магазинов одежды.
        </p>
      </div>
      {" "}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "12px" }}>
        {(v.situations ?? []).map((s, i0) => (
          <Fragment key={i0}>
            <div style={{ background: "#fff", borderRadius: "28px", padding: "clamp(22px,2.6vw,32px)", display: "flex", flexDirection: "column", gap: "20px" }}>
              <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", color: "#565E6B" }}>
                {s.n}
              </span>
              {" "}
              <h3 style={{ margin: "0", fontSize: "22px", fontWeight: "500", lineHeight: "1.25", letterSpacing: "-.015em", minHeight: "2.5em" }}>
                {s.title}
              </h3>
              {" "}
              <p style={{ margin: "0", paddingLeft: "16px", borderLeft: "2px solid #2F5AE6", fontSize: "17px", lineHeight: "1.55", color: "#3F4650", flex: "1" }}>
                {s.quote}
              </p>
              {" "}
              <div style={{ display: "flex", gap: "10px" }}>
                {(s.metrics ?? []).map((m, i1) => (
                  <Fragment key={i1}>
                    <div style={{ flex: "1", borderRadius: "16px", background: "#F6F7F9", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "4px", minWidth: "0" }}>
                      <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontWeight: "300", fontSize: "22px", lineHeight: "1", color: m.color, whiteSpace: "nowrap" }}>
                        {m.value}
                      </span>
                      <span style={{ fontSize: "12px", lineHeight: "1.35", color: "#565E6B" }}>
                        {m.label}
                      </span>
                    </div>
                  </Fragment>
                ))}
              </div>
              {" "}
              <div style={{ paddingTop: "20px", borderTop: "1px solid rgba(18,20,23,.08)" }}>
                <div style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: "#565E6B" }}>
                  ЧТО МЕНЯЕТСЯ
                </div>
                {" "}
                <div style={{ marginTop: "8px", fontSize: "15px", lineHeight: "1.5" }}>
                  {s.change}
                </div>
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    </section>
  );
}
