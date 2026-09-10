import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Article, formatDate, authors } from "@/data/blog";
import { TagChip } from "./TagChip";
import { Avatar } from "./Avatar";

export const FeaturedCard = ({ article }: { article: Article }) => {
  const author = authors[article.authorId];
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="group overflow-hidden rounded-[32px] bg-brand-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)]"
    >
      <Link href={`/ru/blog/${article.slug}`} className="grid md:grid-cols-2">
        <div className="aspect-[16/10] overflow-hidden md:aspect-auto md:h-full">
          <img
            src={article.cover}
            alt={article.title}
            width={1280}
            height={736}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
        <div className="flex flex-col justify-center gap-5 p-7 md:p-10">
          <div className="flex flex-wrap gap-2">
            <TagChip as="span">Главное</TagChip>
            <TagChip as="span">{article.category}</TagChip>
          </div>
          <h2
            className="font-bold text-brand-ink"
            style={{ fontSize: "clamp(24px, 3.2vw, 36px)", letterSpacing: "-0.02em", lineHeight: 1.1 }}
          >
            {article.title}
          </h2>
          <p className="text-[16px] leading-[1.55] text-brand-muted">{article.excerpt}</p>
          <div className="mt-2 flex items-center gap-3 text-[13px] text-brand-muted">
            <Avatar author={author} size={32} />
            <span className="font-medium text-brand-ink">{author.name}</span>
            <span>·</span>
            <span>{formatDate(article.date)}</span>
            <span>·</span>
            <span>{article.readingTime} мин</span>
          </div>
          <span className="mt-2 inline-flex items-center gap-1.5 text-[14px] font-medium text-brand-accent">
            Читать материал <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </motion.article>
  );
};
