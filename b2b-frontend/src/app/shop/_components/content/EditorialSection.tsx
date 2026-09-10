'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const trends = [
  { title: 'Тёплые оттенки', image: '/shop/assets/trend-warm.jpg', href: '/shop/category/clothing' },
  { title: 'Модели из кожи', image: '/shop/assets/trend-leather.jpg', href: '/shop/category/clothing' },
  { title: 'Свадебный стиль', image: '/shop/assets/trend-bridal.jpg', href: '/shop/category/wedding' },
  { title: 'Минимализм', image: '/shop/assets/trend-minimal.jpg', href: '/shop/category/clothing' },
];

const EditorialSection = () => {
  return (
    <section className="w-full mb-16 px-6">
      <h2 className="text-xl font-light text-foreground mb-8 tracking-wider">Тренды сезона</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {trends.map((trend, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Link href={trend.href} className="group relative block">
              <div className="aspect-square overflow-hidden">
                <img
                  src={trend.image}
                  alt={trend.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-foreground/20 group-hover:bg-foreground/40 transition-colors duration-500" />
                <div className="absolute bottom-4 left-4">
                  <h3 className="text-sm md:text-base font-light text-background tracking-wider">
                    {trend.title}
                  </h3>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default EditorialSection;

