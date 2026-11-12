import type { Message, TelegramClient, tl } from "@mtcute/web";
import { parseMarkdown, toTlEntities } from "../markdown";
import { buildRules, parseRules, type PrivacyState, type RawRule } from "../privacy";
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

export interface PeerHit {
  id: number;
  title: string;
  username: string | null;
  kind: ChatKind;
  /** Kanal/guruh a'zolari soni (ma'lum bo'lsa) */
  members: number | null;
  verified: boolean;
  /** Kanal yoki guruhga a'zomiz (foydalanuvchilar uchun doim true) */
  isMember: boolean;
  isContact: boolean;
  presence: Presence;
}

/** Kontaktlar va ommaviy foydalanuvchi/kanal/guruhlarni nom yoki @username bo'yicha qidiradi. */
export async function searchPublic(query: string, limit = 20): Promise<PeerHit[]> {
  const client = await getClient();
  const { PeersIndex, User, Chat } = await import("@mtcute/web");
  const res = await client.call({ _: "contacts.search", q: query.replace(/^@/, ""), limit });
  const peers = PeersIndex.from(res);
  const seen = new Set<number>();
  const out: PeerHit[] = [];
  for (const p of [...res.myResults, ...res.results]) {
    const raw = peers.get(p);
    const peer = raw._ === "user" || raw._ === "userEmpty" ? new User(raw) : new Chat(raw);
    if (seen.has(peer.id)) continue;
    seen.add(peer.id);
    rememberPeer(peer);
    const isUser = peer.type === "user";
    out.push({
      id: peer.id,
      title: peerTitle(peer),
      username: peer.username,
      kind: peerKind(peer),
      members: isUser ? null : peer.membersCount,
      verified: peer.isVerified,
      isMember: isUser ? true : peer.isMember,
      isContact: isUser && peer.isContact,
      presence: peerPresence(peer),
    });
  }
  return out;
}

// ---- O'z profilim ----

export interface MyProfile {
  id: number;
  firstName: string;
  lastName: string;
  bio: string;
  username: string | null;
  phone: string | null;
}

export async function loadMyProfile(): Promise<MyProfile> {
  const client = await getClient();
  const u = await client.getFullUser("me");
  rememberPeer(u);
  return {
    id: u.id, firstName: u.firstName, lastName: u.lastName ?? "", bio: u.bio,
    username: u.username, phone: u.phoneNumber,
  };
}

export async function updateMyProfile(p: { firstName: string; lastName: string; bio: string }): Promise<Me> {
  const client = await getClient();
  const u = await client.updateProfile(p);
  rememberPeer(u);
  return { id: u.id, name: peerTitle(u) };
}

/** Username bo'shmi (o'zimizniki ham "bo'sh" hisoblanadi). */
export async function checkUsername(username: string): Promise<boolean> {
  const client = await getClient();
  return client.call({ _: "account.checkUsername", username });
}

export async function setMyUsername(username: string): Promise<void> {
  const client = await getClient();
  rememberPeer(await client.setMyUsername(username || null));
}

export async function setMyPhoto(file: File): Promise<void> {
  const client = await getClient();
  await client.setMyProfilePhoto({ type: "photo", media: file });
  rememberPeer(await client.getUser("me"));
}

export async function removeMyPhoto(): Promise<void> {
  const client = await getClient();
  const [current] = await client.getProfilePhotos("me", { limit: 1 });
  if (current) await client.deleteProfilePhotos(current.fileId);
  rememberPeer(await client.getUser("me"));
}

// ---- Maxfiylik ----

/** tlKey — PRIVACY_KEYS dagi inputPrivacyKey* nomi */
export async function loadPrivacy(tlKey: string): Promise<PrivacyState> {
  const client = await getClient();
  const res = await client.call({ _: "account.getPrivacy", key: { _: tlKey } as tl.TypeInputPrivacyKey });
  return parseRules(res.rules as unknown as RawRule[]);
}

