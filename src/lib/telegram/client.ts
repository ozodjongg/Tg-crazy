import type { TelegramClient } from "@mtcute/web";

const API_ID = Number(process.env.NEXT_PUBLIC_TG_API_ID ?? "");
const API_HASH = process.env.NEXT_PUBLIC_TG_API_HASH ?? "";

export function hasCredentials(): boolean {
  return Number.isInteger(API_ID) && API_ID > 0 && API_HASH.length > 0;
}

let clientPromise: Promise<TelegramClient> | null = null;

/**
 * Yagona klient. Faqat brauzerda yaratiladi; sessiya IndexedDB'da saqlanadi
 * va to'g'ridan-to'g'ri Telegram serverlariga ulanadi — oraliq serverimiz yo'q.
 */
export function getClient(): Promise<TelegramClient> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Telegram klienti faqat brauzerda ishlaydi"));
  }
  // Faqat ishlab chiqishda: brauzer sinovlari soxta klient bera oladi (production'da bu blok yo'q)
  if (process.env.NODE_ENV !== "production") {
    const mock = (window as unknown as { __tgMockClient?: TelegramClient }).__tgMockClient;
    if (mock) return Promise.resolve(mock);
  }
  if (!hasCredentials()) {
    return Promise.reject(new Error("API_ID / API_HASH sozlanmagan"));
  }
  clientPromise ??= import("@mtcute/web").then(
    ({ TelegramClient }) =>
      new TelegramClient({
        apiId: API_ID,
        apiHash: API_HASH,
        storage: "tg-crazy",
      }),
  );
  return clientPromise;
}
