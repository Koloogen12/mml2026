// Клиент админского API блога. Контракт — internal/blog/handler.go.

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_json?: unknown;
  content_html?: string;
  cover_image: string;
  tag: string;
  status: "draft" | "published" | "scheduled";
  featured: boolean;
  reading_time: number;
  author_id?: string;
  author_name?: string;
  seo_title: string;
  seo_description: string;
  published_at?: string;
  scheduled_at?: string;
  updated_at: string;
}

export interface BlogAuthor {
  id: string;
  name: string;
  avatar_url: string;
  bio: string;
}

export interface BlogMedia {
  id: string;
  filename: string;
  url: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

const BASE = "/api/v1/admin/blog";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const e = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(e.error || `Ошибка ${res.status}`);
  }
  return (await res.json()) as T;
}

export const blogApi = {
  posts: (params: { status?: string; q?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.q) qs.set("q", params.q);
    return req<{ items: BlogPost[]; tags: string[] }>(`/posts?${qs}`);
  },
  post: (id: string) => req<BlogPost>(`/posts/${id}`),
  create: (body: Partial<BlogPost>) =>
    req<{ id: string }>("/posts", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<BlogPost>) =>
    req<{ ok: boolean }>(`/posts/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id: string) => req<{ ok: boolean }>(`/posts/${id}`, { method: "DELETE" }),
  publish: (id: string, status: string, scheduled_at?: string | null) =>
    req<{ ok: boolean }>(`/posts/${id}/publish`, {
      method: "PATCH",
      body: JSON.stringify({ status, scheduled_at: scheduled_at ?? null }),
    }),
  duplicate: (id: string) => req<{ id: string }>(`/posts/${id}/duplicate`, { method: "POST" }),
  authors: () => req<{ items: BlogAuthor[] }>("/authors"),
  createAuthor: (body: { name: string; avatar_url?: string; bio?: string }) =>
    req<{ id: string }>("/authors", { method: "POST", body: JSON.stringify(body) }),
  media: () => req<{ items: BlogMedia[] }>("/media"),
  removeMedia: (id: string) => req<{ ok: boolean }>(`/media/${id}`, { method: "DELETE" }),
  upload: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return req<BlogMedia>("/media/upload", { method: "POST", body: fd });
  },
};
