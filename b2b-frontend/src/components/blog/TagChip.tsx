type Props = {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  as?: "button" | "span";
};

export const TagChip = ({ children, active, onClick, as = "button" }: Props) => {
  const base =
    "inline-flex items-center justify-center rounded-[50px] px-4 py-[8px] text-[12px] font-medium leading-[105%] transition-colors duration-200";
  const styles = active
    ? "bg-brand-cta text-white"
    : "bg-brand-accent-soft text-brand-accent hover:bg-brand-accent hover:text-white";
  if (as === "span") return <span className={`${base} ${styles}`}>{children}</span>;
  return (
    <button type="button" onClick={onClick} className={`${base} ${styles}`}>
      {children}
    </button>
  );
};
