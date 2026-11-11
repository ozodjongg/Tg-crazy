"use client";

import { useEffect, useState } from "react";
import { EMOJI_GROUPS, recentEmoji, rememberEmoji } from "@/lib/emoji";
import * as tg from "@/lib/telegram/api";
import { Icon } from "./Icon";

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
    <button className="flex aspect-square items-center justify-center rounded-xl p-1 hover:bg-hover" aria-label={`Stiker ${sticker.emoji}`} onClick={onPick}>
      {/* eslint-disable-next-line @next/next/no-img-element -- blob URL */}
      {url ? <img src={url} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-2xl">{sticker.emoji}</span>}
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
      <div className="thin-scroll grid flex-1 grid-cols-5 content-start gap-1 overflow-y-auto p-2">
        {!items && <p className="col-span-5 p-4 text-center text-sm text-muted">Yuklanmoqda…</p>}
        {items?.map((s) => <StickerCell key={s.key} sticker={s} onPick={() => onSticker(s.key)} />)}
      </div>
    </div>
  );
}

export function EmojiPanel({
  onEmoji, onSticker, onClose,
}: { onEmoji: (emoji: string) => void; onSticker: (key: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"emoji" | "stickers">("emoji");
  const [group, setGroup] = useState("recent");
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
        aria-label="Emoji va stikerlar"
        className="absolute bottom-full left-0 z-30 mb-2 flex h-[360px] w-[min(352px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-border bg-bg shadow-xl"
      >
        <div className="flex border-b border-border">
          {(["emoji", "stickers"] as const).map((t) => (
            <button
              key={t}
              aria-pressed={tab === t}
              className={`flex-1 border-b-2 py-2 text-sm font-medium ${tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-text"}`}
              onClick={() => setTab(t)}
            >
              {t === "emoji" ? "Emoji" : "Stikerlar"}
            </button>
          ))}
          <button className="px-3 text-muted hover:text-text" aria-label="Yopish" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>
        {tab === "stickers" ? (
          <Stickers onSticker={(key) => (onSticker(key), onClose())} />
        ) : (
          <>
            <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted">{active.label}</p>
            <div className="thin-scroll grid flex-1 grid-cols-8 content-start gap-0.5 overflow-y-auto px-2">
              {active.emojis.split(" ").map((e, i) => (
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
            </div>
            <div className="flex justify-between border-t border-border px-1 py-1">
              {groups.map((g) => (
                <button
                  key={g.id}
                  title={g.label}
                  aria-label={g.label}
                  aria-pressed={active.id === g.id}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg ${active.id === g.id ? "bg-accent-soft" : "opacity-60 hover:opacity-100"}`}
                  onClick={() => setGroup(g.id)}
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
