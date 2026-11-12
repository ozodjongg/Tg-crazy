"use client";

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { formatDayLabel, isSameDay } from "@/lib/format";
import { galleryItems, groupAlbums, pickForAi } from "@/lib/messages";
import { itemPreview, type ChatItem, type ChatKind, type MessageItem } from "@/lib/telegram/types";
import { ChatSearch } from "./ChatSearch";
import { useApp } from "@/store/app";
import { useServices } from "@/store/services";
import { Avatar } from "./Avatar";
import { Composer } from "./Composer";
import { Dialog, primaryButton, secondaryButton } from "./Dialog";
import { ForwardDialog } from "./ForwardDialog";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { Lightbox } from "./MediaView";
import { MessageBubble } from "./MessageBubble";
import { MessageMenu, type MenuAction } from "./MessageMenu";
import { ScheduledDialog } from "./Schedule";
import { chatTitle } from "./ChatList";

const KIND_LABEL: Record<ChatKind, string> = {
  user: "shaxsiy chat",
  bot: "bot",
  group: "guruh",
  channel: "kanal",
};

function subtitle(chat: ChatItem | null, kind: ChatKind, typing: boolean): { text: string; accent: boolean } {
  if (chat?.isSelf) return { text: "", accent: false };
  if (typing) return { text: kind === "user" ? "yozmoqda…" : "kimdir yozmoqda…", accent: true };
  if (chat?.presence === "online") return { text: "onlayn", accent: true };
  if (chat?.presence === "recently") return { text: "yaqinda bo'lgan", accent: false };
  return { text: KIND_LABEL[kind], accent: false };
}

function EmptyState() {
  return (
    <div className="chat-wallpaper flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo size={56} />
      <h2 className="font-serif text-3xl">Xush kelibsiz</h2>
      <p className="max-w-xs text-muted">Suhbatni boshlash uchun chap tomondan chatni tanlang.</p>
    </div>
  );
}

function DeleteDialog({ msgs, canChoose, onClose }: { msgs: MessageItem[]; canChoose: boolean; onClose: () => void }) {
  const deleteMessages = useApp((s) => s.deleteMessages);
  const [busy, setBusy] = useState(false);
  const many = msgs.length > 1;
  const run = async (revoke: boolean) => {
    setBusy(true);
    await deleteMessages(msgs[0].chatId, msgs.map((m) => m.id), revoke).catch(() => {});
    onClose();
  };
  return (
    <Dialog title={many ? `${msgs.length} ta xabarni o'chirish` : "Xabarni o'chirish"} onClose={onClose}>
      <p className="text-muted">
        {canChoose
          ? `${many ? "Xabarlar" : "Xabar"} kim uchun o'chirilsin?`
          : `${many ? "Xabarlar" : "Xabar"} barcha ishtirokchilar uchun o'chiriladi.`}{" "}
        Bu amalni qaytarib bo&apos;lmaydi.
      </p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button className={secondaryButton} disabled={busy} onClick={onClose}>
          Bekor qilish
        </button>
        {canChoose && (
          <button className={secondaryButton} disabled={busy} onClick={() => void run(false)}>
            Faqat menda
          </button>
        )}
        <button className={`${primaryButton} bg-danger hover:bg-danger`} disabled={busy} onClick={() => void run(true)}>
          {canChoose ? "Hamma uchun" : "O'chirish"}
        </button>
      </div>
    </Dialog>
  );
}

/** Tanlangan xabarlar matni (sana tartibida, guruhda yuboruvchi ismi bilan) — nusxa uchun. */
function selectionText(msgs: MessageItem[], withNames: boolean): string {
  return msgs
    .map((m) => {
      const body = m.text || itemPreview(m);
      return withNames && m.senderName ? `${m.senderName}: ${body}` : body;
    })
    .filter(Boolean)
    .join("\n\n");
}