export async function savePrivacy(tlKey: string, state: PrivacyState): Promise<void> {
  const client = await getClient();
  const rules = await Promise.all(
    buildRules(state).map(async (r) =>
      r.users ? { _: r._, users: await Promise.all(r.users.map((id) => client.resolveUser(id))) } : r,
    ),
  );
  await client.call({
    _: "account.setPrivacy",
    key: { _: tlKey } as tl.TypeInputPrivacyKey,
    rules: rules as unknown as tl.TypeInputPrivacyRule[],
  });
}

// ---- Faol seanslar ----

export interface Session {
  /** Seans kaliti (Long → satr) */
  id: string;
  current: boolean;
  device: string;
  app: string;
  place: string;
  ip: string;
  /** ms */
  active: number;
  created: number;
  official: boolean;
}

const sessionHashes = new Map<string, tl.Long>();

export async function loadSessions(): Promise<Session[]> {
  const client = await getClient();
  const res = await client.call({ _: "account.getAuthorizations" });
  return res.authorizations
    .map((a) => {
      const id = a.hash.toString();
      sessionHashes.set(id, a.hash);
      return {
        id,
        current: !!a.current,
        device: [a.deviceModel, [a.platform, a.systemVersion].filter(Boolean).join(" ")].filter(Boolean).join(" · "),
        app: [a.appName, a.appVersion].filter(Boolean).join(" "),
        place: [a.region, a.country].filter(Boolean).join(", "),
        ip: a.ip,
        active: a.dateActive * 1000,
        created: a.dateCreated * 1000,
        official: !!a.officialApp,
      };
    })
    .sort((a, b) => Number(b.current) - Number(a.current) || b.active - a.active);
}

export async function terminateSession(id: string): Promise<void> {
  const hash = sessionHashes.get(id);
  if (!hash) throw new Error("Seans topilmadi");
  const client = await getClient();
  await client.call({ _: "account.resetAuthorization", hash });
}

/** Joriy seansdan boshqa hammasini tugatadi. */
export async function terminateOtherSessions(): Promise<void> {
  const client = await getClient();
  await client.call({ _: "auth.resetAuthorizations" });
}

// ---- Kontaktlar va yangi chatlar ----

export interface Contact {
  id: number;
  name: string;
  username: string | null;
  presence: Presence;
}

/** Kontaktlar: avval onlayn, keyin ism bo'yicha. */
export async function loadContacts(): Promise<Contact[]> {
  const client = await getClient();
  const users = await client.getContacts();
  const rank = (p: Presence) => (p === "online" ? 0 : p === "recently" ? 1 : 2);
  return users
    .filter((u) => !u.isDeleted)
    .map((u) => {
      rememberPeer(u);
      return { id: u.id, name: peerTitle(u), username: u.username, presence: peerPresence(u) };
    })
    .sort((a, b) => rank(a.presence) - rank(b.presence) || a.name.localeCompare(b.name));
}

/**
 * Yangi guruh (supergruppa) yaratadi va a'zolarni qo'shadi.
 * failed — maxfiylik sozlamalari tufayli qo'shib bo'lmagan foydalanuvchilar soni.
 */
export async function createGroup(title: string, userIds: number[]): Promise<{ id: number; failed: number }> {
  const client = await getClient();
  const chat = await client.createSupergroup({ title });
  rememberPeer(chat);
  let failed = 0;
  // Bittadan qo'shamiz: biri rad etsa qolganlari qo'shilaveradi
  for (const id of userIds) {
    try {
      await client.addChatMembers(chat.id, id, {});
    } catch {
      failed++;
    }
  }
  return { id: chat.id, failed };
}

export async function createChannel(title: string, description: string): Promise<number> {
  const client = await getClient();
  const chat = await client.createChannel({ title, description: description || undefined });
  rememberPeer(chat);
  return chat.id;
}

