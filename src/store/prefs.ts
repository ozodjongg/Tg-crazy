import { create } from "zustand";

// Ko'rinish va bildirishnoma sozlamalari: shu qurilmada saqlanadi va
// (xizmatlarga ulangan bo'lsa) boshqa qurilmalar bilan sinxronlanadi.

export type TextSize = "sm" | "md" | "lg" | "xl";
export type Wallpaper = "dots" | "plain" | "warm" | "paper";

export interface Prefs {
  textSize: TextSize;
  wallpaper: Wallpaper;
  notifications: boolean;
}

const KEY = "tg-crazy:prefs";
const DEFAULTS: Prefs = { textSize: "md", wallpaper: "dots", notifications: true };

export const TEXT_SIZES: Record<TextSize, string> = { sm: "14px", md: "16px", lg: "18px", xl: "20px" };

export function sanitizePrefs(raw: unknown): Partial<Prefs> {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: Partial<Prefs> = {};
  if (typeof r.textSize === "string" && r.textSize in TEXT_SIZES) out.textSize = r.textSize as TextSize;
  if (r.wallpaper === "dots" || r.wallpaper === "plain" || r.wallpaper === "warm" || r.wallpaper === "paper") out.wallpaper = r.wallpaper;
  if (typeof r.notifications === "boolean") out.notifications = r.notifications;
  return out;
}

function read(): Prefs {
  try {
    return { ...DEFAULTS, ...sanitizePrefs(JSON.parse(localStorage.getItem(KEY) ?? "null")) };
  } catch {
    return DEFAULTS;
  }
}

function apply(p: Prefs) {
  const root = document.documentElement;
  root.style.setProperty("--msg-font", TEXT_SIZES[p.textSize]);
  root.dataset.wallpaper = p.wallpaper;
}

interface PrefsState extends Prefs {
  load: () => void;
  update: (patch: Partial<Prefs>) => void;
}

export const usePrefs = create<PrefsState>((set, get) => ({
  ...DEFAULTS,
  load() {
    const p = read();
    apply(p);
    set(p);
  },
  update(patch) {
    const next: Prefs = { textSize: get().textSize, wallpaper: get().wallpaper, notifications: get().notifications, ...sanitizePrefs(patch) };
    apply(next);
    set(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Saqlab bo'lmasa — faqat shu seans uchun
    }
  },
}));
