/* СГЕНЕРИРОВАНО scripts/dc-to-tsx.mjs — не править руками.
   Источник: design-handoff/ru-landing/MakeMeLook Landing.dc.html */

import { Fragment } from 'react';

import type { LandingVals } from '../useLandingVals';

export function S08Product({ v }: { v: LandingVals }) {
  return (
    <section data-screen-label="08 Product" style={{ padding: "200px 12px 0" }}>
      <div style={{ position: "relative", borderRadius: "28px", overflow: "hidden", background: "#0E1014", color: "#fff", padding: "clamp(28px,4vw,56px) clamp(18px,3vw,40px)" }}>
        <div style={{ position: "absolute", inset: "0", background: "radial-gradient(60% 50% at 18% 12%, rgba(59,107,255,.22) 0%, rgba(14,16,20,0) 70%),radial-gradient(50% 40% at 90% 90%, rgba(143,176,255,.12) 0%, rgba(14,16,20,0) 70%)", pointerEvents: "none" }}></div>
        {" "}
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: "40px", alignItems: "start", maxWidth: "1288px", margin: "0 auto" }}>
          <div data-r="sticky" style={{ position: "sticky", top: "28px", display: "flex", flexDirection: "column", gap: "28px" }}>
            <div>
              <span style={{ display: "inline-flex", height: "28px", alignItems: "center", padding: "0 12px", borderRadius: "999px", background: "rgba(255,255,255,.1)", fontSize: "12px", fontWeight: "500", color: "rgba(255,255,255,.75)", whiteSpace: "nowrap" }}>
                Вы получаете
              </span>
              {" "}
              <h2 style={{ margin: "18px 0 0", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "clamp(28px,3vw,44px)", lineHeight: "1.08", letterSpacing: "-.03em" }}>
                {"Инструменты, которые "}
                <span style={{ fontWeight: "400", color: "#C9D6E4" }}>
                  работают на вас
                </span>
              </h2>
            </div>
            {" "}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
              {(v.tabs ?? []).map((t, i0) => (
                <Fragment key={i0}>
                  <button className="scp4" onClick={t.pick} style={{ display: "inline-flex", alignItems: "center", gap: "12px", height: "46px", padding: "0 20px", borderRadius: "999px", border: "none", background: t.bg, color: t.color, fontFamily: "'Golos Text',sans-serif", fontSize: "17px", fontWeight: "500", cursor: "pointer", transition: "background 200ms,color 200ms", whiteSpace: "nowrap" }}>
                    <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", opacity: ".55" }}>
                      {t.n}
                    </span>
                    {t.label}
                  </button>
                </Fragment>
              ))}
            </div>
            {" "}
            <p style={{ margin: "0", maxWidth: "380px", fontSize: "17px", lineHeight: "1.55", color: "rgba(255,255,255,.65)" }}>
              {v.tabText}
            </p>
            {" "}
            <a className="scp1" href="#form" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: "52px", padding: "0 26px", borderRadius: "999px", background: "#fff", color: "#121417", fontSize: "17px", fontWeight: "500", textDecoration: "none", whiteSpace: "nowrap", alignSelf: "flex-start" }}>
              Посмотреть на моих товарах
            </a>
          </div>
          {" "}
          <div style={{ position: "relative", borderRadius: "28px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", padding: "20px", minHeight: "600px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "0 4px" }}>
              <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: "rgba(255,255,255,.5)", whiteSpace: "nowrap" }}>
                ЭКРАН {v.tabNum}
              </span>
              <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: "rgba(255,255,255,.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {v.tabMeta}
              </span>
            </div>
            {" "}
            {(v.isTryon) ? (
              <>
                <div style={{ position: "relative", flex: "1", borderRadius: "16px", overflow: "hidden", background: "#0E1014", minHeight: "520px" }}>
                  <img src="/landing/ru/look-2.jpg" alt="" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 25%" }} />
                  {" "}
                  <div style={{ position: "absolute", inset: "0", background: "linear-gradient(180deg,rgba(10,14,22,.3) 0%,rgba(10,14,22,0) 35%,rgba(10,14,22,.55) 100%)" }}></div>
                  {" "}
                  <div style={{ position: "absolute", top: "16px", left: "16px", right: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {(v.tryonLayers ?? []).map((l, i0) => (
                      <Fragment key={i0}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", height: "34px", padding: "0 14px 0 6px", borderRadius: "999px", background: "rgba(255,255,255,.92)", color: "#121417", fontSize: "15px", fontWeight: "500", whiteSpace: "nowrap" }}>
                          <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: l.dot }}></span>
                          {l.name}
                        </span>
                      </Fragment>
                    ))}
                    {" "}
                    <span style={{ display: "inline-flex", alignItems: "center", height: "34px", padding: "0 14px", borderRadius: "999px", border: "1px dashed rgba(255,255,255,.45)", color: "#fff", fontSize: "15px", whiteSpace: "nowrap" }}>
                      + слой
                    </span>
                  </div>
                  {" "}
                  <div style={{ position: "absolute", left: "16px", right: "16px", bottom: "16px", display: "flex", gap: "10px", alignItems: "flex-end" }}>
                    <div style={{ flex: "1", borderRadius: "16px", background: "rgba(255,255,255,.94)", color: "#121417", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                      <span style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: "0" }}>
                        <span style={{ fontSize: "12px", color: "#565E6B" }}>
                          Артикул DR-2041 · слой 2 из 5
                        </span>
                        <span style={{ fontSize: "15px", fontWeight: "500" }}>
                          Ваш размер по сетке этого изделия
                        </span>
                      </span>
                      {" "}
                      <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "36px", fontWeight: "300", color: "#2F5AE6", lineHeight: "1", flex: "none" }}>
                        M
                      </span>
                    </div>
                    {" "}
                    <span style={{ height: "52px", padding: "0 22px", display: "inline-flex", alignItems: "center", borderRadius: "999px", background: "#121417", color: "#fff", fontSize: "15px", fontWeight: "500", whiteSpace: "nowrap" }}>
                      В корзину
                    </span>
                  </div>
                </div>
              </>
            ) : null}
            {" "}
            {(v.isSize) ? (
              <>
                <div style={{ flex: "1", borderRadius: "16px", background: "#fff", color: "#121417", padding: "28px", display: "flex", flexDirection: "column", gap: "24px", minHeight: "520px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: "15px", color: "#565E6B" }}>
                        Платье-миди из плотной шерсти
                      </div>
                      <div style={{ marginTop: "6px", fontSize: "20px", fontWeight: "500" }}>
                        Рекомендуем размер
                      </div>
                    </div>
                    {" "}
                    <div style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontWeight: "300", fontSize: "72px", lineHeight: ".9", color: "#2F5AE6" }}>
                      M
                    </div>
                  </div>
                  {" "}
                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    {(v.fitRows ?? []).map((f, i0) => (
                      <Fragment key={i0}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px" }}>
                            <span>
                              {f.name}
                            </span>
                            <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", color: "#565E6B" }}>
                              {f.value}
                            </span>
                          </div>
                          {" "}
                          <div style={{ position: "relative", height: "6px", borderRadius: "999px", background: "#EEF0F3" }}>
                            <span style={{ position: "absolute", left: "0", top: "0", bottom: "0", width: f.w, borderRadius: "999px", background: f.color }}></span>
                            <span style={{ position: "absolute", left: f.mark, top: "-5px", width: "2px", height: "16px", background: "#121417" }}></span>
                          </div>
                          {" "}
                          <div style={{ fontSize: "15px", color: "#565E6B" }}>
                            {f.note}
                          </div>
                        </div>
                      </Fragment>
                    ))}
                  </div>
                  {" "}
                  <div style={{ marginTop: "auto", padding: "16px 18px", borderRadius: "16px", background: "#F6F7F9", fontSize: "15px", lineHeight: "1.5", color: "#3A414B" }}>
                    Считаем по вашей размерной сетке: замеры этого изделия против параметров покупателя. Не по усреднённой таблице.
                  </div>
                </div>
              </>
            ) : null}
            {" "}
            {(v.isStylist) ? (
              <>
                <div style={{ flex: "1", borderRadius: "16px", background: "#fff", color: "#121417", padding: "24px", display: "flex", flexDirection: "column", gap: "14px", minHeight: "520px" }}>
                  {(v.chat ?? []).map((m, i0) => (
                    <Fragment key={i0}>
                      <div style={{ maxWidth: "82%", alignSelf: m.align, borderRadius: m.radius, background: m.bg, color: m.color, padding: "14px 16px", fontSize: "15px", lineHeight: "1.45" }}>
                        {m.text}
                      </div>
                    </Fragment>
                  ))}
                  {" "}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginTop: "4px" }}>
                    <div style={{ borderRadius: "16px", overflow: "hidden", background: "#EEF0F3", height: "150px", position: "relative" }}>
                      <img src="/landing/ru/look-1.jpg" alt="Образ из каталога: Платье-миди" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 30%" }} />
                      <span style={{ position: "absolute", left: "10px", bottom: "10px", height: "26px", padding: "0 10px", display: "inline-flex", alignItems: "center", borderRadius: "999px", background: "rgba(255,255,255,.92)", fontSize: "12px", fontWeight: "500", whiteSpace: "nowrap" }}>
                        Платье-миди
                      </span>
                    </div>
                    {" "}
                    <div style={{ borderRadius: "16px", overflow: "hidden", background: "#EEF0F3", height: "150px", position: "relative" }}>
                      <img src="/landing/ru/look-2.jpg" alt="Образ из каталога: Пальто" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 35%" }} />
                      <span style={{ position: "absolute", left: "10px", bottom: "10px", height: "26px", padding: "0 10px", display: "inline-flex", alignItems: "center", borderRadius: "999px", background: "rgba(255,255,255,.92)", fontSize: "12px", fontWeight: "500", whiteSpace: "nowrap" }}>
                        Пальто
                      </span>
                    </div>
                    {" "}
                    <div style={{ borderRadius: "16px", overflow: "hidden", background: "#EEF0F3", height: "150px", position: "relative" }}>
                      <img src="/landing/ru/look-7.jpg" alt="Образ из каталога: Жакет" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 30%" }} />
                      <span style={{ position: "absolute", left: "10px", bottom: "10px", height: "26px", padding: "0 10px", display: "inline-flex", alignItems: "center", borderRadius: "999px", background: "rgba(255,255,255,.92)", fontSize: "12px", fontWeight: "500", whiteSpace: "nowrap" }}>
                        Жакет
                      </span>
                    </div>
                  </div>
                  {" "}
                  <div style={{ marginTop: "auto", display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ flex: "1", height: "48px", borderRadius: "999px", background: "#F6F7F9", display: "flex", alignItems: "center", padding: "0 18px", fontSize: "15px", color: "#565E6B" }}>
                      Опишите повод — соберём образ из вашего каталога
                    </span>
                    <span style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#121417", color: "#fff", display: "grid", placeItems: "center", fontSize: "17px" }}>
                      →
                    </span>
                  </div>
                </div>
              </>
            ) : null}
            {" "}
            {(v.isCustom) ? (
              <>
                <div style={{ flex: "1", borderRadius: "16px", background: "#fff", color: "#121417", padding: "28px", display: "flex", flexDirection: "column", gap: "24px", minHeight: "520px" }}>
                  <div style={{ fontSize: "20px", fontWeight: "500" }}>
                    Кнопка «Примерить» на вашей карточке
                  </div>
                  {" "}
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: "#565E6B" }}>
                      ЦВЕТ АКЦЕНТА
                    </div>
                    {" "}
                    <div style={{ display: "flex", gap: "10px" }}>
                      {(v.swatches ?? []).map((s, i0) => (
                        <Fragment key={i0}>
                          <button onClick={s.pick} title="Выбрать цвет" style={{ width: "40px", height: "40px", borderRadius: "50%", background: s.color, border: `2px solid ${s.ring}`, cursor: "pointer", padding: "0" }}></button>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                  {" "}
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: "#565E6B" }}>
                      ФОРМА И ТЕКСТ
                    </div>
                    {" "}
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {(v.shapes ?? []).map((sh, i0) => (
                        <Fragment key={i0}>
                          <button onClick={sh.pick} style={{ height: "40px", padding: "0 16px", borderRadius: "16px", border: `1px solid ${sh.border}`, background: sh.bg, color: sh.color, fontFamily: "'Golos Text',sans-serif", fontSize: "15px", cursor: "pointer", whiteSpace: "nowrap" }}>
                            {sh.label}
                          </button>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                  {" "}
                  <div style={{ flex: "1", borderRadius: "16px", background: "#F6F7F9", padding: "24px", display: "flex", gap: "20px", alignItems: "center" }}>
                    <div style={{ width: "110px", height: "150px", borderRadius: "16px", overflow: "hidden", background: "#E4E8ED", position: "relative", flex: "none" }}>
                      <img src="/landing/ru/look-1.jpg" alt="" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 25%" }} />
                    </div>
                    {" "}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: "0" }}>
                      <span style={{ fontSize: "12px", color: "#565E6B" }}>
                        Платья / Миди
                      </span>
                      {" "}
                      <span style={{ fontSize: "17px", fontWeight: "500", lineHeight: "1.3" }}>
                        Платье-миди из плотной шерсти
                      </span>
                      {" "}
                      <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "17px" }}>
                        14 900 ₽
                      </span>
                      {" "}
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: "46px", padding: "0 20px", borderRadius: v.btnRadius, background: v.accent, color: "#fff", fontSize: "15px", fontWeight: "500", whiteSpace: "nowrap", alignSelf: "flex-start" }}>
                        {v.btnLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
            {" "}
            {(v.isStats) ? (
              <>
                <div style={{ flex: "1", borderRadius: "16px", background: "#fff", color: "#121417", padding: "28px", display: "flex", flexDirection: "column", gap: "24px", minHeight: "520px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "20px", fontWeight: "500", whiteSpace: "nowrap" }}>
                      Кабинет · сентябрь
                    </span>
                    <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".03em", color: "#565E6B" }}>
                      ДАННЫЕ ВАШЕГО МАГАЗИНА
                    </span>
                  </div>
                  {" "}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "10px" }}>
                    {(v.kpis ?? []).map((k, i0) => (
                      <Fragment key={i0}>
                        <div style={{ borderRadius: "16px", background: "#F6F7F9", padding: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                          <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontWeight: "300", fontSize: "26px", lineHeight: "1", color: k.color, whiteSpace: "nowrap" }}>
                            {k.value}
                          </span>
                          <span style={{ fontSize: "12px", lineHeight: "1.35", color: "#565E6B" }}>
                            {k.label}
                          </span>
                        </div>
                      </Fragment>
                    ))}
                  </div>
                  {" "}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: "#565E6B" }}>
                      ПРИМЕРКИ ПО ДНЯМ
                    </span>
                    {" "}
                    <div style={{ height: "150px", display: "flex", alignItems: "flex-end", gap: "6px" }}>
                      {(v.statBars ?? []).map((s2, i0) => (
                        <Fragment key={i0}>
                          <div style={{ flex: "1", height: s2.h, borderRadius: "999px", background: s2.color }}></div>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                  {" "}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: "#565E6B", marginBottom: "10px" }}>
                      ЧАЩЕ ВСЕГО МЕРИЛИ
                    </span>
                    {" "}
                    {(v.topItems ?? []).map((i, i0) => (
                      <Fragment key={i0}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "12px 0", borderBottom: "1px solid rgba(18,20,23,.08)" }}>
                          <span style={{ fontSize: "15px", minWidth: "0" }}>
                            {i.name}
                          </span>
                          <span style={{ display: "flex", gap: "20px", flex: "none" }}>
                            <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "15px", color: "#565E6B", whiteSpace: "nowrap" }}>
                              {i.tryons}
                            </span>
                            <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "15px", color: "#2F5AE6", whiteSpace: "nowrap" }}>
                              {i.cart}
                            </span>
                          </span>
                        </div>
                      </Fragment>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
