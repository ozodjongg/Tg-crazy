"use client";

import { useState } from "react";
import { avatarColor, formatTime } from "@/lib/format";
import type { MessageItem } from "@/lib/telegram/types";
import { toggleScript } from "@/lib/translit/uz";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

export interface BubbleProps {
  msg: MessageItem;
  /** Guruh: yuboruvchi ismi va avatari ko'rsatiladi */
  inGroup: boolean;
  /** Bir yuboruvchining ketma-ket xabarlari ichida birinchi / oxirgi */
  first: boolean;
  last: boolean;
  read: boolean;
  /** Butun chat o'girilgan (sarlavhadagi tugma) */
  convertAll: boolean;
}

export function MessageBubble({ msg, inGroup, first, last, read, convertAll }: BubbleProps) {
  // Xabardagi tugma chat darajasidagi tanlovni shu xabar uchun teskarisiga o'zgartiradi
  const [flipped, setFlipped] = useState(false);
  const converted = convertAll !== flipped;

  if (msg.service) {
    return (
      <li className="my-1 self-center rounded-full bg-hover px-3 py-0.5 text-xs text-muted">{msg.text}</li>
    );
  }

  const out = msg.outgoing;
  // "Dum": ketma-ketlikning oxirgi pufakchasida pastki burchak o'tkir
  const tail = last ? (out ? "rounded-br-md" : "rounded-bl-md") : "";
  const showAvatar = inGroup && !out;

  return (
    <li className={`group flex items-end gap-2 ${out ? "flex-row-reverse" : ""} ${first ? "mt-2" : ""}`}>
      {showAvatar &&
        (last ? <Avatar id={msg.senderId} title={msg.senderName} size={32} /> : <span className="w-8 shrink-0" />)}
      <div
        className={`max-w-[85%] rounded-[18px] px-3 py-1.5 md:max-w-[70%] ${tail} ${
          out ? "bg-bubble-out" : "border border-border bg-bubble-in"
        }`}
      >
        {showAvatar && first && (
          <p className="text-sm font-medium" style={{ color: avatarColor(msg.senderId) }}>
            {msg.senderName}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words leading-snug">
          {converted ? toggleScript(msg.text) : msg.text}
          {/* Vaqt uchun joy qoldiradi, shunda u matn ustiga chiqmaydi */}
          <span className="inline-block w-14" />
        </p>
        <p className="-mt-3.5 flex items-center justify-end gap-0.5 text-[11px] text-muted">
          {formatTime(msg.date)}
          {out && <Icon name={read ? "checks" : "check"} size={14} className="text-accent" />}
        </p>
      </div>
      <button
        className="hidden shrink-0 rounded-full px-2 py-1 text-xs text-muted opacity-0 hover:bg-hover hover:text-text focus-visible:opacity-100 group-hover:opacity-100 md:block"
        title="Lotin ↔ kirill"
        aria-label="Xabarni lotin yoki kirillga o'girish"
        aria-pressed={converted}
        onClick={() => setFlipped((v) => !v)}
      >
        Aa↔Аа
      </button>
    </li>
  );
}
