import { Link } from "react-router-dom";
import heroWedding from "@/assets/hero-wedding.jpg";

const FiftyFiftySection = () => {
  return (
    <section className="w-full mb-16">
      <div className="relative w-full aspect-[16/7] overflow-hidden">
        <img
          src={heroWedding}
          alt="Свадебная коллекция"
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-foreground/30" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <h2 className="text-2xl md:text-4xl font-light text-background tracking-wider mb-3">
            Что надеть на свадьбу?
          </h2>
          <p className="text-sm font-light text-background/90 mb-6 max-w-md">
            От свадебных платьев до аксессуаров для гостей
          </p>
          <Link
            to="/category/wedding"
            className="bg-background text-foreground px-8 py-3 text-sm font-light tracking-wider hover:bg-background/90 transition-all duration-300"
          >
            Начать шопинг
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FiftyFiftySection;
