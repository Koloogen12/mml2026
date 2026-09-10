/* СГЕНЕРИРОВАНО scripts/dc-to-tsx.mjs — не править руками.
   Источник: design-handoff/ru-landing/MakeMeLook Landing.dc.html */

import { Fragment } from 'react';

import type { LandingVals } from '../useLandingVals';

export function S10Data({ v }: { v: LandingVals }) {
  return (
    <section data-screen-label="10 Data" style={{ padding: "120px 24px 0", maxWidth: "1288px", margin: "0 auto" }}>
      <div style={{ background: "#fff", borderRadius: "28px", padding: "clamp(24px,3.4vw,48px)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "40px" }}>
        <div style={{ maxWidth: "320px" }}>
          <h2 style={{ margin: "0", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "clamp(24px,2.4vw,34px)", lineHeight: "1.12", letterSpacing: "-.03em" }}>
            Фото покупателя: где хранится и кому принадлежит
          </h2>
          {" "}
          <p style={{ margin: "20px 0 0", fontSize: "17px", lineHeight: "1.55", color: "#565E6B" }}>
            Покупатель загружает своё фото — значит, у вашего юриста будут вопросы по 152-ФЗ. Отвечаем на них до того, как вы их зададите.
          </p>
          {" "}
          <div style={{ marginTop: "24px", display: "flex", gap: "16px", fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", color: "#6B7380" }}>
            <a href="#" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", color: "#565E6B", textDecoration: "underline" }}>
              политика
            </a>
            <a href="#" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", color: "#565E6B", textDecoration: "underline" }}>
              типовое согласие
            </a>
          </div>
        </div>
        {" "}
        <div style={{ maxWidth: "620px" }}>
          {(v.legal ?? []).map((l, i0) => (
            <Fragment key={i0}>
              <div style={{ padding: "20px 0", borderBottom: "1px solid rgba(18,20,23,.08)", display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "17px", fontWeight: "500" }}>
                  {l.title}
                </span>
                <span style={{ fontSize: "15px", lineHeight: "1.55", color: "#565E6B" }}>
                  {l.text}
                </span>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
