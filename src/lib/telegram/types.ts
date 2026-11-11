import type { Dialog, Message, MessageMedia, Peer } from "@mtcute/web";

// UI uchun sodda, serializatsiya qilinadigan ko'rinishlar.
// mtcute obyektlari store'ga tushmaydi (media uchun media.ts dagi registr ishlatiladi).

export type ChatKind = "user" | "bot" | "group" | "channel";
export type Presence = "online" | "recently" | "offline" | null;

export interface ChatItem {
  id: number;
  title: string;
  kind: ChatKind;
  lastText: string;
  /** Oxirgi xabar ID si (0 — noma'lum) */
  lastId: number;
  lastDate: number | null;
  /** Oxirgi xabar o'zimizdanmi */
  lastOutgoing: boolean;
  /** Oxirgi xabar yuboruvchisi (guruhlarda ko'rsatiladi) */
  lastSender: string;
  /** Suhbatdosh o'qigan eng so'nggi chiquvchi xabar ID si */
  readOutboxMaxId: number;
  unread: number;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  /** Faqat shaxsiy chatlar uchun */
  isContact: boolean;
  presence: Presence;
}

export type MediaKind = "photo" | "video" | "voice" | "audio" | "sticker" | "file";

export interface MediaInfo {
  kind: MediaKind;
  fileName: string;
  size: number | null;
  mime: string;
  width: number | null;
  height: number | null;
  /** Soniyalarda; audio/video/ovoz uchun */
  duration: number | null;
}

export interface Reaction {
  emoji: string;
  count: number;
  chosen: boolean;
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
  edited: boolean;
  replyToId: number | null;
  media: MediaInfo | null;
  reactions: Reaction[];
}

export interface Me {
  id: number;
  name: string;
}

export function peerTitle(peer: Peer): string {
  return peer.displayName || "Nomsiz";
}

export function peerKind(peer: Peer): ChatKind {
  if (peer.type === "user") return peer.isBot ? "bot" : "user";
  return peer.chatType === "channel" ? "channel" : "group";
}

export function peerPresence(peer: Peer): Presence {
  if (peer.type !== "user" || peer.isBot) return null;
  if (peer.status === "online") return "online";
  return peer.status === "recently" ? "recently" : "offline";
}

const MEDIA_LABELS: Record<string, string> = {
  photo: "Rasm",
  video: "Video",
  voice: "Ovozli xabar",
  audio: "Audio",
  document: "Fayl",
  sticker: "Stiker",
  location: "Joylashuv",
  live_location: "Joylashuv",
  venue: "Joy",
  contact: "Kontakt",
  poll: "So'rovnoma",
  dice: "Zar",
  game: "O'yin",
  invoice: "Hisob",
  story: "Hikoya",
};

export function mediaLabel(media: MessageMedia): string {
  if (!media || media.type === "webpage") return "";
  return MEDIA_LABELS[media.type] ?? "Media";
}

export function messagePreview(msg: Message | null): string {
  if (!msg) return "";
  if (msg.text) return msg.text;
  if (msg.isService) return "Xizmat xabari";
  return mediaLabel(msg.media);
}

function toMediaInfo(media: MessageMedia): MediaInfo | null {
  if (!media) return null;
  switch (media.type) {
    case "photo": {
      // Eng katta o'lcham — nisbatni oldindan bilish uchun
      const biggest = [...media.thumbnails].sort((a, b) => b.width * b.height - a.width * a.height)[0];
      return {
        kind: "photo", fileName: "rasm.jpg", size: null, mime: "image/jpeg",
        width: biggest?.width || null, height: biggest?.height || null, duration: null,
      };
    }
    case "video":
      return {
        kind: "video", fileName: media.fileName ?? "video.mp4", size: media.fileSize ?? null,
        mime: media.mimeType, width: media.width || null, height: media.height || null,
        duration: media.duration,
      };
    case "voice":
    case "audio":
      return {
        kind: media.type, fileName: media.fileName ?? (media.type === "voice" ? "ovoz.ogg" : "audio.mp3"),
        size: media.fileSize ?? null, mime: media.mimeType, width: null, height: null,
        duration: media.duration,
      };
    case "sticker":
      return {
        kind: "sticker", fileName: "stiker", size: media.fileSize ?? null, mime: media.mimeType,
        width: media.width || null, height: media.height || null, duration: null,
      };
    case "document":
      return {
        kind: "file", fileName: media.fileName ?? "fayl", size: media.fileSize ?? null,
        mime: media.mimeType, width: null, height: null, duration: null,
      };
    default:
      return null;
  }
}

export function toChatItem(d: Dialog): ChatItem {
  const last = d.lastMessage;
  return {
    id: d.peer.id,
    title: peerTitle(d.peer),
    kind: peerKind(d.peer),
    lastText: messagePreview(last),
    lastId: last?.id ?? 0,
    lastDate: last ? last.date.getTime() : null,
    lastOutgoing: last?.isOutgoing ?? false,
    lastSender: last ? peerTitle(last.sender) : "",
    readOutboxMaxId: d.lastReadOutgoing,
    unread: d.unreadCount,
    pinned: d.isPinned,
    muted: d.isMuted === true,
    archived: d.isArchived,
    isContact: d.peer.type === "user" && d.peer.isContact,
    presence: peerPresence(d.peer),
  };
}

export function toMessageItem(m: Message): MessageItem {
  const media = toMediaInfo(m.media);
  return {
    id: m.id,
    chatId: m.chat.id,
    // Media ko'rsatiladigan bo'lsa matn — faqat izoh; aks holda media nomi
    text: m.text || (media ? "" : messagePreview(m)),
    date: m.date.getTime(),
    outgoing: m.isOutgoing,
    senderId: m.sender.id,
    senderName: peerTitle(m.sender),
    service: m.isService,
    edited: m.editDate !== null && !m.hideEditMark,
    replyToId: m.replyToMessage?.id ?? null,
    media,
    reactions: (m.reactions?.reactions ?? [])
      // Maxsus (premium) emoji-reaksiyalar hozircha ko'rsatilmaydi
      .filter((r) => typeof r.emoji === "string")
      .map((r) => ({ emoji: r.emoji as string, count: r.count, chosen: r.order !== null })),
  };
}

/** Chatlar ro'yxatidagi qisqa matn (media bo'lsa uning nomi). */
export function itemPreview(m: MessageItem): string {
  if (m.text) return m.text;
  if (!m.media) return "";
  const labels: Record<MediaKind, string> = {
    photo: "Rasm", video: "Video", voice: "Ovozli xabar", audio: "Audio", sticker: "Stiker", file: "Fayl",
  };
  return labels[m.media.kind];
}
