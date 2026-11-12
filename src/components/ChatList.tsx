"use client";

import { useEffect, useMemo, useState } from "react";
import { buildFolders, filterChats, unreadChats } from "@/lib/chats";
import { formatChatDate } from "@/lib/format";
import { searchGlobal, searchPublic, type GlobalHit, type PeerHit } from "@/lib/telegram/api";
import { itemPreview, type ChatItem } from "@/lib/telegram/types";
import { useApp, type ChatAction } from "@/store/app";
import { Avatar } from "./Avatar";
import { Dialog, primaryButton, secondaryButton } from "./Dialog";
import { Icon } from "./Icon";
import { PopupMenu, type MenuAction } from "./PopupMenu";
import { SideMenu } from "./SideMenu";

export const chatTitle = (c: ChatItem) => (c.isSelf ? "Saqlangan xabarlar" : c.title);

function ChatRow({
  chat, active: activeProp, typing, onOpen, onMenu, selected,
}: {
  chat: ChatItem;
  active: boolean;
  typing: boolean;
  onOpen: () => void;
  onMenu: (x: number, y: number) => void;
  /** Ko'p tanlash rejimi: undefined — o'chiq */
  selected?: boolean;
}) {
  const selecting = selected !== undefined;
  // Tanlash rejimida ochiq chat ajratib ko'rsatilmaydi
  const active = activeProp && !selecting;
  const sub = active ? "text-accent-text/80" : "text-muted";
  const prefix = chat.lastOutgoing
    ? "Siz: "
    : chat.kind === "group" && chat.lastSender
      ? `${chat.lastSender.split(" ")[0]}: `
      : "";
  const read = chat.lastOutgoing && chat.readOutboxMaxId >= chat.lastId && chat.lastId > 0;
  const badge = "min-w-5 shrink-0 rounded-full px-1.5 text-center text-xs font-medium leading-5";
  const badgeColor = active ? "bg-accent-text text-accent" : chat.muted ? "bg-hover text-muted" : "bg-accent text-accent-text";

  let preview;
  if (typing) {
    preview = <span className={active ? "" : "text-accent"}>yozmoqda…</span>;
  } else if (chat.draft && !active) {
    preview = (
      <>
        <span className="text-danger">Qoralama: </span>
        {chat.draft}
      </>
    );
  } else {
    preview = (
      <>
        {prefix && <span className={active ? "" : "text-text"}>{prefix}</span>}
        {chat.lastText}
      </>
    );
  }

  return (
    <li>
      <button
        aria-current={active || undefined}
        aria-pressed={selecting ? selected : undefined}
        className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left ${
          active ? "bg-accent text-accent-text" : selected ? "bg-accent-soft" : "hover:bg-hover"
        }`}
        onClick={onOpen}
        onContextMenu={(e) => {
          e.preventDefault();
          onMenu(e.clientX, e.clientY);
        }}
      >
        <span className="relative shrink-0">
          <Avatar id={chat.id} title={chat.title} saved={chat.isSelf} online={chat.presence === "online" && !selecting} />
          {selecting && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-bg ${
                selected ? "bg-accent text-accent-text" : "bg-panel"
              }`}
              aria-hidden
            >
              {selected && <Icon name="check" size={12} />}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="min-w-0 truncate font-medium">{chatTitle(chat)}</span>
            {chat.verified && <Icon name="verified" size={15} className={`shrink-0 ${active ? "" : "text-accent"}`} />}
            {chat.muted && <Icon name="mute" size={14} className={`shrink-0 ${sub}`} />}
            <span className="flex-1" />
            {chat.lastOutgoing && (
              <Icon name={read ? "checks" : "check"} size={16} className={`shrink-0 ${active ? "text-accent-text" : "text-accent"}`} />
            )}
            {chat.lastDate !== null && <span className={`shrink-0 text-xs ${sub}`}>{formatChatDate(chat.lastDate)}</span>}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5">
            <span className={`min-w-0 flex-1 truncate text-sm ${sub}`}>{preview}</span>
            {chat.mentions > 0 && (
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${active ? "bg-accent-text text-accent" : "bg-accent text-accent-text"}`} aria-label="Sizni eslatishgan">
                <Icon name="at" size={13} />
              </span>
            )}
            {chat.unread > 0 ? (
              <span className={`${badge} ${badgeColor}`}>{chat.unread > 999 ? "999+" : chat.unread}</span>
            ) : chat.markedUnread ? (
              <span className={`h-5 w-5 shrink-0 rounded-full ${badgeColor}`} aria-label="O'qilmagan deb belgilangan" />
            ) : (
              chat.pinned && <Icon name="pin" size={15} className={`shrink-0 ${sub}`} />
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

function chatActions(chat: ChatItem, run: (a: ChatAction) => void, askDelete: () => void, select: () => void): MenuAction[] {
  const list: MenuAction[] = [{ key: "select", label: "Tanlash", icon: "checkCircle", run: select }];
  if (!chat.archived) {
    list.push(chat.pinned
      ? { key: "unpin", label: "Qadashni olib tashlash", icon: "pin", run: () => run("unpin") }
      : { key: "pin", label: "Qadash", icon: "pin", run: () => run("pin") });
  }
  if (!chat.isSelf) {
    list.push(chat.muted
      ? { key: "unmute", label: "Ovozni yoqish", icon: "mute", run: () => run("unmute") }
      : { key: "mute", label: "Ovozsiz qilish", icon: "mute", run: () => run("mute") });
  }
  list.push(chat.unread > 0 || chat.markedUnread
    ? { key: "read", label: "O'qilgan deb belgilash", icon: "checks", run: () => run("read") }
    : { key: "unread", label: "O'qilmagan deb belgilash", icon: "mark", run: () => run("unread") });
  if (!chat.isSelf) {
    list.push(chat.archived
      ? { key: "unarchive", label: "Arxivdan chiqarish", icon: "archive", run: () => run("unarchive") }
      : { key: "archive", label: "Arxivlash", icon: "archive", run: () => run("archive") });
  }
  list.push({
    key: "delete",
    label: chat.kind === "user" || chat.kind === "bot" ? "Chatni o'chirish" : chat.kind === "channel" ? "Kanalni tark etish" : "Guruhni tark etish",
    icon: "trash",
    danger: true,
    run: askDelete,
  });
  return list;
}

function DeleteChatDialog({ chat, onClose }: { chat: ChatItem; onClose: () => void }) {
  const chatAction = useApp((s) => s.chatAction);
  const personal = chat.kind === "user" && !chat.isSelf;
  const leave = chat.kind === "group" || chat.kind === "channel";
  const go = (a: ChatAction) => {
    onClose();
    void chatAction(chat.id, a);
  };
  return (
    <Dialog title={leave ? `«${chat.title}» dan chiqish` : "Chatni o'chirish"} onClose={onClose}>
      <p className="text-muted">
        {leave
          ? "Guruh yoki kanalni tark etasiz va u ro'yxatdan o'chadi."
          : `«${chatTitle(chat)}» bilan yozishmalar o'chiriladi. Bu amalni qaytarib bo'lmaydi.`}
      </p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button className={secondaryButton} onClick={onClose}>
          Bekor qilish
        </button>
        {personal && (
          <button className={secondaryButton} onClick={() => go("delete")}>
            Faqat menda
          </button>
        )}
        <button className={`${primaryButton} bg-danger hover:bg-danger`} onClick={() => go(personal ? "delete-both" : "delete")}>
          {leave ? "Tark etish" : personal ? "Ikkala tomonda" : "O'chirish"}
        </button>
      </div>
    </Dialog>
  );
}

function DeleteChatsDialog({ chats, onDone, onClose }: { chats: ChatItem[]; onDone: () => void; onClose: () => void }) {
  const chatAction = useApp((s) => s.chatAction);
  const [busy, setBusy] = useState(false);
  const leaves = chats.filter((c) => c.kind === "group" || c.kind === "channel").length;
  const deletes = chats.length - leaves;
  const go = async () => {
    setBusy(true);
    // Ketma-ket: Telegram bir vaqtdagi ko'p so'rovni cheklashi mumkin
    for (const c of chats) await chatAction(c.id, "delete").catch(() => {});
    onDone();
    onClose();
  };
  return (
    <Dialog title={`${chats.length} ta chat`} onClose={onClose}>
      <p className="text-muted">
        {[deletes ? `${deletes} ta chat sizda o'chiriladi` : "", leaves ? `${leaves} ta guruh/kanal tark etiladi` : ""]
          .filter(Boolean)
          .join(", ")}
        . Bu amalni qaytarib bo&apos;lmaydi.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button className={secondaryButton} onClick={onClose} disabled={busy}>
          Bekor qilish
        </button>
        <button className={`${primaryButton} bg-danger hover:bg-danger`} disabled={busy} onClick={() => void go()}>
          {busy ? "Bajarilmoqda…" : "O'chirish"}
        </button>
      </div>
    </Dialog>
  );
}

