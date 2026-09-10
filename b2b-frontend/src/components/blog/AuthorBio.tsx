import { Author } from "@/data/blog";
import { Avatar } from "./Avatar";

export const AuthorBio = ({ author }: { author: Author }) => (
  <aside className="mt-12 flex items-start gap-4 rounded-[24px] bg-white p-6">
    <Avatar author={author} size={56} />
    <div>
      <div className="text-[15px] font-semibold text-brand-ink">{author.name}</div>
      <div className="text-[13px] text-brand-muted">{author.role}</div>
      <p className="mt-2 text-[14px] leading-[1.55] text-brand-ink/80">{author.bio}</p>
    </div>
  </aside>
);
