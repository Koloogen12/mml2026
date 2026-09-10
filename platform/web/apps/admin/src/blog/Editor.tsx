import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, useEditorState, EditorContent, type Editor as TipTapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Underline from "@tiptap/extension-underline";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Callout, CALLOUTS } from "./Callout";
import { blogApi, type BlogPost, type BlogAuthor } from "./api";
// Типографика общая с публичной страницей: что автор видит, то и выйдет.
import "@mml/ui/prose.css";

// Редактор статьи. Перенесён по мотивам донорского AdminBlogEditorScreen
// (BLOG-ADMIN-MODULE-SPEC.md), но: коллауты — свои (у донора их нет),
// картинки — в MinIO, без AI-обложки, одноязычно.

const btn = (on?: boolean): React.CSSProperties => ({
  minWidth: 30,
  height: 30,
  padding: "0 7px",
  borderRadius: 7,
  border: "1px solid " + (on ? "#2B2BCC" : "rgba(0,0,0,.14)"),
  background: on ? "#2B2BCC" : "#fff",
  color: on ? "#fff" : "#16150F",
  font: "500 12.5px 'Inter',sans-serif",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
});

function Tb({ on, title, onClick, children }: { on?: boolean; title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={title} onMouseDown={(e) => e.preventDefault()} onClick={onClick} style={btn(on)}>
      {children}
    </button>
  );
}

const Sep = () => <span style={{ width: 1, height: 20, background: "rgba(0,0,0,.12)", margin: "0 3px" }} />;

// «3 слова», а не «3 слов».
function ruPlural(n: number, one: string, few: string, many: string) {
  const d = n % 10, h = n % 100;
  if (d === 1 && h !== 11) return one;
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few;
  return many;
}
const wordsWord = (n: number) => ruPlural(n, "слово", "слова", "слов");
const charsWord = (n: number) => ruPlural(n, "знак", "знака", "знаков");

