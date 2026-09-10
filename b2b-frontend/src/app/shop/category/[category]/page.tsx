import Header from '../../_components/header/Header';
import Footer from '../../_components/footer/Footer';
import CategoryHeader from '../../_components/category/CategoryHeader';
import CategoryProductGrid from '../../_components/category/CategoryProductGrid';

interface CategoryPageProps {
  params: { category: string };
}

export default function CategoryPage({ params }: CategoryPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-6">
        <CategoryHeader category={params.category || 'All Products'} />
        <CategoryProductGrid category={params.category} />
      </main>
      <Footer />
    </div>
  );
}

