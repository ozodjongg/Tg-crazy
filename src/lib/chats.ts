import type { ChatItem } from "./telegram/types";
import { cyrillicToLatin } from "./translit/uz";

export type Folder = "all" | "personal" | "groups" | "channels";

export const FOLDERS: { id: Folder; label: string }[] = [
  { id: "all", label: "Hammasi" },
  { id: "personal", label: "Shaxsiy" },
  { id: "groups", label: "Guruhlar" },
  { id: "channels", label: "Kanallar" },
];

export function inFolder(chat: ChatItem, folder: Folder): boolean {
  switch (folder) {
    case "all":
      return true;
    case "personal":
      return chat.kind === "user" || chat.kind === "bot";
    case "groups":
      return chat.kind === "group";
    case "channels":
      return chat.kind === "channel";
  }
}

/** Qidiruv yozuvga bog'liq emas: "салом" va "salom" bir xil topiladi. */
export function normalizeQuery(s: string): string {
  return cyrillicToLatin(s).toLowerCase().replace(/[ʻʼ'`‘’]/g, "");
}

export function filterChats(chats: ChatItem[], folder: Folder, query: string): ChatItem[] {
  const q = normalizeQuery(query.trim());
  return chats.filter((c) => inFolder(c, folder) && (!q || normalizeQuery(c.title).includes(q)));
}

/** Papkadagi o'qilmagan (ovozi o'chirilmagan) chatlar soni. */
export function unreadChats(chats: ChatItem[], folder: Folder): number {
  return chats.filter((c) => inFolder(c, folder) && c.unread > 0 && !c.muted).length;
}
