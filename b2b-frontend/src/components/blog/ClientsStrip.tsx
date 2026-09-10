import { Logo } from "@/data/blog";

export const ClientsStrip = ({ items, label = "Используют MakeMeLook" }: { items: Logo[]; label?: string }) => (
  <div className="my-10 rounded-[24px] bg-white p-6">
    <div className="text-[12px] font-semibold uppercase tracking-wider text-brand-muted">{label}</div>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      {items.map((l) => (
        <div
          key={l.name}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-bg px-4 text-[13px] font-medium text-brand-ink"
          title={l.name}
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-accent-soft text-[10px] font-bold text-brand-accent">
            {l.initials}
          </span>
          {l.name}
        </div>
      ))}
    </div>
  </div>
);
