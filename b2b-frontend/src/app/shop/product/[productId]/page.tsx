import ProductDetailClient from './ProductDetailClient';

interface ProductPageProps {
  params: { productId: string };
}

export default function ProductPage({ params }: ProductPageProps) {
  return <ProductDetailClient productId={params.productId} />;
}