/** Tanlangan chatlar uchun amallar paneli. */
function ChatSelectionBar({
  chats, onCancel, onDelete,
}: { chats: ChatItem[]; onCancel: () => void; onDelete: () => void }) {
  const chatAction = useApp((s) => s.chatAction);
  const allMuted = chats.length > 0 && chats.every((c) => c.muted || c.isSelf);
  const allArchived = chats.length > 0 && chats.every((c) => c.archived);
  const anyUnread = chats.some((c) => c.unread > 0 || c.markedUnread);
  const run = (a: ChatAction, filter: (c: ChatItem) => boolean = () => true) => {
    for (const c of chats.filter(filter)) void chatAction(c.id, a).catch(() => {});
    onCancel();
  };
  const btn = "flex h-9 w-9 items-center justify-center rounded-full hover:bg-hover disabled:opacity-40";
  return (
    <div className="flex items-center gap-1 border-b border-border bg-bg px-2 py-1.5" role="toolbar" aria-label="Tanlangan chatlar">
      <button className={`${btn} text-muted`} aria-label="Tanlashni bekor qilish" onClick={onCancel}>
        <Icon name="close" size={18} />
      </button>
      <span className="flex-1 text-sm font-medium" aria-live="polite">
        {chats.length} ta tanlandi
      </span>
      <button className={btn} title={anyUnread ? "O'qilgan deb belgilash" : "O'qilmagan deb belgilash"} aria-label={anyUnread ? "O'qilgan deb belgilash" : "O'qilmagan deb belgilash"} disabled={!chats.length} onClick={() => run(anyUnread ? "read" : "unread")}>
        <Icon name={anyUnread ? "checks" : "mark"} size={18} />
      </button>
      <button className={btn} title={allMuted ? "Ovozni yoqish" : "Ovozsiz qilish"} aria-label={allMuted ? "Ovozni yoqish" : "Ovozsiz qilish"} disabled={!chats.length} onClick={() => run(allMuted ? "unmute" : "mute", (c) => !c.isSelf)}>
        <Icon name="mute" size={18} />
      </button>
      <button className={btn} title={allArchived ? "Arxivdan chiqarish" : "Arxivlash"} aria-label={allArchived ? "Arxivdan chiqarish" : "Arxivlash"} disabled={!chats.length} onClick={() => run(allArchived ? "unarchive" : "archive", (c) => !c.isSelf)}>
        <Icon name="archive" size={18} />
      </button>
      <button className={`${btn} text-danger`} title="O'chirish" aria-label="O'chirish" disabled={!chats.length} onClick={onDelete}>
        <Icon name="trash" size={18} />
      </button>
    </div>
  );
}

