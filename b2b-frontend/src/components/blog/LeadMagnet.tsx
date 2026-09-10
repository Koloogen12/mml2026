import { useState } from "react";
import { Check, Mail } from "lucide-react";

type Props = {
  title?: string;
  description?: string;
  button?: string;
  variant?: "card" | "hero";
};

export const LeadMagnet = ({
  title = "Чек-лист: подготовка каталога к виртуальной примерочной",
  description = "10 пунктов, которые сэкономят недели поддержки. Пришлём PDF на почту.",
  button = "Получить чек-лист",
  variant = "card",
}: Props) => {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setDone(true);
  };

  const wrapper =
    variant === "hero"
      ? "rounded-[24px] bg-white p-6 md:p-8"
      : "rounded-[24px] border border-brand-accent/15 bg-brand-accent-soft p-6 md:p-8";

  return (
    <div className={wrapper}>
      <div className="flex items-start gap-4">
        <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-accent text-white sm:inline-flex">
          <Mail className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h3 className="text-[18px] font-semibold leading-tight tracking-[-0.01em] text-brand-ink md:text-[20px]">
            {title}
          </h3>
          <p className="mt-2 text-[14px] leading-[1.5] text-brand-muted">{description}</p>

          {done ? (
            <div className="mt-4 inline-flex items-center gap-2 text-[14px] font-medium text-emerald-700">
              <Check className="h-4 w-4" /> Готово — проверьте почту
            </div>
          ) : (
            <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="h-[44px] flex-1 rounded-[100px] border border-brand-border bg-white px-5 text-[14px] text-brand-ink placeholder:text-brand-muted focus:border-brand-accent focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex h-[44px] items-center justify-center rounded-[100px] bg-brand-cta px-6 text-[13px] font-medium text-white transition-colors duration-300 hover:bg-brand-cta-hover"
              >
                {button}
              </button>
            </form>
          )}
          <p className="mt-2 text-[12px] text-brand-muted">Без спама. Отписаться можно в один клик.</p>
        </div>
      </div>
    </div>
  );
};
