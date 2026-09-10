import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import ProductCard from "./ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { formatPrice } from "@/lib/utils";

interface ProductCarouselProps {
  gender?: string;
}

const ProductCarousel = ({ gender }: ProductCarouselProps = {}) => {
  const { data, isLoading, isError } = useProducts({ sort: 'newest', limit: 6, ...(gender ? { gender } : {}) });

  if (isLoading) {
    return (
      <section className="w-full mb-16 px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-secondary animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (isError || !data?.items?.length) return null;

  return (
    <section className="w-full mb-16 px-6">
      <Carousel opts={{ align: "start", loop: false }} className="w-full">
        <CarouselContent>
          {data.items.map((product) => (
            <CarouselItem key={product.id} className="basis-1/2 md:basis-1/3 lg:basis-1/4 pr-2 md:pr-4">
              <ProductCard
                id={product.id}
                brand={product.brand ?? ''}
                name={product.name}
                price={formatPrice(product.price, product.currency)}
                image={product.photos[0]?.url ?? ''}
                hoverImage={product.photos[1]?.url}
                isNew={product.is_new}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
};

export default ProductCarousel;
