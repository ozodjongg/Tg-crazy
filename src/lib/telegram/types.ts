import type { Dialog, Message, MessageMedia, Peer } from "@mtcute/web";
import { serviceText } from "./service";

// UI uchun sodda, serializatsiya qilinadigan ko'rinishlar.
// mtcute obyektlari store'ga tushmaydi (media va avatarlar media.ts dagi registrda).

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
  /** Biz o'qigan eng so'nggi kiruvchi xabar ID si — "o'qilmaganlar" ajratgichi uchun */
  readInboxMaxId: number;
  unread: number;
  /** Bizni eslatgan o'qilmagan xabarlar */
  mentions: number;
  /** Qo'lda "o'qilmagan" deb belgilangan */
  markedUnread: boolean;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  /** Faqat shaxsiy chatlar uchun */
  isContact: boolean;
  presence: Presence;
  verified: boolean;
  /** "Saqlangan xabarlar" — o'zimiz bilan chat */
  isSelf: boolean;
  /** Saqlangan qoralama matni */
  draft: string;
  /** Qidiruvdan ochilgan, ro'yxatda yo'q chat (faqat ochiq turganda ko'rinadi) */
  ephemeral?: boolean;
  /** A'zo bo'lmagan ommaviy kanal/guruh — yozish o'rnida "Qo'shilish" */
  joinable?: boolean;
}

export type MediaKind = "photo" | "video" | "gif" | "round" | "voice" | "audio" | "sticker" | "file";

export interface MediaInfo {
  kind: MediaKind;
  fileName: string;
  size: number | null;
  mime: string;
  width: number | null;
  height: number | null;
  /** Soniyalarda; audio/video/ovoz uchun */
  duration: number | null;
  /** Stiker turi */
  stickerFormat?: "static" | "animated" | "video";
  /** Ovozli xabar to'lqini (0–31 qiymatlar) */
  waveform?: number[];
  /** Spoiler ostidagi media */
  spoiler?: boolean;
}

export type EntityKind =
  | "bold" | "italic" | "underline" | "strike" | "spoiler" | "code" | "pre" | "blockquote"
  | "url" | "text_link" | "mention" | "text_mention" | "hashtag" | "cashtag" | "bot_command"
  | "email" | "phone";

export interface Entity {
  kind: EntityKind;
  offset: number;
  length: number;
  url?: string;
  language?: string;
  userId?: number;
}

export interface Reaction {
  emoji: string;
  count: number;
  chosen: boolean;
}

export interface WebPreview {
  url: string;
  siteName: string;
  title: string;
  description: string;
  hasPhoto: boolean;
  largePhoto: boolean;
}

export interface PollInfo {
  question: string;
  answers: { text: string; voters: number; chosen: boolean; correct: boolean; data: string }[];
  voters: number;
  closed: boolean;
  quiz: boolean;
  multiple: boolean;
  isPublic: boolean;
}

export interface Place {
  lat: number;
  lon: number;
  title: string;
  address: string;
  live: boolean;
}

export interface ContactCard {
  name: string;
  phone: string;
  userId: number;
}

export interface InlineButton {
  text: string;
  kind: "callback" | "url" | "other";
  /** callback ma'lumoti, base64 */
  data?: string;
  url?: string;
}

export interface MessageItem {
  id: number;
  chatId: number;
  text: string;
  entities: Entity[];
  date: number;
  outgoing: boolean;
  senderId: number;
  senderName: string;
  service: boolean;
  edited: boolean;
  replyToId: number | null;
  media: MediaInfo | null;
  reactions: Reaction[];
  /** "Uzatilgan: …" — asl muallif */
  forwardFrom: string | null;
  viaBot: string | null;
  signature: string | null;
  views: number | null;
  /** Albom: bir xil qiymatli xabarlar bitta panjarada ko'rsatiladi */
  groupedId: string | null;
  webpage: WebPreview | null;
  poll: PollInfo | null;
  place: Place | null;
  contact: ContactCard | null;
  keyboard: InlineButton[][] | null;
  /** Bizni eslatgan xabar */
  mention: boolean;
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
  live_location: "Jonli joylashuv",
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
  if (media.type === "video" && media.isRound) return "Video xabar";
  if (media.type === "video" && media.isAnimation) return "GIF";
  if (media.type === "sticker") return media.emoji ? `${media.emoji} Stiker` : "Stiker";
  if (media.type === "poll") return `📊 ${media.question}`;
  return MEDIA_LABELS[media.type] ?? "Media";
}

