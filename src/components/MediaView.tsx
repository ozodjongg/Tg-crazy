"use client";

import { useEffect, useState } from "react";
import { formatDuration, formatSize } from "@/lib/messages";
import { mediaUrl } from "@/lib/telegram/media";
import type { MessageItem } from "@/lib/telegram/types";
import { Icon } from "./Icon";

/** Blob-URL ni yuklaydi. enabled=false bo'lsa kutadi (talab bo'yicha yuklash). */
function useMediaUrl(msg: MessageItem, variant: "preview" | "full", enabled: boolean) {
  const [state, setState] = useState<{ url: string | null; error: boolean }>({ url: null, error: false });
  const mime = msg.media?.mime ?? "application/octet-stream";
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    mediaUrl(msg.chatId, msg.id, variant, mime).then(
      (url) => alive && setState({ url, error: false }),
      () => alive && setState({ url: null, error: true }),
    );
    return () => {
      alive = false;
    };
  }, [msg.chatId, msg.id, variant, mime, enabled]);
  return state;
}

function Lightbox({ msg, onClose }: { msg: MessageItem; onClose: () => void }) {
  const full = useMediaUrl(msg, "full", true);
  const preview = useMediaUrl(msg, "preview", true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const url = full.url ?? preview.url;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rasm"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- blob URL, optimizatsiya qo'llanmaydi */}
      {url && <img src={url} alt="" className={`max-h-full max-w-full rounded-lg ${full.url ? "" : "blur-sm"}`} />}
      {full.error && <p className="absolute bottom-6 text-sm text-white">Rasmni yuklab bo&apos;lmadi</p>}
      <button
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
        aria-label="Yopish"
      >
        <Icon name="close" />
      </button>
    </div>
  );
}

function Photo({ msg }: { msg: MessageItem }) {
  const [open, setOpen] = useState(false);
  const { url, error } = useMediaUrl(msg, "preview", true);
  const media = msg.media!;
  // Yuklanguncha joy egallab turadi — ro'yxat sakramaydi
  const ratio = media.width && media.height ? media.width / media.height : 4 / 3;
  const width = Math.min(320, Math.max(160, Math.round(260 * Math.min(ratio, 1.6))));
  return (
    <>
      <button
        className="block overflow-hidden rounded-xl bg-hover"
        style={{ width, aspectRatio: String(ratio), maxWidth: "100%" }}
        aria-label={media.kind === "sticker" ? "Stiker" : "Rasmni ochish"}
        onClick={() => setOpen(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- blob URL */}
        {url && <img src={url} alt="" className="h-full w-full object-cover" />}
        {error && <span className="flex h-full items-center justify-center text-xs text-muted">Yuklanmadi</span>}
      </button>
      {open && <Lightbox msg={msg} onClose={() => setOpen(false)} />}
    </>
  );
}

function FileCard({ msg }: { msg: MessageItem }) {
  const media = msg.media!;
  const [wanted, setWanted] = useState(false);
  const { url, error } = useMediaUrl(msg, "full", wanted);
  const playable = media.kind === "voice" || media.kind === "audio" || media.kind === "video";
  const meta = [formatDuration(media.duration), formatSize(media.size)].filter(Boolean).join(" · ");

  if (url && media.kind === "video") {
    return <video src={url} controls className="max-h-80 max-w-full rounded-xl" />;
  }
  if (url && (media.kind === "voice" || media.kind === "audio")) {
    return <audio src={url} controls className="w-64 max-w-full" />;
  }

  return (
    <div className="flex items-center gap-3">
      {url ? (
        <a
          href={url}
          download={media.fileName}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-text hover:bg-accent-hover"
          aria-label={`${media.fileName} — saqlash`}
        >
          <Icon name="download" />
        </a>
      ) : (
        <button
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-text hover:bg-accent-hover disabled:opacity-60"
          disabled={wanted && !error}
          aria-label={playable ? `${media.fileName} — ijro etish` : `${media.fileName} — yuklab olish`}
          onClick={() => setWanted(true)}
        >
          <Icon name={playable ? "play" : "file"} />
        </button>
      )}
      <div className="min-w-0">
        <p className="truncate font-medium">{media.fileName}</p>
        <p className="text-xs text-muted">
          {error ? "Yuklab bo'lmadi" : wanted && !url ? "Yuklanmoqda…" : url ? "Saqlash uchun bosing" : meta}
        </p>
      </div>
    </div>
  );
}

export function MediaView({ msg }: { msg: MessageItem }) {
  if (!msg.media) return null;
  return msg.media.kind === "photo" || msg.media.kind === "sticker" ? <Photo msg={msg} /> : <FileCard msg={msg} />;
}
