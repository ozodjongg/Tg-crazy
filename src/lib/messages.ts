import type { MessageItem } from "./telegram/types";

// Xabarlar ro'yxati ustidagi sof amallar. Ro'yxat doim ID bo'yicha o'sish tartibida.

/** Xabarni qo'shadi yoki (bir xil ID bo'lsa) yangilaydi. */
export function upsertMessage(list: MessageItem[], msg: MessageItem): MessageItem[] {
  const i = list.findIndex((m) => m.id === msg.id);
  if (i >= 0) {
    const next = [...list];
    next[i] = msg;
    return next;
  }
  if (list.length === 0 || list[list.length - 1].id < msg.id) return [...list, msg];
  return [...list, msg].sort((a, b) => a.id - b.id);
}

/** Faqat mavjud xabarni yangilaydi (tahrir/reaksiya yangilanishi uchun). */
export function replaceMessage(list: MessageItem[], msg: MessageItem): MessageItem[] {
  return list.some((m) => m.id === msg.id) ? list.map((m) => (m.id === msg.id ? msg : m)) : list;
}

export function removeMessages(list: MessageItem[], ids: number[]): MessageItem[] {
  if (ids.length === 0) return list;
  const drop = new Set(ids);
  const next = list.filter((m) => !drop.has(m.id));
  return next.length === list.length ? list : next;
}

/** Eski sahifani boshiga qo'shadi; takrorlar tashlanadi. */
export function prependOlder(list: MessageItem[], older: MessageItem[]): MessageItem[] {
  const have = new Set(list.map((m) => m.id));
  const fresh = older.filter((m) => !have.has(m.id));
  return fresh.length === 0 ? list : [...fresh, ...list].sort((a, b) => a.id - b.id);
}

/** Reaksiyani mahalliy almashtiradi: bosilgan emoji tanlangan bo'lsa olib tashlanadi. */
export function toggleReaction(msg: MessageItem, emoji: string): { next: MessageItem; chosen: string | null } {
  const wasChosen = msg.reactions.some((r) => r.emoji === emoji && r.chosen);
  const cleared = msg.reactions
    .map((r) => (r.chosen ? { ...r, chosen: false, count: r.count - 1 } : r))
    .filter((r) => r.count > 0);
  if (wasChosen) return { next: { ...msg, reactions: cleared }, chosen: null };
  const existing = cleared.find((r) => r.emoji === emoji);
  const reactions = existing
    ? cleared.map((r) => (r.emoji === emoji ? { ...r, chosen: true, count: r.count + 1 } : r))
    : [...cleared, { emoji, count: 1, chosen: true }];
  return { next: { ...msg, reactions }, chosen: emoji };
}

export function formatSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "";
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export interface AiInput {
  sender: string;
  text: string;
  mine: boolean;
}

/**
 * AI'ga yuborish uchun eng so'nggi matnli xabarlarni tanlaydi (xronologik tartibda).
 * Xabarlar kesilmaydi: sig'magani butunlay tashlab ketiladi.
 */
export function pickForAi(list: MessageItem[], maxChars = 30_000, maxCount = 100): AiInput[] {
  const picked: AiInput[] = [];
  let chars = 0;
  for (let i = list.length - 1; i >= 0 && picked.length < maxCount; i--) {
    const m = list[i];
    const text = m.text.trim();
    if (m.service || !text) continue;
    if (chars + text.length > maxChars) break;
    chars += text.length;
    picked.push({ sender: m.senderName, text, mine: m.outgoing });
  }
  return picked.reverse();
}

export interface MessageRow {
  /** Ko'rsatiladigan asosiy xabar (albomda — birinchisi) */
  msg: MessageItem;
  /** Albom bo'lsa — uning barcha xabarlari */
  album: MessageItem[] | null;
}

/** Ketma-ket, bir xil groupedId li xabarlarni bitta qatorga (albomga) birlashtiradi. */
export function groupAlbums(list: MessageItem[]): MessageRow[] {
  const rows: MessageRow[] = [];
  for (const m of list) {
    const prev = rows[rows.length - 1];
    if (m.groupedId && prev && prev.msg.groupedId === m.groupedId && prev.msg.chatId === m.chatId) {
      prev.album = prev.album ? [...prev.album, m] : [prev.msg, m];
    } else {
      rows.push({ msg: m, album: null });
    }
  }
  return rows;
}

/** Galereya uchun: rasm va videolar (xronologik). */
export function galleryItems(list: MessageItem[]): MessageItem[] {
  return list.filter((m) => m.media?.kind === "photo" || m.media?.kind === "video");
}
