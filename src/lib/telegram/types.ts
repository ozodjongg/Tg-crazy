import type { Dialog, Message, Peer } from "@mtcute/web";

// UI uchun sodda, serializatsiya qilinadigan ko'rinishlar.
// mtcute obyektlari store'ga tushmaydi.

export interface ChatItem {
  id: number;
  title: string;
  lastText: string;
  lastDate: number | null;
  unread: number;
  pinned: boolean;
  muted: boolean;
}

export interface MessageItem {
  id: number;
  chatId: number;
  text: string;
  date: number;
  outgoing: boolean;
  senderId: number;
  senderName: string;
  service: boolean;
}

export interface Me {
  id: number;
  name: string;
}

export function peerTitle(peer: Peer): string {
  return peer.displayName || "Nomsiz";
}

export function messagePreview(msg: Message | null): string {
  if (!msg) return "";
  if (msg.text) return msg.text;
  if (msg.isService) return "Xizmat xabari";
  const kind = msg.media?.type;
  const labels: Record<string, string> = {
    photo: "Rasm",
    video: "Video",
    voice: "Ovozli xabar",
    audio: "Audio",
    document: "Fayl",
    sticker: "Stiker",
    location: "Joylashuv",
    contact: "Kontakt",
    poll: "So'rovnoma",
  };
  return kind ? (labels[kind] ?? "Media") : "";
}

export function toChatItem(d: Dialog): ChatItem {
  return {
    id: d.peer.id,
    title: peerTitle(d.peer),
    lastText: messagePreview(d.lastMessage),
    lastDate: d.lastMessage ? d.lastMessage.date.getTime() : null,
    unread: d.unreadCount,
    pinned: d.isPinned,
    muted: d.isMuted === true,
  };
}

export function toMessageItem(m: Message): MessageItem {
  return {
    id: m.id,
    chatId: m.chat.id,
    text: m.text || messagePreview(m),
    date: m.date.getTime(),
    outgoing: m.isOutgoing,
    senderId: m.sender.id,
    senderName: peerTitle(m.sender),
    service: m.isService,
  };
}
