export const BlogFooter = () => (
  <footer className="mt-[110px] md:mt-[140px]">
    <div className="mx-auto flex max-w-container-brand flex-col items-start justify-between gap-4 px-4 py-6 text-[14px] leading-[14.7px] text-[#a4a3a0] md:flex-row md:items-center md:px-2">
      <span style={{ letterSpacing: "-0.05em" }}>© {new Date().getFullYear()} MakeMeLook. Все права защищены.</span>
      <div className="flex gap-5" style={{ letterSpacing: "-0.05em" }}>
        <a href="/" className="transition-colors duration-200 hover:text-brand-ink">Главная</a>
        <a href="/ru/blog" className="transition-colors duration-200 hover:text-brand-ink">Блог</a>
        <a href="mailto:hello@makemelook.ai" className="transition-colors duration-200 hover:text-brand-ink">Контакты</a>
      </div>
    </div>
  </footer>
);
