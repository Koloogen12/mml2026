import { formatPrice } from "@mml/ui";
import { sx } from "../sx";
import { useApp } from "../appStore";
import { imgOf } from "../product-utils";

// CPA-интерстишл покупки: 2600 мс, затем открывается /r/{id} в новой вкладке
// (см. appStore.goRedirect). Примерку ведёт встроенный виджет — это только
// переход в магазин с подписанным click_id.
export function Redirect() {
  const app = useApp();
  const p = app.redirectProduct;
  const offer = app.redirectOffer ?? p?.offers[0];
  return (
    <div style={sx("position:fixed;inset:0;background:#F4F1EA;z-index:80;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px")}>
      <div className="dp-fade" style={sx(`width:150px;height:190px;background:#E4E0D6;background-image:url('${p ? imgOf(p) : ""}');background-size:cover;background-position:center;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 34px rgba(0,0,0,.14)`)}>
        {!p && <span style={sx("font:400 10px 'Inter',monospace;color:rgba(0,0,0,.4)")}>ФОТО</span>}
      </div>
      <div style={sx("text-align:center")}>
        <div style={sx("font:400 28px/1.25 'Spectral',Georgia,serif")}>Открываем {offer?.retailer ?? p?.brand.name ?? "магазин"}…</div>
        <div style={sx("font:500 15px 'Inter',monospace;margin-top:8px")}>{offer ? formatPrice(offer.price, offer.currency) : ""} · размер 44</div>
      </div>
      <div style={sx("display:flex;gap:7px")}>
        <span style={sx("width:8px;height:8px;border-radius:50%;background:#2B2BCC;animation:dpDot 1.2s infinite")}></span>
        <span style={sx("width:8px;height:8px;border-radius:50%;background:#2B2BCC;animation:dpDot 1.2s infinite .2s")}></span>
        <span style={sx("width:8px;height:8px;border-radius:50%;background:#2B2BCC;animation:dpDot 1.2s infinite .4s")}></span>
      </div>
      <div style={sx("font:400 13px/1.5 'Inter',sans-serif;color:rgba(0,0,0,.5);max-width:300px;text-align:center")}>Оплата и доставка — на сайте магазина. Цена и наличие могли обновиться.</div>
      <div style={sx("position:absolute;bottom:26px;font:400 10px 'Inter',monospace;color:rgba(0,0,0,.32)")}>click_id 7f3a-…-c91 · подписан</div>
    </div>
  );
}
