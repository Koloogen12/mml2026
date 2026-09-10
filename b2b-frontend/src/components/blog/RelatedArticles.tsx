import { Article } from "@/data/blog";
import { ArticleCard } from "./ArticleCard";
import { SectionTitle } from "./SectionTitle";

export const RelatedArticles = ({ items }: { items: Article[] }) => {
  if (!items.length) return null;
  return (
    <section className="mt-[110px] md:mt-[140px]">
      <div className="mx-auto max-w-container-brand px-4 md:px-2">
        <div className="mb-8 flex flex-col items-start gap-4">
          <SectionTitle>Читайте также</SectionTitle>
          <h2 className="text-[26px] font-normal leading-[105%] tracking-[-1.3px] text-brand-ink md:text-[34px] md:leading-[95%] md:tracking-[-1.7px]">
            Похожие материалы
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a, i) => (
            <ArticleCard key={a.slug} article={a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};
