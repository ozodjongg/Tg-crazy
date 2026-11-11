import type { Message } from "@mtcute/web";
import { getClient } from "./client";
import { isRpcError } from "./errors";
import { toChatItem, toMessageItem, peerKind, peerTitle, type ChatItem, type ChatKind, type Me, type MessageItem } from "./types";

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

// ---- Chatlar va xabarlar ----

export async function loadChats(limit = 100): Promise<ChatItem[]> {
  const client = await getClient();
  const chats: ChatItem[] = [];
  for await (const dialog of client.iterDialogs({ limit })) {
    chats.push(toChatItem(dialog));
  }
  return chats;
}

/** Eng so'nggi xabarlar, eskidan yangiga tartibda. */
export async function loadHistory(chatId: number, limit = 50): Promise<MessageItem[]> {
  const client = await getClient();
  const messages = await client.getHistory(chatId, { limit });
  return messages.map(toMessageItem).reverse();
}

export async function sendText(chatId: number, text: string): Promise<MessageItem> {
  const client = await getClient();
  return toMessageItem(await client.sendText(chatId, text));
}

/**
 * Chat ochilganda o'qilgan deb belgilaydi. Bu ataylab doim yoqilgan:
 * o'qilganlik holatini yashirish ("ghost mode") Telegram API shartlariga zid.
 */
export async function markRead(chatId: number): Promise<void> {
  const client = await getClient();
  await client.readHistory(chatId);
}

export async function onNewMessage(handler: (msg: MessageItem, chat: { title: string; kind: ChatKind }) => void): Promise<() => void> {
  const client = await getClient();
  const listener = (m: Message) => handler(toMessageItem(m), { title: peerTitle(m.chat), kind: peerKind(m.chat) });
  client.onNewMessage.add(listener);
  return () => client.onNewMessage.remove(listener);
}
