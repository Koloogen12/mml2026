import { useEffect, useState } from "react";
import { blogApi, type BlogPost, type BlogMedia } from "../blog/api";
import { BlogEditor } from "../blog/Editor";

// Раздел «Блог»: список статей, медиатека, редактор.
// Донорские AdminBlogPostsScreen + AdminBlogMediaScreen сведены в один экран
// с табами — у нас нет роутера в админке, а два пункта меню на это избыточны.

const STATUS_LABEL: Record<string, string> = {
  draft: "Черновик",
  published: "Опубликована",
  scheduled: "Запланирована",
};

const fmt = (s?: string) => (s ? new Date(s).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" }) : "—");

export function Blog() {
  const [view, setView] = useState<"posts" | "media">("posts");
  const [editing, setEditing] = useState<string | null | undefined>(undefined); // undefined = список, null = новая
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await blogApi.posts({ status, q });
      setPosts(r.items);
      setErr("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (editing === undefined) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q, editing]);

  if (editing !== undefined) {
    return <BlogEditor postId={editing} onBack={() => setEditing(undefined)} />;
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "26px 22px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["posts", "media"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} style={tab(view === v)}>
              {v === "posts" ? "Статьи" : "Медиатека"}
            </button>
          ))}
        </div>
        {view === "posts" && (
          <button onClick={() => setEditing(null)} style={{ ...tab(true), padding: "10px 20px" }}>
            + Новая статья
          </button>
        )}
      </div>

      {view === "media" ? (
        <Media />
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по заголовку" style={{ flex: "1 1 220px", padding: "9px 14px", borderRadius: 999, border: "1px solid rgba(0,0,0,.16)", font: "400 13.5px 'Inter',sans-serif", outline: "none" }} />
            {[["", "Все"], ["draft", "Черновики"], ["published", "Опубликованные"]].map(([k, l]) => (
              <button key={k} onClick={() => setStatus(k)} style={chip(status === k)}>{l}</button>
            ))}
          </div>

          {err && <div style={{ padding: 14, background: "#FBF0ED", borderRadius: 10, color: "#C4553B", font: "400 13.5px 'Inter',sans-serif", marginBottom: 14 }}>{err}</div>}

          {loading ? (
            <Empty>Загружаем…</Empty>
          ) : posts.length === 0 ? (
            <Empty>{q || status ? "По этому фильтру статей нет." : "Статей пока нет. Начните первую."}</Empty>
          ) : (
            <div style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
              {posts.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, borderTop: i ? "1px solid rgba(0,0,0,.08)" : "none" }}>
                  <div style={{ width: 56, height: 56, flex: "none", borderRadius: 8, background: p.cover_image ? `#F4F1EA url('${p.cover_image}') center/cover` : "#F4F1EA" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: "500 15px 'Inter',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                    <div style={{ font: "400 12.5px 'Inter',sans-serif", color: "rgba(0,0,0,.5)", paddingTop: 3 }}>
                      {p.tag || "без рубрики"} · {p.reading_time} мин · /blog/{p.slug}
                      {p.author_name ? ` · ${p.author_name}` : ""}
                    </div>
                  </div>
                  <span style={badge(p)}>{label(p)}</span>
                  <span style={{ font: "400 12.5px 'Inter',sans-serif", color: "rgba(0,0,0,.45)", whiteSpace: "nowrap" }}>{fmt(p.published_at || p.updated_at)}</span>
                  <div style={{ display: "flex", gap: 6, flex: "none" }}>
                    <button onClick={() => setEditing(p.id)} style={smallBtn}>Открыть</button>
                    <button
                      onClick={async () => { try { await blogApi.duplicate(p.id); void load(); } catch (e) { setErr((e as Error).message); } }}
                      style={smallBtn}
                    >
                      Копия
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Удалить «${p.title}»? Это навсегда.`)) return;
                        try { await blogApi.remove(p.id); void load(); } catch (e) { setErr((e as Error).message); }
                      }}
                      style={{ ...smallBtn, color: "#C4553B", borderColor: "rgba(196,85,59,.4)" }}
                    >
                      Удалить
                    </button>
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

// Статус на карточке честный: «опубликована» с будущей датой — это
// запланированная, на сайте её ещё нет.
const label = (p: BlogPost) =>
  p.status === "published" && p.published_at && new Date(p.published_at) > new Date()
    ? "Запланирована"
    : STATUS_LABEL[p.status] || p.status;

function Media() {
  const [items, setItems] = useState<BlogMedia[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const r = await blogApi.media();
      setItems(r.items);
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  useEffect(() => { void load(); }, []);

  return (
    <>
      <label style={{ display: "block", padding: 26, border: "1px dashed rgba(0,0,0,.25)", borderRadius: 12, textAlign: "center", cursor: "pointer", font: "400 13.5px 'Inter',sans-serif", color: "rgba(0,0,0,.5)", marginBottom: 18 }}>
        {busy ? "Загружаем…" : "Загрузить картинку — JPEG, PNG, WebP или GIF, до 12 МБ"}
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            try { await blogApi.upload(f); await load(); setErr(""); } catch (er) { setErr((er as Error).message); } finally { setBusy(false); e.target.value = ""; }
          }}
        />
      </label>
      {err && <div style={{ padding: 14, background: "#FBF0ED", borderRadius: 10, color: "#C4553B", font: "400 13.5px 'Inter',sans-serif", marginBottom: 14 }}>{err}</div>}
      {items.length === 0 ? (
        <Empty>В медиатеке пока пусто.</Empty>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14 }}>
          {items.map((m) => (
            <div key={m.id} style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
              <div style={{ height: 120, background: `#F4F1EA url('${m.url}') center/cover` }} />
              <div style={{ padding: 10 }}>
                <div style={{ font: "400 12px 'Inter',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.filename}</div>
                <div style={{ font: "400 11px 'Inter',sans-serif", color: "rgba(0,0,0,.45)", paddingTop: 2 }}>{Math.round(m.size_bytes / 1024)} КБ</div>
                <div style={{ display: "flex", gap: 6, paddingTop: 8 }}>
                  <button onClick={() => void navigator.clipboard.writeText(m.url)} style={{ ...smallBtn, flex: 1 }}>Ссылка</button>
                  <button
                    onClick={async () => {
                      if (!window.confirm("Убрать из медиатеки? Сам файл останется — он может стоять в статье.")) return;
                      await blogApi.removeMedia(m.id);
                      void load();
                    }}
                    style={{ ...smallBtn, color: "#C4553B", borderColor: "rgba(196,85,59,.4)" }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "70px 20px", textAlign: "center", font: "400 14px 'Inter',sans-serif", color: "rgba(0,0,0,.45)", border: "1px dashed rgba(0,0,0,.15)", borderRadius: 12 }}>{children}</div>;
}

const tab = (on: boolean): React.CSSProperties => ({
  padding: "10px 18px",
  borderRadius: 999,
  border: "1px solid " + (on ? "#16150F" : "rgba(0,0,0,.16)"),
  background: on ? "#16150F" : "#fff",
  color: on ? "#fff" : "#16150F",
  font: "500 13.5px 'Inter',sans-serif",
  cursor: "pointer",
});

const chip = (on: boolean): React.CSSProperties => ({ ...tab(on), padding: "9px 16px" });

const smallBtn: React.CSSProperties = {
  padding: "7px 12px",
  borderRadius: 999,
  border: "1px solid rgba(0,0,0,.16)",
  background: "#fff",
  font: "500 12px 'Inter',sans-serif",
  cursor: "pointer",
};

const badge = (p: BlogPost): React.CSSProperties => {
  const l = label(p);
  const c = l === "Опубликована" ? "#2E7D4F" : l === "Запланирована" ? "#2B2BCC" : "rgba(0,0,0,.5)";
  return {
    font: "600 10px 'Inter',sans-serif",
    letterSpacing: ".06em",
    textTransform: "uppercase",
    color: c,
    border: `1px solid ${c}33`,
    background: `${c}0f`,
    borderRadius: 999,
    padding: "5px 10px",
    whiteSpace: "nowrap",
    flex: "none",
  };
};