/** Ommaviy kanal yoki guruhga qo'shilish. */
export async function joinChat(chatId: number): Promise<void> {
  const client = await getClient();
  await client.joinChat(chatId);
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
async function formatted(source: string) {
  const { text, entities } = parseMarkdown(source);
  const list: tl.TypeMessageEntity[] = toTlEntities(entities);
  const mentions = entities.filter((e) => e.type === "mention_name" && e.userId);
  if (mentions.length) {
    const client = await getClient();
    for (const e of mentions) {
      try {
        const userId = await client.resolveUser(e.userId!);
        list.push({ _: "inputMessageEntityMentionName", offset: e.offset, length: e.length, userId });
      } catch {
        // Foydalanuvchi topilmasa ism oddiy matn bo'lib qoladi
      }
    }
    list.sort((a, b) => a.offset - b.offset);
  }
  return { text, entities: list };
}

/** schedule — kelajakdagi vaqt (ms) yoki "online" (suhbatdosh onlayn bo'lganda). */
export type Schedule = number | "online";

export async function sendText(
  chatId: number, text: string, replyTo?: number, silent = false, schedule?: Schedule,
): Promise<MessageItem> {
  const client = await getClient();
  const when = schedule === undefined ? undefined : schedule === "online" ? "online" : new Date(schedule);
  return item(await client.sendText(chatId, await formatted(text), { replyTo, silent, schedule: when }));
}

// ---- Rejalashtirilgan xabarlar ----

export async function loadScheduled(chatId: number): Promise<MessageItem[]> {
  const client = await getClient();
  const { Long, Message, PeersIndex } = await import("@mtcute/web");
  const res = await client.call({ _: "messages.getScheduledHistory", peer: await client.resolvePeer(chatId), hash: Long.ZERO });
  if (res._ === "messages.messagesNotModified") return [];
  const peers = PeersIndex.from(res);
  return res.messages
    .filter((m) => m._ === "message")
    .map((m) => item(new Message(m, peers, true)))
    .sort((a, b) => a.date - b.date);
}

export async function sendScheduledNow(chatId: number, ids: number[]): Promise<MessageItem[]> {
  const client = await getClient();
  return (await client.sendScheduled(chatId, ids)).map(item);
}

export async function deleteScheduled(chatId: number, ids: number[]): Promise<void> {
  const client = await getClient();
  await client.deleteScheduledMessages(chatId, ids);
}

export async function reschedule(chatId: number, messageId: number, when: number): Promise<MessageItem> {
  const client = await getClient();
  return item(await client.editMessage({ chatId, message: messageId, scheduleDate: new Date(when) }));
}

export async function editText(chatId: number, messageId: number, text: string): Promise<MessageItem> {
  const client = await getClient();
  return item(await client.editMessage({ chatId, message: messageId, text: await formatted(text) }));
}

// ---- Avtoto'ldirish ----

export interface MentionHit {
  id: number;
  name: string;
  username: string | null;
}

/** Guruhda eslatish uchun a'zolarni ism yoki username bo'yicha qidiradi. */
export async function searchMentions(chatId: number, query: string, limit = 20): Promise<MentionHit[]> {
  if (chatId > 0) return [];
  const client = await getClient();
  const res = await client.getChatMembers(chatId, { query, limit, type: query ? "all" : "recent" });
  const q = query.toLowerCase();
  return res
    .map((m) => {
      rememberPeer(m.user);
      return { id: m.user.id, name: peerTitle(m.user), username: m.user.username };
    })
    // Oddiy guruhlarda server query'ni hisobga olmaydi — mahalliy filtr
    .filter((m) => !q || m.name.toLowerCase().includes(q) || (m.username ?? "").toLowerCase().includes(q));
}

export interface BotCommand {
  command: string;
  description: string;
}

const botCommandsCache = new Map<number, Promise<BotCommand[]>>();

/** Chatdagi bot(lar) buyruqlari: bot bilan shaxsiy chat yoki guruhdagi botlar. */
export function loadBotCommands(chatId: number): Promise<BotCommand[]> {
  let p = botCommandsCache.get(chatId);
  if (!p) {
    p = (async () => {
      const client = await getClient();
      const lists: tl.TypeBotCommand[][] = [];
      if (chatId > 0) {
        const u = await client.getFullUser(chatId);
        const info = u.full.botInfo;
        if (info?.commands) lists.push(info.commands);
      } else {
        const c = await client.getFullChat(chatId);
        c.botInfo.forEach((b) => lists.push(b.commands));
      }
      const seen = new Set<string>();
      return lists.flat().filter((c) => !seen.has(c.command) && seen.add(c.command)).map((c) => ({
        command: c.command, description: c.description,
      }));
    })();
    botCommandsCache.set(chatId, p);
    p.catch(() => botCommandsCache.delete(chatId));
  }
  return p;
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

// ---- GIF ----

type DocumentObj = InstanceType<(typeof import("@mtcute/web"))["Document"]>;

const gifs = new Map<string, DocumentObj>();
const gifUrls = new Map<string, Promise<string>>();

export interface GifRef {
  key: string;
  width: number;
  height: number;
}

export interface GifPage {
  items: GifRef[];
  /** Keyingi sahifa uchun; null — boshqa natija yo'q */
  next: string | null;
}

async function toGifRefs(docs: tl.TypeDocument[]): Promise<GifRef[]> {
  const { Document } = await import("@mtcute/web");
  const out: GifRef[] = [];
  for (const raw of docs) {
    if (raw._ !== "document") continue;
    const doc = new Document(raw);
    const key = doc.uniqueFileId;
    gifs.set(key, doc);
    const size = raw.attributes.find((a) => a._ === "documentAttributeVideo" || a._ === "documentAttributeImageSize") as
      | { w: number; h: number }
      | undefined;
    out.push({ key, width: size?.w || 1, height: size?.h || 1 });
  }
  return out;
}

/** Saqlangan GIF'lar (so'rov bo'sh bo'lganda ko'rsatiladi). */
export async function loadSavedGifs(): Promise<GifRef[]> {
  const client = await getClient();
  const { Long } = await import("@mtcute/web");
  const res = await client.call({ _: "messages.getSavedGifs", hash: Long.ZERO });
  return res._ === "messages.savedGifs" ? toGifRefs(res.gifs) : [];
}

let gifBot: Promise<tl.TypeInputUser> | null = null;

/** GIF qidiruvi — Telegram'ning rasmiy @gif inline boti orqali. */
export async function searchGifs(chatId: number, query: string, offset = ""): Promise<GifPage> {
  const client = await getClient();
  if (!gifBot) {
    gifBot = client.resolveUser("gif");
    gifBot.catch(() => (gifBot = null));
  }
  const res = await client.call({
    _: "messages.getInlineBotResults",
    bot: await gifBot,
    peer: await client.resolvePeer(chatId),
    query,
    offset,
  });
  const docs = res.results.flatMap((r) => (r._ === "botInlineMediaResult" && r.document ? [r.document] : []));
  return { items: await toGifRefs(docs), next: res.nextOffset || null };
}

/** GIF videosi (mp4) uchun blob-URL. */
export function gifUrl(key: string): Promise<string> {
  let p = gifUrls.get(key);
  if (!p) {
    p = (async () => {
      const doc = gifs.get(key);
      if (!doc) throw new Error("GIF topilmadi");
      const client = await getClient();
      const bytes = await client.downloadAsBuffer(doc);
      return URL.createObjectURL(new Blob([bytes as BlobPart], { type: doc.mimeType || "video/mp4" }));
    })();
    gifUrls.set(key, p);
    p.catch(() => gifUrls.delete(key));
  }
  return p;
}

export async function sendGif(chatId: number, key: string, replyTo?: number): Promise<MessageItem> {
  const doc = gifs.get(key);
  if (!doc) throw new Error("GIF topilmadi");
  const client = await getClient();
  return item(await client.sendMedia(chatId, doc.inputMedia, { replyTo }));
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

/** Ovozli xabar (Ogg/Opus). */
export async function sendVoice(
  chatId: number,
  file: File,
  opts: { duration: number; waveform: number[]; replyTo?: number; onProgress?: (fraction: number) => void },
): Promise<MessageItem> {
  const client = await getClient();
  const { InputMedia } = await import("@mtcute/web");
  const media = InputMedia.voice(file, { duration: opts.duration, waveform: opts.waveform, fileMime: "audio/ogg" });
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

