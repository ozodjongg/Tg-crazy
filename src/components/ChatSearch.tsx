"use client";

import { useEffect, useState } from "react";
import { formatChatDate } from "@/lib/format";
import { searchInChat } from "@/lib/telegram/api";
import { itemPreview, type MessageItem } from "@/lib/telegram/types";
import { Icon } from "./Icon";

/** Chat ichida qidiruv: natijaga bosilsa o'sha xabarga o'tiladi. */
export function ChatSearch({ chatId, onPick, onClose }: { chatId: number; onPick: (id: number) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MessageItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const q = query.trim();

  useEffect(() => {
    if (!q) return;
    let alive = true;
    // Har bosishda so'rov yubormaslik uchun biroz kutamiz
    const timer = setTimeout(() => {
      setLoading(true);
      searchInChat(chatId, q).then(
        (list) => alive && (setResults(list), setFailed(false)),
        () => alive && setFailed(true),
      ).finally(() => alive && setLoading(false));
    }, 350);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [chatId, q]);

  const shown = q ? results : null;

  return (
    <div className="relative z-20 border-b border-border bg-bg px-3 py-2">
      <div className="flex items-center gap-2">
        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full border border-border px-3 focus-within:border-accent">
          <Icon name="search" size={16} className="shrink-0 text-muted" />
          <input
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
            placeholder="Shu chatda qidirish"
            aria-label="Shu chatda qidirish"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
          />
        </label>
        <button className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-text" aria-label="Qidiruvni yopish" onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
      </div>
      {q && (
        <div className="thin-scroll absolute inset-x-3 top-full mt-1 max-h-80 overflow-y-auto rounded-2xl border border-border bg-bg p-1 shadow-xl">
          {failed ? (
            <p className="p-4 text-center text-sm text-muted">Qidirib bo&apos;lmadi</p>
          ) : loading && !shown ? (
            <p className="p-4 text-center text-sm text-muted">Qidirilmoqda…</p>
          ) : shown && shown.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted">Hech narsa topilmadi</p>
          ) : (
            <ul>
              {shown?.map((m) => (
                <li key={m.id}>
                  <button className="block w-full rounded-xl px-3 py-2 text-left hover:bg-hover" onClick={() => onPick(m.id)}>
                    <span className="flex items-baseline gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate font-medium">{m.senderName}</span>
                      <span className="shrink-0 text-xs text-muted">{formatChatDate(m.date)}</span>
                    </span>
                    <span className="line-clamp-2 text-sm text-muted">{itemPreview(m)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
