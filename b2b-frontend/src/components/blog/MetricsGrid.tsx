import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Metric } from "@/data/blog";

const Icon = ({ d }: { d?: Metric["delta"] }) => {
  if (d === "up") return <ArrowUp className="h-3.5 w-3.5 text-emerald-600" />;
  if (d === "down") return <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />;
  if (d === "neutral") return <Minus className="h-3.5 w-3.5 text-brand-muted" />;
  return null;
};

export const MetricsGrid = ({ items }: { items: Metric[] }) => (
  <div
    className="my-10 grid gap-3"
    style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))` }}
  >
    {items.map((m, i) => (
      <div key={i} className="rounded-[20px] bg-white p-5">
        <div className="flex items-center gap-1.5 text-[28px] font-bold leading-none tracking-[-0.02em] text-brand-ink md:text-[32px]">
          <span>{m.value}</span>
          <Icon d={m.delta} />
        </div>
        <div className="mt-2 text-[13px] leading-[1.4] text-brand-muted">{m.label}</div>
      </div>
    ))}
  </div>
);
