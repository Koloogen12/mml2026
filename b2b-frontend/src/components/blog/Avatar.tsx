import { Author } from "@/data/blog";

type Props = { author: Author; size?: number; className?: string };

export const Avatar = ({ author, size = 40, className = "" }: Props) => (
  <span
    className={`inline-flex shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-brand-ink ${className}`}
    style={{ width: size, height: size, backgroundColor: author.color, fontSize: Math.max(11, size / 3) }}
    aria-hidden
  >
    {author.initials}
  </span>
);
