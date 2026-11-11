"use client";

import { useEffect, useState } from "react";
import { galleryItems } from "@/lib/messages";
import * as tg from "@/lib/telegram/api";
import { avatarUrl } from "@/lib/telegram/media";
import type { MessageItem } from "@/lib/telegram/types";
import { useApp } from "@/store/app";
import { Avatar } from "./Avatar";
import { chatTitle } from "./ChatList";
import { Icon, type IconName } from "./Icon";
import { Lightbox, MediaTile, MediaView } from "./MediaView";
import { RichText } from "./RichText";

type Tab = "media" | "files" | "links" | "voice" | "members";

const TABS: { id: Tab; label: string }[] = [
  { id: "media", label: "Media" },
  { id: "files", label: "Fayllar" },
  { id: "links", label: "Havolalar" },
  { id: "voice", label: "Ovozlar" },
  { id: "members", label: "A'zolar" },
];

function InfoRow({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 rounded-xl px-3 py-2 hover:bg-hover">
      <Icon name={icon} className="mt-0.5 shrink-0 text-muted" />
      <div className="min-w-0">
        <div className="whitespace-pre-wrap break-words">{children}</div>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

function BigAvatar({ id, title, saved }: { id: number; title: string; saved: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (saved) return;
    let alive = true;
    avatarUrl(id, true).then((u) => alive && setUrl(u), () => {});
    return () => {
      alive = false;
    };
  }, [id, saved]);
  // eslint-disable-next-line @next/next/no-img-element -- blob URL
  if (url) return <img src={url} alt="" className="h-28 w-28 rounded-full object-cover" />;
  return <Avatar id={id} title={title} size={112} saved={saved} />;
}

function SharedList({ chatId, tab }: { chatId: number; tab: Exclude<Tab, "members"> }) {
  const jumpTo = useApp((s) => s.jumpTo);
  const [items, setItems] = useState<MessageItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    tg.loadShared(chatId, tab).then(
      (list) => alive && setItems(list),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [chatId, tab]);

  if (failed) return <p className="p-6 text-center text-sm text-muted">Yuklab bo&apos;lmadi</p>;
  if (!items) return <p className="p-6 text-center text-sm text-muted">Yuklanmoqda…</p>;
  if (items.length === 0) return <p className="p-6 text-center text-sm text-muted">Hali hech narsa yo&apos;q</p>;

  if (tab === "media") {
    const gallery = galleryItems([...items].reverse());
    return (
      <>
        <div className="grid grid-cols-3 gap-0.5 p-1">
          {items.filter((m) => m.media).map((m) => (
            <div key={m.id} className="aspect-square">
              <MediaTile msg={m} fill onOpen={() => setViewing(gallery.findIndex((g) => g.id === m.id))} />
            </div>
          ))}
        </div>
        {viewing !== null && viewing >= 0 && <Lightbox items={gallery} start={viewing} onClose={() => setViewing(null)} />}
      </>
    );
  }

  return (
    <ul className="space-y-1 p-2">
      {items.map((m) => (
        <li key={m.id} className="rounded-xl px-2 py-2 hover:bg-hover">
          {tab === "links" ? (
            <button className="block w-full text-left text-sm" onClick={() => void jumpTo(m.id)}>
              {m.webpage?.title && <span className="block font-medium">{m.webpage.title}</span>}
              <span className="line-clamp-3 break-words text-muted">
                <RichText text={m.text} entities={m.entities} />
              </span>
            </button>
          ) : (
            <MediaView msg={m} onOpen={() => {}} />
          )}
          <p className="mt-1 text-xs text-muted">
            {m.senderName} · {new Date(m.date).toLocaleDateString("ru-RU")}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Members({ chatId }: { chatId: number }) {
  const openChat = useApp((s) => s.openChat);
  const [list, setList] = useState<tg.Member[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    tg.loadMembers(chatId).then(
      (m) => alive && setList(m),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [chatId]);
  if (failed) return <p className="p-6 text-center text-sm text-muted">A&apos;zolar ro&apos;yxati yopiq</p>;
  if (!list) return <p className="p-6 text-center text-sm text-muted">Yuklanmoqda…</p>;
  return (
    <ul className="p-2">
      {list.map((m) => (
        <li key={m.id}>
          <button className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-hover" onClick={() => void openChat(m.id)}>
            <Avatar id={m.id} title={m.name} size={40} online={m.presence === "online"} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{m.name}</span>
              <span className={`block text-xs ${m.presence === "online" ? "text-accent" : "text-muted"}`}>
                {m.presence === "online" ? "onlayn" : m.presence === "recently" ? "yaqinda bo'lgan" : "uzoq vaqt oldin"}
              </span>
            </span>
            {m.role !== "member" && <span className="text-xs text-accent">{m.role === "creator" ? "egasi" : "admin"}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ProfilePanel() {
  const chat = useApp((s) => s.chats.find((c) => c.id === s.activeChatId) ?? null);
  const chatId = useApp((s) => s.activeChatId);
  const close = useApp((s) => s.setProfileOpen);
  const chatAction = useApp((s) => s.chatAction);
  const [profile, setProfile] = useState<tg.Profile | null>(null);
  const [tab, setTab] = useState<Tab>("media");

  useEffect(() => {
    if (chatId === null) return;
    let alive = true;
    tg.loadProfile(chatId).then((p) => alive && setProfile(p), () => {});
    return () => {
      alive = false;
      setProfile(null);
    };
  }, [chatId]);

  if (chatId === null) return null;
  const title = chat ? chatTitle(chat) : "Chat";
  const isGroup = chat?.kind === "group" || chat?.kind === "channel";
  const tabs = TABS.filter((t) => t.id !== "members" || chat?.kind === "group");
  const current = tabs.some((t) => t.id === tab) ? tab : "media";
  const status = chat?.isSelf
    ? ""
    : isGroup
      ? [profile?.members && `${profile.members.toLocaleString("ru-RU")} a'zo`, profile?.online && `${profile.online} onlayn`].filter(Boolean).join(", ")
      : chat?.presence === "online" ? "onlayn" : chat?.presence === "recently" ? "yaqinda bo'lgan" : chat?.kind === "bot" ? "bot" : "";

  return (
    <aside className="flex h-full w-full flex-col border-l border-border bg-bg" aria-label="Profil">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-text" aria-label="Profilni yopish" onClick={() => close(false)}>
          <Icon name="close" />
        </button>
        <h2 className="font-serif text-xl">Ma&apos;lumot</h2>
      </header>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center gap-1 px-4 pb-4 pt-6 text-center">
          <BigAvatar id={chatId} title={chat?.title ?? ""} saved={!!chat?.isSelf} />
          <h3 className="mt-3 flex items-center gap-1 text-xl font-medium">
            {title}
            {chat?.verified && <Icon name="verified" size={18} className="text-accent" />}
          </h3>
          {status && <p className={`text-sm ${chat?.presence === "online" ? "text-accent" : "text-muted"}`}>{status}</p>}
        </div>
        <div className="space-y-0.5 px-2 pb-2">
          {profile?.bio && (
            <InfoRow icon="file" label={isGroup ? "Tavsif" : "Bio"}>
              {profile.bio}
            </InfoRow>
          )}
          {profile?.username && (
            <InfoRow icon="at" label="Foydalanuvchi nomi">
              <a href={`https://t.me/${profile.username}`} target="_blank" rel="noopener noreferrer" className="text-accent">
                @{profile.username}
              </a>
            </InfoRow>
          )}
          {profile?.phone && (
            <InfoRow icon="user" label="Telefon">
              <a href={`tel:+${profile.phone}`} className="hover:text-accent">+{profile.phone}</a>
            </InfoRow>
          )}
          {chat && !chat.isSelf && (
            <button
              className="flex w-full items-center gap-4 rounded-xl px-3 py-2 text-left hover:bg-hover"
              onClick={() => void chatAction(chat.id, chat.muted ? "unmute" : "mute")}
            >
              <Icon name="mute" className="shrink-0 text-muted" />
              <span className="flex-1">Bildirishnomalar</span>
              <span className={`relative h-6 w-10 rounded-full transition-colors ${chat.muted ? "bg-hover" : "bg-accent"}`} role="switch" aria-checked={!chat.muted} aria-label="Bildirishnomalar">
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${chat.muted ? "left-0.5" : "left-[18px]"}`} />
              </span>
            </button>
          )}
        </div>
        <nav className="sticky top-0 z-[1] flex overflow-x-auto border-b border-border bg-bg px-2" aria-label="Umumiy fayllar">
          {tabs.map((t) => (
            <button
              key={t.id}
              aria-pressed={current === t.id}
              className={`flex-1 shrink-0 whitespace-nowrap border-b-2 px-1.5 pb-2 pt-2 text-sm font-medium ${current === t.id ? "border-accent text-accent" : "border-transparent text-muted hover:text-text"}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        {current === "members" ? <Members chatId={chatId} /> : <SharedList key={`${chatId}:${current}`} chatId={chatId} tab={current} />}
      </div>
    </aside>
  );
}
