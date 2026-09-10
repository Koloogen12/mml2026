import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const VirtualTryOnBanner = () => {
  return (
    <section className="w-full mb-16 px-6">
      <div className="bg-accent-blue/5 border border-accent-blue/20 py-12 px-8 text-center">
        <Sparkles className="w-8 h-8 text-accent-blue mx-auto mb-4" />
        <h2 className="text-xl md:text-2xl font-light text-foreground mb-3 tracking-wider">
          Попробуйте виртуальную примерку
        </h2>
        <p className="text-sm font-light text-muted-foreground mb-6 max-w-lg mx-auto">
          Увидьте, как одежда будет выглядеть на вас — загрузите фото и примерьте любую вещь онлайн
        </p>
        <Link
          to="/product/1"
          className="inline-flex items-center gap-2 bg-accent-blue text-accent-blue-foreground px-8 py-3 text-sm font-light tracking-wider hover:bg-accent-blue/90 transition-all duration-300"
        >
          <Sparkles className="w-4 h-4" />
          Попробовать
        </Link>
      </div>
    </section>
  );
};

export default VirtualTryOnBanner;
