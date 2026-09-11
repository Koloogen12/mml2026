/* СГЕНЕРИРОВАНО scripts/dc-to-tsx.mjs — не править руками.
   Источник: design-handoff/ru-landing/MakeMeLook Landing.dc.html */

import { Fragment } from 'react';

import type { LandingVals } from '../useLandingVals';

export function S06WhyWorks({ v }: { v: LandingVals }) {
  return (
    <section data-screen-label="06 Why works" style={{ padding: "120px 24px 0", maxWidth: "1288px", margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", alignItems: "end", gap: "24px 48px", marginBottom: "40px" }}>
        <div>
          <span style={{ display: "inline-flex", height: "28px", alignItems: "center", padding: "0 12px", borderRadius: "999px", background: "#fff", fontSize: "12px", fontWeight: "500", color: "#565E6B", whiteSpace: "nowrap" }}>
            Слои и происхождение
          </span>
          <h2 style={{ margin: "18px 0 0", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "clamp(28px,3vw,44px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" }}>
            {"Один человек, одна поза, "}
            <span style={{ fontWeight: "400", color: "#565E6B" }}>
              меняются слои
            </span>
          </h2>
        </div>
        {" "}
        <p style={{ margin: "0", maxWidth: "420px", fontSize: "17px", lineHeight: "1.5", color: "#565E6B", justifySelf: "end" }}>
          Меняется только количество слоёв одежды. Примерка у маркетплейсов умеет ровно первое состояние — это видно, а не заявлено.
        </p>
      </div>
      {" "}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "12px", alignItems: "stretch" }}>
        <div style={{ position: "relative", borderRadius: "28px", overflow: "hidden", background: "#0E1014", aspectRatio: "3/4", width: "100%" }}>
          <img src="/landing/ru/layer-1.webp" alt="Один человек в одной позе, 1 слой одежды: рубашка" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 50%", opacity: v.lo0, transition: "opacity 500ms ease" }} />
          {" "}
          <img src="/landing/ru/layer-2.webp" alt="Один человек в одной позе, 3 слоя одежды: брюки палаццо, рубашка и сумка-хобо" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 50%", opacity: v.lo1, transition: "opacity 500ms ease" }} />
          {" "}
          <img src="/landing/ru/layer-3.webp" alt="Один человек в одной позе, 4 слоя одежды: те же три вещи плюс трикотажный жилет" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 50%", opacity: v.lo2, transition: "opacity 500ms ease" }} />
          {" "}
          <img src="/landing/ru/layer-4.webp" alt="Один человек в одной позе, 5 слоёв одежды: те же четыре вещи плюс пальто оверсайз" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 50%", opacity: v.lo3, transition: "opacity 500ms ease" }} />
          {" "}
          <div style={{ position: "absolute", inset: "0", background: "linear-gradient(180deg,rgba(10,14,22,.4) 0%,rgba(10,14,22,0) 30%,rgba(10,14,22,.6) 100%)", pointerEvents: "none" }}></div>
          {" "}
          <div style={{ position: "absolute", top: "20px", left: "20px", right: "20px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(v.layerTabs ?? []).map((lt, i0) => (
              <Fragment key={i0}>
                <button onClick={lt.pick} style={{ height: "44px", padding: "0 18px", borderRadius: "999px", border: `1px solid ${lt.border}`, background: lt.bg, color: lt.color, fontFamily: "'Golos Text',sans-serif", fontSize: "15px", fontWeight: "500", cursor: "pointer", whiteSpace: "nowrap", backdropFilter: "blur(14px)" }}>
                  {lt.label}
                </button>
              </Fragment>
            ))}
          </div>
          {" "}
          <div style={{ position: "absolute", left: "20px", right: "20px", bottom: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {(v.activeLayerChips ?? []).map((ch, i0) => (
                <Fragment key={i0}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", height: "32px", padding: "0 14px 0 6px", borderRadius: "999px", background: "rgba(255,255,255,.92)", color: "#121417", fontSize: "15px", fontWeight: "500", whiteSpace: "nowrap" }}>
                    <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: ch.dot }}></span>
                    {ch.name}
                  </span>
                </Fragment>
              ))}
            </div>
            {" "}
            <div style={{ borderRadius: "16px", background: "rgba(255,255,255,.94)", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px" }}>
              <span style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: "0" }}>
                <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".03em", color: "#565E6B" }}>
                  СЛОЁВ В ОБРАЗЕ · {v.layerCount}
                </span>
                <span style={{ fontSize: "15px", lineHeight: "1.35" }}>
                  {v.layerNote}
                </span>
              </span>
              {" "}
              <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "34px", fontWeight: "300", color: "#2F5AE6", lineHeight: "1", flex: "none" }}>
                M
              </span>
            </div>
          </div>
        </div>
        {" "}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ background: "#fff", borderRadius: "28px", padding: "clamp(22px,2.6vw,32px)", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "20px", flex: "1" }}>
            <div>
              <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: "#565E6B" }}>
                ПРОИСХОЖДЕНИЕ ВЕЩИ
              </span>
              {" "}
              <h3 style={{ margin: "12px 0 0", fontSize: "22px", fontWeight: "500", lineHeight: "1.3", letterSpacing: "-.015em" }}>
                Это точно ваш артикул, а не похожая вещь
              </h3>
            </div>
            {" "}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ position: "relative", borderRadius: "16px", overflow: "hidden", background: "#EEF0F3", aspectRatio: "3/4" }}>
                  <img src="/landing/ru/prov-catalog.webp" alt="Фотография жилета из каталога магазина: полосатый V-образный кант" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 50%" }} />
                  <span style={{ position: "absolute", left: "50%", top: "75%", width: "72px", height: "72px", borderRadius: "50%", border: "2px solid #2F5AE6", transform: "translate(-50%,-50%)", boxShadow: "0 0 0 9999px rgba(18,20,23,.18)" }}></span>
                </div>
                {" "}
                <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".03em", color: "#565E6B" }}>
                  ФОТО ИЗ КАТАЛОГА
                </span>
              </div>
              {" "}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ position: "relative", borderRadius: "16px", overflow: "hidden", background: "#EEF0F3", aspectRatio: "3/4" }}>
                  <img src="/landing/ru/prov-render.webp" alt="Наш рендер: тот же жилет на покупателе, кант с тем же порядком полос" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 50%" }} />
                  <span style={{ position: "absolute", left: "50%", top: "47%", width: "72px", height: "72px", borderRadius: "50%", border: "2px solid #2F5AE6", transform: "translate(-50%,-50%)", boxShadow: "0 0 0 9999px rgba(18,20,23,.18)" }}></span>
                </div>
                {" "}
                <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".03em", color: "#2F5AE6" }}>
                  НАШ РЕНДЕР
                </span>
              </div>
            </div>
            {" "}
            <p style={{ margin: "0", fontSize: "15px", lineHeight: "1.55", color: "#565E6B" }}>
              Сверьте порядок полос и переход цвета: на обоих кадрах обведён один и тот же элемент вашего изделия. Генератор картинок такую сверку не проходит — он рисует похожее.
            </p>
          </div>
          {" "}
          <a className="scp1" href="#form" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: "56px", borderRadius: "999px", background: "#121417", color: "#fff", fontSize: "17px", fontWeight: "500", textDecoration: "none", whiteSpace: "nowrap" }}>
            Собрать примерку на моём артикуле
          </a>
        </div>
      </div>
      {" "}
      <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(196px,1fr))", gap: "12px" }}>
        {(v.compare ?? []).map((c, i0) => (
          <Fragment key={i0}>
            <div style={{ background: c.bg, color: c.color, borderRadius: "28px", padding: "28px", display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: c.mutedColor }}>
                {c.title}
              </div>
              {" "}
              {(c.rows ?? []).map((r, i1) => (
                <Fragment key={i1}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingBottom: "14px", borderBottom: `1px solid ${c.line}` }}>
                    <span style={{ fontSize: "15px", color: c.mutedColor }}>
                      {r.k}
                    </span>
                    <span style={{ fontSize: "17px", fontWeight: "500" }}>
                      {r.v}
                    </span>
                  </div>
                </Fragment>
              ))}
            </div>
          </Fragment>
        ))}
      </div>
      {" "}
      <p style={{ margin: "24px auto 0", maxWidth: "760px", textAlign: "center", fontSize: "15px", lineHeight: "1.55", color: "#6B7380" }}>
        Генератор картинок здесь только строкой таблицы — как утверждение, а не как картинка. Сравнение верно в границах примерки маркетплейсов и генераторов; отличие, которое держится против всех, — расчёт размера по вашей размерной сетке.
      </p>
    </section>
  );
}
