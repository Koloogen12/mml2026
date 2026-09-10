import './blog.css';

// Wraps every /ru/blog/** page in an isolated .blog-root container where
// brand CSS variables + Tailwind utility classes apply. Keeps blog styles
// from leaking to the main landing (globals.scss SCSS-modules world).

export default function BlogLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <div className="blog-root">{children}</div>;
}
