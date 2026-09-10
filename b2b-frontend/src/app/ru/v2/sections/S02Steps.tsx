/* СГЕНЕРИРОВАНО scripts/dc-to-tsx.mjs — не править руками.
   Источник: design-handoff/ru-landing/MakeMeLook Landing.dc.html */

import type { LandingVals } from '../useLandingVals';
import { StepMedia } from '../StepMedia';

export function S02Steps(_props: { v: LandingVals }) {
  return (
    <section id="steps" data-screen-label="02 Steps" style={{ padding: "120px 24px 0", maxWidth: "1288px", margin: "0 auto" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto 48px", textAlign: "center" }}>
        <span style={{ display: "inline-flex", height: "28px", alignItems: "center", padding: "0 12px", borderRadius: "999px", background: "#fff", fontSize: "12px", fontWeight: "500", color: "#565E6B", whiteSpace: "nowrap" }}>
          Для покупателя
        </span>
        {" "}
        <h2 style={{ margin: "18px 0 0", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "clamp(28px,3vw,44px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" }}>
          Три шага на странице товара
        </h2>
        {" "}
        <p style={{ margin: "18px 0 0", fontSize: "17px", lineHeight: "1.5", color: "#565E6B" }}>
          Уходить с сайта не нужно, регистрироваться тоже. Виджет открывается по кнопке «Примерить».
        </p>
      </div>
      {" "}
      <div id="step-cards" style={{ display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "120px" }}>
        <div data-r="stepcard" style={{ position: "sticky", top: "72px", borderRadius: "28px", overflow: "hidden", background: "linear-gradient(140deg,#2A3854 0%,#141C29 55%,#0E1014 100%)", padding: "clamp(20px,2.2vw,28px)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "clamp(20px,2.4vw,32px)", alignItems: "center", minHeight: "420px", boxShadow: "0 -18px 40px rgba(10,14,22,.18)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "clamp(8px,1.6vw,20px)" }}>
            <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: "rgba(255,255,255,.6)" }}>
              ШАГ 01 / 03
            </span>
            {" "}
            <h3 style={{ margin: "0", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "clamp(22px,2.2vw,32px)", lineHeight: "1.1", letterSpacing: "-.025em", color: "#fff" }}>
              Нажимает «Примерить»
            </h3>
            {" "}
            <p style={{ margin: "0", maxWidth: "420px", fontSize: "17px", lineHeight: "1.55", color: "rgba(255,255,255,.78)" }}>
              Кнопка живёт на карточке товара. Вид, место и текст настраиваются под ваш магазин — виджет не выглядит вставкой.
            </p>
            {" "}
            <span style={{ display: "inline-flex", alignItems: "center", gap: "10px", height: "40px", padding: "0 16px", borderRadius: "999px", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", color: "#fff", fontSize: "14px", whiteSpace: "nowrap", alignSelf: "flex-start" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#8FB0FF" }}></span>
              Примерить
            </span>
          </div>
          {" "}
          <div className="stepmedia">
            <StepMedia step={1} alt="Запись экрана: покупатель открывает каталог и нажимает «Примерить» на карточке платья" />
          </div>
        </div>
        {" "}
        <div data-r="stepcard" style={{ position: "sticky", top: "88px", borderRadius: "28px", overflow: "hidden", background: "linear-gradient(140deg,#24405E 0%,#16202E 55%,#0E1014 100%)", padding: "clamp(20px,2.2vw,28px)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "clamp(20px,2.4vw,32px)", alignItems: "center", minHeight: "420px", boxShadow: "0 -18px 40px rgba(10,14,22,.18)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "clamp(8px,1.6vw,20px)" }}>
            <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: "rgba(255,255,255,.6)" }}>
              ШАГ 02 / 03
            </span>
            {" "}
            <h3 style={{ margin: "0", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "clamp(22px,2.2vw,32px)", lineHeight: "1.1", letterSpacing: "-.025em", color: "#fff" }}>
              Загружает одно фото
            </h3>
            {" "}
            <p style={{ margin: "0", maxWidth: "420px", fontSize: "17px", lineHeight: "1.55", color: "rgba(255,255,255,.78)" }}>
              Обычное фото в полный рост. Регистрация не нужна, второй раз загружать тоже — фото сохраняется для следующих примерок.
            </p>
            {" "}
            <span style={{ display: "inline-flex", alignItems: "center", gap: "10px", height: "40px", padding: "0 16px", borderRadius: "999px", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", color: "#fff", fontSize: "14px", whiteSpace: "nowrap", alignSelf: "flex-start" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#8FB0FF" }}></span>
              Загрузить фото
            </span>
          </div>
          {" "}
          <div className="stepmedia">
            <StepMedia step={2} alt="Запись экрана: покупатель выбирает своё фото в полный рост и подтверждает загрузку" />
          </div>
        </div>
        {" "}
        <div data-r="stepcard" style={{ position: "sticky", top: "104px", borderRadius: "28px", overflow: "hidden", background: "linear-gradient(140deg,#1E4A72 0%,#152331 55%,#0E1014 100%)", padding: "clamp(20px,2.2vw,28px)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "clamp(20px,2.4vw,32px)", alignItems: "center", minHeight: "420px", boxShadow: "0 -18px 40px rgba(10,14,22,.18)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "clamp(8px,1.6vw,20px)" }}>
            <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: "rgba(255,255,255,.6)" }}>
              ШАГ 03 / 03
            </span>
            {" "}
            <h3 style={{ margin: "0", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "clamp(22px,2.2vw,32px)", lineHeight: "1.1", letterSpacing: "-.025em", color: "#fff" }}>
              Видит вещь на себе
            </h3>
            {" "}
            <p style={{ margin: "0", maxWidth: "420px", fontSize: "17px", lineHeight: "1.55", color: "rgba(255,255,255,.78)" }}>
              Не на модели, похожей на него, а на нём. Вместе с результатом сразу приходит рекомендованный размер — посчитанный по замерам этого изделия, а не по общей таблице.
            </p>
            {" "}
            <span style={{ display: "inline-flex", alignItems: "center", gap: "10px", height: "40px", padding: "0 16px", borderRadius: "999px", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", color: "#fff", fontSize: "14px", whiteSpace: "nowrap", alignSelf: "flex-start" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#8FB0FF" }}></span>
              Ваш размер — M
            </span>
          </div>
          {" "}
          <div className="stepmedia">
            <StepMedia step={3} alt="Запись экрана: платье появляется на самом покупателе, рядом — рекомендованный размер M" />
          </div>
        </div>
      </div>
    </section>
  );
}
