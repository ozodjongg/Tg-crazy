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

const MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Xabarlar orasidagi sana ajratgichi: "Bugun", "Kecha", "12-noyabr", "3-mart, 2024". */
export function formatDayLabel(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const n = new Date(now);
  const diffDays = Math.round((dayStart(n) - dayStart(d)) / 864e5);
  if (diffDays === 0) return "Bugun";
  if (diffDays === 1) return "Kecha";
  const label = `${d.getDate()}-${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === n.getFullYear() ? label : `${label}, ${d.getFullYear()}`;
}

export function isSameDay(a: number, b: number): boolean {
  return dayStart(new Date(a)) === dayStart(new Date(b));
}

export function initials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => Array.from(w)[0] ?? "");
  return letters.join("").toUpperCase() || "?";
}

const AVATAR_COLORS = ["#d97757", "#788c5d", "#6a9bcc", "#c2a15b", "#b5677d", "#5e8c8a", "#8e7cc3", "#bf6a4a"];

export function avatarColor(id: number): string {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length];
}
