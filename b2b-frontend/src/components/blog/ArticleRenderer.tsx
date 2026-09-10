import { Block } from "@/data/blog";
import { CodeBlock } from "./CodeBlock";
import { InlineCTA } from "./InlineCTA";
import { MetricsGrid } from "./MetricsGrid";

// Ad-hoc block variant used by DB-authored posts. The Tiptap editor
// produces plain HTML, and we embed it as a single block rather than
// converting to the structured Block[] format the static articles use.
type HtmlBlock = { type: "html"; html: string };

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-zа-я0-9\s-]/gi, "")
    .trim()
    .replace(/\s+/g, "-");

export const ArticleRenderer = ({ blocks }: { blocks: (Block | HtmlBlock)[] }) => (
  <div className="prose-brand">
    {blocks.map((b, i) => {
      if ((b as HtmlBlock).type === "html") {
        // Trusted: the HTML comes from our own Tiptap editor saving into
        // our DB. No user-generated content is rendered here.
        return (
          <div
            key={i}
            dangerouslySetInnerHTML={{ __html: (b as HtmlBlock).html }}
          />
        );
      }
      switch ((b as Block).type) {
        case "h2":
          return <h2 key={i} id={slugify((b as Extract<Block, { type: 'h2' }>).text)}>{(b as Extract<Block, { type: 'h2' }>).text}</h2>;
        case "h3":
          return <h3 key={i} id={slugify((b as Extract<Block, { type: 'h3' }>).text)}>{(b as Extract<Block, { type: 'h3' }>).text}</h3>;
        case "p":
          return <p key={i}>{(b as Extract<Block, { type: 'p' }>).text}</p>;
        case "ul":
          return <ul key={i}>{(b as Extract<Block, { type: 'ul' }>).items.map((it, j) => <li key={j}>{it}</li>)}</ul>;
        case "ol":
          return <ol key={i}>{(b as Extract<Block, { type: 'ol' }>).items.map((it, j) => <li key={j}>{it}</li>)}</ol>;
        case "quote": {
          const q = b as Extract<Block, { type: 'quote' }>;
          return (
            <blockquote key={i}>
              {q.text}
              {q.cite && <div className="mt-2 not-italic text-[14px] text-brand-muted">— {q.cite}</div>}
            </blockquote>
          );
        }
        case "code": {
          const c = b as Extract<Block, { type: 'code' }>;
          return <CodeBlock key={i} code={c.code} lang={c.lang} />;
        }
        case "img": {
          const im = b as Extract<Block, { type: 'img' }>;
          return <img key={i} src={im.src} alt={im.alt} loading="lazy" />;
        }
        case "metrics":
          return <MetricsGrid key={i} items={(b as Extract<Block, { type: 'metrics' }>).items} />;
        case "cta": {
          const c = b as Extract<Block, { type: 'cta' }>;
          return <InlineCTA key={i} title={c.title} text={c.text} button={c.button} />;
        }
      }
      return null;
    })}
  </div>
);

export { slugify };
