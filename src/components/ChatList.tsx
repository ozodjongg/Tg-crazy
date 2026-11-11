"use client";

import { useMemo, useState } from "react";
import { FOLDERS, filterChats, unreadChats, type Folder } from "@/lib/chats";
import { formatChatDate } from "@/lib/format";
import type { ChatItem } from "@/lib/telegram/types";
import { useApp } from "@/store/app";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { SideMenu } from "./SideMenu";

function ChatRow({ chat, active, onOpen }: { chat: ChatItem; active: boolean; onOpen: () => void }) {
  const sub = active ? "text-accent-text/80" : "text-muted";
  const prefix = chat.lastOutgoing
    ? "Siz: "
    : chat.kind === "group" && chat.lastSender
      ? `${chat.lastSender.split(" ")[0]}: `
      : "";
  const read = chat.lastOutgoing && chat.readOutboxMaxId > 0;

  return (
    <li>
      <button
        aria-current={active || undefined}
        className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left ${
          active ? "bg-accent text-accent-text" : "hover:bg-hover"
        }`}
        onClick={onOpen}
      >
        <Avatar id={chat.id} title={chat.title} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="min-w-0 truncate font-medium">{chat.title}</span>
            {chat.muted && <Icon name="mute" size={14} className={`shrink-0 ${sub}`} />}
            <span className="flex-1" />
            {chat.lastOutgoing && (
              <Icon
                name={read ? "checks" : "check"}
                size={16}
                className={`shrink-0 ${active ? "text-accent-text" : "text-accent"}`}
              />
            )}
            {chat.lastDate !== null && (
              <span className={`shrink-0 text-xs ${sub}`}>{formatChatDate(chat.lastDate)}</span>
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span className={`min-w-0 flex-1 truncate text-sm ${sub}`}>
              {prefix && <span className={active ? "" : "text-text"}>{prefix}</span>}
              {chat.lastText}
            </span>
            {chat.unread > 0 ? (
              <span
                className={`min-w-5 shrink-0 rounded-full px-1.5 text-center text-xs font-medium leading-5 ${
                  active
                    ? "bg-accent-text text-accent"
                    : chat.muted
                      ? "bg-hover text-muted"
                      : "bg-accent text-accent-text"
                }`}
              >
                {chat.unread > 999 ? "999+" : chat.unread}
              </span>
            ) : (
              chat.pinned && <Icon name="pin" size={15} className={`shrink-0 ${sub}`} />
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

export function ChatList() {
  const chats = useApp((s) => s.chats);
  const activeChatId = useApp((s) => s.activeChatId);
  const openChat = useApp((s) => s.openChat);
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState<Folder>("all");
  const [menuOpen, setMenuOpen] = useState(false);

  const visible = useMemo(() => filterChats(chats, folder, query), [chats, folder, query]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-panel">
      <header className="flex items-center gap-2 px-3 pb-2 pt-3">
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-text"
          aria-label="Menyu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Icon name="menu" />
        </button>
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-bg px-3 focus-within:border-accent">
          <Icon name="search" size={17} className="shrink-0 text-muted" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
            type="search"
            placeholder="Qidirish"
            aria-label="Chatlarni qidirish"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </header>
      {menuOpen && <SideMenu onClose={() => setMenuOpen(false)} />}

      <nav aria-label="Papkalar" className="flex overflow-x-auto border-b border-border px-2">
        {FOLDERS.map((f) => {
          const count = unreadChats(chats, f.id);
          const selected = folder === f.id;
          return (
            <button
              key={f.id}
              aria-pressed={selected}
              className={`flex flex-1 shrink-0 items-center justify-center gap-1 border-b-2 px-1.5 pb-2 pt-1.5 text-sm font-medium ${
                selected ? "border-accent text-accent" : "border-transparent text-muted hover:text-text"
              }`}
              onClick={() => setFolder(f.id)}
            >
              {f.label}
              {count > 0 && (
                <span
                  className={`min-w-[18px] rounded-full px-1 text-center text-[11px] leading-[18px] ${
                    selected ? "bg-accent text-accent-text" : "bg-hover text-muted"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <ul className="thin-scroll flex-1 space-y-0.5 overflow-y-auto p-2">
        {visible.map((chat) => (
          <ChatRow
            key={chat.id}
            chat={chat}
            active={chat.id === activeChatId}
            onOpen={() => void openChat(chat.id)}
          />
        ))}
        {visible.length === 0 && (
          <li className="p-6 text-center text-sm text-muted">
            {chats.length === 0 ? "Chatlar yuklanmoqda…" : "Hech narsa topilmadi"}
          </li>
        )}
      </ul>
    </div>
  );
}
