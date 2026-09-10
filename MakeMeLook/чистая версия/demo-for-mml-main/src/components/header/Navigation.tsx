import { X, Search, Heart, ShoppingBag as BagIcon, User, Menu } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ShoppingBag from "./ShoppingBag";
import { useIsMobile } from "@/hooks/use-mobile";
import productDress from "@/assets/product-dress-1.jpg";
import productBlazer from "@/assets/product-blazer.jpg";
import productSweater from "@/assets/product-sweater.jpg";

interface CartItem {
  id: number;
  name: string;
  price: string;
  image: string;
  quantity: number;
  category: string;
}

const Navigation = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShoppingBagOpen, setIsShoppingBagOpen] = useState(false);
  const [offCanvasType, setOffCanvasType] = useState<'favorites' | null>(null);
  const location = useLocation();
  const isMobile = useIsMobile();

  const [cartItems, setCartItems] = useState<CartItem[]>([
    { id: 1, name: "Платье макси из шёлка", price: "87 500 ₽", image: productDress, quantity: 1, category: "VALENTINO" },
    { id: 2, name: "Блейзер оверсайз", price: "124 900 ₽", image: productBlazer, quantity: 1, category: "BALENCIAGA" },
    { id: 3, name: "Свитер из кашемира", price: "68 000 ₽", image: productSweater, quantity: 1, category: "LORO PIANA" },
  ]);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const updateQuantity = (id: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCartItems(items => items.filter(item => item.id !== id));
    } else {
      setCartItems(items =>
        items.map(item => item.id === id ? { ...item, quantity: newQuantity } : item)
      );
    }
  };

  const currentPath = location.pathname;

  const topCategories = [
    { name: "ДЛЯ НЕЕ", href: "/", active: currentPath === "/" },
    { name: "ДЛЯ НЕГО", href: "/category/men", active: currentPath === "/category/men" },
    { name: "ДЛЯ ДЕТЕЙ", href: "/category/kids", active: currentPath === "/category/kids" },
  ];

  const navItems = [
    { name: "Новинки", href: "/category/new" },
    { name: "Платья", href: "/category/dresses" },
    { name: "Верх", href: "/category/tops" },
    { name: "Низ", href: "/category/bottoms" },
    { name: "Верхняя одежда", href: "/category/outerwear" },
    { name: "Свадебная коллекция", href: "/category/wedding" },
  ];

  const popularSearches = [
    "Платья", "Свадебные платья", "Кашемир", "Пальто", "Сумки", "Обувь"
  ];

  return (
    <nav className="relative bg-background">
      {/* Top row: Logo + Nav */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-border" style={{ paddingLeft: isMobile ? 16 : 24, paddingRight: isMobile ? 16 : 24 }}>
        {/* Left: hamburger (mobile) / top categories (desktop) */}
        <div className="flex items-center">
          {isMobile ? (
            <button
              className="p-2 -ml-2 text-foreground hover:text-foreground/60 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Меню"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" strokeWidth={1.5} />
              ) : (
                <Menu className="w-5 h-5" strokeWidth={1.5} />
              )}
            </button>
          ) : (
            <div className="flex items-center space-x-5">
              {topCategories.map((cat) => (
                <Link
                  key={cat.name}
                  to={cat.href}
                  className={`text-xs font-medium tracking-wider transition-colors ${
                    cat.active
                      ? 'text-foreground underline underline-offset-4'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Center logo */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <Link to="/" className="block">
            <img
              src={`${import.meta.env.BASE_URL}makemeelook-logo.png`}
              alt="MakeMeLook"
              className="h-5 w-auto"
            />
          </Link>
        </div>

        {/* Right icons */}
        <div className="flex items-center" style={{ gap: isMobile ? 2 : 4 }}>
          {isMobile && (
            <button
              className="p-2 text-foreground hover:text-foreground/60 transition-colors"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-label="Поиск"
            >
              <Search className="w-5 h-5" strokeWidth={1.5} />
            </button>
          )}
          {!isMobile && (
            <button className="p-2 text-foreground hover:text-foreground/60 transition-colors">
              <User className="w-5 h-5" strokeWidth={1.5} />
            </button>
          )}
          <button
            className="p-2 text-foreground hover:text-foreground/60 transition-colors"
            aria-label="Избранное"
            onClick={() => setOffCanvasType('favorites')}
          >
            <Heart className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <button
            className="p-2 text-foreground hover:text-foreground/60 transition-colors relative"
            aria-label="Корзина"
            onClick={() => setIsShoppingBagOpen(true)}
          >
            <BagIcon className="w-5 h-5" strokeWidth={1.5} />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-foreground text-background text-[0.6rem] font-medium w-4 h-4 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Second row: Nav items (scrollable on mobile) + Search (desktop) */}
      <div className="flex items-center h-11 border-b border-border">
        <div
          className="flex items-center overflow-x-auto flex-1"
          style={{
            gap: isMobile ? 16 : 24,
            paddingLeft: isMobile ? 16 : 24,
            paddingRight: isMobile ? 16 : 24,
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className="text-sm font-light text-foreground hover:text-foreground/60 transition-colors"
              style={{ flexShrink: 0 }}
            >
              {item.name}
            </Link>
          ))}
        </div>
        {!isMobile && (
          <div
            className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors px-6"
            style={{ flexShrink: 0 }}
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            <Search className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-sm font-light border-b border-border pb-0.5" style={{ minWidth: 140 }}>Что вы ищете?</span>
          </div>
        )}
      </div>

      {/* Search overlay */}
      {isSearchOpen && (
        <div className="absolute top-full left-0 right-0 bg-background border-b border-border z-50">
          <div className="px-4 py-6" style={{ padding: isMobile ? '24px 16px' : '32px 24px' }}>
            <div style={{ maxWidth: 672, margin: '0 auto' }}>
              <div style={{ marginBottom: isMobile ? 24 : 32 }}>
                <div className="flex items-center border-b border-foreground pb-2">
                  <Search className="w-5 h-5 text-foreground mr-3" strokeWidth={1.5} />
                  <input
                    type="text"
                    placeholder="Что вы ищете?"
                    className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-light"
                    style={{ fontSize: isMobile ? 16 : 18 }}
                    autoFocus
                  />
                  <button onClick={() => setIsSearchOpen(false)} className="p-1 ml-2 text-foreground hover:text-muted-foreground">
                    <X className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">Популярные запросы</h3>
                <div className="flex flex-wrap" style={{ gap: isMobile ? 8 : 12 }}>
                  {popularSearches.map((search, index) => (
                    <button key={index} className="text-foreground hover:text-foreground/60 text-sm font-light py-2 px-4 border border-border rounded-full transition-colors hover:border-foreground">
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu — slide down */}
      {isMobile && isMobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute top-full left-0 right-0 bg-background border-b border-border z-50 shadow-lg">
            <div style={{ padding: '20px 20px' }}>
              {topCategories.map((cat) => (
                <Link
                  key={cat.name}
                  to={cat.href}
                  className="block text-sm font-medium tracking-wide transition-colors"
                  style={{
                    padding: '12px 0',
                    borderBottom: '1px solid hsl(var(--border) / 0.5)',
                    color: cat.active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                  }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {cat.name}
                </Link>
              ))}

              <div style={{ paddingTop: 8 }} />

              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="block text-sm font-light text-foreground transition-colors"
                  style={{ padding: '12px 0', borderBottom: '1px solid hsl(var(--border) / 0.5)' }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}

              <div style={{ paddingTop: 12 }}>
                <button className="flex items-center gap-3 text-sm font-light text-muted-foreground w-full" style={{ padding: '12px 0' }}>
                  <User className="w-4 h-4" strokeWidth={1.5} />
                  В личный кабинет
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Shopping Bag */}
      <ShoppingBag
        isOpen={isShoppingBagOpen}
        onClose={() => setIsShoppingBagOpen(false)}
        cartItems={cartItems}
        updateQuantity={updateQuantity}
      />

      {/* Favorites */}
      {offCanvasType === 'favorites' && (
        <div className="fixed inset-0 z-50 h-screen">
          <div className="absolute inset-0 h-screen" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setOffCanvasType(null)} />
          <div
            className="absolute right-0 top-0 h-screen bg-background border-l border-border animate-slide-in-right flex flex-col"
            style={{ width: isMobile ? '100%' : 384 }}
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-light text-foreground">Избранное</h2>
              <button onClick={() => setOffCanvasType(null)} className="p-2 text-foreground hover:text-muted-foreground transition-colors" aria-label="Закрыть">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-muted-foreground text-sm">
                У вас пока нет избранных товаров. Просмотрите каталог и нажмите на сердечко, чтобы сохранить понравившиеся вещи.
              </p>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
