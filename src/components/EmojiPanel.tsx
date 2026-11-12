"use client";

import { useEffect, useRef, useState } from "react";
import { EMOJI_GROUPS, recentEmoji, rememberEmoji, searchEmoji } from "@/lib/emoji";
import * as tg from "@/lib/telegram/api";
import { useApp } from "@/store/app";
import { Icon } from "./Icon";
import { IosSticker } from "./IosSticker";

function StickerCell({ sticker, onPick }: { sticker: tg.StickerRef; onPick: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    tg.stickerThumb(sticker.key).then((u) => alive && setUrl(u), () => {});
    return () => {
      alive = false;
    };
  }, [sticker.key]);
  return (
    <button
      className="ios-sticker-cell flex aspect-square items-center justify-center rounded-2xl"
      aria-label={`Stiker ${sticker.emoji}`}
      title={sticker.emoji}
      onClick={onPick}
    >
      <IosSticker size={58}>
        {/* eslint-disable-next-line @next/next/no-img-element -- blob URL */}
        {url ? <img src={url} alt="" draggable={false} className="h-full w-full select-none object-contain" /> : <span className="text-3xl leading-none">{sticker.emoji}</span>}
      </IosSticker>
    </button>
  );
}

function Stickers({ onSticker }: { onSticker: (key: string) => void }) {
  const [sets, setSets] = useState<tg.StickerSetInfo[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [current, setCurrent] = useState(0);
  const [items, setItems] = useState<tg.StickerRef[] | null>(null);

  useEffect(() => {
    let alive = true;
    tg.loadStickerSets().then((s) => alive && setSets(s), () => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!sets?.length) return;
    let alive = true;
    tg.loadStickerSet(current).then((s) => alive && setItems(s), () => alive && setItems([]));
    return () => {
      alive = false;
      setItems(null);
    };
  }, [sets, current]);

  if (failed) return <p className="p-6 text-center text-sm text-muted">Stikerlarni yuklab bo&apos;lmadi</p>;
  if (!sets) return <p className="p-6 text-center text-sm text-muted">Yuklanmoqda…</p>;
  if (sets.length === 0) return <p className="p-6 text-center text-sm text-muted">O&apos;rnatilgan stiker to&apos;plamlari yo&apos;q</p>;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-1.5">
        {sets.map((s) => (
          <button
            key={s.index}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs ${current === s.index ? "bg-accent text-accent-text" : "bg-hover text-muted hover:text-text"}`}
            onClick={() => setCurrent(s.index)}
          >
            {s.title}
          </button>
        ))}
      </div>
      <div className="thin-scroll grid flex-1 grid-cols-5 content-start gap-1.5 overflow-y-auto p-2">
        {!items && <p className="col-span-5 p-4 text-center text-sm text-muted">Yuklanmoqda…</p>}
        {items?.map((s) => <StickerCell key={s.key} sticker={s} onPick={() => onSticker(s.key)} />)}
      </div>
    </div>
  );
}

function GifCell({ gif, onPick }: { gif: tg.GifRef; onPick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let alive = true;
    // Ko'rinadigan bo'lganda yuklanadi
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      tg.gifUrl(gif.key).then((u) => alive && setUrl(u), () => {});
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => {
      alive = false;
      io.disconnect();
    };
  }, [gif.key]);
  return (
    <button
      ref={ref}
      className="mb-1 block w-full overflow-hidden rounded-lg bg-hover hover:opacity-90"
      style={{ aspectRatio: `${gif.width} / ${gif.height}` }}
      aria-label="GIF yuborish"
      onClick={onPick}
    >
      {url && <video src={url} autoPlay loop muted playsInline className="h-full w-full object-cover" />}
    </button>
  );
}

function Gifs({ onGif }: { onGif: (key: string) => void }) {
  const chatId = useApp((s) => s.activeChatId);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState<{ for: string; items: tg.GifRef[]; next: string | null; failed: boolean } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const q = query.trim();

  useEffect(() => {
    if (chatId === null) return;
    let alive = true;
    const timer = setTimeout(() => {
      const req = q ? tg.searchGifs(chatId, q) : tg.loadSavedGifs().then((items) => ({ items, next: null }));
      req.then(
        (r) => alive && setPage({ for: q, items: r.items, next: r.next, failed: false }),
        () => alive && setPage({ for: q, items: [], next: null, failed: true }),
      );
    }, q ? 350 : 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q, chatId]);

  async function more() {
    if (!page?.next || loadingMore || chatId === null || !q) return;
    setLoadingMore(true);
    try {
      const r = await tg.searchGifs(chatId, q, page.next);
      setPage((p) => (p && p.for === q ? { ...p, items: [...p.items, ...r.items], next: r.next } : p));
    } catch {
      setPage((p) => (p ? { ...p, next: null } : p));
    } finally {
      setLoadingMore(false);
    }
  }

  const current = page?.for === q ? page : null;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-2 pt-2">
        <input
          className="w-full rounded-full border border-border bg-panel px-3 py-1.5 text-sm placeholder:text-muted focus:border-accent"
          type="search"
          placeholder="GIF qidirish"
          aria-label="GIF qidirish"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted">{q ? "Natijalar" : "Saqlangan GIF'lar"}</p>
      <div
        className="thin-scroll flex-1 overflow-y-auto px-2 pb-2"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) void more();
        }}
      >
        {!current && <p className="p-4 text-center text-sm text-muted">Yuklanmoqda…</p>}
        {current?.failed && <p className="p-4 text-center text-sm text-muted">GIF&apos;larni yuklab bo&apos;lmadi</p>}
        {current && !current.failed && current.items.length === 0 && (
          <p className="p-4 text-center text-sm text-muted">{q ? "Hech narsa topilmadi" : "Saqlangan GIF yo'q — qidirib ko'ring"}</p>
        )}
        <div className="columns-2 gap-1">
          {current?.items.map((g) => <GifCell key={g.key} gif={g} onPick={() => onGif(g.key)} />)}
        </div>
        {loadingMore && <p className="p-2 text-center text-xs text-muted">Yuklanmoqda…</p>}
      </div>
    </div>
  );
}

export function EmojiPanel({
  onEmoji, onSticker, onGif, onClose,
}: {
  onEmoji: (emoji: string) => void;
  onSticker: (key: string) => void;
  onGif: (key: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"emoji" | "stickers" | "gifs">("emoji");
  const [group, setGroup] = useState("recent");
  const [query, setQuery] = useState("");
  const found = query.trim() ? searchEmoji(query, 64) : null;
  const [recent, setRecent] = useState<string[]>(() => recentEmoji());
  const groups = recent.length
    ? [{ id: "recent", label: "So'nggilar", icon: "🕘", emojis: recent.join(" ") }, ...EMOJI_GROUPS]
    : EMOJI_GROUPS;
  const active = groups.find((g) => g.id === group) ?? groups[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <button className="fixed inset-0 z-20 cursor-default" aria-label="Panelni yopish" tabIndex={-1} onClick={onClose} />
      <div
        role="dialog"
        aria-label="Emoji, stikerlar va GIF"
        className="absolute bottom-full left-0 z-30 mb-2 flex h-[360px] w-[min(352px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-border bg-bg shadow-xl"
      >
        <div className="flex border-b border-border">
          {(["emoji", "stickers", "gifs"] as const).map((t) => (
            <button
              key={t}
              aria-pressed={tab === t}
              className={`flex-1 border-b-2 py-2 text-sm font-medium ${tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-text"}`}
              onClick={() => setTab(t)}
            >
              {t === "emoji" ? "Emoji" : t === "stickers" ? "Stikerlar" : "GIF"}
            </button>
          ))}
          <button className="px-3 text-muted hover:text-text" aria-label="Yopish" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>
        {tab === "stickers" ? (
          <Stickers onSticker={(key) => (onSticker(key), onClose())} />
        ) : tab === "gifs" ? (
          <Gifs onGif={(key) => (onGif(key), onClose())} />
        ) : (
          <>
            <div className="px-2 pt-2">
              <input
                className="w-full rounded-full border border-border bg-panel px-3 py-1.5 text-sm placeholder:text-muted focus:border-accent"
                type="search"
                placeholder="Emoji qidirish (yurak, kulish, olov…)"
                aria-label="Emoji qidirish"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted">{found ? "Qidiruv natijalari" : active.label}</p>
            <div className="thin-scroll grid flex-1 grid-cols-8 content-start gap-0.5 overflow-y-auto px-2">
              {(found ? found.map((f) => f.emoji) : active.emojis.split(" ")).map((e, i) => (
                <button
                  key={`${e}-${i}`}
                  className="flex aspect-square items-center justify-center rounded-lg text-2xl hover:bg-hover"
                  aria-label={e}
                  onClick={() => {
                    rememberEmoji(e);
                    setRecent(recentEmoji());
                    onEmoji(e);
                  }}
                >
                  {e}
                </button>
              ))}
              {found?.length === 0 && <p className="col-span-8 p-4 text-center text-sm text-muted">Hech narsa topilmadi</p>}
            </div>
            <div className="flex justify-between border-t border-border px-1 py-1">
              {groups.map((g) => (
                <button
                  key={g.id}
                  title={g.label}
                  aria-label={g.label}
                  aria-pressed={!found && active.id === g.id}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg ${!found && active.id === g.id ? "bg-accent-soft" : "opacity-60 hover:opacity-100"}`}
                  onClick={() => {
                    setGroup(g.id);
                    setQuery("");
                  }}
                >
                  {g.icon}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
