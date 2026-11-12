"use client";

import { avatarColor, formatTime } from "@/lib/format";
import { emojiOnlyCount } from "@/lib/richtext";
import { itemPreview, type MessageItem } from "@/lib/telegram/types";
import { toggleScript } from "@/lib/translit/uz";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { InlineKeyboard, MessageExtras } from "./MessageExtras";
import { MediaTile, MediaView, isBareMedia, isVisualMedia } from "./MediaView";
import { RichText } from "./RichText";

export interface BubbleProps {
  msg: MessageItem;
  /** Albom bo'lsa — uning barcha xabarlari (msg birinchisi) */
  album: MessageItem[] | null;
  /** Javob berilgan xabar (yuklangan bo'lsa) */
  repliedTo: MessageItem | null;
  /** Guruh: yuboruvchi ismi va avatari ko'rsatiladi */
  inGroup: boolean;
  /** Bir yuboruvchining ketma-ket xabarlari ichida birinchi / oxirgi */
  first: boolean;
  last: boolean;
  read: boolean;
  /** Matn lotin↔kirillga o'girilgan holda ko'rsatiladi */
  converted: boolean;
  onMenu: (msg: MessageItem, x: number, y: number) => void;
  onReact: (msg: MessageItem, emoji: string) => void;
  onJumpTo: (id: number) => void;
  onOpenMedia: (msg: MessageItem) => void;
  /** Ko'p tanlash rejimi: undefined — rejim o'chiq; aks holda xabar tanlanganmi */
  selected?: boolean;
  onSelect?: () => void;
}

