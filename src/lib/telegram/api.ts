import type { Message, TelegramClient } from "@mtcute/web";
import { parseMarkdown, toTlEntities } from "../markdown";
import { getClient } from "./client";
import { isRpcError } from "./errors";
import { rememberMedia, rememberPeer } from "./media";
import {
  fromBase64, toChatItem, toMessageItem, toPollInfo, peerKind, peerPresence, peerTitle,
  type ChatItem, type ChatKind, type Me, type MessageItem, type PollInfo, type Presence,
} from "./types";

function item(m: Message): MessageItem {
  rememberMedia(m);
  rememberPeer(m.sender);
  return toMessageItem(m);
}

// ---- Kirish ----

/** Saqlangan sessiya bo'lsa foydalanuvchini qaytaradi, bo'lmasa null. */
export async function restoreSession(): Promise<Me | null> {
  const client = await getClient();
  try {
    await client.connect();
    const me = await client.getMe();
    await client.startUpdatesLoop();
    return { id: me.id, name: peerTitle(me) };
  } catch (err) {
    if (isRpcError(err, "AUTH_KEY_UNREGISTERED") || isUnauthorized(err)) return null;
    throw err;
  }
}

function isUnauthorized(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === 401;
}

export type SendCodeResult = { done: true; me: Me } | { done: false; phoneCodeHash: string };

export async function sendCode(phone: string): Promise<SendCodeResult> {
  const client = await getClient();
  const res = await client.sendCode({ phone });
  if ("phoneCodeHash" in res) return { done: false, phoneCodeHash: res.phoneCodeHash };
  await client.startUpdatesLoop();
  return { done: true, me: { id: res.id, name: peerTitle(res) } };
}

export type SignInResult = { needPassword: true } | { needPassword: false; me: Me };

export async function signIn(phone: string, phoneCodeHash: string, phoneCode: string): Promise<SignInResult> {
  const client = await getClient();
  try {
    const user = await client.signIn({ phone, phoneCodeHash, phoneCode });
    await client.startUpdatesLoop();
    return { needPassword: false, me: { id: user.id, name: peerTitle(user) } };
  } catch (err) {
    if (isRpcError(err, "SESSION_PASSWORD_NEEDED")) return { needPassword: true };
    throw err;
  }
}

export async function checkPassword(password: string): Promise<Me> {
  const client = await getClient();
  const user = await client.checkPassword(password);
  await client.startUpdatesLoop();
  return { id: user.id, name: peerTitle(user) };
}

export async function logOut(): Promise<void> {
  const client = await getClient();
  await client.logOut();
}

// ---- Chatlar ----

export async function loadChats(limit = 200): Promise<ChatItem[]> {
  const client = await getClient();
  const chats: ChatItem[] = [];
  for await (const dialog of client.iterDialogs({ limit })) {
    rememberPeer(dialog.peer);
    chats.push(toChatItem(dialog));
  }
  return chats;
}

/** Telegram'dagi papka qoidalari (dialogFilter) — sodda ko'rinishda. */
export interface FolderRule {
  id: number;
  title: string;
  contacts: boolean;
  nonContacts: boolean;
  groups: boolean;
  channels: boolean;
  bots: boolean;
  excludeMuted: boolean;
  excludeRead: boolean;
  excludeArchived: boolean;
  include: number[];
  exclude: number[];
}

export async function loadFolders(): Promise<FolderRule[]> {
  const client = await getClient();
  const { getMarkedPeerId } = await import("@mtcute/web");
  const res = await client.getFolders();
  const out: FolderRule[] = [];
  for (const f of res.filters) {
    if (f._ !== "dialogFilter") continue; // "Hammasi" va ulashilgan papkalar (chatlist) hozircha yo'q
    const ids = (peers: typeof f.includePeers) =>
      peers.flatMap((p) => (p._ === "inputPeerEmpty" || p._ === "inputPeerSelf" ? [] : [getMarkedPeerId(p)]));
    out.push({
      id: f.id,
      title: f.title.text,
      contacts: !!f.contacts,
      nonContacts: !!f.nonContacts,
      groups: !!f.groups,
      channels: !!f.broadcasts,
      bots: !!f.bots,
      excludeMuted: !!f.excludeMuted,
      excludeRead: !!f.excludeRead,
      excludeArchived: !!f.excludeArchived,
      include: [...ids(f.pinnedPeers), ...ids(f.includePeers)],
      exclude: ids(f.excludePeers),
    });
  }
  return out;
}

// ---- Chat amallari ----

export async function setPinned(chatId: number, pinned: boolean): Promise<void> {
  const client = await getClient();
  const peer = await client.resolvePeer(chatId);
  await client.call({ _: "messages.toggleDialogPin", pinned, peer: { _: "inputDialogPeer", peer } });
}

