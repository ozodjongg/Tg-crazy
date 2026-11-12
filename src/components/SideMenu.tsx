"use client";

import { useEffect, useState } from "react";
import { useApp, type Theme } from "@/store/app";
import { useServices } from "@/store/services";
import { Avatar } from "./Avatar";
import { Icon, type IconName } from "./Icon";
import { SettingsDialog } from "./SettingsDialog";
import { NewChatDialog, type NewChatMode } from "./NewChatDialog";

const THEMES: { id: Theme; label: string; icon: IconName }[] = [
  { id: "system", label: "Tizim", icon: "monitor" },
  { id: "light", label: "Och", icon: "sun" },
  { id: "dark", label: "To'q", icon: "moon" },
];

/** Tg-crazy xizmatlari (backend): ulanish holati, tarif va AI limiti. */
function Services() {
  const status = useServices((s) => s.status);
  const profile = useServices((s) => s.profile);
  const error = useServices((s) => s.error);
  const connect = useServices((s) => s.connect);
  const disconnect = useServices((s) => s.disconnect);
  const [asking, setAsking] = useState(false);

  if (status === "off") return null;

  return (
    <>
      <p className="px-2 pb-1 pt-2 text-xs text-muted">Tg-crazy xizmatlari</p>
      <div className="rounded-xl bg-panel p-3 text-sm">
        {status === "checking" && <p className="text-muted">Tekshirilmoqda…</p>}
        {status === "unavailable" && <p className="text-muted">Hozircha mavjud emas</p>}
        {status === "connecting" && <p className="text-muted" role="status">Bot tasdig&apos;i kutilmoqda…</p>}
        {status === "connected" && profile && (
          <>
            <p className="flex items-center justify-between">
              <span className="font-medium">{profile.subscription.plan.name} tarifi</span>
              {profile.subscription.expires_at && (
                <span className="text-xs text-muted">
                  {new Date(profile.subscription.expires_at).toLocaleDateString("ru-RU")} gacha
                </span>
              )}
            </p>
            <p className="mt-1 text-muted">
              {profile.ai_enabled ? `AI: bugun ${profile.ai.used} / ${profile.ai.limit}` : "AI hozircha o'chiq"}
            </p>
            <button className="mt-2 text-xs text-muted underline hover:text-text" onClick={() => void disconnect()}>
              Xizmatlardan uzish
            </button>
          </>
        )}
        {status === "disconnected" && !asking && (
          <>
            <p className="text-muted">AI yordamchi va sozlamalar sinxroni.</p>
            <button className="mt-2 font-medium text-accent hover:text-accent-hover" onClick={() => setAsking(true)}>
              Ulanish
            </button>
          </>
        )}
        {status === "disconnected" && asking && (
          <>
            <p>
              Kimligingizni tasdiqlash uchun akkauntingizdan Tg-crazy botiga bitta xabar (bir martalik kod)
              yuboriladi. Sessiyangiz va yozishmalaringiz serverga uzatilmaydi.
            </p>
            <div className="mt-2 flex gap-3">
              <button
                className="font-medium text-accent hover:text-accent-hover"
                onClick={() => {
                  setAsking(false);
                  void connect();
                }}
              >
                Roziman, ulash
              </button>
              <button className="text-muted hover:text-text" onClick={() => setAsking(false)}>
                Bekor qilish
              </button>
            </div>
          </>
        )}
        {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
      </div>
      <div className="my-2 border-t border-border" />
    </>
  );
}

export function SideMenu({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState(false);
  const [newChat, setNewChat] = useState<NewChatMode | null>(null);
  const me = useApp((s) => s.me);
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);
  const logOut = useApp((s) => s.logOut);

  useEffect(() => {
    if (settings || newChat) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, settings, newChat]);

  if (settings) return <SettingsDialog onClose={onClose} />;
  if (newChat) return <NewChatDialog mode={newChat} onClose={onClose} />;

  const item = "mb-1 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-hover";

  return (
    <>
      <button className="fixed inset-0 z-10 cursor-default" aria-label="Menyuni yopish" onClick={onClose} />
      <div
        role="menu"
        className="absolute left-3 top-14 z-20 w-72 rounded-2xl border border-border bg-bg p-2 shadow-lg"
      >
        {me && (
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar id={me.id} title={me.name} size={36} />
            <span className="min-w-0 truncate font-medium">{me.name}</span>
          </div>
        )}
        <div className="my-1 border-t border-border" />
        <button role="menuitem" className={item} onClick={() => setNewChat("contacts")}>
          <Icon name="user" size={18} />
          Kontaktlar
        </button>
        <button role="menuitem" className={item} onClick={() => setNewChat("group")}>
          <Icon name="users" size={18} />
          Yangi guruh
        </button>
        <button role="menuitem" className={item} onClick={() => setNewChat("channel")}>
          <Icon name="megaphone" size={18} />
          Yangi kanal
        </button>
        <div className="my-1 border-t border-border" />
        <p className="px-2 pb-1 pt-2 text-xs text-muted">Mavzu</p>
        <div role="radiogroup" aria-label="Mavzu" className="grid grid-cols-3 gap-1 rounded-xl bg-panel p-1">
          {THEMES.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={theme === t.id}
              className={`flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs ${
                theme === t.id ? "bg-bg text-text shadow-sm" : "text-muted hover:text-text"
              }`}
              onClick={() => setTheme(t.id)}
            >
              <Icon name={t.icon} size={16} />
              {t.label}
            </button>
          ))}
        </div>
        <div className="my-2 border-t border-border" />
        <Services />
        <button
          role="menuitem"
          className="mb-1 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-hover"
          onClick={() => setSettings(true)}
        >
          <Icon name="edit" size={18} />
          Sozlamalar
        </button>
        <button
          role="menuitem"
          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-danger hover:bg-danger-soft"
          onClick={() => {
            if (window.confirm("Akkauntdan chiqasizmi?")) void logOut();
          }}
        >
          <Icon name="logout" size={18} />
          Chiqish
        </button>
      </div>
    </>
  );
}
