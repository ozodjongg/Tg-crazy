import type { Entity } from "./telegram/types";

// Matn + entity'lar → ichma-ich daraxt. Sof funksiya (React'siz), test qilinadi.

export type RichNode = string | { entity: Entity; children: RichNode[] };

/** Tartib: avval boshlanishi, keyin uzunrog'i (tashqi entity ichkisidan oldin). */
function sorted(entities: Entity[], textLength: number): Entity[] {
  return entities
    .filter((e) => e.length > 0 && e.offset >= 0 && e.offset + e.length <= textLength)
    .sort((a, b) => a.offset - b.offset || b.length - a.length);
}

function build(text: string, list: Entity[], start: number, end: number): RichNode[] {
  const out: RichNode[] = [];
  let pos = start;
  let i = 0;
  while (i < list.length) {
    const e = list[i];
    const eEnd = e.offset + e.length;
    // Oldingi entity bilan kesishgan (to'liq ichida bo'lmagan) entity tashlab ketiladi
    if (e.offset < pos || eEnd > end) {
      i++;
      continue;
    }
    if (e.offset > pos) out.push(text.slice(pos, e.offset));
    let j = i + 1;
    while (j < list.length && list[j].offset < eEnd) j++;
    out.push({ entity: e, children: build(text, list.slice(i + 1, j), e.offset, eEnd) });
    pos = eEnd;
    i = j;
  }
  if (pos < end) out.push(text.slice(pos, end));
  return out;
}

export function toRichTree(text: string, entities: Entity[]): RichNode[] {
  return build(text, sorted(entities, text.length), 0, text.length);
}

const SAFE_SCHEMES = /^(https?:|tg:|mailto:|tel:)/i;

/** Faqat xavfsiz havolalar; sxemasiz manzilga https:// qo'shiladi. Aks holda null. */
export function safeHref(entity: Entity, text: string): string | null {
  let raw: string;
  switch (entity.kind) {
    case "text_link":
      raw = entity.url ?? "";
      break;
    case "url":
      raw = text;
      break;
    case "email":
      return `mailto:${text}`;
    case "phone":
      return `tel:${text.replace(/[^\d+]/g, "")}`;
    default:
      return null;
  }
  raw = raw.trim();
  if (!raw) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = `https://${raw}`;
  return SAFE_SCHEMES.test(raw) ? raw : null;
}

/** 1–3 ta emoji'dan iborat xabar (kattaroq ko'rsatiladi). */
export function emojiOnlyCount(text: string): number {
  const t = text.trim();
  if (!t || t.length > 40) return 0;
  if (!/^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\p{Regional_Indicator}|‍|️|\s)+$/u.test(t)) return 0;
  // Faqat raqam/belgilardan iborat matn emoji emas (Emoji_Component ularni ham qamraydi)
  if (!/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(t)) return 0;
  const graphemes = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(t.replace(/\s/g, ""))];
  return graphemes.length <= 3 ? graphemes.length : 0;
}
