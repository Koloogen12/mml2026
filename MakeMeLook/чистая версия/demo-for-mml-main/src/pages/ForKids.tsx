import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import AnimatedSection from "../components/content/AnimatedSection";
import ProductCarousel from "../components/content/ProductCarousel";
import EditorialSection from "../components/content/EditorialSection";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import heroKids from "@/assets/hero-kids.webp";

const ForKids = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero */}
        <section className="w-full mb-16 mt-4">
          <div className="px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <Link to="/category/kids" className="group block">
                <div className="aspect-[3/4] md:aspect-[4/3] overflow-hidden relative">
                  <img
                    src={heroKids}
                    alt="Новая коллекция для детей"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-foreground/10 group-hover:bg-foreground/25 transition-colors duration-500" />
                  <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6">
                    <p className="text-[0.6rem] font-light text-background/80 tracking-widest uppercase mb-1">
                      Весна-Лето 2026
                    </p>
                    <h2 className="text-lg md:text-xl lg:text-2xl font-light text-background tracking-wide">
                      Новая коллекция
                    </h2>
                    <span className="inline-block mt-2 text-[0.65rem] text-background border-b border-background/60 pb-0.5 tracking-wider group-hover:border-background transition-colors duration-300">
                      Смотреть
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Новинки carousel */}
        <AnimatedSection>
          <div className="mb-4 px-6">
            <h2 className="text-xl font-light text-foreground tracking-wider">Новинки</h2>
          </div>
          <ProductCarousel />
        </AnimatedSection>

        {/* Каталог — детские товары появятся в следующей коллекции */}
        <AnimatedSection delay={0.1}>
          <div className="mb-4 px-6">
            <h2 className="text-xl font-light text-foreground tracking-wider">Каталог</h2>
          </div>
          <section className="w-full px-6 mb-16">
            <div className="flex flex-col items-center justify-center py-24 text-center border border-border">
              <p className="text-sm font-light text-muted-foreground mb-1 tracking-wide uppercase">Весна-Лето 2026</p>
              <h3 className="text-2xl font-light text-foreground mb-4 tracking-wide">Детская коллекция скоро появится</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Мы готовим специальную коллекцию для детей. Следите за обновлениями — новинки появятся совсем скоро.
              </p>
              <Link to="/" className="mt-8 text-xs tracking-widest uppercase border-b border-foreground pb-0.5 text-foreground hover:text-muted-foreground transition-colors">
                Смотреть женскую коллекцию
              </Link>
            </div>
          </section>
        </AnimatedSection>

        {/* Тренды */}
        <AnimatedSection delay={0.1}>
          <EditorialSection />
        </AnimatedSection>
      </main>

      <Footer />
    </div>
  );
};

export default ForKids;