function SelectionBar({
  count, onCancel, onCopy, onForward, onDelete,
}: { count: number; onCancel: () => void; onCopy: () => void; onForward: () => void; onDelete: () => void }) {
  const action = "flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium hover:bg-hover disabled:opacity-40";
  return (
    <div className="mx-auto flex max-w-3xl items-center gap-1 px-3 pb-3 pt-1" role="toolbar" aria-label="Tanlangan xabarlar">
      <div className="flex flex-1 items-center gap-1 rounded-3xl border border-border bg-bg px-1.5 py-1 shadow-sm">
        <button className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-text" aria-label="Tanlashni bekor qilish" onClick={onCancel}>
          <Icon name="close" />
        </button>
        <span className="flex-1 truncate text-sm font-medium" aria-live="polite">
          {count} ta tanlandi
        </span>
        <button className={action} onClick={onCopy} disabled={count === 0}>
          <Icon name="copy" size={18} />
          <span className="hidden sm:inline">Nusxa</span>
        </button>
        <button className={`${action} text-accent`} onClick={onForward} disabled={count === 0}>
          <Icon name="forward" size={18} />
          <span className="hidden sm:inline">Uzatish</span>
        </button>
        <button className={`${action} text-danger`} onClick={onDelete} disabled={count === 0}>
          <Icon name="trash" size={18} />
          <span className="hidden sm:inline">O&apos;chirish</span>
        </button>
      </div>
    </div>
  );
}

const headerButton =
  "flex h-10 shrink-0 items-center justify-center rounded-full px-3 text-xs font-medium text-muted hover:bg-hover hover:text-text";

