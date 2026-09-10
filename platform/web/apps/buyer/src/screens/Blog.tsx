import { useEffect, useState } from "react";
import { sx } from "../sx";
import { useApp } from "../appStore";
// Типографика статьи — тот же файл, что и в редакторе админки.
import "@mml/ui/prose.css";
import "../blog.css";
import { minutes } from "../plural";

// Публичный блог: лента и статья. Контракт — internal/blog/handler.go
// (/api/v1/blog/posts, /api/v1/blog/posts/{slug}).
// HTML статьи рендерим как есть — он санитизирован на бэке перед сохранением.

export interface PublicPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_html?: string;
  cover_image: string;
  tag: string;
  reading_time: number;
  author_name?: string;
  published_at?: string;
}

const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "";


export function Blog() {
  const app = useApp();
  const [items, setItems] = useState<PublicPost[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/v1/blog/posts?limit=24${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`);
        if (!res.ok) throw new Error("blog");
        const d = (await res.json()) as { items: PublicPost[] | null; tags: string[] | null };
        setItems(d.items ?? []);
        setTags(d.tags ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [tag]);

  const [hero, ...rest] = items;

  return (
    <div className="dp-fade bl-page" style={sx("max-width:1120px;margin:0 auto")}>
      <h1 className="dp-f46" style={sx("font:400 46px 'Spectral',Georgia,serif;margin:0 0 8px")}>Журнал</h1>
      <p style={sx("font:400 15px 'Inter',sans-serif;color:rgba(0,0,0,.55);margin:0 0 28px")}>
        Как носить то, что у вас уже есть, и как выбирать то, чего пока нет.
      </p>

      {tags.length > 0 && (
        <div style={sx("display:flex;gap:9px;flex-wrap:wrap;margin-bottom:30px")}>
          <span className="dp-chip" onClick={() => setTag("")} style={chipSt(tag === "")}>Все</span>
          {tags.map((t) => (
            <span key={t} className="dp-chip" onClick={() => setTag(t)} style={chipSt(tag === t)}>{t}</span>
          ))}
        </div>
      )}

      {loading ? (
        <div style={sx("padding:70px 20px;text-align:center;font:400 14px 'Inter',sans-serif;color:rgba(0,0,0,.5)")}>Загружаем…</div>
      ) : items.length === 0 ? (
        <div style={sx("padding:70px 20px;text-align:center;font:400 14px 'Inter',sans-serif;color:rgba(0,0,0,.5);border:1px dashed rgba(0,0,0,.15);border-radius:16px")}>
          {tag ? "В этой рубрике пока нет статей." : "Статей пока нет — первая скоро появится."}
        </div>
      ) : (
        <>
          {/* Первая статья — крупно. */}
          <div className="dp-card bl-hero" onClick={() => app.openPost(hero.slug)} style={sx("cursor:pointer;margin-bottom:36px")}>
            <div className="bl-hero-img" style={sx(`border-radius:14px;background:#F4F1EA${hero.cover_image ? `;background-image:url('${hero.cover_image}');background-size:cover;background-position:center` : ""}`)}></div>
            <div className="bl-hero-body">
              <span style={sx("font:600 10.5px 'Inter',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#2B2BCC")}>{hero.tag}</span>
              <h2 style={sx("font:400 34px/1.15 'Spectral',Georgia,serif;margin:10px 0 10px")}>{hero.title}</h2>
              <p style={sx("font:400 15px/1.6 'Inter',sans-serif;color:rgba(0,0,0,.6);margin:0 0 14px")}>{hero.excerpt}</p>
              <span style={sx("font:400 13px 'Inter',sans-serif;color:rgba(0,0,0,.45)")}>
                {fmtDate(hero.published_at)} · {hero.reading_time} {minutes(hero.reading_time)}
                {hero.author_name ? ` · ${hero.author_name}` : ""}
              </span>
            </div>
          </div>

          {rest.length > 0 && (
            <div className="dp-r3" style={sx("display:grid;grid-template-columns:repeat(3,1fr);gap:26px")}>
              {rest.map((p) => (
                <div key={p.id} className="dp-card" onClick={() => app.openPost(p.slug)} style={sx("cursor:pointer")}>
                  <div style={sx(`height:200px;border-radius:12px;background:#F4F1EA${p.cover_image ? `;background-image:url('${p.cover_image}');background-size:cover;background-position:center` : ""}`)}></div>
                  <div style={sx("padding:14px 2px 0")}>
                    <span style={sx("font:600 10px 'Inter',sans-serif;letter-spacing:.13em;text-transform:uppercase;color:#2B2BCC")}>{p.tag}</span>
                    <div style={sx("font:400 20px/1.25 'Spectral',Georgia,serif;padding:7px 0 6px")}>{p.title}</div>
                    <div style={sx("font:400 13.5px/1.5 'Inter',sans-serif;color:rgba(0,0,0,.55)")}>{p.excerpt}</div>
                    <div style={sx("font:400 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.4);padding-top:8px")}>
                      {fmtDate(p.published_at)} · {p.reading_time} {minutes(p.reading_time)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Статья целиком + оглавление из h2 (id проставляет бэк).
export function BlogPost({ slug }: { slug: string }) {
  const app = useApp();
  const [post, setPost] = useState<PublicPost | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  const [toc, setToc] = useState<Array<{ id: string; text: string }>>([]);

  useEffect(() => {
    setState("loading");
    void (async () => {
      try {
        const res = await fetch(`/api/v1/blog/posts/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          setState("missing");
          return;
        }
        const p = (await res.json()) as PublicPost;
        setPost(p);
        setState("ok");
        // Оглавление собираем из готового HTML.
        const doc = new DOMParser().parseFromString(p.content_html || "", "text/html");
        setToc([...doc.querySelectorAll("h2[id]")].map((h) => ({ id: h.id, text: h.textContent || "" })));
      } catch {
        setState("missing");
      }
    })();
  }, [slug]);

  if (state === "loading") {
    return <div style={sx("padding:80px 20px;text-align:center;font:400 14px 'Inter',sans-serif;color:rgba(0,0,0,.5)")}>Загружаем статью…</div>;
  }
  if (state === "missing" || !post) {
    return (
      <div style={sx("padding:80px 20px;text-align:center")}>
        <div style={sx("font:400 26px 'Spectral',Georgia,serif;margin-bottom:10px")}>Статья не найдена</div>
        <div style={sx("font:400 14px 'Inter',sans-serif;color:rgba(0,0,0,.5);margin-bottom:20px")}>Возможно, её сняли с публикации.</div>
        <span className="dp-btn" onClick={() => app.go("blog")} style={sx("font:500 14px 'Inter',sans-serif;color:#fff;background:#000;border-radius:999px;padding:13px 26px")}>В журнал</span>
      </div>
    );
  }

  return (
    <div className="dp-fade bl-page" style={sx("max-width:1120px;margin:0 auto")}>
      <div style={sx("margin-bottom:22px")}>
        <span className="dp-btn" onClick={() => app.go("blog")} style={sx("display:inline-flex;align-items:center;gap:8px;font:500 14px 'Inter',sans-serif;color:rgba(0,0,0,.6)")}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M10 3.5L5.5 8l4.5 4.5"></path></svg>В журнал
        </span>
      </div>

      <div style={sx("font:600 10.5px 'Inter',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#2B2BCC")}>{post.tag}</div>
      <h1 className="bl-title" style={sx("font:400 46px/1.12 'Spectral',Georgia,serif;margin:10px 0 12px")}>{post.title}</h1>
      <div style={sx("font:400 13.5px 'Inter',sans-serif;color:rgba(0,0,0,.45);margin-bottom:26px")}>
        {fmtDate(post.published_at)} · {post.reading_time} {minutes(post.reading_time)}
        {post.author_name ? ` · ${post.author_name}` : ""}
      </div>

      {post.cover_image && (
        <div style={sx(`height:380px;border-radius:16px;margin-bottom:34px;background:#F4F1EA url('${post.cover_image}') center/cover`)}></div>
      )}

      <div className="bl-layout">
        {toc.length > 1 && (
          <aside className="bl-toc">
            <div style={sx("font:600 10px 'Inter',sans-serif;letter-spacing:.13em;text-transform:uppercase;color:rgba(0,0,0,.4);margin-bottom:10px")}>В статье</div>
            {toc.map((h) => (
              <a key={h.id} href={`#${h.id}`} style={sx("display:block;font:400 13px/1.45 'Inter',sans-serif;color:rgba(0,0,0,.6);text-decoration:none;padding:5px 0")}>{h.text}</a>
            ))}
          </aside>
        )}
        {/* HTML санитизирован на сервере (bluemonday) перед записью в базу. */}
        <article className="bl-prose" dangerouslySetInnerHTML={{ __html: post.content_html || "" }} />
      </div>
    </div>
  );
}

const chipSt = (on: boolean) =>
  sx(`font:${on ? "500" : "400"} 13.5px 'Inter',sans-serif;color:${on ? "#fff" : "#000"};background:${on ? "#000" : "#fff"};border:1px solid ${on ? "#000" : "rgba(0,0,0,.16)"};border-radius:999px;padding:9px 17px;cursor:pointer`);