function formatMembers(hit: PeerHit): string {
  if (hit.kind === "user" || hit.kind === "bot") return hit.username ? `@${hit.username}` : hit.kind === "bot" ? "bot" : "";
  const n = hit.members;
  const count = n === null ? "" : n >= 1000 ? `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K` : String(n);
  const noun = hit.kind === "channel" ? "obunachi" : "a'zo";
  return [hit.username ? `@${hit.username}` : "", count ? `${count} ${noun}` : ""].filter(Boolean).join(" · ");
}

/** Qidiruvda: ro'yxatda yo'q kontaktlar va ommaviy kanal/guruh/foydalanuvchilar. */
function PeerHits({ query, exclude }: { query: string; exclude: ReadonlySet<number> }) {
  const openPeer = useApp((s) => s.openPeer);
  const [hits, setHits] = useState<PeerHit[] | null>(null);
  const q = query.trim().replace(/^@/, "");

  useEffect(() => {
    if (q.length < 2) return;
    let alive = true;
    const timer = setTimeout(() => {
      searchPublic(q).then(
        (h) => alive && setHits(h),
        () => alive && setHits([]),
      );
    }, 350);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q]);

  const shown = hits?.filter((h) => !exclude.has(h.id)) ?? [];
  if (q.length < 2 || shown.length === 0) return null;
  return (
    <>
      <li className="px-2.5 pb-1 pt-3 text-xs font-medium text-muted">Global qidiruv</li>
      {shown.map((h) => (
        <li key={h.id}>
          <button className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-hover" onClick={() => void openPeer(h)}>
            <Avatar id={h.id} title={h.title} size={42} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1">
                <span className="truncate font-medium">{h.title}</span>
                {h.verified && <Icon name="verified" size={15} className="shrink-0 text-accent" />}
              </span>
              <span className="block truncate text-sm text-muted">{formatMembers(h)}</span>
            </span>
          </button>
        </li>
      ))}
    </>
  );
}

