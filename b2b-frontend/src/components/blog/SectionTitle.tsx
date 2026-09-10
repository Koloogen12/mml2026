type Props = { children: React.ReactNode; className?: string };

export const SectionTitle = ({ children, className = "" }: Props) => (
  <span
    className={`inline-flex items-center justify-center rounded-[50px] bg-brand-accent-soft px-4 py-[10px] text-[12px] font-normal leading-[105%] text-brand-accent ${className}`}
  >
    {children}
  </span>
);