function formatViews(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

function Album({ items, onOpen }: { items: MessageItem[]; onOpen: (m: MessageItem) => void }) {
  const visual = items.filter(isVisualMedia);
  const files = items.filter((m) => !isVisualMedia(m));
  return (
    <>
      {visual.length > 0 && (
        <div className="grid w-[min(340px,70vw)] grid-cols-2 gap-0.5 overflow-hidden rounded-xl">
          {visual.map((m, i) => (
            <div key={m.id} className={`aspect-square ${visual.length % 2 === 1 && i === 0 ? "col-span-2 aspect-[2/1]" : ""}`}>
              <MediaTile msg={m} fill onOpen={() => onOpen(m)} />
            </div>
          ))}
        </div>
      )}
      {files.map((m) => (
        <div key={m.id} className="my-1">
          <MediaView msg={m} onOpen={() => onOpen(m)} />
        </div>
      ))}
    </>
  );
}

export function MessageBubble({
  msg, album, repliedTo, inGroup, first, last, read, converted, onMenu, onReact, onJumpTo, onOpenMedia,
  selected, onSelect,
}: BubbleProps) {
  if (msg.service) {
    return (
      <li className="my-1 max-w-[85%] self-center rounded-full bg-hover px-3 py-0.5 text-center text-xs text-muted">{msg.text}</li>
    );
  }

  const out = msg.outgoing;
  const selecting = selected !== undefined;
  // Albomda izoh birinchi matnli xabardan olinadi
  const caption = album ? (album.find((m) => m.text) ?? msg) : msg;
  const rawText = caption.text;
  const text = converted ? toggleScript(rawText) : rawText;
  const emojiCount = !msg.media && !msg.webpage ? emojiOnlyCount(rawText) : 0;
  const bare = (!album && isBareMedia(msg)) || emojiCount > 0;
  const visual = album !== null || isVisualMedia(msg);
  const showAvatar = inGroup && !out;
  // "Dum": ketma-ketlikning oxirgi pufakchasida pastki burchak o'tkir
  const tail = last ? (out ? "rounded-br-md" : "rounded-bl-md") : "";

  const meta = (
    <span className={`flex items-center justify-end gap-1 text-[11px] ${bare ? "rounded-full bg-black/40 px-2 text-white" : "text-muted"}`}>
      {msg.views !== null && (
        <span className="flex items-center gap-0.5" title={`${msg.views} marta ko'rilgan`}>
          <Icon name="eye" size={12} />
          {formatViews(msg.views)}
        </span>
      )}
      {msg.signature && <span className="max-w-24 truncate">{msg.signature}</span>}
      {msg.edited && <span>tahrirlangan</span>}
      {formatTime(msg.date)}
      {out && <Icon name={read ? "checks" : "check"} size={14} className={bare ? "" : "text-accent"} />}
    </span>
  );

  const header = (
    <>
      {showAvatar && first && !bare && (
        <p className="text-sm font-medium" style={{ color: avatarColor(msg.senderId) }}>
          {msg.senderName}
        </p>
      )}
      {msg.forwardFrom && (
        <p className="text-sm text-accent">
          <span className="text-muted">Uzatilgan: </span>
          <span className="font-medium">{msg.forwardFrom}</span>
        </p>
      )}
      {msg.viaBot && <p className="text-sm text-muted">@{msg.viaBot} orqali</p>}
      {msg.replyToId !== null && (
        <button
          className="mb-1 block w-full max-w-xs rounded-lg border-l-2 border-accent bg-black/5 px-2 py-1 text-left text-sm"
          onClick={() => onJumpTo(msg.replyToId!)}
        >
          <span className="block truncate font-medium text-accent">{repliedTo?.senderName ?? "Javob"}</span>
          <span className="block truncate text-muted">
            {repliedTo ? itemPreview(repliedTo) || "Xabar" : "Xabar yuklanmagan"}
          </span>
        </button>
      )}
    </>
  );

  return (
    <li
      id={`msg-${msg.id}`}
      className={`group flex items-end gap-2 ${out ? "flex-row-reverse" : ""} ${first ? "mt-2" : ""} ${
        selecting ? "-mx-2 cursor-pointer rounded-xl px-2 transition-colors" : ""
      } ${selected ? "bg-accent/10" : ""}`}
      // Tanlash rejimida bosish xabarni belgilaydi (media ochilmaydi, havolaga o'tilmaydi)
      onClickCapture={
        selecting
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect?.();
            }
          : undefined
      }
    >
      {selecting && (
        <span
          className={`mb-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
            out ? "order-last mr-auto" : "order-first"
          } ${selected ? "border-accent bg-accent text-accent-text" : "border-muted/60 bg-bg/70"}`}
          aria-hidden
        >
          {selected && <Icon name="check" size={14} />}
        </span>
      )}
      {selected && <span className="sr-only">Tanlangan</span>}
      {showAvatar &&
        (last ? <Avatar id={msg.senderId} title={msg.senderName} size={32} /> : <span className="w-8 shrink-0" />)}
      <div className={`flex min-w-0 max-w-[85%] flex-col md:max-w-[70%] ${out ? "items-end" : "items-start"}`}>
        <div
          className={
            bare
              ? "flex flex-col items-end gap-1"
              : `max-w-full rounded-[18px] ${visual ? "p-1" : "px-3 py-1.5"} ${tail} ${
                  out ? "bg-bubble-out" : "border border-border bg-bubble-in"
                }`
          }
          onContextMenu={(e) => {
            e.preventDefault();
            onMenu(msg, e.clientX, e.clientY);
          }}
        >
          {bare ? (
            <>
              {(msg.forwardFrom || msg.replyToId !== null) && (
                <div className="rounded-2xl border border-border bg-bubble-in px-3 py-1.5">{header}</div>
              )}
              {emojiCount > 0 ? (
                <span className={emojiCount === 1 ? "text-7xl leading-none" : "text-5xl leading-none"}>{rawText}</span>
              ) : (
                <MediaView msg={msg} onOpen={() => onOpenMedia(msg)} />
              )}
              {meta}
            </>
          ) : (
            <>
              <div className={visual ? "px-2 pt-1" : ""}>{header}</div>
              {album ? (
                <Album items={album} onOpen={onOpenMedia} />
              ) : (
                msg.media && (
                  <div className={visual ? "" : "my-1"}>
                    <MediaView msg={msg} onOpen={() => onOpenMedia(msg)} />
                  </div>
                )
              )}
              {text && (
                <div className={`msg-text whitespace-pre-wrap break-words leading-snug ${visual ? "px-2 pt-1" : ""}`}>
                  {converted ? text : <RichText text={text} entities={caption.entities} />}
                  {/* Vaqt uchun joy qoldiradi, shunda u matn ustiga chiqmaydi */}
                  <span className={`inline-block ${msg.edited || msg.views !== null ? "w-36" : out ? "w-16" : "w-12"}`} />
                </div>
              )}
              <MessageExtras msg={msg} />
              <div className={`${text && !msg.webpage && !msg.poll ? "-mt-3.5" : "mt-0.5"} ${visual ? "px-2 pb-0.5" : ""}`}>{meta}</div>
            </>
          )}
        </div>
        {msg.keyboard && <InlineKeyboard msg={msg} />}
        {msg.reactions.length > 0 && (
          <div className={`mt-1 flex flex-wrap gap-1 ${out ? "justify-end" : ""}`}>
            {msg.reactions.map((r) => (
              <button
                key={r.emoji}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm ${
                  r.chosen ? "border-accent bg-accent-soft" : "border-border bg-bg hover:bg-hover"
                }`}
                aria-pressed={r.chosen}
                aria-label={`${r.emoji} ${r.count}`}
                onClick={() => onReact(msg, r.emoji)}
              >
                <span>{r.emoji}</span>
                <span className="text-xs text-muted">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        className="flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-full text-muted hover:bg-hover hover:text-text focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
        aria-label="Xabar amallari"
        aria-haspopup="menu"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onMenu(msg, out ? r.left - 224 : r.right, r.top);
        }}
      >
        <Icon name="more" size={18} />
      </button>
    </li>
  );
}
