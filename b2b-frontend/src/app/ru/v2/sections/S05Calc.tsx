/* СГЕНЕРИРОВАНО scripts/dc-to-tsx.mjs — не править руками.
   Источник: design-handoff/ru-landing/MakeMeLook Landing.dc.html */

import { Fragment } from 'react';

import type { LandingVals } from '../useLandingVals';

export function S05Calc({ v }: { v: LandingVals }) {
  return (
    <section data-screen-label="05 Calc" data-anim="calc" style={{ padding: "200px 24px 0", maxWidth: "1288px", margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", alignItems: "end", gap: "24px 48px", marginBottom: "40px" }}>
        <div>
          <span style={{ display: "inline-flex", height: "28px", alignItems: "center", padding: "0 12px", borderRadius: "999px", background: "#fff", fontSize: "12px", fontWeight: "500", color: "#565E6B", whiteSpace: "nowrap" }}>
            Арифметика возвратов
          </span>
          {" "}
          <h2 style={{ margin: "18px 0 0", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "clamp(28px,3vw,44px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" }}>
            {"Сколько стоит чужая "}
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontWeight: "400", fontSize: "1.15em" }}>
              неуверенность
            </span>
          </h2>
        </div>
        {" "}
        <p style={{ margin: "0", maxWidth: "420px", fontSize: "17px", lineHeight: "1.5", color: "#565E6B", justifySelf: "end" }}>
          Три ваших числа — и видно, во что обходится размер, который покупатель не смог проверить. Цифры по рынку: 30–45% возвратов на маркетплейсах, 15–25% на сайтах брендов.
        </p>
      </div>
      {" "}
      <div style={{ borderRadius: "28px", overflow: "hidden", background: "#fff", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
        <div style={{ padding: "clamp(24px,3vw,40px)", display: "flex", flexDirection: "column", gap: "26px", borderRight: "1px solid rgba(18,20,23,.07)" }}>
          {(v.dials ?? []).map((d, i0) => (
            <Fragment key={i0}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
                  <span style={{ fontSize: "15px", color: "#565E6B" }}>
                    {d.name}
                  </span>
                  {" "}
                  <span style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
                    <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontWeight: "300", fontSize: "26px", lineHeight: "1", letterSpacing: "-.02em", whiteSpace: "nowrap" }}>
                      {d.value}
                    </span>
                    <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "15px", color: "#565E6B" }}>
                      {d.unit}
                    </span>
                  </span>
                </div>
                {" "}
                <div style={{ position: "relative", height: "44px" }}>
                  <div style={{ position: "absolute", inset: "0", borderRadius: "999px", background: "#EEF1F5", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: d.pct, background: "linear-gradient(90deg,#8FB0FF 0%,#2F5AE6 100%)", transition: "width 160ms linear" }}></div>
                  </div>
                  {" "}
                  <div style={{ position: "absolute", top: "5px", bottom: "5px", left: d.pct, width: "34px", marginLeft: "-17px", borderRadius: "999px", background: "#fff", border: "1px solid rgba(18,20,23,.12)", pointerEvents: "none", transition: "left 160ms linear" }}></div>
                  {" "}
                  <input className="mml-range" type="range" min={d.min} max={d.max} step={d.step} value={d.raw} onChange={d.set} aria-label={d.name} />
                </div>
                {" "}
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", color: "#6B7380", whiteSpace: "nowrap" }}>
                  <span>
                    {d.minLabel}
                  </span>
                  <span>
                    {d.maxLabel}
                  </span>
                </div>
              </div>
            </Fragment>
          ))}
          {" "}
          <div style={{ marginTop: "auto", paddingTop: "22px", borderTop: "1px solid rgba(18,20,23,.07)", display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <span style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "20px", fontWeight: "300", whiteSpace: "nowrap" }}>
                {v.returnsCount}
              </span>
              <span style={{ fontSize: "13px", color: "#565E6B" }}>
                возвратов в месяц
              </span>
            </span>
            {" "}
            <span style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "20px", fontWeight: "300", whiteSpace: "nowrap" }}>
                8 ₽
              </span>
              <span style={{ fontSize: "13px", color: "#565E6B" }}>
                стоит одна примерка
              </span>
            </span>
          </div>
        </div>
        {" "}
        <div style={{ position: "relative", padding: "clamp(24px,3vw,40px)", background: "#0E1014", color: "#fff", display: "flex", flexDirection: "column", gap: "26px", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: "0", background: "radial-gradient(70% 60% at 80% 0%, rgba(47,90,230,.28) 0%, rgba(14,16,20,0) 70%)", pointerEvents: "none" }}></div>
          {" "}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: "rgba(255,255,255,.5)" }}>
              УХОДИТ НА ВОЗВРАТЫ В МЕСЯЦ
            </span>
            {" "}
            <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontWeight: "300", fontSize: "clamp(36px,4.4vw,60px)", lineHeight: "1", letterSpacing: "-.035em", whiteSpace: "nowrap", transform: `scale(${v.pulse})`, transformOrigin: "left center", transition: "transform 220ms cubic-bezier(.2,.8,.2,1)" }}>
              {v.monthFmt} ₽
            </span>
          </div>
          {" "}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "rgba(255,255,255,.62)" }}>
              <span>
                За год
              </span>
              <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", color: "#8FB0FF", whiteSpace: "nowrap" }}>
                {v.yearFmt} ₽
              </span>
            </div>
            {" "}
            <div style={{ height: "8px", borderRadius: "999px", background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg,#8FB0FF 0%,#2F5AE6 100%)" }}></div>
            </div>
            {" "}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "rgba(255,255,255,.62)" }}>
              <span>
                Примерки на все заказы за год
              </span>
              <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", color: "#fff", whiteSpace: "nowrap" }}>
                {v.tryonYearFmt} ₽
              </span>
            </div>
            {" "}
            <div style={{ height: "8px", borderRadius: "999px", background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: v.tryonShare, background: "#fff", transition: "width 260ms cubic-bezier(.2,.8,.2,1)" }}></div>
            </div>
            {" "}
            <span style={{ fontSize: "13px", lineHeight: "1.5", color: "rgba(255,255,255,.62)" }}>
              Примерка каждому покупателю стоит {v.tryonShareLabel} от того, что вы платите за возвраты.
            </span>
          </div>
          {" "}
          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "12px" }}>
            <div style={{ borderRadius: "16px", background: "rgba(255,255,255,.07)", padding: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontWeight: "300", fontSize: "24px", lineHeight: "1", color: "#8FB0FF", whiteSpace: "nowrap" }}>
                {v.payback}
              </span>
              <span style={{ fontSize: "13px", lineHeight: "1.35", color: "rgba(255,255,255,.62)" }}>
                примерок окупает один невозврат
              </span>
            </div>
            {" "}
            <div style={{ borderRadius: "16px", background: "rgba(255,255,255,.07)", padding: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontWeight: "300", fontSize: "24px", lineHeight: "1", color: "#fff", whiteSpace: "nowrap" }}>
                {v.breakEven}
              </span>
              <span style={{ fontSize: "13px", lineHeight: "1.35", color: "rgba(255,255,255,.62)" }}>
                невозвратов в месяц — и инструмент бесплатен
              </span>
            </div>
          </div>
          {" "}
          <div style={{ position: "relative", marginTop: "auto", display: "flex", flexDirection: "column", gap: "14px" }}>
            <span style={{ fontSize: "15px", lineHeight: "1.5" }}>
              <b style={{ fontWeight: "500" }}>
                Мы не обещаем процент. Мы ставим счётчик.
              </b>
              <span style={{ color: "rgba(255,255,255,.68)" }}>
                {" В кабинете видно, сколько примерили, что положили в корзину и что выкупили."}
              </span>
            </span>
            {" "}
            <a className="scp1" href="#form" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: "56px", borderRadius: "999px", boxSizing: "border-box", background: "#fff", color: "#121417", fontSize: "16px", fontWeight: "500", textDecoration: "none", whiteSpace: "nowrap" }}>
              Показать примерку на моих товарах
            </a>
            {" "}
            <span style={{ fontSize: "12px", lineHeight: "1.5", color: "rgba(255,255,255,.5)" }}>
              Цифры по рынку — из отраслевых исследований, не наши обещания.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
