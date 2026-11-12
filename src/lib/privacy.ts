// Telegram maxfiylik qoidalari ↔ sodda "hamma / kontaktlar / hech kim" + istisnolar.
// Asosiy daraja o'zgarganda istisnolar (ruxsat/taqiq ro'yxatlari) saqlanadi —
// rasmiy ilovalardagidek: "hamma"da faqat taqiqlar, "hech kim"da faqat ruxsatlar ma'noli.

export type PrivacyLevel = "everybody" | "contacts" | "nobody";

export type PrivacyKey = "phone" | "lastSeen" | "photo" | "bio" | "forwards" | "calls" | "invites";

export const PRIVACY_KEYS: { key: PrivacyKey; tl: string; label: string; levels: PrivacyLevel[] }[] = [
  { key: "phone", tl: "inputPrivacyKeyPhoneNumber", label: "Telefon raqamim", levels: ["everybody", "contacts", "nobody"] },
  { key: "lastSeen", tl: "inputPrivacyKeyStatusTimestamp", label: "Oxirgi faollik va onlayn", levels: ["everybody", "contacts", "nobody"] },
  { key: "photo", tl: "inputPrivacyKeyProfilePhoto", label: "Profil rasmi", levels: ["everybody", "contacts", "nobody"] },
  { key: "bio", tl: "inputPrivacyKeyAbout", label: "O'zim haqimda", levels: ["everybody", "contacts", "nobody"] },
  { key: "forwards", tl: "inputPrivacyKeyForwards", label: "Uzatilgan xabarlarda havola", levels: ["everybody", "contacts", "nobody"] },
  { key: "calls", tl: "inputPrivacyKeyPhoneCall", label: "Qo'ng'iroqlar", levels: ["everybody", "contacts", "nobody"] },
  { key: "invites", tl: "inputPrivacyKeyChatInvite", label: "Guruhlarga qo'shish", levels: ["everybody", "contacts"] },
];

export const LEVEL_LABEL: Record<PrivacyLevel, string> = {
  everybody: "Hamma",
  contacts: "Kontaktlarim",
  nobody: "Hech kim",
};

/** Server qaytargan qoida (privacyValue*) ning bizga kerakli qismi */
export interface RawRule {
  _: string;
  users?: number[];
  chats?: number[];
}

export interface Exceptions {
  users: number[];
  chats: number[];
}

export interface PrivacyState {
  level: PrivacyLevel;
  allow: Exceptions;
  disallow: Exceptions;
}

export function parseRules(rules: RawRule[]): PrivacyState {
  const has = (name: string) => rules.some((r) => r._ === name);
  const level: PrivacyLevel = has("privacyValueAllowAll")
    ? "everybody"
    : has("privacyValueAllowContacts")
      ? "contacts"
      : "nobody";
  const collect = (users: string, chats: string): Exceptions => ({
    users: rules.filter((r) => r._ === users).flatMap((r) => r.users ?? []),
    chats: rules.filter((r) => r._ === chats).flatMap((r) => r.chats ?? []),
  });
  return {
    level,
    allow: collect("privacyValueAllowUsers", "privacyValueAllowChatParticipants"),
    disallow: collect("privacyValueDisallowUsers", "privacyValueDisallowChatParticipants"),
  };
}

/** Saqlash uchun qoidalar ro'yxati (input* nomlari bilan; foydalanuvchilar api.ts da resolve qilinadi). */
export function buildRules(state: PrivacyState): RawRule[] {
  const out: RawRule[] = [];
  const add = (name: string, e: Exceptions) => {
    if (e.users.length) out.push({ _: `inputPrivacyValue${name}Users`, users: e.users });
    if (e.chats.length) out.push({ _: `inputPrivacyValue${name}ChatParticipants`, chats: e.chats });
  };
  // Istisnolar asosiy qoidadan oldin turadi (Telegram tartibi)
  if (state.level !== "everybody") add("Allow", state.allow);
  if (state.level !== "nobody") add("Disallow", state.disallow);
  out.push({
    _: state.level === "everybody" ? "inputPrivacyValueAllowAll" : state.level === "contacts" ? "inputPrivacyValueAllowContacts" : "inputPrivacyValueDisallowAll",
  });
  return out;
}

/** "+2 · −1" — ko'rsatiladigan istisnolar (joriy darajada ma'noli bo'lganlari) */
export function exceptionsLabel(state: PrivacyState): string {
  const n = (e: Exceptions) => e.users.length + e.chats.length;
  const parts: string[] = [];
  if (state.level !== "everybody" && n(state.allow)) parts.push(`+${n(state.allow)}`);
  if (state.level !== "nobody" && n(state.disallow)) parts.push(`−${n(state.disallow)}`);
  return parts.join(" · ");
}
