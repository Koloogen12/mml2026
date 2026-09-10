'use client';

import { useState, useRef } from 'react';
import ImageZoom from './ImageZoom';

interface ProductImageGalleryProps {
  images: string[];
}

const ProductImageGallery = ({ images }: ProductImageGalleryProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomInitialIndex, setZoomInitialIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const total = images.length;
  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % total);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + total) % total);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => { touchEndX.current = e.touches[0].clientX; };
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) { diff > 0 ? nextImage() : prevImage(); }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!images.length) return null;

  return (
    <div className="w-full">
      <div className="space-y-2">
        {images.map((image, index) => (
          <div
            key={index}
            className="w-full aspect-[3/4] overflow-hidden cursor-pointer group"
            onClick={() => { setZoomInitialIndex(index); setIsZoomOpen(true); }}
            onTouchStart={index === currentImageIndex ? handleTouchStart : undefined}
            onTouchMove={index === currentImageIndex ? handleTouchMove : undefined}
            onTouchEnd={index === currentImageIndex ? handleTouchEnd : undefined}
          >
            <img src={image} alt={`Вид ${index + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 select-none" />
          </div>
        ))}
      </div>
      <ImageZoom images={images} initialIndex={zoomInitialIndex} isOpen={isZoomOpen} onClose={() => setIsZoomOpen(false)} />
    </div>
  );
};

export default ProductImageGallery;

