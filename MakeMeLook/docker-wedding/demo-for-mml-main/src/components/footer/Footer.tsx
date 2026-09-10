import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="w-full bg-background text-foreground pt-16 pb-4 px-6 border-t border-border mt-24">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
        {/* Newsletter */}
        <div className="lg:col-span-2">
          <h4 className="text-sm font-medium mb-4 tracking-wider">Подпишитесь на новинки</h4>
          <p className="text-sm font-light text-muted-foreground mb-4">
            Будьте первыми, кто узнает о новых коллекциях и специальных предложениях
          </p>
          <div className="flex">
            <input
              type="email"
              placeholder="Ваш email"
              className="flex-1 bg-transparent border border-border px-4 py-2.5 text-sm font-light outline-none focus:border-foreground transition-colors"
            />
            <button className="bg-foreground text-background px-6 py-2.5 text-sm font-light tracking-wider hover:bg-foreground/90 transition-colors">
              OK
            </button>
          </div>
          {/* Social icons */}
          <div className="flex gap-4 mt-6">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Instagram</a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Telegram</a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">VK</a>
          </div>
        </div>

        {/* О нас */}
        <div>
          <h4 className="text-xs font-medium uppercase tracking-widest mb-4">О нас</h4>
          <ul className="space-y-2">
            <li><Link to="/about/our-story" className="text-sm font-light text-muted-foreground hover:text-foreground transition-colors">О компании</Link></li>
            <li><a href="#" className="text-sm font-light text-muted-foreground hover:text-foreground transition-colors">Карьера</a></li>
            <li><a href="#" className="text-sm font-light text-muted-foreground hover:text-foreground transition-colors">Пресса</a></li>
          </ul>
        </div>

        {/* Помощь */}
        <div>
          <h4 className="text-xs font-medium uppercase tracking-widest mb-4">Помощь</h4>
          <ul className="space-y-2">
            <li><Link to="/about/customer-care" className="text-sm font-light text-muted-foreground hover:text-foreground transition-colors">Служба поддержки</Link></li>
            <li><Link to="/about/size-guide" className="text-sm font-light text-muted-foreground hover:text-foreground transition-colors">Размерная сетка</Link></li>
            <li><a href="#" className="text-sm font-light text-muted-foreground hover:text-foreground transition-colors">FAQ</a></li>
          </ul>
        </div>

        {/* Доставка и оплата */}
        <div>
          <h4 className="text-xs font-medium uppercase tracking-widest mb-4">Контакты</h4>
          <ul className="space-y-2">
            <li><a href="#" className="text-sm font-light text-muted-foreground hover:text-foreground transition-colors">Доставка и оплата</a></li>
            <li><a href="#" className="text-sm font-light text-muted-foreground hover:text-foreground transition-colors">Возврат</a></li>
            <li><a href="mailto:hello@makemeelook.ai" className="text-sm font-light text-muted-foreground hover:text-foreground transition-colors">hello@makemeelook.ai</a></li>
          </ul>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-border pt-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-xs font-light text-muted-foreground">
            © 2026 MakeMeLook. Все права защищены.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/privacy-policy" className="text-xs font-light text-muted-foreground hover:text-foreground transition-colors">
              Политика конфиденциальности
            </Link>
            <Link to="/terms-of-service" className="text-xs font-light text-muted-foreground hover:text-foreground transition-colors">
              Условия использования
            </Link>
          </div>
          <a
            href="https://makemeelook.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-light text-muted-foreground hover:text-foreground transition-colors"
          >
            Powered by MakeMeLook.ai
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
