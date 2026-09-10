/**
 * MakeMeLook B2B — Reference card component for Lovable / v0.
 *
 * This file is intentionally self-contained (no external imports, no CSS
 * modules, no SCSS, no path aliases). Feed it into Lovable together with
 * DESIGN_SYSTEM.md and Lovable will be able to faithfully match the visual
 * language of b2b.makemelook.ai when generating new blocks.
 *
 * What it demonstrates:
 *  - Brand palette via explicit hex colors (the same values live in
 *    globals.scss as CSS custom properties).
 *  - Inter typography with negative letter-spacing on display headings.
 *  - "SectionTitle" chip badge (lavender #edefff on indigo #4859f5 text).
 *  - Pill buttons (border-radius: 100px, height 42px, font 13/500).
 *  - Card pattern (white on #f7f7f7, 24px radius, hover lift + soft shadow).
 *  - Content typography (h2 28px/700/-0.01em, body 18px/1.7, indigo links).
 *  - Breakpoints: 1120px max content, 760px max text column, mobile at 440px.
 */
import React, { useState } from 'react';

// ---- Tokens (mirror of src/app/globals.scss) --------------------------------

const COLOR = {
  bg: '#f7f7f7',            // --primaryColor — page background
  surface: '#ffffff',       // --whiteColor   — card background
  ink: '#292824',           // --text-primaryColor
  muted: '#747474',         // --text-secondaryColor
  accent: '#4859f5',        // --text-thirdlyColor — indigo brand accent
  accentSoft: '#edefff',    // --thirdlyColor — lavender chip background
  dark: '#011010',          // --darkColor — near-black for logo / headings
  black: '#000000'          // --blackColor — CTA button background
};

const FONT_STACK =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

// ---- SectionTitle chip ------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 34,
        padding: '10px 16px',
        borderRadius: 50,
        background: COLOR.accentSoft,
        color: COLOR.accent,
        fontFamily: FONT_STACK,
        fontSize: 12,
        fontWeight: 400,
        lineHeight: '105%'
      }}
    >
      {children}
    </div>
  );
}

// ---- Pill button (primarySolid preset) --------------------------------------

function PillButton({
  children,
  variant = 'primary',
  onClick
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent';
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);

  const styleMap = {
    primary: {
      base: { color: '#ffffff', background: COLOR.black },
      hover: { background: '#6d7373' }
    },
    secondary: {
      base: { color: COLOR.ink, background: COLOR.surface },
      hover: { background: '#e8e8e8' }
    },
    accent: {
      base: { color: '#ffffff', background: COLOR.accent },
      hover: { background: '#283adb' }
    }
  } as const;

  const { base, hover: hoverStyle } = styleMap[variant];

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: '1px solid transparent',
        borderRadius: 100,
        height: 42,
        padding: '0 24px',
        fontFamily: FONT_STACK,
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'color 0.3s, background-color 0.3s, border-color 0.3s',
        ...base,
        ...(hover ? hoverStyle : null)
      }}
    >
      {children}
    </button>
  );
}

// ---- Blog post card (core brand card pattern) -------------------------------

interface PostCardProps {
  title: string;
  excerpt: string;
  coverUrl: string;
  publishedAt: string; // human-readable ("18 апреля 2026")
  category?: string;
  onClick?: () => void;
}

function PostCard({
  title,
  excerpt,
  coverUrl,
  publishedAt,
  category,
  onClick
}: PostCardProps) {
  const [hover, setHover] = useState(false);

  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: COLOR.surface,
        borderRadius: 24,
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: hover
          ? '0 12px 32px rgba(0,0,0,0.08)'
          : '0 0 0 rgba(0,0,0,0)',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)'
      }}
    >
      <div
        style={{
          aspectRatio: '16 / 9',
          background: `url(${coverUrl}) center / cover, #eee`
        }}
      />
      <div
        style={{
          padding: '20px 22px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          flex: 1
        }}
      >
        {category && <SectionTitle>{category}</SectionTitle>}

        <h3
          style={{
            margin: 0,
            fontFamily: FONT_STACK,
            fontSize: 20,
            fontWeight: 600,
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
            color: COLOR.ink
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: 0,
            fontFamily: FONT_STACK,
            fontSize: 14,
            lineHeight: 1.55,
            color: COLOR.muted,
            flex: 1
          }}
        >
          {excerpt}
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 13,
            color: '#888',
            marginTop: 'auto',
            paddingTop: 8,
            fontFamily: FONT_STACK
          }}
        >
          <time>{publishedAt}</time>
          <span style={{ color: COLOR.ink, fontWeight: 500 }}>Читать →</span>
        </div>
      </div>
    </a>
  );
}

// ---- Demo page composition (blog index layout) ------------------------------

export default function BlogIndexReference() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: COLOR.bg,
        color: COLOR.ink,
        fontFamily: FONT_STACK,
        paddingBottom: 80
      }}
    >
      {/* Topbar with brand link */}
      <header
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '22px 8px'
        }}
      >
        <a
          href="#"
          style={{
            color: COLOR.muted,
            textDecoration: 'none',
            fontSize: 14
          }}
        >
          ← MakeMeLook
        </a>
      </header>

      {/* Hero */}
      <section
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '40px 24px 48px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20
        }}
      >
        <SectionTitle>Статьи и обзоры</SectionTitle>

        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(40px, 6vw, 64px)',
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: COLOR.ink
          }}
        >
          Блог
        </h1>

        <p
          style={{
            margin: 0,
            fontSize: 18,
            lineHeight: 1.5,
            color: '#555',
            maxWidth: 620
          }}
        >
          Кейсы, обзоры рынка примерочных, сравнения с конкурентами и
          технические разборы интеграций.
        </p>
      </section>

      {/* Cards grid */}
      <section
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 28
        }}
      >
        <PostCard
          category="Обзор рынка"
          title="Zeekit vs YourFit vs MakeMeLook — сравнение трёх подходов к AI-примерке"
          excerpt="Разбираем архитектуру, качество генерации, скорость интеграции и цены трёх ведущих решений на рынке виртуальной примерочной."
          coverUrl="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800"
          publishedAt="18 апреля 2026"
        />
        <PostCard
          category="Кейс"
          title="Как магазин одежды увеличил конверсию на 47% за два месяца"
          excerpt="Разбор внедрения виджета виртуальной примерки у магазина с 3 000 SKU: что измеряли, какие гипотезы тестировали, что в итоге сработало."
          coverUrl="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800"
          publishedAt="10 апреля 2026"
        />
        <PostCard
          category="Интеграция"
          title="Подключение MakeMeLook к Tilda, Shopify и WordPress за 5 минут"
          excerpt="Пошаговая инструкция с видео, как встроить виджет на самые популярные платформы без помощи разработчика."
          coverUrl="https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=800"
          publishedAt="2 апреля 2026"
        />
      </section>

      {/* CTA row to demonstrate button variants */}
      <section
        style={{
          maxWidth: 1120,
          margin: '80px auto 0',
          padding: '0 24px',
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}
      >
        <PillButton variant="primary">Получить демо</PillButton>
        <PillButton variant="secondary">Войти в кабинет</PillButton>
        <PillButton variant="accent">Попробовать бесплатно</PillButton>
      </section>
    </main>
  );
}
