import Header from '../../_components/header/Header';
import Footer from '../../_components/footer/Footer';
import AnimatedSection from '../../_components/content/AnimatedSection';
import ProductCarousel from '../../_components/content/ProductCarousel';
import CategoryProductGrid from '../../_components/category/CategoryProductGrid';
import EditorialSection from '../../_components/content/EditorialSection';
import LargeHeroMen from './LargeHeroMen';

export default function ForHimPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <LargeHeroMen />
        <AnimatedSection>
          <div className="mb-4 px-6">
            <h2 className="text-xl font-light text-foreground tracking-wider">Новинки</h2>
          </div>
          <ProductCarousel gender="male" />
        </AnimatedSection>
        <AnimatedSection delay={0.1}>
          <div className="mb-4 px-6">
            <h2 className="text-xl font-light text-foreground tracking-wider">Каталог</h2>
          </div>
          <CategoryProductGrid genderOverride="male" />
        </AnimatedSection>
        <AnimatedSection delay={0.1}>
          <EditorialSection />
        </AnimatedSection>
      </main>
      <Footer />
    </div>
  );
}
