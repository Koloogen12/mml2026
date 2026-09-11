'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('unauthorized');
  }
  return session;
}

// Produce a URL-safe slug (latin transliteration of Cyrillic) from a title.
function slugify(input: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo',
    ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
    н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
    ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
  };
  return input
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || 'post';
}

async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  let slug = base;
  let n = 1;
  // Try up to 20 suffixes, then append a timestamp as a guaranteed-unique fallback.
  while (n < 20) {
    const conflict = await prisma.blogPost.findFirst({
      where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) }
    });
    if (!conflict) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

export async function createPostAction() {
  await requireAdmin();
  const slug = await uniqueSlug('novyy-post');
  const post = await prisma.blogPost.create({
    data: {
      slug,
      title: 'Новый пост',
      excerpt: '',
      contentHtml: '',
      status: 'draft'
    }
  });
  revalidatePath('/admin/blog');
  redirect(`/admin/blog/${post.id}`);
}

export async function duplicatePostAction(id: number) {
  await requireAdmin();
  const src = await prisma.blogPost.findUnique({ where: { id } });
  if (!src) throw new Error('not found');
  const slug = await uniqueSlug(`${src.slug}-copy`);
  const post = await prisma.blogPost.create({
    data: {
      slug,
      title: `${src.title} (копия)`,
      excerpt: src.excerpt,
      coverUrl: src.coverUrl,
      contentHtml: src.contentHtml,
      status: 'draft'
    }
  });
  revalidatePath('/admin/blog');
  redirect(`/admin/blog/${post.id}`);
}

export async function deletePostAction(id: number) {
  await requireAdmin();
  await prisma.blogPost.delete({ where: { id } });
  revalidatePath('/admin/blog');
  revalidatePath('/admin');
  revalidatePath('/blog');
}

interface SavePostInput {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  coverUrl: string;
  contentHtml: string;
}

export async function savePostAction(input: SavePostInput) {
  await requireAdmin();

  // Ensure slug stays URL-safe + unique (user might have typed free-form).
  const baseSlug = slugify(input.slug || input.title);
  const safeSlug = await uniqueSlug(baseSlug, input.id);

  await prisma.blogPost.update({
    where: { id: input.id },
    data: {
      title: input.title.trim() || 'Без заголовка',
      slug: safeSlug,
      excerpt: input.excerpt.trim() || null,
      coverUrl: input.coverUrl.trim() || null,
      contentHtml: input.contentHtml
    }
  });

  revalidatePath('/admin/blog');
  revalidatePath(`/admin/blog/${input.id}`);
  revalidatePath('/blog');
  revalidatePath(`/blog/${safeSlug}`);

  return { slug: safeSlug };
}

export async function togglePublishAction(id: number) {
  await requireAdmin();
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) throw new Error('not found');

  const nextStatus = post.status === 'published' ? 'draft' : 'published';
  await prisma.blogPost.update({
    where: { id },
    data: {
      status: nextStatus,
      publishedAt: nextStatus === 'published' ? post.publishedAt ?? new Date() : post.publishedAt
    }
  });

  revalidatePath('/admin/blog');
  revalidatePath(`/admin/blog/${id}`);
  revalidatePath('/blog');
  revalidatePath(`/blog/${post.slug}`);

  return { status: nextStatus };
}
