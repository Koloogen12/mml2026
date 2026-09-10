import { useEffect, useState } from "react";
import { sx } from "../sx";
import { useApp } from "../appStore";
import { ProductCardDp } from "../components/ProductCardDp";
import { things, brands } from "../plural";

const ZONE_LABEL: Record<string, string> = {
  dress: "Платья",
  outerwear: "Верхняя одежда",
  tops: "Верх",
  bottoms: "Низ",
  footwear: "Обувь",
  accessories: "Аксессуары",
};

export function Favorites() {
  const app = useApp();
  // Избранное и борды — с сервера; товары берём по id, а не из витрины.
  const favProducts = app.productsByIds(app.favIds);
  const favBrandCount = new Set(favProducts.map((p) => p.brand.name)).size;
  const itemsMode = app.favMode === "items";
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (app.loggedIn && !app.collectionsLoaded) void app.loadCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.loggedIn, app.collectionsLoaded]);

  const submitNew = async () => {
    const n = newName.trim();
    if (!n) return;
    if (await app.createCollection(n)) {
      setNewName("");
      setNewOpen(false);
    }
  };

  const board = app.openCollection ? (app.collectionItems[app.openCollection.id] ?? []) : [];
  const boardProducts = app.productsByIds(board);

  // Реальные чипы-фильтры: зоны из самих избранных + примерка + скидка.
  const [favFilter, setFavFilter] = useState("all");
  const favZones = Array.from(
    new Set(favProducts.map((p) => p.garment_zone).filter((z): z is string => !!z)),
  );
  const chips = [
    { k: "all", l: "Все" },
    ...favZones.map((z) => ({ k: "zone:" + z, l: ZONE_LABEL[z] ?? z })),
    { k: "tryon", l: "Можно примерить" },
    { k: "sale", l: "Снижена цена" },
  ];
  const shown = favProducts.filter((p) => {
    if (favFilter === "all") return true;
    if (favFilter === "tryon") return p.tryon_eligible;
    if (favFilter === "sale") return !!p.offers[0]?.old_price;
    if (favFilter.startsWith("zone:")) return p.garment_zone === favFilter.slice(5);
    return true;
  });

  return (
    <div className="dp-fade" style={sx("max-width:1120px;margin:0 auto;padding:40px 40px 96px")}>
      <div style={sx("display:flex;justify-content:center;margin-bottom:36px")}>
        <div style={sx("display:inline-flex;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:999px;padding:5px;box-shadow:0 2px 10px rgba(0,0,0,.05)")}>
          <span className="dp-btn" onClick={() => useApp.setState({ favMode: "items" })} style={sx(`display:inline-flex;align-items:center;gap:7px;padding:9px 20px;border-radius:999px;font:500 13.5px 'Inter',sans-serif;background:${itemsMode ? "#000" : "transparent"};color:${itemsMode ? "#fff" : "rgba(0,0,0,.6)"}`)}>
            Избранное <span style={sx("opacity:.6")}>{app.favIds.length}</span>
          </span>
          <span className="dp-btn" onClick={() => useApp.setState({ favMode: "collections" })} style={sx(`display:inline-flex;align-items:center;gap:7px;padding:9px 20px;border-radius:999px;font:500 13.5px 'Inter',sans-serif;background:${!itemsMode ? "#000" : "transparent"};color:${!itemsMode ? "#fff" : "rgba(0,0,0,.6)"}`)}>
            Коллекции <span style={sx("opacity:.6")}>{app.collections.length}</span>
          </span>
        </div>
      </div>

      {itemsMode && (
        <>
          <div style={sx("display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px")}>
            <h1 className="dp-f46" style={sx("font:400 46px 'Spectral',Georgia,serif;margin:0")}>Избранное</h1>
            <span style={sx("font:400 14px 'Inter',sans-serif;color:rgba(0,0,0,.5)")}>{app.favIds.length} {things(app.favIds.length)} · {favBrandCount} {brands(favBrandCount)}</span>
          </div>
          <p style={sx("font:400 15px 'Inter',sans-serif;color:rgba(0,0,0,.55);margin:0 0 30px")}>Всё, что вы сохранили ♡. Соберите из них борд или примерьте на себе.</p>
          {favProducts.length === 0 ? (
            <div style={sx("display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px;padding:80px 20px;border:1px dashed rgba(0,0,0,.15);border-radius:16px")}>
              <span style={sx("width:60px;height:60px;border-radius:50%;background:#F4F1EA;display:flex;align-items:center;justify-content:center")}>
                <svg width="26" height="24" viewBox="0 0 15 14" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="1.4"><path d="M7.5 12.5S1.5 8.8 1.5 4.9C1.5 2.9 3 1.5 4.8 1.5c1.1 0 2.1.5 2.7 1.4.6-.9 1.6-1.4 2.7-1.4 1.8 0 3.3 1.4 3.3 3.4 0 3.9-6 7.6-6 7.6z"></path></svg>
              </span>
              <div style={sx("font:400 24px 'Spectral',Georgia,serif")}>Пока пусто</div>
              <div style={sx("font:400 14px 'Inter',sans-serif;color:#737373;max-width:360px")}>Жмите ♡ на любой карточке — вещи соберутся здесь, готовые к примерке и покупке.</div>
              <span className="dp-btn" onClick={() => app.go("chat")} style={sx("margin-top:6px;font:500 14px 'Inter',sans-serif;color:#fff;background:#000;border-radius:999px;padding:13px 26px")}>К выдаче</span>
            </div>
          ) : (
            <>
              <div style={sx("display:flex;gap:10px;margin-bottom:30px;flex-wrap:wrap")}>
                {chips.map((c) => {
                  const on = favFilter === c.k;
                  const accent = c.k === "tryon" ? "#2B2BCC" : c.k === "sale" ? "#C4553B" : "#000";
                  return (
                    <span
                      key={c.k}
                      className="dp-chip"
                      onClick={() => setFavFilter(c.k)}
                      style={sx(`font:${on ? "500" : "400"} 13.5px 'Inter',sans-serif;color:${on ? "#fff" : accent};background:${on ? accent : "#fff"};border:1px solid ${on ? accent : "rgba(0,0,0,.16)"};border-radius:999px;padding:9px 17px;cursor:pointer`)}
                    >
                      {c.l}
                    </span>
                  );
                })}
              </div>
              {shown.length === 0 ? (
                <div style={sx("padding:48px 20px;text-align:center;font:400 14px 'Inter',sans-serif;color:rgba(0,0,0,.5)")}>
                  По этому фильтру в избранном ничего нет.
                </div>
              ) : (
                <div className="dp-r4" style={sx("display:grid;grid-template-columns:repeat(4,1fr);gap:22px")}>
                  {shown.map((p) => (
                    <ProductCardDp key={p.id} p={p} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {!itemsMode && !app.openCollection && (
        <>
          <div style={sx("display:flex;align-items:baseline;justify-content:space-between;margin-bottom:26px;gap:16px;flex-wrap:wrap")}>
            <h1 className="dp-f46" style={sx("font:400 46px 'Spectral',Georgia,serif;margin:0")}>Коллекции</h1>
            {newOpen ? (
              <div style={sx("display:flex;gap:8px")}>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submitNew();
                    if (e.key === "Escape") setNewOpen(false);
                  }}
                  placeholder="Название коллекции"
                  style={sx("border:1px solid rgba(0,0,0,.16);border-radius:999px;padding:10px 16px;font:400 13.5px 'Inter',sans-serif;outline:none;min-width:200px")}
                />
                <span className="dp-btn" onClick={() => void submitNew()} style={sx(`font:500 13.5px 'Inter',sans-serif;color:#fff;background:${newName.trim() ? "#000" : "rgba(0,0,0,.25)"};border-radius:999px;padding:11px 20px`)}>Создать</span>
              </div>
            ) : (
              <span className="dp-btn" onClick={() => { if (!app.requireAuth()) return; setNewOpen(true); }} style={sx("display:inline-flex;align-items:center;gap:8px;font:500 13.5px 'Inter',sans-serif;border:1px solid rgba(0,0,0,.16);border-radius:999px;padding:11px 18px")}>+ Новая</span>
            )}
          </div>

          {app.collections.length === 0 ? (
            <div style={sx("display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;padding:80px 20px;border:1px dashed rgba(0,0,0,.15);border-radius:16px")}>
              <div style={sx("font:400 28px 'Spectral',Georgia,serif")}>Начните первую коллекцию.</div>
              <div style={sx("font:400 14px/1.6 'Inter',sans-serif;color:#737373;max-width:420px")}>Группируйте вещи в капсулы — образ на свадьбу, сезон, ротация брендов. Кнопка ⊞ слева сверху в карточке товара кладёт вещь в нужный борд.</div>
              <span className="dp-btn" onClick={() => { if (!app.requireAuth()) return; setNewOpen(true); }} style={sx("margin-top:6px;font:500 14px 'Inter',sans-serif;color:#fff;background:#000;border-radius:999px;padding:13px 26px")}>Создать коллекцию</span>
            </div>
          ) : (
            <div className="dp-r4" style={sx("display:grid;grid-template-columns:repeat(3,1fr);gap:26px")}>
              {app.collections.map((c) => (
                <div key={c.id} className="dp-card" onClick={() => void app.openCollectionBoard(c)} style={sx("border-radius:4px;cursor:pointer")}>
                  <div style={sx(`height:300px;border-radius:2px;background:#F4F1EA;position:relative;overflow:hidden${c.cover_url ? `;background-image:url('${c.cover_url}');background-size:cover;background-position:center` : ""}`)}>
                    {!c.cover_url && (
                      <div style={sx("position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:400 13px 'Inter',sans-serif;color:rgba(0,0,0,.35)")}>Пусто</div>
                    )}
                  </div>
                  <div style={sx("padding:14px 2px 0;display:flex;align-items:baseline;justify-content:space-between;gap:10px")}>
                    <span style={sx("font:400 17px 'Spectral',Georgia,serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                      {c.is_default ? "♡ " : ""}{c.name}
                    </span>
                    <span style={sx("font:400 13px 'Inter',sans-serif;color:#737373;white-space:nowrap")}>{c.count} {things(c.count)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!itemsMode && app.openCollection && (
        <>
          <span className="dp-btn" onClick={() => useApp.setState({ openCollection: null })} style={sx("display:inline-flex;align-items:center;gap:8px;font:500 14px 'Inter',sans-serif;color:rgba(0,0,0,.6);margin-bottom:18px")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M10 3.5L5.5 8l4.5 4.5"></path></svg>Все коллекции
          </span>
          <div style={sx("display:flex;align-items:baseline;justify-content:space-between;margin-bottom:26px;gap:16px")}>
            <h1 className="dp-f46" style={sx("font:400 46px 'Spectral',Georgia,serif;margin:0")}>{app.openCollection.name}</h1>
            {!app.openCollection.is_default && (
              <span className="dp-btn" onClick={() => void app.deleteCollection(app.openCollection!.id)} style={sx("font:500 13.5px 'Inter',sans-serif;color:#C4553B;border:1px solid rgba(196,85,59,.4);border-radius:999px;padding:10px 18px")}>Удалить коллекцию</span>
            )}
          </div>
          {boardProducts.length === 0 ? (
            <div style={sx("padding:70px 20px;text-align:center;font:400 14px 'Inter',sans-serif;color:rgba(0,0,0,.5)")}>
              В этой коллекции пока пусто — добавьте вещи кнопкой ⊞ в карточке товара.
            </div>
          ) : (
            <div className="dp-r4" style={sx("display:grid;grid-template-columns:repeat(4,1fr);gap:22px")}>
              {boardProducts.map((p) => (
                <ProductCardDp key={p.id} p={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
