type Props = { items: string[] };

export const TLDR = ({ items }: Props) => (
  <aside className="my-8 rounded-[20px] bg-white p-6" aria-label="Краткое содержание">
    <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-brand-accent">TL;DR</div>
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-[1.5] text-brand-ink">
          <span className="mt-[9px] inline-block h-[5px] w-[5px] shrink-0 rounded-full bg-brand-accent" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  </aside>
);