/** Ovozsiz qilish (muddatsiz) yoki yoqish. */
export async function setMuted(chatId: number, muted: boolean): Promise<void> {
  const client = await getClient();
  const peer = await client.resolvePeer(chatId);
  await client.call({
    _: "account.updateNotifySettings",
    peer: { _: "inputNotifyPeer", peer },
    // 2^31-1 — Telegram'da "doimiy" ovozsiz
    settings: { _: "inputPeerNotifySettings", muteUntil: muted ? 2147483647 : 0 },
  });
}

export async function setArchived(chatId: number, archived: boolean): Promise<void> {
  const client = await getClient();
  if (archived) await client.archiveChats(chatId);
  else await client.unarchiveChats(chatId);
}

export async function markUnread(chatId: number): Promise<void> {
  const client = await getClient();
  await client.markChatUnread(chatId);
}

/** Shaxsiy chat — tarix o'chiriladi (revoke: ikkala tomonda); guruh/kanal — tark etiladi. */
export async function deleteChat(chatId: number, revoke: boolean): Promise<void> {
  const client = await getClient();
  if (chatId > 0) await client.deleteHistory(chatId, { mode: revoke ? "revoke" : "delete" });
  else await client.leaveChat(chatId, { clear: true });
}

// ---- Xabarlar ----

export const PAGE_SIZE = 50;

export interface HistoryCursor {
  id: number;
  /** Soniyalarda (Telegram formati) */
  date: number;
}

/** Xabarlar sahifasi, eskidan yangiga. before berilmasa — eng so'nggilari. */
export async function loadHistory(chatId: number, before?: HistoryCursor): Promise<MessageItem[]> {
  const client = await getClient();
  const messages = await client.getHistory(chatId, { limit: PAGE_SIZE, offset: before });
  return messages.map(item).reverse();
}

/** Berilgan xabar atrofidagi sahifa (unga o'tish uchun), eskidan yangiga. */
export async function loadAround(chatId: number, messageId: number): Promise<MessageItem[]> {
  const client = await getClient();
  const half = Math.floor(PAGE_SIZE / 2);
  const messages = await client.getHistory(chatId, {
    limit: PAGE_SIZE, offset: { id: messageId + 1, date: 0 }, addOffset: -half,
  });
  return messages.map(item).reverse();
}

/** newestId dan keyingi (yangiroq) xabarlar, eskidan yangiga. */
export async function loadNewer(chatId: number, newestId: number): Promise<MessageItem[]> {
  const client = await getClient();
  const messages = await client.getHistory(chatId, {
    limit: PAGE_SIZE, offset: { id: newestId + 1, date: 0 }, addOffset: -PAGE_SIZE,
  });
  return messages.map(item).filter((m) => m.id > newestId).sort((a, b) => a.id - b.id);
}

export type SharedKind = "media" | "files" | "links" | "voice" | "pinned";

const FILTERS = {
  media: { _: "inputMessagesFilterPhotoVideo" },
  files: { _: "inputMessagesFilterDocument" },
  links: { _: "inputMessagesFilterUrl" },
  voice: { _: "inputMessagesFilterRoundVoice" },
  pinned: { _: "inputMessagesFilterPinned" },
} as const;

/** Chatdagi umumiy media/fayl/havolalar yoki qadalgan xabarlar (yangidan eskiga). */
export async function loadShared(chatId: number, kind: SharedKind, limit = 60): Promise<MessageItem[]> {
  const client = await getClient();
  const res = await client.searchMessages({ chatId, filter: FILTERS[kind], limit });
  return res.map(item);
}

/** Chat ichida matn bo'yicha qidiruv (yangidan eskiga). */
export async function searchInChat(chatId: number, query: string, limit = 50): Promise<MessageItem[]> {
  const client = await getClient();
  const res = await client.searchMessages({ chatId, query, limit });
  return res.map(item);
}

export interface GlobalHit {
  msg: MessageItem;
  chatTitle: string;
}

/** Barcha chatlardagi xabarlar bo'yicha qidiruv (yangidan eskiga). */
export async function searchGlobal(query: string, limit = 40): Promise<GlobalHit[]> {
  const client = await getClient();
  const res = await client.searchGlobal({ query, limit });
  return res.map((m) => {
    rememberPeer(m.chat);
    return { msg: item(m), chatTitle: peerTitle(m.chat) };
  });
}

export interface Profile {
  bio: string;
  username: string | null;
  phone: string | null;
  members: number | null;
  online: number | null;
}

