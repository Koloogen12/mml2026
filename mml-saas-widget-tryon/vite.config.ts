import path from 'path';
import postcss from 'postcss';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// ---------------------------------------------------------------------------
// scopeWidgetCSS — Vite plugin that wraps every selector in the final
// widget.css under `.mml-root`, so the widget's Tailwind utilities
// (`.fixed`, `.flex`, `.container`, `.z-10`, …) and `:root` CSS variables
// don't bleed into the host page.
//
// Real-world failure that motivated this: bruler.ru (custom Laravel + their
// own .container / .fixed / .flex classes) loaded the widget and reported
// "ваш аддон ломает вёрстку". The widget's Tailwind output declared global
// `.container { max-width: 40rem }`, which overrode their site-wide
// container width. Same for `.fixed`, `.flex`, etc. — any host with the
// same class name lost its layout the moment our CSS loaded.
//
// What this plugin does, run after Tailwind generates the final CSS:
//   1. For each top-level rule selector (e.g. `.fixed`, `:root`, `.container`),
//      prefix it with `.mml-root ` so it only matches inside our root.
//   2. Replace `:root` and `:host` with `.mml-root` so CSS variables stay
//      scoped to the widget.
//   3. Descend into @media / @supports / @layer; KEEP @keyframes, @property,
//      @font-face, @charset, @import global — those must remain unscoped
//      so animations and font registrations work.
//   4. Skip rules already scoped (already start with `.mml-root` or
//      `:where(.mml-root)`).
// ---------------------------------------------------------------------------
function scopeWidgetCSS(scope: string): Plugin {
  const scopeOne = (sel: string): string => {
    const s = sel.trim();
    if (!s) return s;
    if (s.startsWith(scope) || s.startsWith(`:where(${scope})`)) return s;
    if (s === ':root' || s === ':host' || s === ':root,:host') return scope;
    return `${scope} ${s}`;
  };

  // At-rules whose contents must NOT be prefixed (they're definitions,
  // not selectors). @keyframes step names like `0%`, `to` aren't selectors;
  // @property describes a CSS custom property registration.
  const SKIP_BLOCK = /^(keyframes|-webkit-keyframes|property|font-face|charset|import|namespace)$/i;

  const transform = (css: string): string => {
    const root = postcss.parse(css);

    const walk = (container: postcss.Container) => {
      container.each((node) => {
        if (node.type === 'rule') {
          const seen = new Set<string>();
          const out: string[] = [];
          for (const orig of node.selectors) {
            const next = scopeOne(orig);
            if (!seen.has(next)) {
              seen.add(next);
              out.push(next);
            }
          }
          node.selectors = out;
        } else if (node.type === 'atrule') {
          if (SKIP_BLOCK.test(node.name)) return; // leave globals alone
          if (node.nodes) walk(node);
        }
      });
    };

    walk(root);
    return root.toString();
  };

  return {
    name: 'mml:scope-widget-css',
    apply: 'build',
    // `enforce: 'post'` keeps us after @tailwindcss/vite — the Tailwind
    // plugin emits the final CSS asset, then we rewrite its selectors.
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const fileName of Object.keys(bundle)) {
        const asset = bundle[fileName];
        if (asset.type !== 'asset' || !fileName.endsWith('.css')) continue;
        const source = typeof asset.source === 'string'
          ? asset.source
          : Buffer.from(asset.source).toString('utf-8');
        asset.source = transform(source);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const apiTarget = env.VITE_API_TARGET || 'http://localhost:3010';
  const s3Proxy = env.VITE_S3_PROXY === 'true';
  const s3Target = env.VITE_S3_TARGET || 'http://127.0.0.1:9010';

  const proxy: Record<string, object> = {
    '/api': {
      target: apiTarget,
      changeOrigin: true,
    },
  };

  if (s3Proxy) {
    proxy['/s3'] = {
      target: s3Target,
      changeOrigin: true,
      rewrite: (p: string) => p.replace(/^\/s3/, ''),
    };
  }

  return {
    // Plugin order matters: tailwindcss generates utility classes,
    // react handles JSX, scopeWidgetCSS runs last (generateBundle hook)
    // to wrap the final CSS bundle under `.mml-root`. See the long-form
    // comment above scopeWidgetCSS for the why.
    plugins: [tailwindcss(), react(), scopeWidgetCSS('.mml-root')],
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    server: {
      port: 5175,
      proxy,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, 'src/widget.tsx'),
        name: 'MakeMeLookWidget',
        formats: ['iife'],
        fileName: () => 'widget.js',
      },
      rollupOptions: {
        external: [],
        output: {
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) return 'widget.css';
            return assetInfo.name ?? 'assets/[name]-[hash][extname]';
          },
        },
      },
      cssCodeSplit: false,
      outDir: 'dist',
      cssMinify: true,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: false,
        },
      },
    },
  };
});
