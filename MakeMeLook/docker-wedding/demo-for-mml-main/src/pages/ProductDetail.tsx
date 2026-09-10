import { useParams, Link } from "react-router-dom";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import ProductImageGallery from "../components/product/ProductImageGallery";
import ProductInfo from "../components/product/ProductInfo";
import ProductCard from "../components/content/ProductCard";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { useProduct } from "@/hooks/useProduct";
import { formatPrice } from "@/lib/utils";

const ProductDetail = () => {
  const { productId } = useParams<{ productId: string }>();
  const { data: product, isLoading, isError } = useProduct(productId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-6 px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="aspect-[3/4] bg-secondary animate-pulse" />
            <div className="lg:pl-12 mt-8 lg:mt-0 space-y-4">
              <div className="h-4 w-24 bg-secondary animate-pulse" />
              <div className="h-8 w-3/4 bg-secondary animate-pulse" />
              <div className="h-6 w-20 bg-secondary animate-pulse" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20 px-6 text-center">
          <p className="text-sm text-muted-foreground">Товар не найден.</p>
          <Link to="/" className="text-sm underline mt-4 inline-block">На главную</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const images = product.photos.map((p) => p.url);
  const categoryPath = product.category ? `/category/${product.category}` : '/';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-6">
        <section className="w-full px-6">
          {/* Mobile breadcrumb */}
          <div className="lg:hidden mb-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild><Link to="/">Главная</Link></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild><Link to={categoryPath}>{product.category ?? 'Одежда'}</Link></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{product.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <ProductImageGallery images={images} />
            <div className="lg:pl-12 mt-8 lg:mt-0 lg:sticky lg:top-20 lg:h-fit">
              <ProductInfo product={product} />
            </div>
          </div>
        </section>

        {/* Related products */}
        {product.related_products.length > 0 && (
          <section className="w-full mt-16">
            <div className="mb-6 px-6">
              <h2 className="text-xl font-light text-foreground tracking-wider">Вам также может понравиться</h2>
            </div>
            <div className="px-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {product.related_products.slice(0, 4).map((related) => (
                <ProductCard
                  key={related.id}
                  id={related.id}
                  brand={related.brand ?? ''}
                  name={related.name}
                  price={formatPrice(related.price, related.currency)}
                  image={related.photos[0]?.url ?? ''}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;
