import { useEffect } from "react";
import { sx } from "./sx";
import { useApp } from "./appStore";
import { useAuth } from "./authStore";
import { TopBar } from "./components/TopBar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Home } from "./screens/Home";
import { Chat } from "./screens/Chat";
import { Favorites } from "./screens/Favorites";
import { Passport } from "./screens/Passport";
import { Brand } from "./screens/Brand";
import { Onboarding } from "./screens/Onboarding";
import { ProductDetail } from "./overlays/ProductDetail";
import { NotMyStyle } from "./overlays/NotMyStyle";
import { CollectionPicker } from "./components/CollectionPicker";
import { Blog, BlogPost } from "./screens/Blog";
import { Redirect } from "./overlays/Redirect";
import { Auth } from "./overlays/Auth";

export default function App() {
  const app = useApp();
  const authChecked = useAuth((s) => s.authChecked);
  const onboardingActive = useAuth((s) => s.onboardingActive);

  useEffect(() => {
    void useApp.getState().loadCatalog();
    void useApp.getState().loadHomeContent();
    // Восстановление сессии из refresh-cookie + first-run гейт онбординга.
    void useAuth.getState().init();
    // ?q= — сразу запускаем поиск (как в макете)
    try {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q) useApp.getState().runSearch(q);
    } catch {
      /* noop */
    }
  }, []);

  // Escape закрывает слои в том же порядке, что и в макете
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const s = useApp.getState();
      if (s.notMyStyle) useApp.setState({ notMyStyle: null });
      else if (s.cardChat) useApp.setState({ cardChat: null });
      else if (s.activeProduct) useApp.setState({ activeProduct: null });
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  // Пока открыт оверлей товара — метим body: CSS гасит ховеры и анимации фона,
  // иначе они перерисовываются под backdrop-filter и фон мерцает.
  //
  // ВАЖНО: хук обязан стоять ДО ранних return'ов ниже. Пока сессия не проверена,
  // компонент выходит раньше — и если хук объявлен после выхода, он не
  // регистрируется. Как только вход подтверждён, выходов нет, хук появляется,
  // число хуков между рендерами меняется — и React роняет ВСЁ приложение в
  // белый экран. Ровно это и ловил пользователь сразу после входа через Яндекс.
  useEffect(() => {
    const on = !!app.activeProduct;
    document.body.classList.toggle("dp-overlay", on);
    return () => document.body.classList.remove("dp-overlay");
  }, [app.activeProduct]);

  // Пока не проверили сессию — пустой белый экран (без мигания logged-out → logged-in).
  if (!authChecked) {
    return <div style={sx("min-height:100vh;background:#fff")} />;
  }

  // First-run гейт: не вошёл и онбординг не пройден → показываем онбординг.
  if (onboardingActive) {
    return <Onboarding />;
  }

  return (
    <div style={sx("min-height:100vh;display:flex;flex-direction:column;overflow-x:hidden")}>
      {/* Всё, что лежит ПОД оверлеем товара, — в одной обёртке: пока оверлей
          открыт, она перестаёт принимать курсор. Иначе кнопки и карточки фона
          ловят hover, меняют вид под backdrop-filter, и браузер пересчитывает
          размытие на весь экран — это и есть мерцание. Гасить сами ховеры
          нельзя: те же классы кнопок используются внутри оверлея. */}
      <div className="dp-page" style={sx("flex:1;display:flex;flex-direction:column;min-width:0")}>
      <TopBar />
      {/* Границу вешаем на экраны: падение одного не должно уносить всё
          приложение в белый экран (ровно это и случилось с главной). key по
          экрану — чтобы после перехода граница сбрасывалась сама. */}
      <ErrorBoundary key={app.screen}>
      <div style={sx("flex:1;position:relative;min-width:0")}>
        {app.screen === "home" && <Home />}
        {app.screen === "chat" && <Chat />}
        {app.screen === "favorites" && <Favorites />}
        {app.screen === "passport" && <Passport />}
        {app.screen === "brand" && <Brand />}
        {app.screen === "blog" && <Blog />}
        {app.screen === "post" && <BlogPost slug={app.activePostSlug} />}
      </div>
      </ErrorBoundary>
      </div>

      {app.activeProduct && <ProductDetail p={app.activeProduct} />}
      {app.notMyStyle && <NotMyStyle p={app.notMyStyle} />}
      <CollectionPicker />
      {app.screen === "redirect" && <Redirect />}
      {app.authOpen && <Auth />}

      {/* toast */}
      {app.toast && (
        <div
          className="dp-fade"
          style={sx("position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:999px;padding:13px 24px;box-shadow:0 8px 30px rgba(0,0,0,.16);z-index:90;font:500 14px 'Inter',sans-serif;display:flex;align-items:center;gap:10px")}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#3F7A4E" strokeWidth="1.8" strokeLinecap="round"><path d="M3 8.5L6.5 12 13 4.5"></path></svg>
          {app.toast}
        </div>
      )}
    </div>
  );
}
