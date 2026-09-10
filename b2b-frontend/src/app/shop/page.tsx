import Header from './_components/header/Header';
import Footer from './_components/footer/Footer';
import LargeHero from './_components/content/LargeHero';
import ProductCarousel from './_components/content/ProductCarousel';
import ProductGrid from './_components/content/ProductGrid';
import EditorialSection from './_components/content/EditorialSection';
import AnimatedSection from './_components/content/AnimatedSection';
export default function ShopPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <LargeHero />
        <AnimatedSection>
          <div className="mb-4 px-6">
            <h2 className="text-xl font-light text-foreground tracking-wider">Новинки</h2>
          </div>
          <ProductCarousel />
        </AnimatedSection>
        <AnimatedSection delay={0.1}>
          <div className="mb-4 px-6">
            <h2 className="text-xl font-light text-foreground tracking-wider">Каталог</h2>
          </div>
          <ProductGrid />
        </AnimatedSection>
        <AnimatedSection delay={0.1}>
          <EditorialSection />
        </AnimatedSection>
      </main>
      <Footer />
    </div>
  );
}

