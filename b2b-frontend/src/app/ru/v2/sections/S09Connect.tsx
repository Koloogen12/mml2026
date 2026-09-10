/* СГЕНЕРИРОВАНО scripts/dc-to-tsx.mjs — не править руками.
   Источник: design-handoff/ru-landing/MakeMeLook Landing.dc.html */

import { Fragment } from 'react';

import type { LandingVals } from '../useLandingVals';

export function S09Connect({ v }: { v: LandingVals }) {
  return (
    <section data-screen-label="09 Connect" style={{ padding: "120px 24px 0", maxWidth: "1288px", margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: "12px", alignItems: "start" }}>
        <div style={{ background: "#fff", borderRadius: "28px", padding: "clamp(24px,3vw,40px)" }}>
          <span style={{ display: "inline-flex", height: "28px", alignItems: "center", padding: "0 12px", borderRadius: "999px", background: "#F2F3F5", fontSize: "12px", fontWeight: "500", color: "#565E6B", whiteSpace: "nowrap" }}>
            Подключение
          </span>
          {" "}
          <h2 style={{ margin: "18px 0 0", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "clamp(26px,2.6vw,38px)", lineHeight: "1.1", letterSpacing: "-.03em" }}>
            {"Разработчик нужен на "}
            <span style={{ fontWeight: "400", color: "#565E6B" }}>
              десять минут
            </span>
          </h2>
          {" "}
          <div style={{ marginTop: "32px", display: "flex", flexDirection: "column" }}>
            {(v.connectSteps ?? []).map((c, i0) => (
              <Fragment key={i0}>
                <div style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: "18px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: c.dot, marginTop: "6px" }}></span>
                    <span style={{ flex: "1", width: "1px", background: c.line }}></span>
                  </div>
                  {" "}
                  <div style={{ paddingBottom: "28px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", color: "#565E6B" }}>
                        {c.n}
                      </span>
                      <span style={{ fontSize: "20px", fontWeight: "500", letterSpacing: "-.01em", lineHeight: "1.3" }}>
                        {c.title}
                      </span>
                    </div>
                    <p style={{ margin: "8px 0 0", fontSize: "15px", lineHeight: "1.5", color: "#565E6B", maxWidth: "420px" }}>
                      {c.text}
                    </p>
                  </div>
                </div>
              </Fragment>
            ))}
          </div>
          {" "}
          <div style={{ borderRadius: "16px", background: "#0E1014", padding: "20px 22px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: "rgba(255,255,255,.45)", whiteSpace: "nowrap" }}>
                СТРАНИЦА ТОВАРА · ОДНА СТРОКА
              </span>
              <span style={{ height: "26px", padding: "0 10px", display: "inline-flex", alignItems: "center", borderRadius: "999px", background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.7)", fontSize: "12px", whiteSpace: "nowrap" }}>
                скопировать
              </span>
            </div>
            {" "}
            <code style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "15px", lineHeight: "1.6", color: "#8FB0FF", wordBreak: "break-all" }}>
              &lt;script src=&quot;https://cdn.makemelook.ai/w.js&quot; data-shop=&quot;
              <span style={{ color: "#fff" }}>
                ваш-id
              </span>
              &quot; defer&gt;&lt;/script&gt;
            </code>
          </div>
          {" "}
          <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: "8px" }}>
            {(v.platforms ?? []).map((p2, i0) => (
              <Fragment key={i0}>
                <div style={{ borderRadius: "16px", background: "#F6F7F9", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "4px", minWidth: "0" }}>
                  <span style={{ fontSize: "15px", fontWeight: "500", whiteSpace: "nowrap" }}>
                    {p2.name}
                  </span>
                  <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "11px", color: "#565E6B" }}>
                    {p2.note}
                  </span>
                </div>
              </Fragment>
            ))}
          </div>
          {" "}
          <div style={{ marginTop: "16px", padding: "18px 20px", borderRadius: "16px", background: "#F6F7F9", borderLeft: "2px solid #2F5AE6", fontSize: "15px", lineHeight: "1.5" }}>
            Каталог импортируется из вашей системы или забирается прямо с сайта. Вручную заводить товары не нужно.
          </div>
        </div>
        {" "}
        <div data-r="sticky" style={{ position: "sticky", top: "24px", background: "#121417", color: "#fff", borderRadius: "28px", padding: "clamp(24px,3vw,40px)", display: "flex", flexDirection: "column", gap: "24px" }}>
          <h3 style={{ margin: "0", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "22px", letterSpacing: "-.02em" }}>
            Что нужно от вашей команды
          </h3>
          {" "}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", gap: "14px", alignItems: "baseline", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,.12)" }}>
              <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "22px", fontWeight: "300", color: "#8FB0FF", whiteSpace: "nowrap" }}>
                10 мин
              </span>
              <span style={{ fontSize: "15px", lineHeight: "1.45", color: "rgba(255,255,255,.75)" }}>
                разработчика — поставить скрипт на страницу товара
              </span>
            </div>
            {" "}
            <div style={{ display: "flex", gap: "14px", alignItems: "baseline", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,.12)" }}>
              <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "22px", fontWeight: "300", color: "#8FB0FF", whiteSpace: "nowrap" }}>
                1 файл
              </span>
              <span style={{ fontSize: "15px", lineHeight: "1.45", color: "rgba(255,255,255,.75)" }}>
                размерные сетки в любом формате
              </span>
            </div>
            {" "}
            <div style={{ display: "flex", gap: "14px", alignItems: "baseline" }}>
              <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "22px", fontWeight: "300", color: "#8FB0FF", whiteSpace: "nowrap" }}>
                1 ссылка
              </span>
              <span style={{ fontSize: "15px", lineHeight: "1.45", color: "rgba(255,255,255,.75)" }}>
                на каталог или доступ к нему
              </span>
            </div>
          </div>
          {" "}
          <div style={{ fontSize: "15px", lineHeight: "1.5", color: "rgba(255,255,255,.6)" }}>
            Нет разработчика — подключаем сами.
          </div>
          {" "}
          <a className="scp1" href="#form" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: "52px", borderRadius: "999px", background: "#fff", color: "#121417", fontSize: "17px", fontWeight: "500", textDecoration: "none", whiteSpace: "nowrap" }}>
            Прислать ссылку на каталог
          </a>
        </div>
      </div>
    </section>
  );
}
