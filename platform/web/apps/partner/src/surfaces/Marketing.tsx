import { sx } from "../sx";
import { usePartner } from "../store";
import { Wordmark } from "./Wordmark";

// Порт hi-fi макета "For Partners.dc.html" (контракт 1:1).
// Разметка / классы / inline-стили — дословно. Отличия (санкционированы):
//   • 'Martina Plantijn' → 'Spectral' (у Martina нет кириллицы);
//   • href на .dc.html-страницы → onClick surface-навигация внутри SPA;
//     «Открыть MakeMeLook» ведёт на buyer-приложение (localhost:5173).
export function Marketing() {
  const setSurface = usePartner((s) => s.setSurface);
  const goAuth = () => setSurface("auth");

  return (
    <div className="mk-root" style={sx("overflow-x:hidden;background:#fff")}>
      {/* ============ HEADER ============ */}
      <header style={sx("position:sticky;top:0;z-index:60;height:100px;display:flex;align-items:center;padding:0 40px;background:rgba(255,255,255,.9);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid rgba(22,21,15,.05)")}>
        <div style={sx("position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:12px")}>
          <span style={sx("display:inline-flex;align-items:center;color:#16150F")}><Wordmark width={152} height={26} /></span>
          <span style={sx("font:800 11px 'Inter',sans-serif;letter-spacing:.07em;color:#fff;background:linear-gradient(90deg,#3F9E5A,#2B2BCC);border-radius:6px;padding:5px 9px 4px")}>ПАРТНЁРЫ</span>
        </div>
        <div style={sx("margin-left:auto;display:flex;align-items:center")}>
          <a onClick={goAuth} className="dp-btn" style={sx("display:flex;align-items:center;justify-content:center;height:52px;padding:0 42px;border-radius:999px;background:#2B2BCC;color:#fff;font:600 17px 'Inter',sans-serif;text-decoration:none;box-shadow:0 8px 22px rgba(43,43,204,.24)")}>Войти</a>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section style={sx("background:radial-gradient(60% 90% at 0% 0%,#EDEFFB 0%,rgba(237,239,251,0) 55%),radial-gradient(50% 80% at 100% 0%,#EEF0F7 0%,rgba(238,240,247,0) 50%),#fff")}>
        <div style={sx("display:grid;grid-template-columns:minmax(0,560px) minmax(0,1fr);align-items:center;gap:40px;padding:70px 0 96px 96px")}>

          {/* LEFT */}
          <div style={sx("max-width:560px")}>
            <h1 style={sx("margin:0 0 30px;font:800 46px/1.12 'Inter',sans-serif;letter-spacing:-.025em;color:#16150F;text-wrap:balance")}>Мы — AI-платформа для шопинга, меняем то, как люди покупают онлайн.</h1>
            <p style={sx("margin:0 0 40px;font:400 17px/1.68 'Inter',sans-serif;color:#3a3a42;max-width:520px")}>Сегодня покупатели тонут в бесконечном выборе — найти именно то, что подходит их вкусу, всё сложнее. MakeMeLook ведёт диалог с покупателем и помогает ему находить вещи и бренды, которые он полюбит. Став партнёром и загрузив каталог в MakeMeLook, вы откроете свой бренд новым клиентам и приведёте их к покупке ваших товаров. Присоединяйтесь — давайте вместе менять онлайн&#8209;шопинг.</p>
            <div style={sx("display:flex;gap:16px;flex-wrap:wrap")}>
              <a onClick={goAuth} className="dp-btn" style={sx("display:flex;align-items:center;justify-content:center;height:60px;padding:0 44px;border-radius:999px;background:#2B2BCC;color:#fff;font:600 18px 'Inter',sans-serif;text-decoration:none;box-shadow:0 10px 26px rgba(43,43,204,.22)")}>Стать партнёром</a>
              <a href="http://localhost:5173" className="dp-btn" style={sx("display:flex;align-items:center;justify-content:center;height:60px;padding:0 40px;border-radius:999px;background:#fff;border:1.5px solid rgba(22,21,15,.14);color:#2B2BCC;font:600 18px 'Inter',sans-serif;text-decoration:none")}>Открыть MakeMeLook</a>
            </div>
          </div>

          {/* RIGHT: app mockup, bleeds off right edge */}
          <div style={sx("min-width:0;background:#fff;border:1px solid rgba(22,21,15,.08);border-radius:24px 0 0 24px;box-shadow:0 24px 70px rgba(22,21,15,.09);padding:22px 22px 0 22px;margin-right:-40px")}>

            {/* mockup top bar */}
            <div style={sx("display:flex;align-items:center;justify-content:space-between;padding:2px 4px 18px")}>
              <span style={sx("display:inline-flex;align-items:center;gap:9px;height:44px;padding:0 20px;border:1px solid rgba(22,21,15,.12);border-radius:999px;font:600 15px 'Inter',sans-serif;color:#16150F")}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#16150F" strokeWidth="1.6" strokeLinejoin="round"><path d="M3 4.5h11a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H8l-4 3v-3a2 2 0 0 1-2-2v-5a2 2 0 0 1 1-1.7"></path></svg>
                Чаты
              </span>
              <span style={sx("display:inline-flex;align-items:center;color:#16150F")}><Wordmark width={126} height={22} /></span>
            </div>

            {/* Brand card */}
            <div style={sx("position:relative;background:#F3F2FB;border-radius:18px;padding:26px;overflow:hidden;display:flex;gap:26px;min-height:210px")}>
              <div style={sx("flex:none;width:180px;height:180px;background:#fff;border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(22,21,15,.05)")}>
                <span style={sx("font:600 19px 'Inter',sans-serif;letter-spacing:.12em;color:#16150F")}>ВАШ БРЕНД</span>
              </div>
              <div style={sx("flex:1;min-width:0;max-width:640px;position:relative;z-index:2")}>
                {/* Витрина в макете — «ваш бренд», а не чужой: подставлять сюда
                    реальную марку значит выдавать её за клиента. */}
                <div style={sx("font:700 24px 'Inter',sans-serif;color:#16150F;margin-bottom:12px")}>Ваш бренд</div>
                <p style={sx("margin:0 0 20px;font:400 16px/1.5 'Inter',sans-serif;color:#2c2c33;max-width:560px")}>Так покупатель увидит вашу витрину: описание, кампейн и товары, которые ассистент подберёт под его вкус. Он сможет подписаться — и получать ваши новинки в своей ленте.</p>
                <span className="dp-btn" style={sx("display:inline-flex;align-items:center;gap:9px;height:48px;padding:0 26px;border-radius:999px;background:#2B2BCC;color:#fff;font:600 16px 'Inter',sans-serif")}>
                  <span style={sx("font-size:20px;font-weight:400;line-height:1;margin-top:-1px")}>+</span> В избранное
                </span>
              </div>
              {/* campaign photo bleeding right */}
              <div style={sx("position:absolute;top:0;right:0;bottom:0;width:280px;background-image:url('/partner/fig/prod-cape.png');background-size:cover;background-position:20% 12%;filter:grayscale(1) contrast(1.02);-webkit-mask-image:linear-gradient(90deg,transparent,#000 42%);mask-image:linear-gradient(90deg,transparent,#000 42%)")}></div>
            </div>

            {/* product cards row */}
            <div style={sx("display:flex;gap:18px;margin-top:18px;padding-bottom:0;overflow:hidden")}>
              <div style={sx("flex:none;width:calc(50% - 9px);min-width:300px;position:relative;background:#F4F1EA;border-radius:12px 12px 0 0;overflow:hidden;height:320px")}>
                <div style={sx("position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:999px;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(22,21,15,.08);z-index:2")}><svg width="15" height="15" viewBox="0 0 16 20" fill="none" stroke="#16150F" strokeWidth="1.5" strokeLinejoin="round"><path d="M3 2.5h10v15l-5-3.4-5 3.4z"></path></svg></div>
                <div style={sx("width:100%;height:100%;background-image:url('/partner/fig/prod-blue-dress.png');background-size:cover;background-position:center 18%")}></div>
              </div>
              <div style={sx("flex:none;width:calc(50% - 9px);min-width:300px;position:relative;background:#F4F1EA;border-radius:12px 12px 0 0;overflow:hidden;height:320px")}>
                <div style={sx("position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:999px;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(22,21,15,.08);z-index:2")}><svg width="15" height="15" viewBox="0 0 16 20" fill="none" stroke="#16150F" strokeWidth="1.5" strokeLinejoin="round"><path d="M3 2.5h10v15l-5-3.4-5 3.4z"></path></svg></div>
                <div style={sx("width:100%;height:100%;background-image:url('/partner/fig/prod-white-dress.png');background-size:cover;background-position:center 12%")}></div>
              </div>
              <div style={sx("flex:none;width:calc(50% - 9px);min-width:300px;position:relative;background:#EDEBE4;border-radius:12px 12px 0 0;overflow:hidden;height:320px")}>
                <div style={sx("width:100%;height:100%;background-image:url('/partner/fig/prod-sandals.png');background-size:cover;background-position:center 20%")}></div>
              </div>
            </div>

          </div>
        </div>

        {/* Блок «Наши партнёры» удалён: там стоял список 12 STOREEZ, USHATÁVA,
            LIME, JNBY, EKONIKA, 2MOOD, Charuel, LOVE REPUBLIC — ни один из них
            не наш партнёр. Это публичная страница: заявлять чужие бренды
            своими клиентами нельзя. Вернём, когда будет что показать и будет
            согласие бренда на упоминание. */}
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={sx("background:#2B2BCC;color:#fff;padding:104px 96px 88px")}>
        <div style={sx("max-width:1400px;margin:0 auto;display:grid;grid-template-columns:1fr auto auto;gap:64px 120px;align-items:start")}>
          <div>
            <span style={sx("display:inline-flex;color:#fff")}><Wordmark width={300} height={52} /></span>
          </div>
          <div>
            <div style={sx("font:700 17px 'Inter',sans-serif;color:#fff;margin-bottom:34px")}>Компания</div>
            <div style={sx("display:flex;flex-direction:column;gap:32px")}>
              <span className="dp-link" onClick={goAuth} style={sx("font:400 17px 'Inter',sans-serif;color:rgba(255,255,255,.6);white-space:nowrap")}>Наш бета-доступ</span>
              <a className="dp-link" href="mailto:ceo@themono.ru" style={sx("font:400 17px 'Inter',sans-serif;color:rgba(255,255,255,.6);white-space:nowrap;text-decoration:none")}>Свяжитесь с нами</a>
              <span style={sx("font:400 17px 'Inter',sans-serif;color:rgba(255,255,255,.6);white-space:nowrap")}>Вакансии</span>
              <span style={sx("font:400 17px 'Inter',sans-serif;color:rgba(255,255,255,.6);white-space:nowrap")}>Пресса</span>
            </div>
          </div>
          <div style={sx("min-width:220px")}>
            <div style={sx("font:700 17px 'Inter',sans-serif;color:#fff;margin-bottom:34px")}>Правовое</div>
            <div style={sx("display:flex;flex-direction:column;gap:32px")}>
              <a className="dp-link" href="https://makemelook.ai/legal/partner-terms.html" target="_blank" rel="noopener" style={sx("font:400 17px 'Inter',sans-serif;color:rgba(255,255,255,.6);white-space:nowrap;text-decoration:none")}>Условия использования</a>
              <a className="dp-link" href="https://makemelook.ai/legal/privacy.html" target="_blank" rel="noopener" style={sx("font:400 17px 'Inter',sans-serif;color:rgba(255,255,255,.6);white-space:nowrap;text-decoration:none")}>Политика конфиденциальности</a>
            </div>
          </div>
        </div>

        <div style={sx("max-width:1400px;margin:92px auto 0;display:flex;align-items:flex-end;justify-content:space-between")}>
          <div style={sx("display:flex;align-items:center;gap:34px")}>
            <span style={sx("opacity:.85;display:inline-flex")} aria-label="Instagram"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.3" cy="6.7" r="1.1" fill="#fff" stroke="none"></circle></svg></span>
            <span style={sx("opacity:.85;display:inline-flex")} aria-label="Telegram"><svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path d="M21.5 4.3 2.9 11.5c-1 .4-1 1-.2 1.3l4.7 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.2-.5-1.8-1.3-1.5zM8.3 14l10-6.3c.5-.3.9-.1.5.2l-8.1 7.3-.3 3.4z"></path></svg></span>
            <span style={sx("opacity:.85;display:inline-flex")} aria-label="VK"><svg width="27" height="27" viewBox="0 0 24 24" fill="#fff"><path d="M12.8 16.7c-5.4 0-8.9-3.8-9-10.1h2.8c.1 4.7 2.3 6.7 3.9 7.1V6.6h2.6v3.9c1.6-.2 3.3-2 3.9-3.9h2.6c-.4 2.4-2.1 4.2-3.3 4.9 1.2.6 3.1 2.2 3.9 5.2h-2.9c-.6-1.9-2.1-3.3-4.1-3.6v3.6z"></path></svg></span>
            <span style={sx("opacity:.85;display:inline-flex")} aria-label="X"><svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M18.9 2h3.3l-7.2 8.2L23.5 22h-6.7l-5.2-6.9L5.6 22H2.3l7.7-8.8L1.9 2h6.9l4.7 6.3zM17.7 20h1.8L7.4 3.9H5.4z"></path></svg></span>
          </div>
          <div style={sx("font:400 16px 'Inter',sans-serif;color:rgba(255,255,255,.55)")}>© 2026 MakeMeLook</div>
        </div>
      </footer>
    </div>
  );
}
