import { useEffect, useState } from "react";
import { Block } from "@/data/blog";
import { slugify } from "./ArticleRenderer";

type Item = { id: string; text: string; level: 2 | 3 };

export const TableOfContents = ({ blocks }: { blocks: Block[] }) => {
  const items: Item[] = blocks
    .filter((b) => b.type === "h2" || b.type === "h3")
    .map((b: any) => ({ id: slugify(b.text), text: b.text, level: b.type === "h2" ? 2 : 3 }));

  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    if (!items.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -65% 0px", threshold: 0 }
    );
    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items.length]);

  if (!items.length) return null;

  const list = (
    <ul className="space-y-2 border-l border-brand-border pl-4">
      {items.map((it) => (
        <li key={it.id} className={it.level === 3 ? "pl-3" : ""}>
          <a
            href={`#${it.id}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(it.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className={`block text-[13px] leading-[1.5] transition-colors duration-200 ${
              active === it.id ? "text-brand-accent font-medium" : "text-brand-muted hover:text-brand-ink"
            }`}
          >
            {it.text}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <details className="mb-6 rounded-[16px] bg-white p-5 lg:hidden">
        <summary className="cursor-pointer text-[13px] font-medium text-brand-ink">Содержание</summary>
        <div className="mt-4">{list}</div>
      </details>
      <nav className="hidden lg:block">
        <div className="sticky top-[88px]">
          <div className="mb-3 text-[12px] font-medium uppercase tracking-wider text-brand-muted">Содержание</div>
          {list}
        </div>
      </nav>
    </>
  );
};
