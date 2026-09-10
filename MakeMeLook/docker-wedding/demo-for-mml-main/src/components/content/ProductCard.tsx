import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import tryonIcon from "@/assets/tryon-icon.svg";

interface ProductCardProps {
  id: string; // public_id UUID
  brand: string;
  name: string;
  price: string;
  image: string;
  hoverImage?: string;
  isNew?: boolean;
}

const ProductCard = ({ id, brand, name, price, image, hoverImage, isNew }: ProductCardProps) => {
  return (
    <Link to={`/product/${id}`} className="group block">
      <div className="aspect-[3/4] mb-3 overflow-hidden bg-secondary relative">
        {/* Main image */}
        <img
          src={image}
          alt={name}
          className={`w-full h-full object-cover transition-all duration-500 ${hoverImage ? 'group-hover:opacity-0' : 'group-hover:scale-105'}`}
          loading="lazy"
        />
        {/* Hover image */}
        {hoverImage && (
          <img
            src={hoverImage}
            alt={`${name} — другой ракурс`}
            className="absolute inset-0 w-full h-full object-cover transition-all duration-500 opacity-0 group-hover:opacity-100 group-hover:scale-105"
            loading="lazy"
          />
        )}

        {/* New badge */}
        {isNew && (
          <span className="absolute top-3 left-3 bg-background text-foreground text-[0.6rem] font-medium uppercase tracking-widest px-2 py-1">
            Новый сезон
          </span>
        )}

        {/* Wishlist button */}
        <button
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          aria-label="Добавить в избранное"
        >
          <Heart className="w-5 h-5 text-foreground" strokeWidth={1.5} />
        </button>

        {/* Try-on button sliding up from bottom */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-10">
          <button
            className="w-full bg-foreground text-background py-3 text-xs font-light tracking-wider flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              (window as any).makeMeLook?.open({ productId: id });
            }}
          >
            <img src={tryonIcon} alt="" className="w-3.5 h-3.5" />
            Примерить
          </button>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-[0.65rem] font-medium text-muted-foreground uppercase tracking-widest">
          {brand}
        </p>
        <h3 className="text-sm font-light text-foreground line-clamp-1">{name}</h3>
        <p className="text-sm font-light text-foreground">{price}</p>
      </div>
    </Link>
  );
};

export default ProductCard;
