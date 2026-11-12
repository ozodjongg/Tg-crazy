// Tg-crazy backend bilan ishlash. Backend ixtiyoriy: NEXT_PUBLIC_API_URL bo'lmasa
// bu bo'lim o'chiq va messenjer o'zi ishlayveradi.
//
// Bu yerga Telegram sessiyasi yoki yozishmalar yuborilmaydi — faqat foydalanuvchi
// AI uchun o'zi tanlagan matn va Tg-crazy sozlamalari.

import { activeSlot, slotKey } from "../telegram/accounts";

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
// Xizmatlarga ulanish har bir Telegram akkaunti uchun alohida
const refreshKey = () => slotKey("tg-crazy:refresh", activeSlot());

export const backendEnabled = BASE !== "";

export class BackendError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public body: unknown = null,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;

function storedRefresh(): string | null {
  try {
    return localStorage.getItem(refreshKey());
  } catch {
    return null;
  }
}

function storeTokens(access: string | null, refresh: string | null) {
  accessToken = access;
  try {
    if (refresh) localStorage.setItem(refreshKey(), refresh);
    else localStorage.removeItem(refreshKey());
  } catch {
    // Saqlab bo'lmasa — ulanish faqat shu seansda amal qiladi
  }
}

async function raw(method: string, path: string, body?: unknown, token?: string | null): Promise<Response> {
  try {
    return await fetch(BASE + path, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new BackendError(0, "network", "Tg-crazy serveriga ulanib bo'lmadi");
  }
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // JSON bo'lmagan javob — pastda umumiy xato
  }
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new BackendError(res.status, err?.code ?? "http", err?.message ?? `Server xatosi (${res.status})`, data);
  }
  return data as T;
}

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

/** Refresh token bilan yangi juftlik oladi. Parallel chaqiruvlar bitta so'rovga birlashadi. */
function refresh(): Promise<boolean> {
  refreshing ??= (async () => {
    const token = storedRefresh();
    if (!token) return false;
    try {
      const pair = await parse<TokenPair>(await raw("POST", "/v1/auth/refresh", { refresh_token: token }));
      storeTokens(pair.access_token, pair.refresh_token);
      return true;
    } catch (err) {
      // Faqat server "yaroqsiz" desa unutamiz; tarmoq xatosida token saqlanib qoladi
      if (err instanceof BackendError && err.status === 401) storeTokens(null, null);
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function authed<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!accessToken && !(await refresh())) throw new BackendError(401, "unauthorized", "Xizmatlarga ulanmagansiz");
  let res = await raw(method, path, body, accessToken);
  if (res.status === 401 && (await refresh())) res = await raw(method, path, body, accessToken);
  return parse<T>(res);
}

// ---- Ulanish ----

export interface AuthStart {
  nonce: string;
  secret: string;
  bot_username: string;
  expires_in: number;
}

export const hasSavedSession = () => storedRefresh() !== null;

export async function health(): Promise<{ auth: boolean; ai: boolean }> {
  return parse(await raw("GET", "/healthz"));
}

export async function authStart(): Promise<AuthStart> {
  return parse(await raw("POST", "/v1/auth/start"));
}

/** true — ulandi; false — bot hali tasdiqlamagan. */
export async function authComplete(nonce: string, secret: string): Promise<boolean> {
  const res = await raw("POST", "/v1/auth/complete", { nonce, secret });
  if (res.status === 202) return false;
  const pair = await parse<TokenPair>(res);
  storeTokens(pair.access_token, pair.refresh_token);
  return true;
}

export async function logout(): Promise<void> {
  const token = storedRefresh();
  storeTokens(null, null);
  if (token) await raw("POST", "/v1/auth/logout", { refresh_token: token }).catch(() => {});
}

// ---- Profil va sozlamalar ----

export interface AiQuota {
  used: number;
  limit: number;
}

export interface Profile {
  user: { tg_id: number; first_name: string };
  subscription: { plan: { id: string; name: string; daily_ai_limit: number }; expires_at: string | null };
  ai: AiQuota;
  ai_enabled: boolean;
}

export const getProfile = () => authed<Profile>("GET", "/v1/me");

export interface RemoteSettings<T> {
  data: Partial<T>;
  version: number;
}

export const getSettings = <T>() => authed<RemoteSettings<T>>("GET", "/v1/settings");

/** Ziddiyat (409) bo'lsa serverdagi amaldagi holatni qaytaradi — chaqiruvchi uni qabul qiladi. */
export async function putSettings<T>(data: T, version: number): Promise<{ saved: boolean; current: RemoteSettings<T> }> {
  try {
    return { saved: true, current: await authed<RemoteSettings<T>>("PUT", "/v1/settings", { data, version }) };
  } catch (err) {
    if (err instanceof BackendError && err.status === 409) {
      const current = (err.body as { current?: RemoteSettings<T> } | null)?.current;
      if (current) return { saved: false, current };
    }
    throw err;
  }
}

// ---- AI ----

export interface AiMessage {
  sender: string;
  text: string;
  mine: boolean;
}

export interface AiResult {
  text: string;
  ai: AiQuota;
}

export type AiLang = "uz" | "uz-cyrl" | "ru" | "en";

export const aiSummarize = (messages: AiMessage[], lang: AiLang) =>
  authed<AiResult>("POST", "/v1/ai/summarize", { messages, lang });

export const aiTranslate = (text: string, lang: AiLang) =>
  authed<AiResult>("POST", "/v1/ai/translate", { text, lang });

export const aiReplyDraft = (messages: AiMessage[], hint: string, lang: AiLang) =>
  authed<AiResult>("POST", "/v1/ai/reply-draft", { messages, hint, lang });
