"use client";

import { useMemo, useState } from "react";
import { formatChatDate } from "@/lib/format";
import { cyrillicToLatin } from "@/lib/translit/uz";
import { useApp } from "@/store/app";
import { Avatar } from "./Avatar";

/** Qidiruv yozuvga bog'liq emas: "салом" va "salom" bir xil topiladi. */
const normalize = (s: string) => cyrillicToLatin(s).toLowerCase().replace(/[ʻʼ'`‘’]/g, "");

export function ChatList() {
  const chats = useApp((s) => s.chats);
  const me = useApp((s) => s.me);
  const activeChatId = useApp((s) => s.activeChatId);
  const openChat = useApp((s) => s.openChat);
  const logOut = useApp((s) => s.logOut);
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return q ? chats.filter((c) => normalize(c.title).includes(q)) : chats;
  }, [chats, query]);

  return (
    <>
      <header className="flex items-center gap-2 border-b border-border p-3">
        <input
          className="min-w-0 flex-1 rounded-full bg-panel px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          type="search"
          placeholder="Qidirish"
          aria-label="Chatlarni qidirish"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="shrink-0 rounded-full px-3 py-2 text-sm text-muted hover:bg-panel"
          title={me ? `${me.name} — chiqish` : "Chiqish"}
          onClick={() => {
            if (window.confirm("Akkauntdan chiqasizmi?")) void logOut();
          }}
        >
          Chiqish
        </button>
      </header>
      <ul className="flex-1 overflow-y-auto">
        {visible.map((chat) => (
          <li key={chat.id}>
            <button
              className={`flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-panel ${
                chat.id === activeChatId ? "bg-panel" : ""
              }`}
              onClick={() => void openChat(chat.id)}
            >
              <Avatar id={chat.id} title={chat.title} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate font-medium">{chat.title}</span>
                  {chat.lastDate !== null && (
                    <span className="shrink-0 text-xs text-muted">{formatChatDate(chat.lastDate)}</span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-muted">{chat.lastText}</span>
                  {chat.unread > 0 && (
                    <span
                      className={`shrink-0 rounded-full px-1.5 text-xs leading-5 text-white ${
                        chat.muted ? "bg-zinc-400" : "bg-accent"
                      }`}
                    >
                      {chat.unread}
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="p-6 text-center text-sm text-muted">
            {chats.length === 0 ? "Chatlar yuklanmoqda…" : "Hech narsa topilmadi"}
          </li>
        )}
      </ul>
    </>
  );
}
