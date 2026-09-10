/* СГЕНЕРИРОВАНО scripts/dc-to-tsx.mjs — не править руками.
   Источник: design-handoff/ru-landing/MakeMeLook Landing.dc.html */

import type { LandingVals } from '../useLandingVals';

export function S03Guess({ v }: { v: LandingVals }) {
  return (
    <section data-screen-label="03 Guess" data-anim="guess" style={{ padding: "200px 24px 0", maxWidth: "1288px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", maxWidth: "760px", margin: "0 auto 44px" }}>
        <h2 style={{ margin: "0", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "clamp(28px,3vw,44px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" }}>
          Где здесь съёмка, а где примерка?
        </h2>
        {" "}
        <p style={{ margin: "18px 0 0", fontSize: "17px", lineHeight: "1.5", color: "#565E6B" }}>
          Восемь кадров, четыре и четыре. Поставьте на каждый — съёмка это или примерка. Ответ появится сразу.
        </p>
      </div>
      {" "}
      <div data-r="guessgrid" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "16px" }}>
        <div style={{ position: "relative", borderRadius: "28px", overflow: "hidden", background: "#E4E8ED", aspectRatio: "3/4" }}>
          <img src="/landing/ru/look-1.jpg" alt="Кадр 1 из восьми: съёмка или примерка" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 22%" }} />
          {" "}
          <span style={{ position: "absolute", top: "14px", left: "14px", height: "28px", padding: "0 11px", display: "inline-flex", alignItems: "center", borderRadius: "999px", background: "rgba(255,255,255,.9)", fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", color: "#121417" }}>
            01
          </span>
          {" "}
          <div style={{ position: "absolute", left: "14px", right: "14px", bottom: "14px", display: "flex", gap: "8px", opacity: v.g0.betOpacity, pointerEvents: v.g0.betEvents, transition: "opacity 220ms" }}>
            <button className="scp2" onClick={v.g0.betShoot} style={{ flex: "1", minHeight: "44px", borderRadius: "999px", border: "none", background: "rgba(255,255,255,.94)", color: "#121417", fontFamily: "'Golos Text',sans-serif", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}>
              Съёмка
            </button>
            {" "}
            <button className="scp3" onClick={v.g0.betTryon} style={{ flex: "1", minHeight: "44px", borderRadius: "999px", border: "none", background: "rgba(18,20,23,.6)", color: "#fff", fontFamily: "'Golos Text',sans-serif", fontSize: "14px", fontWeight: "500", cursor: "pointer", backdropFilter: "blur(12px)" }}>
              Примерка
            </button>
          </div>
          {" "}
          <div style={{ position: "absolute", inset: "0", background: v.g0.plateBg, opacity: v.g0.plateOpacity, transition: "opacity 320ms", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "20px", pointerEvents: "none" }}>
            <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: v.g0.verdictColor }}>
              {v.g0.verdict}
            </span>
            {" "}
            <span style={{ marginTop: "6px", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "22px", letterSpacing: "-.02em", color: "#fff" }}>
              Это примерка
            </span>
            {" "}
            <span style={{ marginTop: "8px", fontSize: "14px", lineHeight: "1.45", color: "rgba(255,255,255,.82)" }}>
              Собрано на фото покупателя по артикулу из каталога
            </span>
          </div>
        </div>
        {" "}
        <div style={{ position: "relative", borderRadius: "28px", overflow: "hidden", background: "#E4E8ED", aspectRatio: "3/4" }}>
          <img src="/landing/ru/look-3.jpg" alt="Кадр 2 из восьми: съёмка или примерка" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 22%" }} />
          {" "}
          <span style={{ position: "absolute", top: "14px", left: "14px", height: "28px", padding: "0 11px", display: "inline-flex", alignItems: "center", borderRadius: "999px", background: "rgba(255,255,255,.9)", fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", color: "#121417" }}>
            02
          </span>
          {" "}
          <div style={{ position: "absolute", left: "14px", right: "14px", bottom: "14px", display: "flex", gap: "8px", opacity: v.g1.betOpacity, pointerEvents: v.g1.betEvents, transition: "opacity 220ms" }}>
            <button className="scp2" onClick={v.g1.betShoot} style={{ flex: "1", minHeight: "44px", borderRadius: "999px", border: "none", background: "rgba(255,255,255,.94)", color: "#121417", fontFamily: "'Golos Text',sans-serif", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}>
              Съёмка
            </button>
            {" "}
            <button className="scp3" onClick={v.g1.betTryon} style={{ flex: "1", minHeight: "44px", borderRadius: "999px", border: "none", background: "rgba(18,20,23,.6)", color: "#fff", fontFamily: "'Golos Text',sans-serif", fontSize: "14px", fontWeight: "500", cursor: "pointer", backdropFilter: "blur(12px)" }}>
              Примерка
            </button>
          </div>
          {" "}
          <div style={{ position: "absolute", inset: "0", background: v.g1.plateBg, opacity: v.g1.plateOpacity, transition: "opacity 320ms", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "20px", pointerEvents: "none" }}>
            <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: v.g1.verdictColor }}>
              {v.g1.verdict}
            </span>
            {" "}
            <span style={{ marginTop: "6px", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "22px", letterSpacing: "-.02em", color: "#fff" }}>
              Это съёмка
            </span>
            {" "}
            <span style={{ marginTop: "8px", fontSize: "14px", lineHeight: "1.45", color: "rgba(255,255,255,.82)" }}>
              Снято фотографом на студийной съёмке
            </span>
          </div>
        </div>
        {" "}
        <div style={{ position: "relative", borderRadius: "28px", overflow: "hidden", background: "#E4E8ED", aspectRatio: "3/4" }}>
          <img src="/landing/ru/look-4.jpg" alt="Кадр 3 из восьми: съёмка или примерка" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 22%" }} />
          {" "}
          <span style={{ position: "absolute", top: "14px", left: "14px", height: "28px", padding: "0 11px", display: "inline-flex", alignItems: "center", borderRadius: "999px", background: "rgba(255,255,255,.9)", fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", color: "#121417" }}>
            03
          </span>
          {" "}
          <div style={{ position: "absolute", left: "14px", right: "14px", bottom: "14px", display: "flex", gap: "8px", opacity: v.g2.betOpacity, pointerEvents: v.g2.betEvents, transition: "opacity 220ms" }}>
            <button className="scp2" onClick={v.g2.betShoot} style={{ flex: "1", minHeight: "44px", borderRadius: "999px", border: "none", background: "rgba(255,255,255,.94)", color: "#121417", fontFamily: "'Golos Text',sans-serif", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}>
              Съёмка
            </button>
            {" "}
            <button className="scp3" onClick={v.g2.betTryon} style={{ flex: "1", minHeight: "44px", borderRadius: "999px", border: "none", background: "rgba(18,20,23,.6)", color: "#fff", fontFamily: "'Golos Text',sans-serif", fontSize: "14px", fontWeight: "500", cursor: "pointer", backdropFilter: "blur(12px)" }}>
              Примерка
            </button>
          </div>
          {" "}
          <div style={{ position: "absolute", inset: "0", background: v.g2.plateBg, opacity: v.g2.plateOpacity, transition: "opacity 320ms", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "20px", pointerEvents: "none" }}>
            <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: v.g2.verdictColor }}>
              {v.g2.verdict}
            </span>
            {" "}
            <span style={{ marginTop: "6px", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "22px", letterSpacing: "-.02em", color: "#fff" }}>
              Это примерка
            </span>
            {" "}
            <span style={{ marginTop: "8px", fontSize: "14px", lineHeight: "1.45", color: "rgba(255,255,255,.82)" }}>
              Собрано на фото покупателя по артикулу из каталога
            </span>
          </div>
        </div>
        {" "}
        <div style={{ position: "relative", borderRadius: "28px", overflow: "hidden", background: "#E4E8ED", aspectRatio: "3/4" }}>
          <img src="/landing/ru/look-5.jpg" alt="Кадр 4 из восьми: съёмка или примерка" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 22%" }} />
          {" "}
          <span style={{ position: "absolute", top: "14px", left: "14px", height: "28px", padding: "0 11px", display: "inline-flex", alignItems: "center", borderRadius: "999px", background: "rgba(255,255,255,.9)", fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", color: "#121417" }}>
            04
          </span>
          {" "}
          <div style={{ position: "absolute", left: "14px", right: "14px", bottom: "14px", display: "flex", gap: "8px", opacity: v.g3.betOpacity, pointerEvents: v.g3.betEvents, transition: "opacity 220ms" }}>
            <button className="scp2" onClick={v.g3.betShoot} style={{ flex: "1", minHeight: "44px", borderRadius: "999px", border: "none", background: "rgba(255,255,255,.94)", color: "#121417", fontFamily: "'Golos Text',sans-serif", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}>
              Съёмка
            </button>
            {" "}
            <button className="scp3" onClick={v.g3.betTryon} style={{ flex: "1", minHeight: "44px", borderRadius: "999px", border: "none", background: "rgba(18,20,23,.6)", color: "#fff", fontFamily: "'Golos Text',sans-serif", fontSize: "14px", fontWeight: "500", cursor: "pointer", backdropFilter: "blur(12px)" }}>
              Примерка
            </button>
          </div>
          {" "}
          <div style={{ position: "absolute", inset: "0", background: v.g3.plateBg, opacity: v.g3.plateOpacity, transition: "opacity 320ms", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "20px", pointerEvents: "none" }}>
            <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: v.g3.verdictColor }}>
              {v.g3.verdict}
            </span>
            {" "}
            <span style={{ marginTop: "6px", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "22px", letterSpacing: "-.02em", color: "#fff" }}>
              Это съёмка
            </span>
            {" "}
            <span style={{ marginTop: "8px", fontSize: "14px", lineHeight: "1.45", color: "rgba(255,255,255,.82)" }}>
              Снято фотографом на студийной съёмке
            </span>
          </div>
        </div>
        {" "}
        <div style={{ position: "relative", borderRadius: "28px", overflow: "hidden", background: "#E4E8ED", aspectRatio: "3/4" }}>
          <img src="/landing/ru/look-6.jpg" alt="Кадр 5 из восьми: съёмка или примерка" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 22%" }} />
          {" "}
          <span style={{ position: "absolute", top: "14px", left: "14px", height: "28px", padding: "0 11px", display: "inline-flex", alignItems: "center", borderRadius: "999px", background: "rgba(255,255,255,.9)", fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", color: "#121417" }}>
            05
          </span>
          {" "}
          <div style={{ position: "absolute", left: "14px", right: "14px", bottom: "14px", display: "flex", gap: "8px", opacity: v.g4.betOpacity, pointerEvents: v.g4.betEvents, transition: "opacity 220ms" }}>
            <button className="scp2" onClick={v.g4.betShoot} style={{ flex: "1", minHeight: "44px", borderRadius: "999px", border: "none", background: "rgba(255,255,255,.94)", color: "#121417", fontFamily: "'Golos Text',sans-serif", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}>
              Съёмка
            </button>
            {" "}
            <button className="scp3" onClick={v.g4.betTryon} style={{ flex: "1", minHeight: "44px", borderRadius: "999px", border: "none", background: "rgba(18,20,23,.6)", color: "#fff", fontFamily: "'Golos Text',sans-serif", fontSize: "14px", fontWeight: "500", cursor: "pointer", backdropFilter: "blur(12px)" }}>
              Примерка
            </button>
          </div>
          {" "}
          <div style={{ position: "absolute", inset: "0", background: v.g4.plateBg, opacity: v.g4.plateOpacity, transition: "opacity 320ms", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "20px", pointerEvents: "none" }}>
            <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: v.g4.verdictColor }}>
              {v.g4.verdict}
            </span>
            {" "}
            <span style={{ marginTop: "6px", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "22px", letterSpacing: "-.02em", color: "#fff" }}>
              Это съёмка
            </span>
            {" "}
            <span style={{ marginTop: "8px", fontSize: "14px", lineHeight: "1.45", color: "rgba(255,255,255,.82)" }}>
              Снято фотографом на студийной съёмке
            </span>
          </div>
        </div>
        {" "}
        <div style={{ position: "relative", borderRadius: "28px", overflow: "hidden", background: "#E4E8ED", aspectRatio: "3/4" }}>
          <img src="/landing/ru/look-2.jpg" alt="Кадр 6 из восьми: съёмка или примерка" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 22%" }} />
          {" "}
          <span style={{ position: "absolute", top: "14px", left: "14px", height: "28px", padding: "0 11px", display: "inline-flex", alignItems: "center", borderRadius: "999px", background: "rgba(255,255,255,.9)", fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", color: "#121417" }}>
            06
          </span>
          {" "}
          <div style={{ position: "absolute", left: "14px", right: "14px", bottom: "14px", display: "flex", gap: "8px", opacity: v.g5.betOpacity, pointerEvents: v.g5.betEvents, transition: "opacity 220ms" }}>
            <button className="scp2" onClick={v.g5.betShoot} style={{ flex: "1", minHeight: "44px", borderRadius: "999px", border: "none", background: "rgba(255,255,255,.94)", color: "#121417", fontFamily: "'Golos Text',sans-serif", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}>
              Съёмка
            </button>
            {" "}
            <button className="scp3" onClick={v.g5.betTryon} style={{ flex: "1", minHeight: "44px", borderRadius: "999px", border: "none", background: "rgba(18,20,23,.6)", color: "#fff", fontFamily: "'Golos Text',sans-serif", fontSize: "14px", fontWeight: "500", cursor: "pointer", backdropFilter: "blur(12px)" }}>
              Примерка
            </button>
          </div>
          {" "}
          <div style={{ position: "absolute", inset: "0", background: v.g5.plateBg, opacity: v.g5.plateOpacity, transition: "opacity 320ms", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "20px", pointerEvents: "none" }}>
            <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: v.g5.verdictColor }}>
              {v.g5.verdict}
            </span>
            {" "}
            <span style={{ marginTop: "6px", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "22px", letterSpacing: "-.02em", color: "#fff" }}>
              Это примерка
            </span>
            {" "}
            <span style={{ marginTop: "8px", fontSize: "14px", lineHeight: "1.45", color: "rgba(255,255,255,.82)" }}>
              Собрано на фото покупателя по артикулу из каталога
            </span>
          </div>
        </div>
        {" "}
        <div style={{ position: "relative", borderRadius: "28px", overflow: "hidden", background: "#E4E8ED", aspectRatio: "3/4" }}>
          <img src="/landing/ru/look-7.jpg" alt="Кадр 7 из восьми: съёмка или примерка" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 22%" }} />
          {" "}
          <span style={{ position: "absolute", top: "14px", left: "14px", height: "28px", padding: "0 11px", display: "inline-flex", alignItems: "center", borderRadius: "999px", background: "rgba(255,255,255,.9)", fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", color: "#121417" }}>
            07
          </span>
          {" "}
          <div style={{ position: "absolute", left: "14px", right: "14px", bottom: "14px", display: "flex", gap: "8px", opacity: v.g6.betOpacity, pointerEvents: v.g6.betEvents, transition: "opacity 220ms" }}>
            <button className="scp2" onClick={v.g6.betShoot} style={{ flex: "1", minHeight: "44px", borderRadius: "999px", border: "none", background: "rgba(255,255,255,.94)", color: "#121417", fontFamily: "'Golos Text',sans-serif", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}>
              Съёмка
            </button>
            {" "}
            <button className="scp3" onClick={v.g6.betTryon} style={{ flex: "1", minHeight: "44px", borderRadius: "999px", border: "none", background: "rgba(18,20,23,.6)", color: "#fff", fontFamily: "'Golos Text',sans-serif", fontSize: "14px", fontWeight: "500", cursor: "pointer", backdropFilter: "blur(12px)" }}>
              Примерка
            </button>
          </div>
          {" "}
          <div style={{ position: "absolute", inset: "0", background: v.g6.plateBg, opacity: v.g6.plateOpacity, transition: "opacity 320ms", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "20px", pointerEvents: "none" }}>
            <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: v.g6.verdictColor }}>
              {v.g6.verdict}
            </span>
            {" "}
            <span style={{ marginTop: "6px", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "22px", letterSpacing: "-.02em", color: "#fff" }}>
              Это съёмка
            </span>
            {" "}
            <span style={{ marginTop: "8px", fontSize: "14px", lineHeight: "1.45", color: "rgba(255,255,255,.82)" }}>
              Снято фотографом на студийной съёмке
            </span>
          </div>
        </div>
        {" "}
        <div style={{ position: "relative", borderRadius: "28px", overflow: "hidden", background: "#E4E8ED", aspectRatio: "3/4" }}>
          <img src="/landing/ru/look-4.jpg" alt="Кадр 8 из восьми: съёмка или примерка" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 22%" }} />
          {" "}
          <span style={{ position: "absolute", top: "14px", left: "14px", height: "28px", padding: "0 11px", display: "inline-flex", alignItems: "center", borderRadius: "999px", background: "rgba(255,255,255,.9)", fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", color: "#121417" }}>
            08
          </span>
          {" "}
          <div style={{ position: "absolute", left: "14px", right: "14px", bottom: "14px", display: "flex", gap: "8px", opacity: v.g7.betOpacity, pointerEvents: v.g7.betEvents, transition: "opacity 220ms" }}>
            <button className="scp2" onClick={v.g7.betShoot} style={{ flex: "1", minHeight: "44px", borderRadius: "999px", border: "none", background: "rgba(255,255,255,.94)", color: "#121417", fontFamily: "'Golos Text',sans-serif", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}>
              Съёмка
            </button>
            {" "}
            <button className="scp3" onClick={v.g7.betTryon} style={{ flex: "1", minHeight: "44px", borderRadius: "999px", border: "none", background: "rgba(18,20,23,.6)", color: "#fff", fontFamily: "'Golos Text',sans-serif", fontSize: "14px", fontWeight: "500", cursor: "pointer", backdropFilter: "blur(12px)" }}>
              Примерка
            </button>
          </div>
          {" "}
          <div style={{ position: "absolute", inset: "0", background: v.g7.plateBg, opacity: v.g7.plateOpacity, transition: "opacity 320ms", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "20px", pointerEvents: "none" }}>
            <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: v.g7.verdictColor }}>
              {v.g7.verdict}
            </span>
            {" "}
            <span style={{ marginTop: "6px", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "22px", letterSpacing: "-.02em", color: "#fff" }}>
              Это примерка
            </span>
            {" "}
            <span style={{ marginTop: "8px", fontSize: "14px", lineHeight: "1.45", color: "rgba(255,255,255,.82)" }}>
              Собрано на фото покупателя по артикулу из каталога
            </span>
          </div>
        </div>
      </div>
      {" "}
      <div style={{ marginTop: "32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", justifyContent: "center" }}>
          <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: "#565E6B" }}>
            СТАВОК {v.betCount} ИЗ 8
          </span>
          {" "}
          <span style={{ width: "1px", height: "16px", background: "rgba(18,20,23,.14)" }}></span>
          {" "}
          <span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: "#2F5AE6" }}>
            УГАДАНО {v.correctCount}
          </span>
        </div>
        {" "}
        {(v.allBet) ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", textAlign: "center" }}>
              <p style={{ margin: "0", maxWidth: "760px", fontFamily: "Unbounded,sans-serif", fontWeight: "500", fontSize: "clamp(22px,2.4vw,32px)", lineHeight: "1.14", letterSpacing: "-.02em", textWrap: "balance" }}>
                Вы угадали {v.correctCount} из 8 — а вы искали подвох. Ваш покупатель не ищет.
              </p>
              {" "}
              <a className="scp1" href="#form" style={{ display: "inline-flex", alignItems: "center", height: "56px", padding: "0 26px", borderRadius: "999px", boxSizing: "border-box", background: "#121417", color: "#fff", fontSize: "17px", fontWeight: "500", textDecoration: "none", whiteSpace: "nowrap" }}>
                Покажите на моих товарах
              </a>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
