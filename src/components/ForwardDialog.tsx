"use client";

import { useMemo, useState } from "react";
import { normalizeQuery } from "@/lib/chats";
import type { MessageItem } from "@/lib/telegram/types";
import { useApp } from "@/store/app";
import { Avatar } from "./Avatar";
import { Dialog } from "./Dialog";

export function ForwardDialog({ msg, onClose }: { msg: MessageItem; onClose: () => void }) {
  const chats = useApp((s) => s.chats);
  const forwardMessage = useApp((s) => s.forwardMessage);
  const openChat = useApp((s) => s.openChat);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const visible = useMemo(() => {
    const q = normalizeQuery(query.trim());
    return q ? chats.filter((c) => normalizeQuery(c.title).includes(q)) : chats;
  }, [chats, query]);

  async function pick(chatId: number) {
    setBusyId(chatId);
    try {
      await forwardMessage(msg, chatId);
      onClose();
      void openChat(chatId);
    } catch {
      setBusyId(null); // xato store orqali ko'rsatiladi
    }
  }

  return (
    <Dialog title="Kimga yuborilsin?" onClose={onClose}>
      <input
        className="mb-2 w-full rounded-full border border-border bg-bg px-4 py-2 text-sm placeholder:text-muted focus:border-accent"
        type="search"
        placeholder="Qidirish"
        aria-label="Chatlarni qidirish"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="space-y-0.5">
        {visible.map((chat) => (
          <li key={chat.id}>
            <button
              className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-hover disabled:opacity-50"
              disabled={busyId !== null}
              onClick={() => void pick(chat.id)}
            >
              <Avatar id={chat.id} title={chat.title} size={38} />
              <span className="min-w-0 flex-1 truncate font-medium">{chat.title}</span>
              {busyId === chat.id && <span className="text-xs text-muted">Yuborilmoqda…</span>}
            </button>
          </li>
        ))}
        {visible.length === 0 && <li className="p-4 text-center text-sm text-muted">Hech narsa topilmadi</li>}
      </ul>
    </Dialog>
  );
}
