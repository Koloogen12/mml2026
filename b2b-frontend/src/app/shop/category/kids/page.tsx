import Header from '../../_components/header/Header';
import Footer from '../../_components/footer/Footer';
import AnimatedSection from '../../_components/content/AnimatedSection';
import ProductCarousel from '../../_components/content/ProductCarousel';
import EditorialSection from '../../_components/content/EditorialSection';
import Link from 'next/link';
import LargeHeroKids from './LargeHeroKids';

export default function ForKidsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <LargeHeroKids />
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
          <section className="w-full px-6 mb-16">
            <div className="flex flex-col items-center justify-center py-24 text-center border border-border">
              <p className="text-sm font-light text-muted-foreground mb-1 tracking-wide uppercase">Весна-Лето 2026</p>
              <h3 className="text-2xl font-light text-foreground mb-4 tracking-wide">Детская коллекция скоро появится</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Мы готовим специальную коллекцию для детей. Следите за обновлениями — новинки появятся совсем скоро.
              </p>
              <Link href="/shop" className="mt-8 text-xs tracking-widest uppercase border-b border-foreground pb-0.5 text-foreground hover:text-muted-foreground transition-colors">
                Смотреть женскую коллекцию
              </Link>
            </div>
          </section>
        </AnimatedSection>
        <AnimatedSection delay={0.1}>
          <EditorialSection />
        </AnimatedSection>
      </main>
      <Footer />
    </div>
  );
}
