import { ArrowRight } from "lucide-react";

type Props = { title: string; text: string; button: string; href?: string };

export const InlineCTA = ({ title, text, button, href = "/#cta" }: Props) => (
  <aside
    className="my-10 rounded-[24px] border border-brand-accent/15 bg-brand-accent-soft p-8"
    role="complementary"
  >
    <h3 className="text-[22px] font-semibold leading-tight tracking-[-0.01em] text-brand-ink">{title}</h3>
    <p className="mt-3 text-[16px] leading-[1.55] text-brand-ink/80">{text}</p>
    <a
      href={href}
      className="mt-5 inline-flex h-[44px] items-center gap-2 rounded-[100px] bg-brand-accent px-6 text-[13px] font-medium text-white transition-colors duration-300 hover:bg-brand-accent-hover"
    >
      {button} <ArrowRight className="h-3.5 w-3.5" />
    </a>
  </aside>
);
