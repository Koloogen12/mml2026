'use client';

import CharacterCount from '@tiptap/extension-character-count';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  ArrowLeft,
  Bold,
  Copy,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Save,
  Trash2,
  Underline as UnderlineIcon,
  Undo2
} from 'lucide-react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import {
  deletePostAction,
  duplicatePostAction,
  savePostAction,
  togglePublishAction
} from '@/app/admin/blog/actions';

type Post = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  coverUrl: string | null;
  contentHtml: string;
  status: string;
  publishedAt: string | null;
  updatedAt: string;
};

function ToolbarBtn({
  active,
  onClick,
  title,
  children
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
        active
          ? 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]'
          : 'text-[var(--admin-muted)] hover:bg-[var(--admin-bg)] hover:text-[var(--admin-ink)]'
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px bg-[var(--admin-border)]" />;
}

export default function BlogEditor({ post }: { post: Post }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [excerpt, setExcerpt] = useState(post.excerpt ?? '');
  const [coverUrl, setCoverUrl] = useState(post.coverUrl ?? '');
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [status, setStatus] = useState(post.status);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        horizontalRule: {}
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener', target: '_blank' }
      }),
      Image,
      Placeholder.configure({
        placeholder: 'Начните писать...'
      }),
      CharacterCount.configure({ limit: 50000 })
    ],
    content: post.contentHtml || '<p></p>',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose-editor focus:outline-none min-h-[480px] text-[17px] leading-relaxed'
      }
    },
    onUpdate: () => setDirty(true)
  });

  // Mark other fields as dirty when user edits them.
  useEffect(() => {
    if (
      title !== post.title ||
      slug !== post.slug ||
      excerpt !== (post.excerpt ?? '') ||
      coverUrl !== (post.coverUrl ?? '')
    ) {
      setDirty(true);
    }
  }, [title, slug, excerpt, coverUrl, post]);

  const save = () => {
    if (!editor) return;
    const html = editor.getHTML();
    startTransition(async () => {
      const { slug: newSlug } = await savePostAction({
        id: post.id,
        title,
        slug,
        excerpt,
        coverUrl,
        contentHtml: html
      });
      setSlug(newSlug);
      setDirty(false);
      setSavedAt(new Date());
      router.refresh();
    });
  };

  const publish = () => {
    startTransition(async () => {
      // Save current edits first so we don't publish a stale version.
      if (editor) {
        await savePostAction({
          id: post.id,
          title,
          slug,
          excerpt,
          coverUrl,
          contentHtml: editor.getHTML()
        });
      }
      const { status: newStatus } = await togglePublishAction(post.id);
      setStatus(newStatus);
      setDirty(false);
      setSavedAt(new Date());
      router.refresh();
    });
  };

  const del = () => {
    if (!confirm(`Удалить пост «${title}»? Это необратимо.`)) return;
    startTransition(async () => {
      await deletePostAction(post.id);
      router.push('/admin/blog');
    });
  };

  const duplicate = () => {
    startTransition(() => duplicatePostAction(post.id));
  };

  const insertLink = () => {
    const prev = editor?.getAttributes('link').href ?? '';
    const url = prompt('URL (оставьте пустым чтобы убрать ссылку):', prev);
    if (url === null) return;
    if (!url) {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const insertImage = () => {
    const url = prompt('URL картинки:');
    if (!url) return;
    editor?.chain().focus().setImage({ src: url }).run();
  };

  if (!editor) return null;

  const wordCount = editor.storage.characterCount?.words() ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Topbar */}
      <div className="flex flex-wrap items-center gap-3">
        <NextLink
          href="/admin/blog"
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--admin-muted)] transition-colors hover:text-[var(--admin-ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          К списку постов
        </NextLink>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-[var(--admin-muted)]">
            {savedAt
              ? `Сохранено в ${savedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
              : dirty
                ? 'Не сохранено'
                : `Без изменений · ${wordCount} слов`}
          </span>

          {status === 'published' && (
            <NextLink
              href={`/blog/${slug}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-[13px] font-medium text-[var(--admin-ink)] transition-colors hover:bg-[var(--admin-bg)]"
            >
              <Eye className="h-3.5 w-3.5" />
              На сайте
            </NextLink>
          )}

          <button
            type="button"
            onClick={duplicate}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-[13px] font-medium text-[var(--admin-ink)] transition-colors hover:bg-[var(--admin-bg)] disabled:opacity-50"
          >
            <Copy className="h-3.5 w-3.5" />
            Дубликат
          </button>

          <button
            type="button"
            onClick={del}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--admin-border)] bg-white px-3 py-1.5 text-[13px] font-medium text-[var(--admin-danger)] transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Удалить
          </button>

          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-[13px] font-medium text-[var(--admin-ink)] transition-colors hover:bg-[var(--admin-bg)] disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            Сохранить
          </button>

          <button
            type="button"
            onClick={publish}
            disabled={isPending}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${
              status === 'published' ? 'bg-[var(--admin-muted)]' : 'bg-[var(--admin-accent)]'
            }`}
          >
            {status === 'published' ? 'Снять с публикации' : 'Опубликовать'}
          </button>
        </div>
      </div>

      {/* Meta fields */}
      <div className="grid gap-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 md:grid-cols-2">
        <Field label="Заголовок">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 w-full rounded-md border border-[var(--admin-border)] bg-white px-3 text-[15px] font-medium text-[var(--admin-ink)] outline-none focus:border-[var(--admin-accent)]"
            placeholder="Заголовок статьи"
          />
        </Field>

        <Field label="Slug (URL)" hint="Латиницей, через дефис. Сформируется автоматом из заголовка при сохранении, можно переопределить.">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="h-10 w-full rounded-md border border-[var(--admin-border)] bg-white px-3 font-mono text-[14px] text-[var(--admin-ink)] outline-none focus:border-[var(--admin-accent)]"
            placeholder="my-post"
          />
        </Field>

        <Field label="Краткое описание (для карточки + OG)" className="md:col-span-2">
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-[var(--admin-border)] bg-white px-3 py-2 text-[14px] text-[var(--admin-ink)] outline-none focus:border-[var(--admin-accent)]"
            placeholder="1–2 предложения, которые покажутся в карточке и в соцсетях при шеринге"
          />
        </Field>

        <Field label="URL обложки" hint="Ссылка на картинку 16:9. Пока загрузка файлов не сделана — используй готовую ссылку." className="md:col-span-2">
          <input
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            className="h-10 w-full rounded-md border border-[var(--admin-border)] bg-white px-3 font-mono text-[13px] text-[var(--admin-ink)] outline-none focus:border-[var(--admin-accent)]"
            placeholder="https://example.com/cover.jpg  или  /blog/cover-1.jpg"
          />
        </Field>
      </div>

      {/* Editor card */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--admin-border)] px-3 py-2">
          <ToolbarBtn
            title="Отменить"
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Повторить"
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 className="h-4 w-4" />
          </ToolbarBtn>

          <ToolbarDivider />

          <ToolbarBtn
            title="Заголовок 1"
            active={editor.isActive('heading', { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Заголовок 2"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Заголовок 3"
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarBtn>

          <ToolbarDivider />

          <ToolbarBtn
            title="Жирный"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Курсив"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Подчёркнутый"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarBtn>

          <ToolbarDivider />

          <ToolbarBtn
            title="Список"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Нумерованный список"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Цитата"
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Разделитель"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <Minus className="h-4 w-4" />
          </ToolbarBtn>

          <ToolbarDivider />

          <ToolbarBtn
            title="Ссылка"
            active={editor.isActive('link')}
            onClick={insertLink}
          >
            <LinkIcon className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn title="Картинка" onClick={insertImage}>
            <ImageIcon className="h-4 w-4" />
          </ToolbarBtn>
        </div>

        <div className="px-6 py-6">
          <EditorContent editor={editor} />
        </div>

        <div className="border-t border-[var(--admin-border)] px-6 py-2 text-right text-[12px] text-[var(--admin-muted)]">
          {editor.storage.characterCount?.characters() ?? 0} символов · {wordCount} слов
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  className,
  children
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <span className="text-[12px] font-medium uppercase tracking-wide text-[var(--admin-muted)]">
        {label}
      </span>
      {children}
      {hint && <span className="text-[12px] text-[var(--admin-muted)]">{hint}</span>}
    </label>
  );
}