export function BlogEditor({ postId, onBack }: { postId: string | null; onBack: () => void }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tag, setTag] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [cover, setCover] = useState("");
  const [featured, setFeatured] = useState(false);
  const [authorId, setAuthorId] = useState("");
  const [authors, setAuthors] = useState<BlogAuthor[]>([]);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [post, setPost] = useState<BlogPost | null>(null);
  const [id, setId] = useState<string | null>(postId);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [schedOpen, setSchedOpen] = useState(false);
  const [schedAt, setSchedAt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false, underline: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: "Текст статьи…" }),
      CharacterCount,
      Callout,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: "",
    editorProps: {
      attributes: { class: "bl-prose" },
      // Картинку можно просто перетащить в текст или вставить из буфера.
      handleDrop: (_view, event) => {
        const f = event.dataTransfer?.files?.[0];
        if (f && f.type.startsWith("image/")) {
          event.preventDefault();
          void uploadInline(f);
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const f = event.clipboardData?.files?.[0];
        if (f && f.type.startsWith("image/")) {
          event.preventDefault();
          void uploadInline(f);
          return true;
        }
        return false;
      },
    },
  });

  // TipTap 3 не перерисовывает компонент на каждой транзакции — без подписки
  // тулбар не подсвечивался, а счётчик слов стоял на нуле.
  const st = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: !!e?.isActive("bold"),
      italic: !!e?.isActive("italic"),
      underline: !!e?.isActive("underline"),
      strike: !!e?.isActive("strike"),
      h2: !!e?.isActive("heading", { level: 2 }),
      h3: !!e?.isActive("heading", { level: 3 }),
      bullet: !!e?.isActive("bulletList"),
      ordered: !!e?.isActive("orderedList"),
      quote: !!e?.isActive("blockquote"),
      code: !!e?.isActive("codeBlock"),
      link: !!e?.isActive("link"),
      table: !!e?.isActive("table"),
      callout: (["info", "tip", "warn"] as const).find((k) => e?.isActive("callout", { kind: k })) ?? null,
      chars: e?.storage.characterCount?.characters?.() ?? 0,
      words: e?.storage.characterCount?.words?.() ?? 0,
    }),
  });

  const uploadInline = useCallback(
    async (file: File) => {
      setMsg("Загружаем картинку…");
      try {
        const m = await blogApi.upload(file);
        editor?.chain().focus().setImage({ src: m.url, alt: m.filename }).run();
        setMsg("Картинка добавлена");
      } catch (e) {
        setMsg((e as Error).message);
      }
    },
    [editor],
  );

  // Загрузка поста и справочников.
  useEffect(() => {
    void (async () => {
      try {
        const a = await blogApi.authors();
        setAuthors(a.items);
      } catch {
        /* авторов может не быть — не мешает писать */
      }
      try {
        const list = await blogApi.posts();
        setTags(list.tags);
        if (!postId && list.tags.length) setTag((t) => t || list.tags[0]);
      } catch {
        /* рубрики придут с постом */
      }
      if (!postId) return;
      try {
        const p = await blogApi.post(postId);
        setPost(p);
        setTitle(p.title);
        setSlug(p.slug);
        setExcerpt(p.excerpt);
        setTag(p.tag);
        setCover(p.cover_image);
        setFeatured(p.featured);
        setAuthorId(p.author_id || "");
        setSeoTitle(p.seo_title);
        setSeoDesc(p.seo_description);
        editor?.commands.setContent(p.content_html || "");
      } catch (e) {
        setMsg((e as Error).message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, editor]);

  const body = () => ({
    title,
    slug,
    excerpt,
    tag,
    cover_image: cover,
    featured,
    author_id: authorId,
    seo_title: seoTitle,
    seo_description: seoDesc,
    content_html: editor?.getHTML() || "",
    content_json: editor?.getJSON(),
  });

  // Возвращает id статьи. Именно возвращает, а не полагается на setId:
  // publish() вызывает save() и сразу использует результат, а состояние
  // в этот момент ещё старое — новый черновик не публиковался.
  const save = async (quiet = false): Promise<string | null> => {
    if (!title.trim()) {
      setMsg("Нужен заголовок");
      return null;
    }
    setSaving(true);
    try {
      if (id) {
        await blogApi.update(id, body());
        if (!quiet) setMsg("Сохранено");
        return id;
      }
      const r = await blogApi.create(body());
      setId(r.id);
      if (!quiet) setMsg("Сохранено");
      return r.id;
    } catch (e) {
      setMsg((e as Error).message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const publish = async (status: string, at?: string) => {
    const pid = await save(true);
    if (!pid) return; // save уже объяснил, почему не вышло
    try {
      await blogApi.publish(pid, status, at ? new Date(at).toISOString() : null);
      const p = await blogApi.post(pid);
      setPost(p);
      setSchedOpen(false);
      setMsg(status === "draft" ? "Снято с публикации" : status === "scheduled" ? "Запланировано" : "Опубликовано");
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const addLink = () => {
    const prev = editor?.getAttributes("link").href || "";
    const url = window.prompt("Ссылка (пусто — убрать):", prev);
    if (url === null) return;
    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const chars = st?.chars ?? 0;
  const words = st?.words ?? 0;
  const readMin = Math.max(1, Math.round(words / 180));
  const statusLabel =
    post?.status === "published"
      ? post.published_at && new Date(post.published_at) > new Date()
        ? "Запланирована"
        : "Опубликована"
      : "Черновик";

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "26px 22px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <button onClick={onBack} style={{ ...btn(), border: "none", background: "none", padding: 0, font: "500 14px 'Inter',sans-serif", color: "rgba(0,0,0,.6)" }}>
          ← Все статьи
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ font: "500 12px 'Inter',sans-serif", color: "rgba(0,0,0,.5)" }}>
            {statusLabel} · {words} {wordsWord(words)} · ~{readMin} мин
          </span>
          {msg && <span style={{ font: "500 12.5px 'Inter',sans-serif", color: "#2B2BCC" }}>{msg}</span>}
          <button onClick={() => void save()} disabled={saving} style={{ ...btn(), height: 38, padding: "0 18px", borderRadius: 999 }}>
            {saving ? "Сохраняем…" : "Сохранить"}
          </button>
          {post?.status === "published" ? (
            <button onClick={() => void publish("draft")} style={{ ...btn(), height: 38, padding: "0 18px", borderRadius: 999 }}>
              В черновик
            </button>
          ) : (
            <>
              <button onClick={() => setSchedOpen((v) => !v)} style={{ ...btn(), height: 38, padding: "0 18px", borderRadius: 999 }}>
                Запланировать
              </button>
              <button onClick={() => void publish("published")} style={{ ...btn(true), height: 38, padding: "0 20px", borderRadius: 999 }}>
                Опубликовать
              </button>
            </>
          )}
        </div>
      </div>

      {schedOpen && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, padding: 12, background: "#F4F1EA", borderRadius: 12 }}>
          <input type="datetime-local" value={schedAt} onChange={(e) => setSchedAt(e.target.value)} style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,.16)", font: "400 13.5px 'Inter',sans-serif" }} />
          <button onClick={() => void publish("scheduled", schedAt)} style={{ ...btn(true), height: 34, padding: "0 16px", borderRadius: 999 }}>
            Запланировать выход
          </button>
          <span style={{ font: "400 12.5px 'Inter',sans-serif", color: "rgba(0,0,0,.5)" }}>До этого времени статья не видна на сайте.</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 26, alignItems: "start" }} className="bl-grid">
        {/* Левая колонка — заголовок + текст */}
        <div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заголовок статьи"
            style={{ width: "100%", border: "none", outline: "none", font: "400 38px 'Spectral',Georgia,serif", marginBottom: 8 }}
          />
          <input
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Короткое описание — оно показывается в ленте блога"
            style={{ width: "100%", border: "none", outline: "none", font: "400 15px 'Inter',sans-serif", color: "rgba(0,0,0,.55)", marginBottom: 18 }}
          />

          {/* Тулбар */}
          <div style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center", padding: "9px 10px", background: "#fff", border: "1px solid rgba(0,0,0,.12)", borderRadius: 10, marginBottom: 14 }}>
            <Tb title="Жирный" on={st?.bold} onClick={() => editor?.chain().focus().toggleBold().run()}><b>Ж</b></Tb>
            <Tb title="Курсив" on={st?.italic} onClick={() => editor?.chain().focus().toggleItalic().run()}><i>К</i></Tb>
            <Tb title="Подчёркнутый" on={st?.underline} onClick={() => editor?.chain().focus().toggleUnderline().run()}><u>Ч</u></Tb>
            <Tb title="Зачёркнутый" on={st?.strike} onClick={() => editor?.chain().focus().toggleStrike().run()}><s>З</s></Tb>
            <Sep />
            <Tb title="Заголовок 2" on={st?.h2} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Tb>
            <Tb title="Заголовок 3" on={st?.h3} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Tb>
            <Sep />
            <Tb title="Маркированный список" on={st?.bullet} onClick={() => editor?.chain().focus().toggleBulletList().run()}>•—</Tb>
            <Tb title="Нумерованный список" on={st?.ordered} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1.</Tb>
            <Tb title="Цитата" on={st?.quote} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>❝</Tb>
            <Tb title="Код" on={st?.code} onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>{"</>"}</Tb>
            <Sep />
            {CALLOUTS.map((c) => (
              <Tb key={c.kind} title={`Коллаут: ${c.label}`} on={st?.callout === c.kind} onClick={() => editor?.chain().focus().toggleCallout(c.kind).run()}>
                {c.icon} {c.label}
              </Tb>
            ))}
            <Sep />
            <Tb title="Ссылка" on={st?.link} onClick={addLink}>↗</Tb>
            <Tb title="Картинка" onClick={() => fileRef.current?.click()}>🖼</Tb>
            <Tb title="Таблица 3×3" onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>▦</Tb>
            <Tb title="Разделитель" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>—</Tb>
            <Sep />
            <Tb title="Отменить" onClick={() => editor?.chain().focus().undo().run()}>↶</Tb>
            <Tb title="Вернуть" onClick={() => editor?.chain().focus().redo().run()}>↷</Tb>
            {st?.table && (
              <>
                <Sep />
                <Tb title="Столбец справа" onClick={() => editor?.chain().focus().addColumnAfter().run()}>+столб</Tb>
                <Tb title="Строка ниже" onClick={() => editor?.chain().focus().addRowAfter().run()}>+строка</Tb>
                <Tb title="Удалить таблицу" onClick={() => editor?.chain().focus().deleteTable().run()}>✕табл</Tb>
              </>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadInline(f); e.target.value = ""; }} />

          <div style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: 12, padding: "22px 24px", minHeight: 420, background: "#fff" }}>
            <EditorContent editor={editor} />
          </div>
          <div style={{ font: "400 12px 'Inter',sans-serif", color: "rgba(0,0,0,.4)", padding: "8px 2px" }}>
            {chars} {charsWord(chars)} · картинку можно перетащить прямо в текст
          </div>
        </div>

        {/* Правая колонка — обложка, рубрика, SEO */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Panel title="Обложка">
            <div
              onClick={() => coverRef.current?.click()}
              style={{ height: 150, borderRadius: 10, cursor: "pointer", background: cover ? `#F4F1EA url('${cover}') center/cover` : "#F4F1EA", border: "1px dashed rgba(0,0,0,.25)", display: "flex", alignItems: "center", justifyContent: "center", font: "400 13px 'Inter',sans-serif", color: "rgba(0,0,0,.45)" }}
            >
              {!cover && "Загрузить обложку"}
            </div>
            <input ref={coverRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const m = await blogApi.upload(f); setCover(m.url); } catch (err) { setMsg((err as Error).message); } e.target.value = ""; }} />
            {cover && <button onClick={() => setCover("")} style={{ ...btn(), height: 30, marginTop: 8, width: "100%" }}>Убрать обложку</button>}
          </Panel>

          <Panel title="Рубрика">
            <select value={tag} onChange={(e) => setTag(e.target.value)} style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,.16)", font: "400 13.5px 'Inter',sans-serif", background: "#fff" }}>
              {tags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, font: "400 13.5px 'Inter',sans-serif", cursor: "pointer" }}>
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
              Закрепить в ленте
            </label>
          </Panel>

          <Panel title="Автор">
            <select value={authorId} onChange={(e) => setAuthorId(e.target.value)} style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,.16)", font: "400 13.5px 'Inter',sans-serif", background: "#fff" }}>
              <option value="">Без автора</option>
              {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button
              onClick={async () => {
                const name = window.prompt("Имя автора:");
                if (!name) return;
                try {
                  const r = await blogApi.createAuthor({ name });
                  const a = await blogApi.authors();
                  setAuthors(a.items);
                  setAuthorId(r.id);
                } catch (e) { setMsg((e as Error).message); }
              }}
              style={{ ...btn(), height: 30, marginTop: 8, width: "100%" }}
            >
              + Новый автор
            </button>
          </Panel>

          <Panel title="Адрес и SEO">
            <Field label="Адрес страницы">
              <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="соберётся из заголовка" style={inputSt} />
            </Field>
            <Field label="SEO-заголовок">
              <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={title || "как заголовок"} style={inputSt} />
            </Field>
            <Field label="SEO-описание">
              <textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} rows={3} placeholder={excerpt || "как описание"} style={{ ...inputSt, resize: "vertical" }} />
            </Field>
            {/* Как статья будет выглядеть в поиске. */}
            <div style={{ marginTop: 12, padding: 12, background: "#F8F8F6", borderRadius: 8 }}>
              <div style={{ font: "400 11px 'Inter',sans-serif", color: "rgba(0,0,0,.4)", marginBottom: 5 }}>ПРЕВЬЮ В ПОИСКЕ</div>
              <div style={{ font: "400 15px 'Inter',sans-serif", color: "#1a0dab", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{seoTitle || title || "Заголовок статьи"}</div>
              <div style={{ font: "400 11.5px 'Inter',sans-serif", color: "#006621" }}>makemelook.ai/blog/{slug || "адрес"}</div>
              <div style={{ font: "400 12.5px/1.45 'Inter',sans-serif", color: "#545454", marginTop: 3 }}>{(seoDesc || excerpt || "Описание появится здесь.").slice(0, 160)}</div>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

const inputSt: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,.16)",
  font: "400 13px 'Inter',sans-serif",
  outline: "none",
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: 12, padding: 16, background: "#fff" }}>
      <div style={{ font: "600 10.5px 'Inter',sans-serif", letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(0,0,0,.45)", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ font: "400 11.5px 'Inter',sans-serif", color: "rgba(0,0,0,.5)", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

export type { TipTapEditor };
