import { useState } from "react";
import { Check, Copy } from "lucide-react";

export const CodeBlock = ({ code, lang }: { code: string; lang?: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {/* noop */}
  };
  return (
    <div className="group relative my-6">
      <button
        type="button"
        onClick={copy}
        aria-label="Скопировать код"
        className="absolute right-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-md bg-white/10 px-2.5 text-[12px] font-medium text-white/80 opacity-0 transition-opacity duration-200 hover:bg-white/20 hover:text-white group-hover:opacity-100 focus:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Скопировано" : "Копировать"}
      </button>
      <pre className="!my-0">
        <code data-lang={lang}>{code}</code>
      </pre>
    </div>
  );
};
