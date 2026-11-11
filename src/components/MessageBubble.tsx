"use client";

import { avatarColor, formatTime } from "@/lib/format";
import { itemPreview, type MessageItem } from "@/lib/telegram/types";
import { toggleScript } from "@/lib/translit/uz";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { MediaView } from "./MediaView";

export interface BubbleProps {
  msg: MessageItem;
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
}

export function MessageBubble({
  msg, repliedTo, inGroup, first, last, read, converted, onMenu, onReact, onJumpTo,
}: BubbleProps) {
  if (msg.service) {
    return (
      <li className="my-1 self-center rounded-full bg-hover px-3 py-0.5 text-xs text-muted">{msg.text}</li>
    );
  }

  const out = msg.outgoing;
  // "Dum": ketma-ketlikning oxirgi pufakchasida pastki burchak o'tkir
  const tail = last ? (out ? "rounded-br-md" : "rounded-bl-md") : "";
  const showAvatar = inGroup && !out;
  const text = converted ? toggleScript(msg.text) : msg.text;
  const visual = msg.media?.kind === "photo" || msg.media?.kind === "sticker";

  return (
    <li
      id={`msg-${msg.id}`}
      className={`group flex items-end gap-2 ${out ? "flex-row-reverse" : ""} ${first ? "mt-2" : ""}`}
    >
      {showAvatar &&
        (last ? <Avatar id={msg.senderId} title={msg.senderName} size={32} /> : <span className="w-8 shrink-0" />)}
      <div className={`flex min-w-0 max-w-[85%] flex-col md:max-w-[70%] ${out ? "items-end" : "items-start"}`}>
        <div
          className={`max-w-full rounded-[18px] px-3 py-1.5 ${tail} ${
            out ? "bg-bubble-out" : "border border-border bg-bubble-in"
          }`}
          onContextMenu={(e) => {
            e.preventDefault();
            onMenu(msg, e.clientX, e.clientY);
          }}
        >
          {showAvatar && first && (
            <p className="text-sm font-medium" style={{ color: avatarColor(msg.senderId) }}>
              {msg.senderName}
            </p>
          )}
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
          {msg.media && (
            <div className={visual ? "-mx-1.5 mb-1 mt-0.5" : "my-1"}>
              <MediaView msg={msg} />
            </div>
          )}
          {text && (
            <p className="whitespace-pre-wrap break-words leading-snug">
              {text}
              {/* Vaqt uchun joy qoldiradi, shunda u matn ustiga chiqmaydi */}
              <span className={`inline-block ${msg.edited ? "w-36" : out ? "w-16" : "w-12"}`} />
            </p>
          )}
          <p className={`flex items-center justify-end gap-0.5 text-[11px] text-muted ${text ? "-mt-3.5" : "mt-0.5"}`}>
            {msg.edited && <span className="mr-1">tahrirlangan</span>}
            {formatTime(msg.date)}
            {out && <Icon name={read ? "checks" : "check"} size={14} className="text-accent" />}
          </p>
        </div>
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
