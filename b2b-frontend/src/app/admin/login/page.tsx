'use client';

import { Loader2, LogIn } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false
    });

    setLoading(false);

    if (!res) {
      setError('Не удалось войти — попробуйте ещё раз.');
      return;
    }
    if (res.error) {
      setError('Неверный email или пароль.');
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--admin-bg)] px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 text-center">
          <div className="text-[20px] font-semibold tracking-tight text-[var(--admin-ink)]">
            MakeMeLook / admin
          </div>
          <p className="mt-1 text-[13px] text-[var(--admin-muted)]">
            Вход в админку блога и заявок
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6"
        >
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-[var(--admin-ink)]">
            Email
            <input
              type="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 rounded-md border border-[var(--admin-border)] bg-white px-3 text-[14px] text-[var(--admin-ink)] outline-none focus:border-[var(--admin-accent)]"
              placeholder="ceo@mhs.pro"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-[var(--admin-ink)]">
            Пароль
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 rounded-md border border-[var(--admin-border)] bg-white px-3 text-[14px] text-[var(--admin-ink)] outline-none focus:border-[var(--admin-accent)]"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--admin-ink)] px-4 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            Войти
          </button>
        </form>

        <p className="mt-4 text-center text-[12px] text-[var(--admin-muted)]">
          Доступ ограничен. Если вы не админ — закройте вкладку.
        </p>
      </div>
    </div>
  );
}
