import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { articles } from "@/data/blog";
import { ArticleCard } from "./ArticleCard";
import { SectionTitle } from "./SectionTitle";

export const BlogTeaser = () => {
  const latest = [...articles].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  return (
    <section className="bg-brand-bg font-inter">
      <div className="mx-auto max-w-container-brand px-4 md:px-2">
        <div className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="flex flex-col items-start gap-4">
            <SectionTitle>Блог</SectionTitle>
            <h2
              className="font-normal text-brand-ink"
              style={{ fontSize: "clamp(26px, 3.4vw, 36px)", letterSpacing: "-1.7px", lineHeight: "105%" }}
            >
              Свежие материалы и кейсы
            </h2>
          </div>
          <Link
            href="/ru/blog"
            className="inline-flex h-[42px] items-center gap-2 rounded-[100px] bg-brand-cta px-6 text-[13px] font-medium text-white transition-colors duration-300 hover:bg-brand-cta-hover"
          >
            Все статьи <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((a, i) => (
            <ArticleCard key={a.slug} article={a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};
