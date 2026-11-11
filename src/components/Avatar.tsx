import { avatarColor, initials } from "@/lib/format";

export function Avatar({ id, title, size = 48 }: { id: number; title: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-medium text-white"
      style={{ width: size, height: size, background: avatarColor(id), fontSize: size * 0.38 }}
    >
      {initials(title)}
    </span>
  );
}
