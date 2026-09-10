import type { FC, ComponentProps } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLocale } from '@/shared/lib/locale';

interface LegalPageProps {
  title: string;
  content: string;
  englishDisclaimer?: string;
}

const mdComponents: Components = {
  h1: (props: ComponentProps<'h1'>) => (
    <h1 className="text-2xl font-bold mt-10 mb-4" {...props} />
  ),
  h2: (props: ComponentProps<'h2'>) => (
    <h2 className="text-xl font-semibold mt-8 mb-3 border-b border-border pb-1" {...props} />
  ),
  h3: (props: ComponentProps<'h3'>) => (
    <h3 className="text-lg font-semibold mt-6 mb-2" {...props} />
  ),
  p: (props: ComponentProps<'p'>) => (
    <p className="my-3 leading-relaxed text-foreground/90" {...props} />
  ),
  ul: (props: ComponentProps<'ul'>) => (
    <ul className="list-disc pl-6 my-3 space-y-1" {...props} />
  ),
  ol: (props: ComponentProps<'ol'>) => (
    <ol className="list-decimal pl-6 my-3 space-y-1" {...props} />
  ),
  li: (props: ComponentProps<'li'>) => <li className="leading-relaxed" {...props} />,
  a: (props: ComponentProps<'a'>) => (
    <a className="text-primary underline underline-offset-2 hover:opacity-80" {...props} />
  ),
  strong: (props: ComponentProps<'strong'>) => (
    <strong className="font-semibold" {...props} />
  ),
  code: (props: ComponentProps<'code'>) => (
    <code
      className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono"
      {...props}
    />
  ),
  hr: (props: ComponentProps<'hr'>) => <hr className="my-8 border-border" {...props} />,
  blockquote: (props: ComponentProps<'blockquote'>) => (
    <blockquote
      className="border-l-4 border-primary/40 pl-4 my-4 italic text-foreground/80"
      {...props}
    />
  ),
  table: (props: ComponentProps<'table'>) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full text-sm border-collapse" {...props} />
    </div>
  ),
  thead: (props: ComponentProps<'thead'>) => (
    <thead className="bg-muted" {...props} />
  ),
  th: (props: ComponentProps<'th'>) => (
    <th className="border border-border p-2 text-left font-semibold" {...props} />
  ),
  td: (props: ComponentProps<'td'>) => (
    <td className="border border-border p-2 align-top" {...props} />
  ),
};

export const LegalPage: FC<LegalPageProps> = ({ title, content, englishDisclaimer }) => {
  const locale = useLocale();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 bg-transparent border-none cursor-pointer p-0"
        >
          <ArrowLeft className="size-4" />
          {locale === 'ru' ? 'Назад' : 'Back'}
        </button>
        <h1 className="text-3xl font-bold mb-6">{title}</h1>
        {locale === 'en' && englishDisclaimer && (
          <div className="mb-6 p-4 rounded-md border border-border bg-muted/40 text-sm text-muted-foreground">
            {englishDisclaimer}
          </div>
        )}
        <div className="text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
