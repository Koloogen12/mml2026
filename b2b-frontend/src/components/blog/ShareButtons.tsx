import { useState } from "react";
import { Link2, Check } from "lucide-react";

const Btn = ({ href, label, children }: { href: string; label: string; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-ink transition-colors duration-200 hover:bg-brand-accent hover:text-white"
  >
    {children}
  </a>
);

export const ShareButtons = ({ title }: { title: string }) => {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";
  const enc = encodeURIComponent;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {/* noop */}
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[12px] font-medium uppercase tracking-wider text-brand-muted">Поделиться</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={copy}
          aria-label="Скопировать ссылку"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-ink transition-colors duration-200 hover:bg-brand-accent hover:text-white"
        >
          {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
        </button>
        <Btn href={`https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`} label="Telegram">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M9.78 15.27 9.6 18.9c.27 0 .39-.12.53-.26l1.27-1.22 2.64 1.93c.48.27.83.13.96-.45l1.74-8.16c.17-.78-.28-1.09-.75-.92L4.86 13.7c-.76.3-.75.72-.13.91l2.55.79 5.92-3.74c.28-.18.53-.08.32.1z"/></svg>
        </Btn>
        <Btn href={`https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`} label="X">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M18.9 3H22l-7.5 8.6L23 21h-6.8l-5.3-6.9L4.8 21H1.7l8-9.2L1 3h7l4.8 6.3L18.9 3zm-2.4 16h1.7L7.6 4.9H5.8L16.5 19z"/></svg>
        </Btn>
        <Btn href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} label="LinkedIn">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8h4.56v14H.22V8zm7.6 0h4.37v1.92h.06c.61-1.15 2.1-2.36 4.32-2.36 4.62 0 5.47 3.04 5.47 6.99V22h-4.56v-6.18c0-1.47-.03-3.36-2.05-3.36-2.05 0-2.36 1.6-2.36 3.25V22H7.82V8z"/></svg>
        </Btn>
      </div>
    </div>
  );
};