export async function loadProfile(chatId: number): Promise<Profile> {
  const client = await getClient();
  if (chatId > 0) {
    const u = await client.getFullUser(chatId);
    rememberPeer(u);
    return { bio: u.bio, username: u.username, phone: u.phoneNumber, members: null, online: null };
  }
  const c = await client.getFullChat(chatId);
  rememberPeer(c);
  return { bio: c.bio, username: c.username, phone: null, members: c.membersCount || null, online: c.onlineCount || null };
}

export interface Member {
  id: number;
  name: string;
  role: "creator" | "admin" | "member";
  presence: Presence;
}

export async function loadMembers(chatId: number, limit = 100): Promise<Member[]> {
  const client = await getClient();
  const res = await client.getChatMembers(chatId, { limit, type: "recent" });
  return res.map((m) => {
    rememberPeer(m.user);
    const role = m.status === "creator" || m.status === "admin" ? m.status : "member";
    return { id: m.user.id, name: peerTitle(m.user), role, presence: peerPresence(m.user) };
  });
}

/** Qoralamani Telegram'da saqlaydi (boshqa qurilmalarda ham ko'rinadi); bo'sh matn — o'chiradi. */
export async function saveDraft(chatId: number, text: string): Promise<void> {
  const client = await getClient();
  await client.saveDraft(chatId, text.trim() ? { message: text } : null);
}

/** Belgilashli matn (**qalin** va h.k.) Telegram formatiga o'giriladi. */
function formatted(source: string) {
  const { text, entities } = parseMarkdown(source);
  return { text, entities: toTlEntities(entities) };
}

export async function sendText(chatId: number, text: string, replyTo?: number, silent = false): Promise<MessageItem> {
  const client = await getClient();
  return item(await client.sendText(chatId, formatted(text), { replyTo, silent }));
}

export async function editText(chatId: number, messageId: number, text: string): Promise<MessageItem> {
  const client = await getClient();
  return item(await client.editMessage({ chatId, message: messageId, text: formatted(text) }));
}

// ---- Stikerlar ----

type StickerSetObj = Awaited<ReturnType<TelegramClient["getInstalledStickers"]>>[number];
type StickerObj = StickerSetObj["stickers"][number]["sticker"];

const stickerSets: StickerSetObj[] = [];
const stickers = new Map<string, StickerObj>();
const stickerThumbs = new Map<string, Promise<string>>();

export interface StickerSetInfo {
  index: number;
  title: string;
}

export interface StickerRef {
  key: string;
  emoji: string;
}

export async function loadStickerSets(): Promise<StickerSetInfo[]> {
  const client = await getClient();
  const sets = await client.getInstalledStickers();
  stickerSets.splice(0, stickerSets.length, ...sets);
  return sets.map((s, index) => ({ index, title: s.title }));
}

export async function loadStickerSet(index: number): Promise<StickerRef[]> {
  const client = await getClient();
  const brief = stickerSets[index];
  if (!brief) return [];
  const full = await client.getStickerSet(brief.inputStickerSet);
  return full.stickers.map((s, i) => {
    const key = `${index}:${i}`;
    stickers.set(key, s.sticker);
    return { key, emoji: s.alt };
  });
}

/** Stikerning kichik rasmi (animatsiyalilari uchun — statik eskiz). */
export function stickerThumb(key: string): Promise<string> {
  let p = stickerThumbs.get(key);
  if (!p) {
    p = (async () => {
      const s = stickers.get(key);
      if (!s) throw new Error("Stiker topilmadi");
      const client = await getClient();
      const thumb = [...s.thumbnails].filter((t) => t.width > 0).sort((a, b) => b.width - a.width)[0];
      const isStatic = s.sourceType === "static";
      const bytes = await client.downloadAsBuffer(isStatic || !thumb ? s : thumb);
      return URL.createObjectURL(new Blob([bytes as BlobPart], { type: isStatic ? "image/webp" : "image/jpeg" }));
    })();
    stickerThumbs.set(key, p);
    p.catch(() => stickerThumbs.delete(key));
  }
  return p;
}

export async function sendSticker(chatId: number, key: string, replyTo?: number): Promise<MessageItem> {
  const s = stickers.get(key);
  if (!s) throw new Error("Stiker topilmadi");
  const client = await getClient();
  return item(await client.sendMedia(chatId, s.inputMedia, { replyTo }));
}

/** revoke=true — hamma uchun o'chiradi. */
export async function deleteMessages(chatId: number, ids: number[], revoke: boolean): Promise<void> {
  const client = await getClient();
  await client.deleteMessagesById(chatId, ids, { revoke });
}

export async function forwardMessages(fromChatId: number, ids: number[], toChatId: number): Promise<MessageItem[]> {
  const client = await getClient();
  const sent = await client.forwardMessagesById({ fromChatId, messages: ids, toChatId });
  return sent.map(item);
}

