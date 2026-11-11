"use client";

import { useEffect, useRef, useState } from "react";
import { formatDuration, formatSize } from "@/lib/messages";
import { mediaUrl, stickerAnimation } from "@/lib/telegram/media";
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

/** Element ekranga yaqinlashganda true bo'ladi — uzun chatda hamma media birdan yuklanmasin. */
function useVisible<T extends Element>() {
  const ref = useRef<T>(null);
  // IntersectionObserver bo'lmagan muhitda darhol ko'rinadi deb hisoblaymiz
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setVisible(true), {
      rootMargin: "400px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);
  return { ref, visible };
}

export function Lightbox({ items, start, onClose }: { items: MessageItem[]; start: number; onClose: () => void }) {
  const [index, setIndex] = useState(start);
  const msg = items[index];
  const isVideo = msg.media?.kind === "video";
  const full = useMediaUrl(msg, "full", true);
  const preview = useMediaUrl(msg, "preview", !isVideo);
  const url = full.url ?? preview.url;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(items.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, items.length]);

  const navButton = "absolute top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25";

  return (
    <div role="dialog" aria-modal="true" aria-label="Media ko'rgich" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <button className="absolute inset-0 cursor-default" aria-label="Yopish" tabIndex={-1} onClick={onClose} />
      {url && isVideo ? (
        <video key={url} src={url} controls autoPlay className="relative max-h-full max-w-full rounded-lg" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- blob URL
        url && <img src={url} alt="" className={`relative max-h-full max-w-full rounded-lg ${full.url ? "" : "blur-sm"}`} />
      )}
      {!url && !full.error && <p className="relative text-sm text-white/80">Yuklanmoqda…</p>}
      {full.error && <p className="absolute bottom-6 text-sm text-white">Yuklab bo&apos;lmadi</p>}
      <div className="absolute right-4 top-4 flex gap-2">
        {full.url && (
          <a href={full.url} download={msg.media?.fileName} aria-label="Saqlash" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
            <Icon name="download" />
          </a>
        )}
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Yopish" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      {items.length > 1 && (
        <>
          <span className="absolute left-1/2 top-5 -translate-x-1/2 text-sm text-white/80">{index + 1} / {items.length}</span>
          {index > 0 && (
            <button className={`${navButton} left-4`} aria-label="Oldingi" onClick={() => setIndex(index - 1)}>
              <Icon name="back" />
            </button>
          )}
          {index < items.length - 1 && (
            <button className={`${navButton} right-4 rotate-180`} aria-label="Keyingi" onClick={() => setIndex(index + 1)}>
              <Icon name="back" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** Rasm yoki video uchun kvadrat/to'rtburchak plitka (albom ichida ham ishlatiladi). */
export function MediaTile({ msg, onOpen, fill = false }: { msg: MessageItem; onOpen: () => void; fill?: boolean }) {
  const media = msg.media!;
  const { ref, visible } = useVisible<HTMLButtonElement>();
  const { url, error } = useMediaUrl(msg, "preview", visible);
  const [revealed, setRevealed] = useState(!media.spoiler);
  const ratio = media.width && media.height ? media.width / media.height : 4 / 3;
  const width = Math.min(340, Math.max(160, Math.round(280 * Math.min(ratio, 1.6))));
  return (
    <button
      ref={ref}
      className="relative block overflow-hidden rounded-xl bg-hover"
      style={fill ? { width: "100%", height: "100%" } : { width, aspectRatio: String(ratio), maxWidth: "100%" }}
      aria-label={revealed ? (media.kind === "video" ? "Videoni ochish" : "Rasmni ochish") : "Yashirin media — ochish"}
      onClick={() => (revealed ? onOpen() : setRevealed(true))}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- blob URL */}
      {url && <img src={url} alt="" className={`h-full w-full object-cover ${revealed ? "" : "scale-110 blur-xl"}`} />}
      {error && revealed && <span className="flex h-full items-center justify-center text-xs text-muted">Yuklanmadi</span>}
      {media.kind === "video" && revealed && (
        <>
          <span className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white">
            <Icon name="play" />
          </span>
          {media.duration !== null && (
            <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 text-xs text-white">{formatDuration(media.duration)}</span>
          )}
        </>
      )}
      {!revealed && <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white">Spoiler</span>}
    </button>
  );
}

/** GIF va dumaloq video: ko'rinsa avtomatik, ovozsiz takrorlanadi. */
function LoopVideo({ msg }: { msg: MessageItem }) {
  const media = msg.media!;
  const round = media.kind === "round";
  const { ref, visible } = useVisible<HTMLDivElement>();
  const full = useMediaUrl(msg, "full", visible);
  const preview = useMediaUrl(msg, "preview", visible && !full.url);
  const [muted, setMuted] = useState(true);
  const ratio = media.width && media.height ? media.width / media.height : 1;
  const style = round ? { width: 220, height: 220 } : { width: Math.min(320, Math.round(260 * Math.min(ratio, 1.6))), aspectRatio: String(ratio), maxWidth: "100%" };
  return (
    <div ref={ref} className={`relative overflow-hidden bg-hover ${round ? "rounded-full" : "rounded-xl"}`} style={style}>
      {full.url ? (
        <video
          src={full.url}
          autoPlay
          loop
          muted={muted}
          playsInline
          className="h-full w-full object-cover"
          onClick={() => round && setMuted((m) => !m)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- blob URL
        preview.url && <img src={preview.url} alt="" className="h-full w-full object-cover" />
      )}
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/50 px-2 text-xs text-white">
        {round ? (muted ? `${formatDuration(media.duration)} · 🔇` : formatDuration(media.duration)) : "GIF"}
      </span>
    </div>
  );
}

function AnimatedSticker({ msg, size }: { msg: MessageItem; size: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let destroyed = false;
    let anim: { destroy(): void } | null = null;
    (async () => {
      try {
        const [data, lottie] = await Promise.all([stickerAnimation(msg.chatId, msg.id), import("lottie-web")]);
        if (destroyed || !ref.current) return;
        anim = lottie.default.loadAnimation({
          container: ref.current, renderer: "svg", loop: true, autoplay: true, animationData: data,
        });
      } catch {
        if (!destroyed) setFailed(true);
      }
    })();
    return () => {
      destroyed = true;
      anim?.destroy();
    };
  }, [msg.chatId, msg.id]);
  if (failed) return <span className="text-6xl">{msg.media?.fileName}</span>;
  return <div ref={ref} style={{ width: size, height: size }} aria-label={`Stiker ${msg.media?.fileName ?? ""}`} />;
}

function Sticker({ msg }: { msg: MessageItem }) {
  const media = msg.media!;
  const size = 180;
  const { ref, visible } = useVisible<HTMLDivElement>();
  const isStatic = media.stickerFormat === "static";
  const full = useMediaUrl(msg, "full", visible && media.stickerFormat !== "animated");
  return (
    <div ref={ref} style={{ width: size, height: size }} className="flex items-center justify-center">
      {visible && media.stickerFormat === "animated" && <AnimatedSticker msg={msg} size={size} />}
      {full.url && isStatic && (
        // eslint-disable-next-line @next/next/no-img-element -- blob URL
        <img src={full.url} alt={`Stiker ${media.fileName}`} className="max-h-full max-w-full object-contain" />
      )}
      {full.url && media.stickerFormat === "video" && (
        <video src={full.url} autoPlay loop muted playsInline className="max-h-full max-w-full" aria-label={`Stiker ${media.fileName}`} />
      )}
      {full.error && <span className="text-6xl">{media.fileName}</span>}
    </div>
  );
}

/** Ovozli xabar: to'lqin shakli, ijro va siljitish. */
function VoicePlayer({ msg, outgoing }: { msg: MessageItem; outgoing: boolean }) {
  const media = msg.media!;
  const [wanted, setWanted] = useState(false);
  const { url, error } = useMediaUrl(msg, "full", wanted);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Ma'lumot kelgach o'zi ijro etiladi
  useEffect(() => {
    if (url && wanted) void audio.current?.play().catch(() => {});
  }, [url, wanted]);

  const bars = resample(media.waveform ?? [], 40);
  const toggle = () => {
    if (!url) return setWanted(true);
    const a = audio.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };

  return (
    <div className="flex items-center gap-3">
      <button
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-text hover:bg-accent-hover disabled:opacity-60"
        aria-label={playing ? "To'xtatish" : "Ijro etish"}
        disabled={wanted && !url && !error}
        onClick={toggle}
      >
        <Icon name={playing ? "pause" : "play"} />
      </button>
      <div className="min-w-0">
        <div
          className="flex h-7 cursor-pointer items-end gap-[2px]"
          role="slider"
          aria-label="Ovozli xabar holati"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          tabIndex={0}
          onClick={(e) => {
            const a = audio.current;
            if (!a || !a.duration) return;
            const r = e.currentTarget.getBoundingClientRect();
            a.currentTime = ((e.clientX - r.left) / r.width) * a.duration;
          }}
        >
          {bars.map((v, i) => (
            <span
              key={i}
              className={`w-[3px] rounded-full ${i / bars.length < progress ? "bg-accent" : outgoing ? "bg-accent/35" : "bg-muted/40"}`}
              style={{ height: `${Math.max(12, (v / 31) * 100)}%` }}
            />
          ))}
        </div>
        <p className="text-xs text-muted">
          {error ? "Yuklab bo'lmadi" : wanted && !url ? "Yuklanmoqda…" : formatDuration(media.duration)}
        </p>
      </div>
      {url && (
        <audio
          ref={audio}
          src={url}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setProgress(0);
          }}
          onTimeUpdate={(e) => setProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
        />
      )}
    </div>
  );
}

/** To'lqinni n ta ustunga keltiradi; ma'lumot yo'q bo'lsa tekis chiziq. */
export function resample(values: number[], n: number): number[] {
  if (values.length === 0) return Array(n).fill(4);
  return Array.from({ length: n }, (_, i) => {
    const from = Math.floor((i * values.length) / n);
    const to = Math.max(from + 1, Math.floor(((i + 1) * values.length) / n));
    const slice = values.slice(from, to);
    return Math.max(...slice);
  });
}

function FileCard({ msg }: { msg: MessageItem }) {
  const media = msg.media!;
  const [wanted, setWanted] = useState(false);
  const { url, error } = useMediaUrl(msg, "full", wanted);
  const playable = media.kind === "audio" || media.kind === "video";
  const meta = [formatDuration(media.duration), formatSize(media.size)].filter(Boolean).join(" · ");

  if (url && media.kind === "audio") {
    return (
      <div>
        <p className="mb-1 truncate text-sm font-medium">{media.fileName}</p>
        <audio src={url} controls autoPlay className="w-64 max-w-full" />
      </div>
    );
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

export function MediaView({ msg, onOpen }: { msg: MessageItem; onOpen: () => void }) {
  if (!msg.media) return null;
  switch (msg.media.kind) {
    case "photo":
    case "video":
      return <MediaTile msg={msg} onOpen={onOpen} />;
    case "gif":
    case "round":
      return <LoopVideo msg={msg} />;
    case "sticker":
      return <Sticker msg={msg} />;
    case "voice":
      return <VoicePlayer msg={msg} outgoing={msg.outgoing} />;
    default:
      return <FileCard msg={msg} />;
  }
}

/** Media "pufakchasiz" ko'rsatiladimi (stiker, dumaloq video). */
export const isBareMedia = (msg: MessageItem) =>
  !msg.text && (msg.media?.kind === "sticker" || msg.media?.kind === "round");

/** Media pufakcha chetigacha cho'ziladimi (rasm, video, GIF). */
export const isVisualMedia = (msg: MessageItem) =>
  msg.media?.kind === "photo" || msg.media?.kind === "video" || msg.media?.kind === "gif";
