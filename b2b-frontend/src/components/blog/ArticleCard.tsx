import Link from "next/link";
import { motion } from "framer-motion";
import { Article, authors, relativeDate } from "@/data/blog";
import { TagChip } from "./TagChip";
import { Avatar } from "./Avatar";

type Props = { article: Article; index?: number; query?: string };

const highlight = (text: string, q?: string) => {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-brand-accent-soft px-0.5 text-brand-accent">
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
};

export const ArticleCard = ({ article, index = 0, query }: Props) => {
  const author = authors[article.authorId];
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: Math.min(index, 6) * 0.04 }}
      className="group flex flex-col overflow-hidden rounded-[24px] bg-brand-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]"
    >
      <Link href={`/ru/blog/${article.slug}`} className="flex flex-1 flex-col">
        <div className="aspect-[16/9] w-full overflow-hidden">
          <img
            src={article.cover}
            alt={article.title}
            loading="lazy"
            width={1280}
            height={736}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
        <div className="flex flex-1 flex-col gap-4 p-6">
          <TagChip as="span">{article.category}</TagChip>
          <h3 className="text-[20px] font-semibold leading-[1.25] tracking-[-0.01em] text-brand-ink">
            {highlight(article.title, query)}
          </h3>
          <p className="line-clamp-3 text-[15px] leading-[1.5] text-brand-muted">
            {highlight(article.excerpt, query)}
          </p>
          <div className="mt-auto flex items-center justify-between gap-3 pt-2 text-[13px] text-brand-muted">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar author={author} size={24} />
              <span className="truncate font-medium text-brand-ink">{author.name}</span>
            </div>
            <span className="shrink-0">{relativeDate(article.date)} · {article.readingTime} мин</span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
};