/** emoji=null — reaksiyani olib tashlaydi. */
export async function setReaction(chatId: number, messageId: number, emoji: string | null): Promise<MessageItem | null> {
  const client = await getClient();
  const res = await client.sendReaction({ chatId, message: messageId, emoji });
  return res ? item(res) : null;
}

export async function sendFile(
  chatId: number,
  file: File,
  opts: { caption?: string; replyTo?: number; onProgress?: (fraction: number) => void } = {},
): Promise<MessageItem> {
  const client = await getClient();
  const { InputMedia } = await import("@mtcute/web");
  const media = InputMedia.auto(file, { caption: opts.caption || undefined, fileName: file.name });
  const sent = await client.sendMedia(chatId, media, {
    replyTo: opts.replyTo,
    progressCallback: (done, total) => opts.onProgress?.(total > 0 ? done / total : 0),
  });
  return item(sent);
}

/** So'rovnomada ovoz berish; answers bo'sh bo'lsa ovoz qaytarib olinadi. */
export async function votePoll(chatId: number, messageId: number, answers: string[]): Promise<PollInfo> {
  const client = await getClient();
  const poll = await client.sendVote({
    chatId, message: messageId, options: answers.length ? answers.map(fromBase64) : null,
  });
  return toPollInfo(poll);
}

/** Bot tugmasi bosilganda: botning qisqa javobi (bo'lsa) va ochiladigan havola. */
export async function pressButton(
  chatId: number, messageId: number, data: string,
): Promise<{ text: string; alert: boolean; url: string | null }> {
  const client = await getClient();
  const res = await client.getCallbackAnswer({ chatId, message: messageId, data: fromBase64(data), timeout: 15 });
  return { text: res.message ?? "", alert: !!res.alert, url: res.url ?? null };
}

/**
 * Chat ochilganda o'qilgan deb belgilaydi. Bu ataylab doim yoqilgan:
 * o'qilganlik holatini yashirish ("ghost mode") Telegram API shartlariga zid.
 */
export async function markRead(chatId: number): Promise<void> {
  const client = await getClient();
  await client.readHistory(chatId);
}

/** "Yozmoqda…" holati. Yashirish imkoniyati ataylab yo'q (API shartlari). */
export async function sendTyping(chatId: number): Promise<void> {
  const client = await getClient();
  await client.sendTyping(chatId, "typing");
}

/** Tg-crazy xizmatlariga ulanish: foydalanuvchi roziligidan keyin botga tasdiqlash kodi yuboriladi. */
export async function sendBotStart(botUsername: string, nonce: string): Promise<void> {
  const client = await getClient();
  await client.sendText(botUsername, `/start ${nonce}`);
}

// ---- Yangilanishlar ----

export interface UpdateHandlers {
  onMessage(msg: MessageItem, chat: { title: string; kind: ChatKind }): void;
  onEdit(msg: MessageItem): void;
  /** channelId=null — shaxsiy chat va oddiy guruhlar (ID lar umumiy) */
  onDelete(ids: number[], channelId: number | null): void;
  onReadOutbox(chatId: number, maxId: number): void;
  onTyping(chatId: number, userId: number, active: boolean): void;
  onPresence(userId: number, presence: Presence): void;
}

export async function subscribe(h: UpdateHandlers): Promise<() => void> {
  const client: TelegramClient = await getClient();
  const { getMarkedPeerId } = await import("@mtcute/web");

  const newMessage = (m: Message) => h.onMessage(item(m), { title: peerTitle(m.chat), kind: peerKind(m.chat) });
  const edit = (m: Message) => h.onEdit(item(m));
  const del = (u: { messageIds: number[]; channelId: number | null }) =>
    h.onDelete(u.messageIds, u.channelId === null ? null : getMarkedPeerId(u.channelId, "channel"));
  const read = (u: { isOutbox: boolean; chatId: number; maxReadId: number }) => {
    if (u.isOutbox) h.onReadOutbox(u.chatId, u.maxReadId);
  };
  const typing = (u: { chatId: number; userId: number; status: string }) =>
    h.onTyping(u.chatId, u.userId, u.status !== "cancel");
  const status = (u: { userId: number; status: string }) =>
    h.onPresence(u.userId, u.status === "online" ? "online" : u.status === "recently" ? "recently" : "offline");

  client.onNewMessage.add(newMessage);
  client.onEditMessage.add(edit);
  client.onDeleteMessage.add(del);
  client.onHistoryRead.add(read);
  client.onUserTyping.add(typing);
  client.onUserStatusUpdate.add(status);
  return () => {
    client.onNewMessage.remove(newMessage);
    client.onEditMessage.remove(edit);
    client.onDeleteMessage.remove(del);
    client.onHistoryRead.remove(read);
    client.onUserTyping.remove(typing);
    client.onUserStatusUpdate.remove(status);
  };
}

