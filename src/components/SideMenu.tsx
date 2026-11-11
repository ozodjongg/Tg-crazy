"use client";

import { useEffect } from "react";
import { useApp, type Theme } from "@/store/app";
import { Avatar } from "./Avatar";
import { Icon, type IconName } from "./Icon";

const THEMES: { id: Theme; label: string; icon: IconName }[] = [
  { id: "system", label: "Tizim", icon: "monitor" },
  { id: "light", label: "Och", icon: "sun" },
  { id: "dark", label: "To'q", icon: "moon" },
];

export function SideMenu({ onClose }: { onClose: () => void }) {
  const me = useApp((s) => s.me);
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);
  const logOut = useApp((s) => s.logOut);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <button className="fixed inset-0 z-10 cursor-default" aria-label="Menyuni yopish" onClick={onClose} />
      <div
        role="menu"
        className="absolute left-3 top-14 z-20 w-64 rounded-2xl border border-border bg-bg p-2 shadow-lg"
      >
        {me && (
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar id={me.id} title={me.name} size={36} />
            <span className="min-w-0 truncate font-medium">{me.name}</span>
          </div>
        )}
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
