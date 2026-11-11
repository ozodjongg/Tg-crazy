import type { FolderRule } from "./telegram/api";
import type { ChatItem } from "./telegram/types";
import { cyrillicToLatin } from "./translit/uz";

/** Papka: "all" yoki Telegram'dagi papka ID si, yoki lokal turkum. */
export interface Folder {
  key: string;
  label: string;
  match: (chat: ChatItem) => boolean;
}

const notArchived = (c: ChatItem) => !c.archived;

/** Telegram'da papkalar bo'lmasa ishlatiladigan lokal turkumlar. */
export const LOCAL_FOLDERS: Folder[] = [
  { key: "all", label: "Hammasi", match: notArchived },
  { key: "personal", label: "Shaxsiy", match: (c) => notArchived(c) && (c.kind === "user" || c.kind === "bot") },
  { key: "groups", label: "Guruhlar", match: (c) => notArchived(c) && c.kind === "group" },
  { key: "channels", label: "Kanallar", match: (c) => notArchived(c) && c.kind === "channel" },
];

/** Telegram papka qoidasini (dialogFilter) chatga qo'llaydi. */
export function matchesRule(chat: ChatItem, rule: FolderRule): boolean {
  if (rule.include.includes(chat.id)) return true;
  if (rule.exclude.includes(chat.id)) return false;
  if (rule.excludeArchived && chat.archived) return false;
  if (rule.excludeMuted && chat.muted) return false;
  if (rule.excludeRead && chat.unread === 0) return false;
  switch (chat.kind) {
    case "user":
      return chat.isContact ? rule.contacts : rule.nonContacts;
    case "bot":
      return rule.bots;
    case "group":
      return rule.groups;
    case "channel":
      return rule.channels;
  }
}

export function buildFolders(rules: FolderRule[]): Folder[] {
  if (rules.length === 0) return LOCAL_FOLDERS;
  return [
    LOCAL_FOLDERS[0],
    ...rules.map((rule) => ({
      key: `tg:${rule.id}`,
      label: rule.title || "Papka",
      match: (c: ChatItem) => matchesRule(c, rule),
    })),
  ];
}

/** Qidiruv yozuvga bog'liq emas: "салом" va "salom" bir xil topiladi. */
export function normalizeQuery(s: string): string {
  return cyrillicToLatin(s).toLowerCase().replace(/[ʻʼ'`‘’]/g, "");
}

export function filterChats(chats: ChatItem[], folder: Folder, query: string): ChatItem[] {
  const q = normalizeQuery(query.trim());
  // Qidiruvda arxivdagilar ham topiladi
  return chats.filter((c) => (q ? normalizeQuery(c.title).includes(q) : folder.match(c)));
}

/** Papkadagi o'qilmagan (ovozi o'chirilmagan) chatlar soni. */
export function unreadChats(chats: ChatItem[], folder: Folder): number {
  return chats.filter((c) => folder.match(c) && c.unread > 0 && !c.muted).length;
}
