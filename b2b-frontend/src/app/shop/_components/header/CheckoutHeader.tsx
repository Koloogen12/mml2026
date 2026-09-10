import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

const CheckoutHeader = () => {
  return (
    <header className="w-full bg-background border-b border-muted-foreground/20">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="relative flex items-center justify-between">
          <Link
            href="/shop"
            className="flex items-center gap-2 text-foreground hover:text-foreground/80 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm font-light hidden sm:inline">Продолжить покупки</span>
          </Link>
          <Link href="/shop" className="absolute left-1/2 transform -translate-x-1/2">
            <img src="/shop/makemeelook-logo.png" alt="MakeMeLook" className="h-6 w-auto" />
          </Link>
          <div className="text-sm font-light text-foreground">Поддержка</div>
        </div>
      </div>
    </header>
  );
};

export default CheckoutHeader;

