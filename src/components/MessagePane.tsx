"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { formatTime } from "@/lib/format";
import type { MessageItem } from "@/lib/telegram/types";
import { toggleScript } from "@/lib/translit/uz";
import { useApp } from "@/store/app";
import { Avatar } from "./Avatar";

function Bubble({ msg, showSender }: { msg: MessageItem; showSender: boolean }) {
  const [converted, setConverted] = useState(false);

  if (msg.service) {
    return <li className="mx-auto my-1 rounded-full bg-black/10 px-3 py-0.5 text-xs text-muted">{msg.text}</li>;
  }

  return (
    <li className={`group flex items-end gap-1 ${msg.outgoing ? "flex-row-reverse" : ""}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-1.5 shadow-sm md:max-w-[65%] ${
          msg.outgoing ? "bg-bubble-out" : "bg-bubble-in"
        }`}
      >
        {showSender && <p className="text-xs font-medium text-accent">{msg.senderName}</p>}
        <p className="whitespace-pre-wrap break-words">{converted ? toggleScript(msg.text) : msg.text}</p>
        <p className="text-right text-[11px] text-muted">{formatTime(msg.date)}</p>
      </div>
      <button
        className="rounded-full px-2 py-1 text-xs text-muted opacity-60 hover:bg-black/10 hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
        title="Lotin ↔ kirill"
        aria-label="Xabarni lotin yoki kirillga o'girish"
        aria-pressed={converted}
        onClick={() => setConverted((v) => !v)}
      >
        Aa↔Аа
      </button>
    </li>
  );
}

function Composer() {
  const send = useApp((s) => s.send);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await send(text);
      setText("");
    } catch {
      // Xato store orqali ko'rsatiladi; matn saqlanib qoladi
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <footer className="flex items-end gap-2 border-t border-border bg-bg p-3">
      <textarea
        className="max-h-40 min-h-10 flex-1 resize-none rounded-2xl bg-panel px-4 py-2 outline-none focus:ring-2 focus:ring-accent"
        rows={1}
        placeholder="Xabar yozing…"
        aria-label="Xabar matni"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <button
        className="rounded-full px-3 py-2 text-sm text-muted hover:bg-panel disabled:opacity-40"
        title="Yozilgan matnni lotin ↔ kirillga o'girish"
        disabled={!text.trim()}
        onClick={() => setText(toggleScript(text))}
      >
        Aa↔Аа
      </button>
      <button
        className="rounded-full bg-accent px-4 py-2 font-medium text-accent-text disabled:opacity-50"
        disabled={!text.trim() || sending}
        onClick={() => void submit()}
      >
        Yuborish
      </button>
    </footer>
  );
}

export function MessagePane() {
  const chat = useApp((s) => s.chats.find((c) => c.id === s.activeChatId) ?? null);
  const activeChatId = useApp((s) => s.activeChatId);
  const messages = useApp((s) => s.messages);
  const loading = useApp((s) => s.messagesLoading);
  const error = useApp((s) => s.error);
  const openChat = useApp((s) => s.openChat);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  if (activeChatId === null) {
    return (
      <div className="flex flex-1 items-center justify-center bg-chat-bg text-muted">
        Suhbatni boshlash uchun chatni tanlang
      </div>
    );
  }

  const title = chat?.title ?? "Chat";
  // Guruhlarda (manfiy ID) kiruvchi xabarlar ustida yuboruvchi ismi ko'rsatiladi
  const isGroup = activeChatId < 0;

  return (
    <>
      <header className="flex items-center gap-3 border-b border-border bg-bg p-3">
        <button
          className="rounded-full px-2 py-1 text-accent hover:bg-panel md:hidden"
          aria-label="Chatlar ro'yxatiga qaytish"
          onClick={() => void openChat(null)}
        >
          ←
        </button>
        <Avatar id={activeChatId} title={title} size={36} />
        <h2 className="min-w-0 flex-1 truncate font-medium">{title}</h2>
      </header>
      <div className="flex-1 overflow-y-auto bg-chat-bg p-3">
        {loading && <p className="py-6 text-center text-sm text-muted">Xabarlar yuklanmoqda…</p>}
        {!loading && messages.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">Bu yerda hali xabar yo&apos;q</p>
        )}
        <ul className="flex flex-col gap-1">
          {messages.map((msg, i) => (
            <Bubble
              key={msg.id}
              msg={msg}
              showSender={isGroup && !msg.outgoing && messages[i - 1]?.senderId !== msg.senderId}
            />
          ))}
        </ul>
        <div ref={endRef} />
      </div>
      {error && (
        <p role="alert" className="bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <Composer key={activeChatId} />
    </>
  );
}
