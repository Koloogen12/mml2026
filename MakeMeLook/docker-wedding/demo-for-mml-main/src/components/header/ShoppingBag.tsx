import { X, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface CartItem {
  id: number;
  name: string;
  price: string;
  image: string;
  quantity: number;
  category: string;
}

interface ShoppingBagProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  updateQuantity: (id: number, newQuantity: number) => void;
  onViewFavorites?: () => void;
}

const ShoppingBag = ({ isOpen, onClose, cartItems, updateQuantity }: ShoppingBagProps) => {
  if (!isOpen) return null;

  const subtotal = cartItems.reduce((sum, item) => {
    const price = parseInt(item.price.replace(/[^\d]/g, ''));
    return sum + (price * item.quantity);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 h-screen">
      <div className="absolute inset-0 bg-foreground/50 h-screen" onClick={onClose} />
      <div className="absolute right-0 top-0 h-screen w-full md:w-96 bg-background border-l border-border animate-slide-in-right flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-light text-foreground">Корзина</h2>
          <button onClick={onClose} className="p-2 text-foreground hover:text-muted-foreground transition-colors" aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 flex flex-col p-6">
          {cartItems.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground text-sm text-center">
                Ваша корзина пуста.<br />Продолжите покупки, чтобы добавить товары.
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-6 mb-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-20 h-24 bg-secondary overflow-hidden">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.category}</p>
                      <h3 className="text-sm font-light text-foreground mt-1">{item.name}</h3>
                      <p className="text-sm font-light text-foreground mt-1">{item.price}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center border border-border">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1.5 hover:bg-secondary transition-colors">
                            <Minus size={12} />
                          </button>
                          <span className="px-3 text-xs font-light">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1.5 hover:bg-secondary transition-colors">
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-light text-foreground">Итого</span>
                  <span className="text-sm font-medium text-foreground">{subtotal.toLocaleString('ru-RU')} ₽</span>
                </div>
                <p className="text-xs text-muted-foreground">Доставка рассчитывается при оформлении</p>
                <Button asChild className="w-full rounded-none" size="lg" onClick={onClose}>
                  <Link to="/checkout">Оформить заказ</Link>
                </Button>
                <Button variant="outline" className="w-full rounded-none" size="lg" onClick={onClose} asChild>
                  <Link to="/category/clothing">Продолжить покупки</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShoppingBag;
