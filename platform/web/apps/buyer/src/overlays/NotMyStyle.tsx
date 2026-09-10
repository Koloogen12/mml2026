import type { MMLProduct } from "@mml/ui";
import { sx } from "../sx";
import { useApp } from "../appStore";

// TODO(Ф5): исключения «не мой стиль» — отправка сигнала в профиль на бэкенде.
export function NotMyStyle({ p }: { p: MMLProduct }) {
  const app = useApp();
  const close = () => useApp.setState({ notMyStyle: null, nmText: "" });
  const attrs: Array<{ k: string; v: string }> = [
    { k: "Категория", v: p.category || "Платье" },
    { k: "Длина", v: "Миди" },
    { k: "Крой", v: "Прямой" },
    { k: "Бренд", v: p.brand.name },
    { k: "Цвет", v: p.color || "айвори" },
    { k: "Материал", v: p.material || "Атлас" },
  ];

  return (
    <div className="dp-scrim" style={sx("position:fixed;inset:0;z-index:72;display:flex;align-items:center;justify-content:center;padding:30px")} onClick={close}>
      {/* Размытие отдельным слоем — на контейнере с контентом оно пересчитывается
          при каждом ховере внутри (см. .dp-scrim-blur в dp.css). */}
      <div className="dp-scrim-blur" aria-hidden="true"></div>
      <div className="dp-fade" onClick={(e) => e.stopPropagation()} style={sx("position:relative;width:min(660px,94vw);max-height:92vh;overflow-y:auto;background:#fff;border-radius:16px;padding:36px 38px 30px;box-shadow:0 30px 80px rgba(0,0,0,.3)")}>
        <span className="dp-btn" onClick={close} style={sx("position:absolute;top:20px;right:20px;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center")}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3l9 9M12 3l-9 9"></path></svg>
        </span>
        <div style={sx("display:flex;align-items:center;gap:7px;font:700 11px 'Inter',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#2B2BCC;margin-bottom:10px")}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.2 3.6L12 5.8 8.2 7 7 10.6 5.8 7 2 5.8l3.8-1.2z" fill="#2B2BCC"></path></svg>Не мой стиль
        </div>
        <h2 style={sx("font:400 34px 'Spectral',Georgia,serif;margin:0 0 6px")}>Что не подошло?</h2>
        <p style={sx("font:400 13.5px 'Inter',sans-serif;color:rgba(0,0,0,.5);margin:0 0 22px")}>{p.name} · выберите, что исключить из будущих подборок.</p>
        <div style={sx("display:flex;flex-wrap:wrap;gap:10px;margin-bottom:26px")}>
          {attrs.map((a) => (
            <span key={a.k} className="dp-chip" style={sx("display:inline-flex;align-items:center;gap:10px;border:1px solid rgba(0,0,0,.16);border-radius:999px;padding:9px 15px;font:400 14px 'Inter',sans-serif;background:#fff")}>
              <span style={sx("font:700 9.5px 'Inter',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:rgba(0,0,0,.4)")}>{a.k}</span>
              <span style={sx("width:1px;height:14px;background:rgba(0,0,0,.15)")}></span>
              {a.v}
            </span>
          ))}
        </div>
        <div style={sx("font:700 10.8px 'Inter',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:rgba(0,0,0,.5);margin-bottom:10px")}>
          Расскажите подробнее <span style={sx("color:rgba(0,0,0,.3);text-transform:none;letter-spacing:0")}>(необязательно)</span>
        </div>
        <textarea
          value={app.nmText}
          onChange={(e) => useApp.setState({ nmText: e.target.value })}
          placeholder="Что ещё нам учесть?"
          style={sx("width:100%;min-height:96px;resize:none;border:1px solid rgba(0,0,0,.14);border-radius:12px;padding:14px 16px;font:400 14px 'Inter',sans-serif;outline:none")}
        ></textarea>
        <div style={sx("display:flex;justify-content:flex-end;gap:12px;margin-top:22px")}>
          <span className="dp-btn" onClick={close} style={sx("font:500 14px 'Inter',sans-serif;padding:14px 26px;border-radius:999px;border:1px solid rgba(0,0,0,.16)")}>Отмена</span>
          <span className="dp-btn" onClick={() => app.excludeNm()} style={sx("font:500 14px 'Inter',sans-serif;padding:14px 28px;border-radius:999px;background:#000;color:#fff")}>Исключить это</span>
        </div>
      </div>
    </div>
  );
}
