import './landing.css';

// Группа маршрутов «(landing)»: в адресе она не участвует, поэтому
// src/app/(landing)/page.tsx отдаётся на корне «/».
//
// Группа, а не файлы прямо в src/app/: рядом с page.tsx лежат sections/,
// и любая обычная папка здесь стала бы маршрутом (/sections). Группа
// позволяет держать лендинг одним каталогом и при этом занимать корень.
//
// Свой layout нужен ради landing.css: подключённый здесь, он не приезжает
// на /blog, /admin и /shop.

// eslint-disable-next-line import/no-unused-modules
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