export function MessagePane() {
  const chat = useApp((s) => s.chats.find((c) => c.id === s.activeChatId) ?? null);
  const activeChatId = useApp((s) => s.activeChatId);
  const messages = useApp((s) => s.messages);
  const loading = useApp((s) => s.messagesLoading);
  const hasMore = useApp((s) => s.hasMore);
  const loadingOlder = useApp((s) => s.loadingOlder);
  const error = useApp((s) => s.error);
  const isTyping = useApp((s) => s.activeChatId !== null && s.activeChatId in s.typing);
  const openChat = useApp((s) => s.openChat);
  const loadOlder = useApp((s) => s.loadOlder);
  const setReplyTo = useApp((s) => s.setReplyTo);
  const setEditing = useApp((s) => s.setEditing);
  const react = useApp((s) => s.react);
  const sendFile = useApp((s) => s.sendFile);
  const clearError = useApp((s) => s.clearError);
  const aiReady = useServices((s) => s.status === "connected" && !!s.profile?.ai_enabled);
  const openAi = useServices((s) => s.openAi);

  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  /** Eski sahifa yuklanishidan oldingi balandlik — scroll joyini saqlash uchun */
  const heightBeforeOlder = useRef<number | null>(null);
  const [showDown, setShowDown] = useState(false);
  // Qaysi chat to'liq o'girilgan; boshqa chatga o'tganda o'z-o'zidan o'chadi
  const [convertedChat, setConvertedChat] = useState<number | null>(null);
  // Alohida o'girilgan xabarlar ("chatId:msgId")
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(new Set());
  const [menu, setMenu] = useState<{ msg: MessageItem; x: number; y: number } | null>(null);
  const [forwarding, setForwarding] = useState<MessageItem[] | null>(null);
  const [deleting, setDeleting] = useState<MessageItem[] | null>(null);
  // Ko'p tanlash rejimi: null — o'chiq. Chat almashganda bekor bo'ladi.
  const [selection, setSelection] = useState<{ chatId: number; ids: ReadonlySet<number> } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const rows = useMemo(() => groupAlbums(messages), [messages]);
  const gallery = useMemo(() => galleryItems(messages), [messages]);
  const [viewing, setViewing] = useState<number | null>(null);
  const notice = useApp((s) => s.notice);
  const hasNewer = useApp((s) => s.hasNewer);
  const unreadAnchor = useApp((s) => s.unreadAnchor);
  const jumpTarget = useApp((s) => s.jumpTarget);
  const pinned = useApp((s) => s.pinned);
  const pinnedIndex = useApp((s) => s.pinnedIndex);
  const profileOpen = useApp((s) => s.profileOpen);
  const loadNewer = useApp((s) => s.loadNewer);
  const storeJumpTo = useApp((s) => s.jumpTo);
  const clearJump = useApp((s) => s.clearJump);
  const backToLatest = useApp((s) => s.backToLatest);
  const cyclePinned = useApp((s) => s.cyclePinned);
  const setProfileOpen = useApp((s) => s.setProfileOpen);
  const [searchOpen, setSearchOpen] = useState(false);
  const scheduledCount = useApp((s) => s.scheduled.length);
  const [scheduledOpen, setScheduledOpen] = useState(false);
  /** Qaysi chat uchun boshlang'ich joy (o'qilmaganlar yoki oxiri) tanlangan */
  const positionedFor = useRef<number | null>(null);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || messages.length === 0) return;
    if (positionedFor.current !== activeChatId) {
      // Chat ochildi: birinchi o'qilmagan xabarga yoki oxiriga
      positionedFor.current = activeChatId;
      const sep = el.querySelector<HTMLElement>("#unread-separator");
      if (sep) {
        // Yuqoridagi sana belgisi ajratgichni yopmasligi uchun biroz joy qoldiramiz
        el.scrollTop = sep.offsetTop - el.offsetTop - 56;
        nearBottom.current = false;
      } else {
        scrollToBottom();
        nearBottom.current = true;
      }
      return;
    }
    if (heightBeforeOlder.current !== null) {
      // Tepaga eski xabarlar qo'shildi: ko'rinib turgan joy siljimasin
      el.scrollTop += el.scrollHeight - heightBeforeOlder.current;
      heightBeforeOlder.current = null;
    } else if (nearBottom.current) {
      // Yangi xabar kelganda faqat foydalanuvchi pastda turgan bo'lsa pastga tushamiz
      scrollToBottom();
    }
  }, [messages, activeChatId]);

  // Xabarga o'tish (qadalgan, javob, qidiruv): markazga keltirib, qisqa yoritamiz
  useEffect(() => {
    if (jumpTarget === null) return;
    const el = document.getElementById(`msg-${jumpTarget}`);
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.animate([{ backgroundColor: "var(--accent-soft)" }, { backgroundColor: "transparent" }], { duration: 1400 });
    }
    clearJump();
  }, [jumpTarget, messages, clearJump]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(clearError, 6000);
    return () => clearTimeout(timer);
  }, [error, clearError]);

  // Esc — tanlashni bekor qiladi (ochiq dialog yoki menyu bo'lmasa)
  useEffect(() => {
    if (!selection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !forwarding && !deleting && !menu) setSelection(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, forwarding, deleting, menu]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setShowDown(!nearBottom.current || hasNewer);
    if (nearBottom.current && hasNewer) void loadNewer();
    if (el.scrollTop < 200 && hasMore && !loadingOlder && !loading) {
      heightBeforeOlder.current = el.scrollHeight;
      void loadOlder();
    }
  }

  if (activeChatId === null) return <EmptyState />;

  const title = chat ? chatTitle(chat) : "Chat";
  const kind: ChatKind = chat?.kind ?? (activeChatId < 0 ? "group" : "user");
  const inGroup = kind === "group";
  const readMaxId = chat?.readOutboxMaxId ?? 0;
  const convertAll = convertedChat === activeChatId;
  const sub = subtitle(chat, kind, isTyping);
  // Kanal va supergruppalarda xabar doim hamma uchun o'chadi
  const canChooseDelete = activeChatId > -1_000_000_000_000;
  const flipKey = (m: MessageItem) => `${m.chatId}:${m.id}`;

  const jumpTo = (id: number) => void storeJumpTo(id);
  const currentPinned = pinned[pinnedIndex] ?? null;

  const selected = selection?.chatId === activeChatId ? selection.ids : null;
  const selectedMsgs = selected ? messages.filter((m) => selected.has(m.id)) : [];
  /** Albom bitta qator bo'lib ko'rinadi — uni tanlash barcha qismlarini tanlaydi */
  const idsOf = (msg: MessageItem) => rows.find((r) => r.msg.id === msg.id)?.album?.map((m) => m.id) ?? [msg.id];

  function toggleSelect(ids: number[]) {
    const base = selected ?? new Set<number>();
    const next = new Set(base);
    const on = ids.some((id) => !base.has(id));
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    setSelection(next.size ? { chatId: activeChatId!, ids: next } : null);
  }

  function actionsFor(msg: MessageItem): MenuAction[] {
    const list: MenuAction[] = [{ key: "reply", label: "Javob berish", icon: "reply", run: () => setReplyTo(msg) }];
    if (msg.text) {
      list.push({ key: "copy", label: "Nusxa olish", icon: "copy", run: () => void navigator.clipboard.writeText(msg.text) });
      list.push({
        key: "script", label: "Lotin ↔ kirill", icon: "script",
        run: () =>
          setFlipped((prev) => {
            const next = new Set(prev);
            if (!next.delete(flipKey(msg))) next.add(flipKey(msg));
            return next;
          }),
      });
      if (aiReady) {
        list.push({ key: "translate", label: "AI tarjima", icon: "globe", run: () => openAi({ kind: "translate", text: msg.text }) });
      }
    }
    if (msg.outgoing && msg.text) {
      list.push({ key: "edit", label: "Tahrirlash", icon: "edit", run: () => setEditing(msg) });
    }
    list.push({ key: "forward", label: "Uzatish", icon: "forward", run: () => setForwarding([msg]) });
    list.push({ key: "select", label: "Tanlash", icon: "checkCircle", run: () => toggleSelect(idsOf(msg)) });
    list.push({ key: "delete", label: "O'chirish", icon: "trash", danger: true, run: () => setDeleting([msg]) });
    return list;
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void sendFile(file, "").catch(() => {});
  }

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragOver(false);
      }}
      onDrop={onDrop}
    >
      <header className="flex items-center gap-2 border-b border-border bg-bg px-3 py-2">
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
        <button
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-0.5 text-left"
          aria-label="Profilni ochish"
          onClick={() => setProfileOpen(!profileOpen)}
        >
          <Avatar id={activeChatId} title={title} size={40} saved={chat?.isSelf} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1">
              <span className="truncate font-medium leading-tight">{title}</span>
              {chat?.verified && <Icon name="verified" size={15} className="shrink-0 text-accent" />}
            </span>
            {sub.text && (
              <span className={`block truncate text-sm ${sub.accent ? "text-accent" : "text-muted"}`} aria-live="polite">
                {sub.text}
              </span>
            )}
          </span>
        </button>
        {scheduledCount > 0 && (
          <button
            className={`${headerButton} gap-1 text-accent`}
            title="Rejalashtirilgan xabarlar"
            aria-label={`Rejalashtirilgan xabarlar: ${scheduledCount}`}
            onClick={() => setScheduledOpen(true)}
          >
            <Icon name="clock" />
            {scheduledCount}
          </button>
        )}
        <button
          className={`${headerButton} ${searchOpen ? "bg-accent-soft text-accent" : ""}`}
          title="Chat ichida qidirish"
          aria-label="Chat ichida qidirish"
          aria-pressed={searchOpen}
          onClick={() => setSearchOpen((v) => !v)}
        >
          <Icon name="search" />
        </button>
        {aiReady && (
          <button
            className={headerButton}
            title="AI: suhbat xulosasi"
            aria-label="AI: suhbat xulosasi"
            onClick={() => openAi({ kind: "summary", messages: pickForAi(messages) })}
          >
            <Icon name="sparkle" />
          </button>
        )}
        <button
          className={`${headerButton} ${convertAll ? "bg-accent-soft text-accent" : ""}`}
          title="Barcha xabarlarni lotin ↔ kirillga o'girish"
          aria-label="Barcha xabarlarni lotin yoki kirillga o'girish"
          aria-pressed={convertAll}
          onClick={() => setConvertedChat(convertAll ? null : activeChatId)}
        >
          Aa↔Аа
        </button>
      </header>
      {searchOpen && <ChatSearch chatId={activeChatId} onPick={jumpTo} onClose={() => setSearchOpen(false)} />}
      {currentPinned && (
        <button
          className="flex items-center gap-3 border-b border-border bg-bg px-4 py-1.5 text-left hover:bg-hover"
          onClick={cyclePinned}
          aria-label="Qadalgan xabarga o'tish"
        >
          <span className="flex h-8 flex-col gap-0.5" aria-hidden>
            {pinned.slice(0, 4).map((p, i) => (
              <span key={p.id} className={`w-0.5 flex-1 rounded-full ${i === pinnedIndex % 4 ? "bg-accent" : "bg-accent/30"}`} />
            ))}
          </span>
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-medium text-accent">
              Qadalgan xabar{pinned.length > 1 ? ` ${pinnedIndex + 1}/${pinned.length}` : ""}
            </span>
            <span className="block truncate text-muted">{itemPreview(currentPinned) || "Xabar"}</span>
          </span>
          <Icon name="pin" size={18} className="shrink-0 text-muted" />
        </button>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} onScroll={onScroll} className="chat-wallpaper thin-scroll flex-1 overflow-y-auto px-3 py-3">
          {loading && <p className="py-6 text-center text-sm text-muted">Xabarlar yuklanmoqda…</p>}
          {loadingOlder && <p className="pb-2 text-center text-xs text-muted">Eski xabarlar yuklanmoqda…</p>}
          {!loading && messages.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">Bu yerda hali xabar yo&apos;q</p>
          )}
          <ul className="mx-auto flex max-w-3xl flex-col gap-0.5">
            {rows.map(({ msg, album }, i) => {
              const prev = rows[i - 1]?.msg;
              const next = rows[i + 1]?.msg;
              const newDay = !prev || !isSameDay(prev.date, msg.date);
              const sameAsPrev = !newDay && !!prev && !prev.service && prev.senderId === msg.senderId;
              const sameAsNext =
                !!next && !next.service && next.senderId === msg.senderId && isSameDay(next.date, msg.date);
              return (
                <Fragment key={msg.id}>
                  {unreadAnchor !== null && msg.id > unreadAnchor && !msg.outgoing && (!prev || prev.id <= unreadAnchor) && (
                    <li id="unread-separator" className="my-2 -mx-3 bg-accent/10 py-1 text-center text-xs font-medium text-accent">
                      O&apos;qilmagan xabarlar
                    </li>
                  )}
                  {newDay && (
                    <li className="sticky top-0 z-[1] my-2 self-center rounded-full border border-border bg-bg px-3 py-0.5 text-xs font-medium text-muted">
                      {formatDayLabel(msg.date)}
                    </li>
                  )}
                  <MessageBubble
                    msg={msg}
                    album={album}
                    onOpenMedia={(m) => {
                      const index = gallery.findIndex((g) => g.id === m.id);
                      if (index >= 0) setViewing(index);
                    }}
                    repliedTo={msg.replyToId !== null ? (byId.get(msg.replyToId) ?? null) : null}
                    inGroup={inGroup}
                    first={!sameAsPrev}
                    last={!sameAsNext}
                    read={msg.id <= readMaxId}
                    converted={convertAll !== flipped.has(flipKey(msg))}
                    onMenu={(m, x, y) => setMenu({ msg: m, x, y })}
                    onReact={(m, emoji) => void react(m, emoji)}
                    onJumpTo={jumpTo}
                    selected={selected ? (album ?? [msg]).every((m) => selected.has(m.id)) : undefined}
                    onSelect={() => toggleSelect(idsOf(msg))}
                  />
                </Fragment>
              );
            })}
          </ul>
        </div>
        {(showDown || hasNewer) && (
          <button
            className="absolute bottom-3 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-bg text-muted shadow-md hover:text-text"
            aria-label="Eng so'nggi xabarga tushish"
            onClick={() => (hasNewer ? void backToLatest() : scrollToBottom())}
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
        {selected ? (
          <SelectionBar
            count={selectedMsgs.length}
            onCancel={() => setSelection(null)}
            onCopy={() => {
              void navigator.clipboard.writeText(selectionText(selectedMsgs, kind !== "user"));
              setSelection(null);
            }}
            onForward={() => setForwarding(selectedMsgs)}
            onDelete={() => setDeleting(selectedMsgs)}
          />
        ) : (
          <Composer key={activeChatId} />
        )}
      </div>

      {dragOver && (
        <div className="pointer-events-none absolute inset-2 z-20 flex items-center justify-center rounded-3xl border-2 border-dashed border-accent bg-bg/90 font-serif text-2xl text-accent">
          Faylni shu yerga tashlang
        </div>
      )}
      {menu && (
        <MessageMenu
          msg={byId.get(menu.msg.id) ?? menu.msg}
          x={menu.x}
          y={menu.y}
          actions={actionsFor(menu.msg)}
          onReact={(emoji) => void react(byId.get(menu.msg.id) ?? menu.msg, emoji)}
          onClose={() => setMenu(null)}
        />
      )}
      {viewing !== null && gallery[viewing] && (
        <Lightbox items={gallery} start={viewing} onClose={() => setViewing(null)} />
      )}
      {notice && (
        <p role="status" className="absolute left-1/2 top-16 z-30 max-w-sm -translate-x-1/2 rounded-2xl bg-text px-4 py-2 text-center text-sm text-bg shadow-lg">
          {notice}
        </p>
      )}
      {scheduledOpen && <ScheduledDialog onClose={() => setScheduledOpen(false)} />}
      {forwarding && (
        <ForwardDialog
          msgs={forwarding}
          onClose={() => {
            setForwarding(null);
            setSelection(null);
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          msgs={deleting}
          canChoose={canChooseDelete}
          onClose={() => {
            setDeleting(null);
            setSelection(null);
          }}
        />
      )}
    </div>
  );
}
