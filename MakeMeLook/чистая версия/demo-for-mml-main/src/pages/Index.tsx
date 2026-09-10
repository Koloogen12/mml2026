import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import LargeHero from "../components/content/LargeHero";
import ProductCarousel from "../components/content/ProductCarousel";
import ProductGrid from "../components/content/ProductGrid";
import EditorialSection from "../components/content/EditorialSection";
import AnimatedSection from "../components/content/AnimatedSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero */}
        <LargeHero />

        {/* Новинки carousel */}
        <AnimatedSection>
          <div className="mb-4 px-6">
            <h2 className="text-xl font-light text-foreground tracking-wider">Новинки</h2>
          </div>
          <ProductCarousel />
        </AnimatedSection>

        {/* Product Grid */}
        <AnimatedSection delay={0.1}>
          <div className="mb-4 px-6">
            <h2 className="text-xl font-light text-foreground tracking-wider">Каталог</h2>
          </div>
          <ProductGrid />
        </AnimatedSection>

        {/* Тренды сезона */}
        <AnimatedSection delay={0.1}>
          <EditorialSection />
        </AnimatedSection>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
