import { useParams } from "react-router-dom";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import CategoryHeader from "../components/category/CategoryHeader";
import ProductGrid from "../components/category/ProductGrid";

const Category = () => {
  const { category } = useParams();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-6">
        <CategoryHeader category={category || 'All Products'} />
        <ProductGrid />
      </main>

      <Footer />
    </div>
  );
};

export default Category;
