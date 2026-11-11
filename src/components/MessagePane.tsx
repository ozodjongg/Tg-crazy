"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { formatDayLabel, isSameDay } from "@/lib/format";
import type { ChatKind } from "@/lib/telegram/types";
import { useApp } from "@/store/app";
import { Avatar } from "./Avatar";
import { Composer } from "./Composer";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { MessageBubble } from "./MessageBubble";

const KIND_LABEL: Record<ChatKind, string> = {
  user: "shaxsiy chat",
  bot: "bot",
  group: "guruh",
  channel: "kanal",
};

function EmptyState() {
  return (
    <div className="chat-wallpaper flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo size={56} />
      <h2 className="font-serif text-3xl">Xush kelibsiz</h2>
      <p className="max-w-xs text-muted">Suhbatni boshlash uchun chap tomondan chatni tanlang.</p>
    </div>
  );
}

export function MessagePane() {
  const chat = useApp((s) => s.chats.find((c) => c.id === s.activeChatId) ?? null);
  const activeChatId = useApp((s) => s.activeChatId);
  const messages = useApp((s) => s.messages);
  const loading = useApp((s) => s.messagesLoading);
  const error = useApp((s) => s.error);
  const openChat = useApp((s) => s.openChat);

  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const [showDown, setShowDown] = useState(false);
  // Qaysi chat to'liq o'girilgan; boshqa chatga o'tganda o'z-o'zidan o'chadi
  const [convertedChat, setConvertedChat] = useState<number | null>(null);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  // Yangi xabar kelganda faqat foydalanuvchi pastda turgan bo'lsa pastga tushamiz
  useEffect(() => {
    if (nearBottom.current) scrollToBottom();
  }, [messages]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setShowDown(!nearBottom.current);
  }

  if (activeChatId === null) return <EmptyState />;

  const title = chat?.title ?? "Chat";
  const kind: ChatKind = chat?.kind ?? (activeChatId < 0 ? "group" : "user");
  const inGroup = kind === "group";
  const readMaxId = chat?.readOutboxMaxId ?? 0;
  const convertAll = convertedChat === activeChatId;

  return (
    <>
      <header className="flex items-center gap-3 border-b border-border bg-bg px-3 py-2">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-text md:hidden"
          aria-label="Chatlar ro'yxatiga qaytish"
          onClick={() => {
            nearBottom.current = true;
            void openChat(null);
          }}
        >
          <Icon name="back" />
        </button>
        <Avatar id={activeChatId} title={title} size={40} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-medium leading-tight">{title}</h2>
          <p className="truncate text-sm text-muted">{KIND_LABEL[kind]}</p>
        </div>
        <button
          className={`rounded-full px-3 py-2 text-xs font-medium ${
            convertAll ? "bg-accent-soft text-accent" : "text-muted hover:bg-hover hover:text-text"
          }`}
          title="Barcha xabarlarni lotin ↔ kirillga o'girish"
          aria-label="Barcha xabarlarni lotin yoki kirillga o'girish"
          aria-pressed={convertAll}
          onClick={() => setConvertedChat(convertAll ? null : activeChatId)}
        >
          Aa↔Аа
        </button>
        {(["search", "more"] as const).map((name) => (
          <button
            key={name}
            disabled
            title="Tez orada"
            aria-label={name === "search" ? "Chat ichida qidirish (tez orada)" : "Yana (tez orada)"}
            className="hidden h-10 w-10 items-center justify-center rounded-full text-muted opacity-50 sm:flex"
          >
            <Icon name={name} />
          </button>
        ))}
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} onScroll={onScroll} className="chat-wallpaper thin-scroll flex-1 overflow-y-auto px-3 py-3">
          {loading && <p className="py-6 text-center text-sm text-muted">Xabarlar yuklanmoqda…</p>}
          {!loading && messages.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">Bu yerda hali xabar yo&apos;q</p>
          )}
          <ul className="mx-auto flex max-w-3xl flex-col gap-0.5">
            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const newDay = !prev || !isSameDay(prev.date, msg.date);
              const sameAsPrev = !newDay && !!prev && !prev.service && prev.senderId === msg.senderId;
              const sameAsNext =
                !!next && !next.service && next.senderId === msg.senderId && isSameDay(next.date, msg.date);
              return (
                <Fragment key={msg.id}>
                  {newDay && (
                    <li className="sticky top-0 z-[1] my-2 self-center rounded-full border border-border bg-bg px-3 py-0.5 text-xs font-medium text-muted">
                      {formatDayLabel(msg.date)}
                    </li>
                  )}
                  <MessageBubble
                    msg={msg}
                    inGroup={inGroup}
                    first={!sameAsPrev}
                    last={!sameAsNext}
                    read={msg.id <= readMaxId}
                    convertAll={convertAll}
                  />
                </Fragment>
              );
            })}
          </ul>
        </div>
        {showDown && (
          <button
            className="absolute bottom-3 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-bg text-muted shadow-md hover:text-text"
            aria-label="Eng so'nggi xabarga tushish"
            onClick={scrollToBottom}
          >
            <Icon name="down" />
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mx-3 mb-1 rounded-xl bg-danger-soft px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="chat-wallpaper">
        <Composer key={activeChatId} />
      </div>
    </>
  );
}
