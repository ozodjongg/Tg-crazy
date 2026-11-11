const pad = (n: number) => String(n).padStart(2, "0");

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Bugun bo'lsa vaqt, aks holda sana. */
export function formatChatDate(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const n = new Date(now);
  const sameDay =
    d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  if (sameDay) return formatTime(ts);
  const date = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
  return d.getFullYear() === n.getFullYear() ? date : `${date}.${String(d.getFullYear()).slice(2)}`;
}

export function initials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => Array.from(w)[0] ?? "");
  return letters.join("").toUpperCase() || "?";
}

const AVATAR_COLORS = ["#e11d48", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#2563eb", "#7c3aed", "#c026d3"];

export function avatarColor(id: number): string {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length];
}
