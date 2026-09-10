import { useEffect, useState } from "react";
import { sx } from "../sx";
import { useApp } from "../appStore";
import { things } from "../plural";

// Пикер «Сохранить в коллекцию» — открывается кнопкой ⊞ в карточке товара
// и в модалке. Список бордов реальный (/collections), создание работает.
export function CollectionPicker() {
  const app = useApp();
  const p = app.pickerProduct;
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (p) {
      setCreating(false);
      setName("");
      void app.loadCollections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.id]);

  if (!p) return null;

  const submit = async () => {
    const n = name.trim();
    if (!n) return;
    const ok = await app.createCollection(n, p);
    if (ok) useApp.setState({ pickerProduct: null });
  };

  return (
    <div
      onClick={() => useApp.setState({ pickerProduct: null })}
      style={sx("position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:20px")}
    >
      <div
        className="dp-fade"
        onClick={(e) => e.stopPropagation()}
        style={sx("width:100%;max-width:400px;background:#fff;border-radius:18px;padding:26px 24px;box-shadow:0 20px 60px rgba(0,0,0,.25)")}
      >
        <div style={sx("font:400 24px 'Spectral',Georgia,serif;margin-bottom:4px")}>Сохранить в коллекцию</div>
        <div style={sx("font:400 13px 'Inter',sans-serif;color:#737373;margin-bottom:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
          {p.brand.name} · {p.name}
        </div>

        <div style={sx("display:flex;flex-direction:column;gap:8px;max-height:280px;overflow:auto;margin-bottom:16px")}>
          {app.collections.length === 0 && app.collectionsLoaded && (
            <div style={sx("font:400 13.5px 'Inter',sans-serif;color:#737373;padding:8px 0")}>
              Коллекций пока нет — создайте первую.
            </div>
          )}
          {app.collections.map((c) => (
            <span
              key={c.id}
              className="dp-btn"
              onClick={() => void app.addToCollection(c, p)}
              style={sx("display:flex;align-items:center;gap:12px;padding:9px;border:1px solid rgba(0,0,0,.12);border-radius:12px;cursor:pointer")}
            >
              <span style={sx(`width:44px;height:44px;flex:none;border-radius:8px;background:#F4F1EA${c.cover_url ? `;background-image:url('${c.cover_url}');background-size:cover;background-position:center` : ""}`)}></span>
              <span style={sx("flex:1;min-width:0")}>
                <span style={sx("display:block;font:400 15px 'Inter',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{c.name}</span>
                <span style={sx("display:block;font:400 12px 'Inter',sans-serif;color:#737373;padding-top:2px")}>{c.count} {things(c.count)}</span>
              </span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="rgba(0,0,0,.4)" strokeWidth="1.6" strokeLinecap="round"><path d="M8 3.5v9M3.5 8h9"></path></svg>
            </span>
          ))}
        </div>

        {creating ? (
          <div style={sx("display:flex;gap:8px")}>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
              placeholder="Например, «Капсула на осень»"
              style={sx("flex:1;min-width:0;border:1px solid rgba(0,0,0,.16);border-radius:999px;padding:11px 16px;font:400 14px 'Inter',sans-serif;outline:none")}
            />
            <span
              className="dp-btn"
              onClick={() => void submit()}
              style={sx(`font:500 14px 'Inter',sans-serif;color:#fff;background:${name.trim() ? "#000" : "rgba(0,0,0,.25)"};border-radius:999px;padding:11px 20px;flex:none`)}
            >
              Создать
            </span>
          </div>
        ) : (
          <span
            className="dp-btn"
            onClick={() => setCreating(true)}
            style={sx("display:flex;align-items:center;justify-content:center;gap:8px;font:500 14px 'Inter',sans-serif;border:1px dashed rgba(0,0,0,.28);border-radius:999px;padding:12px 0;cursor:pointer")}
          >
            + Новая коллекция
          </span>
        )}
      </div>
    </div>
  );
}

