import { sx } from "../sx";
import { useApp } from "../appStore";
import { useAuth } from "../authStore";
import { Logo } from "./Logo";

export function TopBar() {
  const app = useApp();
  const user = useAuth((s) => s.user);
  const obName = useAuth((s) => s.onboardingName);
  const tabBg = (t: string) => (app.screen === t ? "#ECE9E0" : "transparent");
  const tabCol = (t: string) => (app.screen === t ? "#000" : "rgba(0,0,0,.5)");
  const displayName = obName || user?.email?.split("@")[0] || "Профиль";
  const initial = (displayName[0] || "П").toUpperCase();
  const avatarUrl = useAuth((s) => s.avatarUrl);

  return (
    <div
      className="dp-topbar"
      style={sx(
        // Сетка 1fr auto 1fr: логотип ровно по центру окна, а колонки не могут
        // наехать друг на друга. Раньше логотип стоял position:absolute;left:50%
        // и ничего не знал о ширине меню — с добавлением «Журнала» он оказался
        // под пунктами навигации.
        "display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;padding:22px 40px;position:sticky;top:0;background:rgba(255,255,255,.9);backdrop-filter:blur(12px);z-index:40;border-bottom:1px solid rgba(0,0,0,.06)",
      )}
    >
      <div className="dp-topbar-nav" style={sx("justify-self:start;min-width:0;display:flex;background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:999px;padding:5px;gap:2px;box-shadow:0 2px 10px rgba(0,0,0,.05)")}>
        <span className="dp-nav" onClick={() => app.go("home")} style={sx(`font:500 14px 'Inter',sans-serif;padding:8px 18px;border-radius:999px;background:${tabBg("home")};color:${tabCol("home")}`)}>Обзор</span>
        <span className="dp-nav" onClick={() => app.go("chat")} style={sx(`font:500 14px 'Inter',sans-serif;padding:8px 18px;border-radius:999px;background:${tabBg("chat")};color:${tabCol("chat")}`)}>Чат</span>
        <span className="dp-nav" onClick={() => app.go("favorites")} style={sx(`font:500 14px 'Inter',sans-serif;padding:8px 18px;border-radius:999px;background:${tabBg("favorites")};color:${tabCol("favorites")}`)}>Избранное</span>
        <span className="dp-nav" onClick={() => app.go("blog")} style={sx(`font:500 14px 'Inter',sans-serif;padding:8px 18px;border-radius:999px;background:${tabBg("blog")};color:${tabCol("blog")}`)}>Журнал</span>
      </div>
      <div
        className="dp-topbar-logo"
        onClick={() => app.go("home")}
        style={sx("cursor:pointer;display:flex;align-items:center;justify-self:center")}
      >
        <Logo width={165} height={28} />
      </div>
      <div style={sx("justify-self:end;display:flex;align-items:center;gap:12px")}>
        {app.loggedIn ? (
          <>
            <span className="dp-btn dp-topbar-profile" onClick={() => app.go("passport")} style={sx("display:flex;align-items:center;gap:10px;font:500 14px 'Inter',sans-serif;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:999px;padding:6px 8px 6px 16px;box-shadow:0 2px 10px rgba(0,0,0,.05)")}>
              <span className="dp-topbar-name">{displayName}</span>
              <span className="dp-irid" style={sx(`width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:600 12px 'Inter',sans-serif;color:#000;overflow:hidden;${avatarUrl ? `background-image:url('${avatarUrl}');background-size:cover;background-position:center` : ""}`)}>{!avatarUrl && initial}</span>
            </span>
          </>
        ) : (
          <>
            <span className="dp-btn" onClick={() => useApp.setState({ authOpen: true, authMode: "signin" })} style={sx("font:500 14px 'Inter',sans-serif;color:rgba(0,0,0,.6);cursor:pointer")}>Войти</span>
            <span className="dp-btn" onClick={() => useAuth.getState().startOnboarding()} style={sx("font:500 14px 'Inter',sans-serif;background:#000;color:#fff;border-radius:999px;padding:11px 22px")}>Собрать профиль</span>
          </>
        )}
      </div>
    </div>
  );
}
