import type { Message } from "@mtcute/web";
import { getClient } from "./client";

// Media obyektlari (mtcute) store'ga tushmaydi — shu registrda saqlanadi va kerak
// bo'lganda yuklab olinadi. Yuklangan fayllar xotirada blob-URL sifatida keshlanadi.

type Media = NonNullable<Message["media"]>;

const registry = new Map<string, Media>();
const urls = new Map<string, Promise<string>>();

const key = (chatId: number, msgId: number) => `${chatId}:${msgId}`;

export function rememberMedia(m: Message): void {
  if (m.media) registry.set(key(m.chat.id, m.id), m.media);
}

export function forgetChatMedia(chatId: number): void {
  const prefix = `${chatId}:`;
  for (const k of registry.keys()) if (k.startsWith(prefix)) registry.delete(k);
  for (const [k, p] of urls) {
    if (!k.startsWith(prefix)) continue;
    urls.delete(k);
    void p.then((u) => URL.revokeObjectURL(u)).catch(() => {});
  }
}

async function download(chatId: number, msgId: number, variant: "preview" | "full", mime: string): Promise<string> {
  const media = registry.get(key(chatId, msgId));
  if (!media) throw new Error("Media topilmadi");
  const client = await getClient();

  let location;
  if (media.type === "photo") {
    // preview: ~320px, full: eng kattasi
    const sized = [...media.thumbnails].filter((t) => t.width > 0).sort((a, b) => a.width - b.width);
    location = variant === "preview" ? (sized.find((t) => t.width >= 320) ?? sized.at(-1)) : sized.at(-1);
    mime = "image/jpeg";
  } else if (variant === "preview" && "thumbnails" in media) {
    location = [...media.thumbnails].filter((t) => t.width > 0).sort((a, b) => b.width - a.width)[0];
    mime = "image/jpeg";
  } else if (media.type === "video" || media.type === "document" || media.type === "audio" ||
             media.type === "voice" || media.type === "sticker") {
    location = media;
  }
  if (!location) throw new Error("Bu turdagi mediani yuklab bo'lmaydi");

  const bytes = await client.downloadAsBuffer(location);
  return URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
}

/** Blob-URL qaytaradi; bir xil so'rov qayta yuklanmaydi. */
export function mediaUrl(chatId: number, msgId: number, variant: "preview" | "full", mime: string): Promise<string> {
  const k = `${key(chatId, msgId)}:${variant}`;
  let p = urls.get(k);
  if (!p) {
    p = download(chatId, msgId, variant, mime);
    urls.set(k, p);
    // Xato bo'lsa keyingi urinishga yo'l ochamiz
    p.catch(() => urls.delete(k));
  }
  return p;
}
