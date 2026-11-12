// Yozish maydonidagi avtoto'ldirish: kursor oldidagi "@ism", boshidagi "/buyruq" yoki ":emoji".

export type TriggerKind = "mention" | "command" | "emoji";

export interface Trigger {
  kind: TriggerKind;
  /** Belgisiz qidiruv so'zi ("@ali" → "ali") */
  query: string;
  /** Almashtiriladigan bo'lak: [start, end) — belgi bilan birga */
  start: number;
  end: number;
}

const MENTION_RE = /(^|\s)@(\w{0,32})$/u;
const COMMAND_RE = /^\/(\w{0,32})$/u;
// ":" dan keyin kamida 2 ta harf; "12:30" yoki ":)" taklif chiqarmaydi
const EMOJI_RE = /(^|\s):([\p{L}][\p{L}\d_'ʻ’]{1,30})$/u;

/** Kursor (matn oxiri emas, aynan kursor) oldidagi avtoto'ldirish belgisini topadi. */
export function findTrigger(text: string, cursor: number): Trigger | null {
  const before = text.slice(0, cursor);
  // Kursordan keyin so'z davom etayotgan bo'lsa (so'z o'rtasi) — taklif yo'q
  if (/^\w/u.test(text.slice(cursor))) return null;

  const cmd = COMMAND_RE.exec(before);
  if (cmd) return { kind: "command", query: cmd[1], start: 0, end: cursor };

  const mention = MENTION_RE.exec(before);
  if (mention) {
    const start = mention.index + mention[1].length;
    return { kind: "mention", query: mention[2], start, end: cursor };
  }

  const emoji = EMOJI_RE.exec(before);
  if (emoji) {
    const start = emoji.index + emoji[1].length;
    return { kind: "emoji", query: emoji[2], start, end: cursor };
  }
  return null;
}

/** Belgili bo'lakni tanlangan qiymat bilan almashtiradi; keyin bo'sh joy qo'yadi. */
export function applyCompletion(text: string, t: Trigger, value: string): { text: string; cursor: number } {
  const rest = text.slice(t.end);
  const sep = rest.startsWith(" ") ? "" : " ";
  const next = text.slice(0, t.start) + value + sep + rest;
  return { text: next, cursor: t.start + value.length + 1 };
}
