/* СГЕНЕРИРОВАНО scripts/dc-to-tsx.mjs — не править руками.
   Источник: design-handoff/ru-landing/MakeMeLook Landing.dc.html */

import type { LandingVals } from '../useLandingVals';
import { HeroMedia } from '../HeroMedia';

export function S01Hero(_props: { v: LandingVals }) {
  return (
    <section data-screen-label="01 Hero" style={{ padding: "12px 12px 0" }}>
      <div style={{ position: "relative", height: "calc(100vh - 24px)", minHeight: "720px", borderRadius: "28px", overflow: "hidden", background: "#0E1014" }}>
        <HeroMedia style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 26%" }} />
        {" "}
        <div data-r="herophone" style={{ position: "absolute", right: "clamp(20px,3.4vw,44px)", bottom: "clamp(28px,5vh,48px)", height: "min(76%,760px)", aspectRatio: "732/1300", borderRadius: "28px", overflow: "hidden", background: "#3F6B8C", pointerEvents: "none" }}>
          <img src="/landing/ru/widget-ui.jpg" alt="Виджет примерки: образ на покупателе, слои со своими размерами и подбор верхней одежды из каталога" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 50%", display: "block" }} />
        </div>
        {" "}
        <div style={{ position: "absolute", inset: "0", background: "linear-gradient(180deg,rgba(10,14,22,.42) 0%,rgba(10,14,22,.12) 24%,rgba(10,14,22,.42) 58%,rgba(10,14,22,.88) 100%)", pointerEvents: "none" }}></div>
        {" "}
        <div style={{ position: "absolute", inset: "0", background: "linear-gradient(90deg,rgba(10,14,22,.7) 0%,rgba(10,14,22,.44) 34%,rgba(10,14,22,0) 64%)", pointerEvents: "none" }}></div>
        {" "}
        <header style={{ position: "absolute", top: "20px", left: "20px", right: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", zIndex: "3" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", height: "44px", padding: "0 18px 0 16px", borderRadius: "999px", background: "rgba(255,255,255,.14)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,.18)", color: "#fff", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "15px", letterSpacing: "-.02em", whiteSpace: "nowrap" }}>
            <span style={{ display: "inline-flex", width: "20px", height: "15px", flex: "none" }}>
              <svg viewBox="0 0 34 25" width="20" height="15" fill="none" aria-hidden="true">
                <path d="M33.6 24.4318H30.5455V3.8182C30.5455 3.66716 30.5007 3.51952 30.4168 3.39394C30.3329 3.26836 30.2136 3.17048 30.0741 3.11268C29.9345 3.05489 29.781 3.03976 29.6328 3.06923C29.4847 3.0987 29.3486 3.17143 29.2418 3.27823L11.8635 20.6566C11.5089 21.0111 11.088 21.2924 10.6248 21.4843C10.1615 21.6761 9.66502 21.7749 9.16361 21.7749C8.6622 21.7749 8.16569 21.6761 7.70245 21.4843C7.23921 21.2924 6.8183 21.0111 6.46375 20.6566L4.35812 18.551C4.25132 18.4442 4.11526 18.3715 3.96712 18.342C3.81899 18.3125 3.66545 18.3277 3.52591 18.3854C3.38637 18.4432 3.26711 18.5411 3.1832 18.6667C3.09929 18.7923 3.0545 18.9399 3.05449 19.091V24.4318H0V19.091C0 18.3358 0.223919 17.5976 0.643462 16.9697C1.06301 16.3418 1.65932 15.8524 2.357 15.5634C3.05468 15.2744 3.82239 15.1988 4.56304 15.3461C5.3037 15.4935 5.98403 15.8571 6.51801 16.3911L8.62363 18.4967C8.69453 18.5676 8.77871 18.6239 8.87135 18.6622C8.96399 18.7006 9.06329 18.7204 9.16357 18.7204C9.26384 18.7204 9.36314 18.7006 9.45578 18.6623C9.54843 18.6239 9.63261 18.5676 9.70351 18.4967L27.0819 1.11834C27.6159 0.584351 28.2962 0.220699 29.0369 0.0733701C29.7776 -0.073959 30.5453 0.00165186 31.243 0.290641C31.9406 0.579631 32.537 1.06902 32.9565 1.69692C33.3761 2.32482 33.6 3.06303 33.6 3.8182V24.4318Z" fill="#fff"></path>
              </svg>
            </span>
            MakeMeLook
          </div>
          {" "}
          <nav style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <a className="scp0" href="#steps" style={{ display: "inline-flex", alignItems: "center", height: "44px", padding: "0 18px", borderRadius: "999px", background: "rgba(255,255,255,.14)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,.18)", color: "#fff", fontSize: "15px", fontWeight: "500", textDecoration: "none", whiteSpace: "nowrap" }}>
              Как работает
            </a>
            {" "}
            <a className="scp1" href="#form" style={{ display: "inline-flex", alignItems: "center", height: "44px", padding: "0 20px", borderRadius: "999px", background: "#fff", color: "#121417", fontSize: "15px", fontWeight: "500", textDecoration: "none", whiteSpace: "nowrap" }}>
              Показать на моих товарах
            </a>
          </nav>
        </header>
        {" "}
        <div style={{ position: "absolute", left: "clamp(20px,3.4vw,44px)", right: "clamp(20px,3.4vw,44px)", bottom: "clamp(28px,5vh,48px)", maxWidth: "640px", zIndex: "3", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", textTransform: "uppercase", color: "#fff", maxWidth: "32ch" }}>
            Виртуальная примерка для интернет-магазинов одежды
          </span>
          {" "}
          <h1 style={{ margin: "20px 0 0", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "clamp(38px,4.6vw,68px)", lineHeight: "1.02", letterSpacing: "-.035em", color: "#fff", textWrap: "balance" }}>
            {"Ваша одежда на покупателе "}
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontWeight: "400", fontSize: "1.18em", letterSpacing: "-.01em" }}>
              до заказа
            </span>
          </h1>
          {" "}
          <p style={{ margin: "22px 0 0", maxWidth: "480px", fontSize: "clamp(16px,1.2vw,19px)", lineHeight: "1.45", color: "#fff" }}>
            Одно фото — и покупатель видит вашу вещь на себе. Размер считается по вашей размерной сетке.
          </p>
          {" "}
          <div style={{ display: "flex", gap: "10px", marginTop: "30px", flexWrap: "wrap" }}>
            <a className="scp1" href="#form" style={{ display: "inline-flex", alignItems: "center", height: "56px", padding: "0 26px", borderRadius: "999px", boxSizing: "border-box", background: "#fff", color: "#121417", fontSize: "17px", fontWeight: "500", textDecoration: "none", whiteSpace: "nowrap" }}>
              Покажите на моих товарах
            </a>
            {" "}
            <a className="scp0" href="#steps" style={{ display: "inline-flex", alignItems: "center", height: "56px", padding: "0 22px", borderRadius: "999px", boxSizing: "border-box", background: "rgba(255,255,255,.14)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,.22)", color: "#fff", fontSize: "17px", fontWeight: "500", textDecoration: "none", whiteSpace: "nowrap" }}>
              Как это выглядит
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