/** Qidiruvda: barcha chatlardagi xabarlar (Telegram serveridan). */
function MessageHits({ query }: { query: string }) {
  const openChatAt = useApp((s) => s.openChatAt);
  const [hits, setHits] = useState<GlobalHit[] | null>(null);
  const [failed, setFailed] = useState(false);
  const q = query.trim();

  useEffect(() => {
    if (q.length < 2) return;
    let alive = true;
    const timer = setTimeout(() => {
      searchGlobal(q).then(
        (h) => alive && (setHits(h), setFailed(false)),
        () => alive && setFailed(true),
      );
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q]);

  if (q.length < 2) return null;
  return (
    <>
      <li className="px-2.5 pb-1 pt-3 text-xs font-medium text-muted">Xabarlar</li>
      {failed && <li className="px-2.5 py-2 text-sm text-muted">Qidirib bo&apos;lmadi</li>}
      {!failed && !hits && <li className="px-2.5 py-2 text-sm text-muted">Qidirilmoqda…</li>}
      {hits?.length === 0 && <li className="px-2.5 py-2 text-sm text-muted">Xabar topilmadi</li>}
      {hits?.map(({ msg, chatTitle: title }) => (
        <li key={`${msg.chatId}:${msg.id}`}>
          <button className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-hover" onClick={() => void openChatAt(msg.chatId, msg.id)}>
            <Avatar id={msg.chatId} title={title} size={42} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
                <span className="shrink-0 text-xs text-muted">{formatChatDate(msg.date)}</span>
              </span>
              <span className="block truncate text-sm text-muted">{itemPreview(msg)}</span>
            </span>
          </button>
        </li>
      ))}
    </>
  );
}

export function ChatList() {
  const allChats = useApp((s) => s.chats);
  const activeChatId = useApp((s) => s.activeChatId);
  // Qidiruvdan ochilgan (a'zo bo'lmagan) chat faqat ochiq turganda ko'rinadi
  const chats = useMemo(() => allChats.filter((c) => !c.ephemeral || c.id === activeChatId), [allChats, activeChatId]);
  const openChat = useApp((s) => s.openChat);
  const chatAction = useApp((s) => s.chatAction);
  const typing = useApp((s) => s.typing);
  const error = useApp((s) => s.error);
  const rules = useApp((s) => s.folders);
  const [query, setQuery] = useState("");
  const [folderKey, setFolderKey] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [archive, setArchive] = useState(false);
  const [rowMenu, setRowMenu] = useState<{ chat: ChatItem; x: number; y: number } | null>(null);
  const [deleting, setDeleting] = useState<ChatItem | null>(null);
  const [selection, setSelection] = useState<ReadonlySet<number> | null>(null);
  const [deletingMany, setDeletingMany] = useState(false);
  const toggle = (id: number) =>
    setSelection((sel) => {
      const next = new Set(sel ?? []);
      if (!next.delete(id)) next.add(id);
      return next.size ? next : null;
    });

  useEffect(() => {
    if (!selection) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !deletingMany && setSelection(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, deletingMany]);

  const folders = useMemo(() => buildFolders(rules), [rules]);
  // Tanlangan papka Telegram'da o'chirilgan bo'lsa — "Hammasi"
  const folder = folders.find((f) => f.key === folderKey) ?? folders[0];
  const archived = useMemo(() => chats.filter((c) => c.archived), [chats]);
  const visible = useMemo(
    () => (archive && !query ? archived : filterChats(chats, folder, query)),
    [archive, archived, chats, folder, query],
  );
  const archiveUnread = archived.filter((c) => c.unread > 0 || c.markedUnread).length;
  const showArchiveRow = !archive && !query && folder.key === "all" && archived.length > 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-panel">
      <header className="flex items-center gap-2 px-3 pb-2 pt-3">
        {archive ? (
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-text"
            aria-label="Arxivdan chiqish"
            onClick={() => setArchive(false)}
          >
            <Icon name="back" />
          </button>
        ) : (
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-text"
            aria-label="Menyu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name="menu" />
          </button>
        )}
        {archive && !query ? (
          <h2 className="flex-1 font-serif text-xl">Arxiv</h2>
        ) : null}
        <label className={`flex h-10 min-w-0 items-center gap-2 rounded-full border border-border bg-bg px-3 focus-within:border-accent ${archive && !query ? "w-10 justify-center px-0" : "flex-1"}`}>
          <Icon name="search" size={17} className="shrink-0 text-muted" />
          <input
            className={`min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted ${archive && !query ? "w-0 flex-none" : ""}`}
            type="search"
            placeholder="Qidirish"
            aria-label="Chatlarni qidirish"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </header>
      {menuOpen && <SideMenu onClose={() => setMenuOpen(false)} />}

      {!archive && (
        <nav aria-label="Papkalar" className="flex overflow-x-auto border-b border-border px-2">
          {folders.map((f) => {
            const count = unreadChats(chats, f);
            const selected = folder.key === f.key;
            return (
              <button
                key={f.key}
                aria-pressed={selected}
                className={`flex flex-1 shrink-0 items-center justify-center gap-1 whitespace-nowrap border-b-2 px-2 pb-2 pt-1.5 text-sm font-medium ${
                  selected ? "border-accent text-accent" : "border-transparent text-muted hover:text-text"
                }`}
                onClick={() => setFolderKey(f.key)}
              >
                {f.label}
                {count > 0 && (
                  <span className={`min-w-[18px] rounded-full px-1 text-center text-[11px] leading-[18px] ${selected ? "bg-accent text-accent-text" : "bg-hover text-muted"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      {selection && (
        <ChatSelectionBar
          chats={allChats.filter((c) => selection.has(c.id))}
          onCancel={() => setSelection(null)}
          onDelete={() => setDeletingMany(true)}
        />
      )}
      <ul className="thin-scroll flex-1 space-y-0.5 overflow-y-auto p-2">
        {showArchiveRow && (
          <li>
            <button className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-hover" onClick={() => setArchive(true)}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-hover text-muted">
                <Icon name="archive" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">Arxiv</span>
                <span className="block truncate text-sm text-muted">{archived.map(chatTitle).join(", ")}</span>
              </span>
              {archiveUnread > 0 && (
                <span className="min-w-5 shrink-0 rounded-full bg-hover px-1.5 text-center text-xs font-medium leading-5 text-muted">{archiveUnread}</span>
              )}
            </button>
          </li>
        )}
        {query.trim() && <li className="px-2.5 pb-1 pt-1 text-xs font-medium text-muted">Chatlar</li>}
        {visible.map((chat) => (
          <ChatRow
            key={chat.id}
            chat={chat}
            active={chat.id === activeChatId}
            typing={chat.id in typing}
            onOpen={() => (selection ? toggle(chat.id) : void openChat(chat.id))}
            onMenu={(x, y) => setRowMenu({ chat, x, y })}
            selected={selection ? selection.has(chat.id) : undefined}
          />
        ))}
        {visible.length === 0 && !query.trim() && (
          <li className="p-6 text-center text-sm text-muted">
            {chats.length === 0 ? "Chatlar yuklanmoqda…" : archive ? "Arxiv bo'sh" : "Hech narsa topilmadi"}
          </li>
        )}
        {query.trim() && visible.length === 0 && <li className="px-2.5 py-2 text-sm text-muted">Chat topilmadi</li>}
        {query.trim() && <PeerHits key={`p:${query.trim()}`} query={query} exclude={new Set(visible.map((c) => c.id))} />}
        {query.trim() && <MessageHits key={query.trim()} query={query} />}
      </ul>

      {error && activeChatId === null && (
        <p role="alert" className="mx-3 mb-3 rounded-xl bg-danger-soft px-4 py-2 text-sm text-danger">{error}</p>
      )}
      {rowMenu && (
        <PopupMenu
          x={rowMenu.x}
          y={rowMenu.y}
          label="Chat amallari"
          actions={chatActions(
            rowMenu.chat,
            (a) => void chatAction(rowMenu.chat.id, a),
            () => setDeleting(rowMenu.chat),
            () => toggle(rowMenu.chat.id),
          )}
          onClose={() => setRowMenu(null)}
        />
      )}
      {deleting && <DeleteChatDialog chat={deleting} onClose={() => setDeleting(null)} />}
      {deletingMany && selection && (
        <DeleteChatsDialog
          chats={allChats.filter((c) => selection.has(c.id))}
          onDone={() => setSelection(null)}
          onClose={() => setDeletingMany(false)}
        />
      )}
    </div>
  );
}