export function messagePreview(msg: Message | null): string {
  if (!msg) return "";
  if (msg.isService) return serviceText(msg);
  if (msg.text) return msg.text;
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
        spoiler: media.hasSpoiler,
      };
    }
    case "video":
      return {
        kind: media.isRound ? "round" : media.isAnimation ? "gif" : "video",
        fileName: media.fileName ?? "video.mp4", size: media.fileSize ?? null,
        mime: media.mimeType || "video/mp4", width: media.width || null, height: media.height || null,
        duration: media.duration, spoiler: media.hasSpoiler,
      };
    case "voice":
      return {
        kind: "voice", fileName: media.fileName ?? "ovoz.ogg", size: media.fileSize ?? null,
        mime: media.mimeType, width: null, height: null, duration: media.duration,
        waveform: media.waveform,
      };
    case "audio":
      return {
        kind: "audio", fileName: media.fileName ?? "audio.mp3", size: media.fileSize ?? null,
        mime: media.mimeType, width: null, height: null, duration: media.duration,
      };
    case "sticker":
      return {
        kind: "sticker", fileName: media.emoji || "stiker", size: media.fileSize ?? null,
        mime: media.mimeType, width: media.width || null, height: media.height || null, duration: null,
        stickerFormat: media.sourceType,
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

const ENTITY_KINDS: Partial<Record<string, EntityKind>> = {
  bold: "bold", italic: "italic", underline: "underline", strikethrough: "strike", spoiler: "spoiler",
  code: "code", pre: "pre", blockquote: "blockquote", url: "url", text_link: "text_link",
  mention: "mention", text_mention: "text_mention", hashtag: "hashtag", cashtag: "cashtag",
  bot_command: "bot_command", email: "email", phone_number: "phone",
};

function toEntities(m: Message): Entity[] {
  const out: Entity[] = [];
  for (const e of m.entities) {
    const kind = ENTITY_KINDS[e.kind];
    if (!kind) continue;
    const p = e.params as { url?: string; language?: string; userId?: number };
    out.push({
      kind, offset: e.offset, length: e.length,
      ...(p.url ? { url: p.url } : {}),
      ...(p.language ? { language: p.language } : {}),
      ...(typeof p.userId === "number" ? { userId: p.userId } : {}),
    });
  }
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function toKeyboard(m: Message): InlineButton[][] | null {
  const markup = m.markup;
  if (!markup || markup.type !== "inline") return null;
  return markup.buttons.map((row) =>
    row.map((b): InlineButton => {
      switch (b.type._) {
        case "inlineButtonTypeCallback":
          return { text: b.text, kind: "callback", data: toBase64(b.type.data) };
        case "inlineButtonTypeUrl":
          return { text: b.text, kind: "url", url: b.type.url };
        default:
          return { text: b.text, kind: "other" };
      }
    }),
  );
}

type PollMedia = Extract<NonNullable<MessageMedia>, { type: "poll" }>;

export function toPollInfo(poll: PollMedia): PollInfo {
  return {
    question: poll.question,
    answers: poll.answers.map((a) => ({
      text: a.text, voters: a.voters, chosen: a.chosen, correct: a.correct, data: toBase64(a.data),
    })),
    voters: poll.voters, closed: poll.isClosed, quiz: poll.isQuiz, multiple: poll.isMultiple,
    isPublic: poll.isPublic,
  };
}

export function fromBase64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

function extras(m: Message): Pick<MessageItem, "webpage" | "poll" | "place" | "contact"> {
  const media = m.media;
  const none = { webpage: null, poll: null, place: null, contact: null };
  if (!media) return none;
  switch (media.type) {
    case "webpage": {
      const p = media.preview;
      return {
        ...none,
        webpage: {
          url: p.url, siteName: p.siteName ?? "", title: p.title ?? "", description: p.description ?? "",
          hasPhoto: p.photo !== null, largePhoto: media.displaySize === "large" || p.previewType === "photo",
        },
      };
    }
    case "poll":
      return { ...none, poll: toPollInfo(media) };
    case "location":
    case "live_location":
      return {
        ...none,
        place: { lat: media.latitude, lon: media.longitude, title: "", address: "", live: media.type === "live_location" },
      };
    case "venue":
      return {
        ...none,
        place: {
          lat: media.location.latitude, lon: media.location.longitude,
          title: media.title, address: media.address, live: false,
        },
      };
    case "contact":
      return {
        ...none,
        contact: { name: [media.firstName, media.lastName].filter(Boolean).join(" "), phone: media.phoneNumber, userId: media.userId },
      };
    default:
      return none;
  }
}

export function toChatItem(d: Dialog): ChatItem {
  const last = d.lastMessage;
  const peer = d.peer;
  return {
    id: peer.id,
    title: peerTitle(peer),
    kind: peerKind(peer),
    lastText: messagePreview(last),
    lastId: last?.id ?? 0,
    lastDate: last ? last.date.getTime() : null,
    lastOutgoing: last?.isOutgoing ?? false,
    lastSender: last ? peerTitle(last.sender) : "",
    readOutboxMaxId: d.lastReadOutgoing,
    readInboxMaxId: d.lastReadIngoing,
    unread: d.unreadCount,
    mentions: d.unreadMentionsCount,
    markedUnread: d.isManuallyUnread,
    pinned: d.isPinned,
    muted: d.isMuted === true,
    archived: d.isArchived,
    isContact: peer.type === "user" && peer.isContact,
    presence: peerPresence(peer),
    verified: peer.isVerified,
    isSelf: peer.type === "user" && peer.isSelf,
    draft: d.draftMessage?.text ?? "",
  };
}

export function toMessageItem(m: Message): MessageItem {
  const media = toMediaInfo(m.media);
  const service = m.isService;
  const fwd = m.forward;
  return {
    id: m.id,
    chatId: m.chat.id,
    // Media ko'rsatiladigan bo'lsa matn — faqat izoh; aks holda media nomi
    text: service ? serviceText(m) : m.text || (media || m.media?.type === "poll" ? "" : messagePreview(m)),
    entities: service ? [] : toEntities(m),
    date: m.date.getTime(),
    outgoing: m.isOutgoing,
    senderId: m.sender.id,
    senderName: peerTitle(m.sender),
    service,
    edited: m.editDate !== null && !m.hideEditMark,
    replyToId: m.replyToMessage?.id ?? null,
    media,
    reactions: (m.reactions?.reactions ?? [])
      // Maxsus (premium) emoji-reaksiyalar hozircha ko'rsatilmaydi
      .filter((r) => typeof r.emoji === "string")
      .map((r) => ({ emoji: r.emoji as string, count: r.count, chosen: r.order !== null })),
    forwardFrom: fwd ? fwd.sender.displayName || "Noma'lum" : null,
    viaBot: m.viaBot ? (m.viaBot.username ?? m.viaBot.displayName) : null,
    signature: m.signature,
    views: m.views,
    groupedId: m.groupedIdUnique,
    ...extras(m),
    keyboard: toKeyboard(m),
    mention: m.isMention,
  };
}

/** Chatlar ro'yxatidagi qisqa matn (media bo'lsa uning nomi). */
export function itemPreview(m: MessageItem): string {
  if (m.text) return m.text;
  if (m.poll) return `📊 ${m.poll.question}`;
  if (m.place) return "Joylashuv";
  if (m.contact) return "Kontakt";
  if (!m.media) return "";
  const labels: Record<MediaKind, string> = {
    photo: "Rasm", video: "Video", gif: "GIF", round: "Video xabar", voice: "Ovozli xabar",
    audio: "Audio", sticker: "Stiker", file: "Fayl",
  };
  return m.media.kind === "sticker" && m.media.fileName !== "stiker"
    ? `${m.media.fileName} Stiker`
    : labels[m.media.kind];
}
