"use client";

import { useState } from "react";
import { TEXT_SIZES, usePrefs, type TextSize, type Wallpaper } from "@/store/prefs";
import { Dialog } from "./Dialog";

const SIZES: { id: TextSize; label: string }[] = [
  { id: "sm", label: "Kichik" },
  { id: "md", label: "O'rta" },
  { id: "lg", label: "Katta" },
  { id: "xl", label: "Juda katta" },
];

const WALLPAPERS: { id: Wallpaper; label: string }[] = [
  { id: "dots", label: "Nuqtali" },
  { id: "plain", label: "Tekis" },
  { id: "warm", label: "Iliq" },
  { id: "paper", label: "Daftar" },
];

function notificationState(): NotificationPermission | "unsupported" {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const prefs = usePrefs();
  const [permission, setPermission] = useState(notificationState);

  async function toggleNotifications(on: boolean) {
    if (on && permission === "default") {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return;
    }
    prefs.update({ notifications: on });
  }

  const enabled = prefs.notifications && permission === "granted";

  return (
    <Dialog title="Sozlamalar" onClose={onClose}>
      <section>
        <h3 className="mb-2 text-sm font-medium text-muted">Xabar matni o&apos;lchami</h3>
        <div role="radiogroup" aria-label="Matn o'lchami" className="grid grid-cols-4 gap-1 rounded-xl bg-panel p-1">
          {SIZES.map((s) => (
            <button
              key={s.id}
              role="radio"
              aria-checked={prefs.textSize === s.id}
              className={`rounded-lg px-1 py-1.5 text-xs ${prefs.textSize === s.id ? "bg-bg text-text shadow-sm" : "text-muted hover:text-text"}`}
              onClick={() => prefs.update({ textSize: s.id })}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="chat-wallpaper mt-2 rounded-xl border border-border p-3">
          <span className="msg-text inline-block rounded-2xl border border-border bg-bubble-in px-3 py-1.5" style={{ fontSize: TEXT_SIZES[prefs.textSize] }}>
            Assalomu alaykum! Matn shu o&apos;lchamda ko&apos;rinadi.
          </span>
        </p>
      </section>

      <section className="mt-5">
        <h3 className="mb-2 text-sm font-medium text-muted">Chat foni</h3>
        <div role="radiogroup" aria-label="Chat foni" className="grid grid-cols-4 gap-2">
          {WALLPAPERS.map((w) => (
            <button
              key={w.id}
              role="radio"
              aria-checked={prefs.wallpaper === w.id}
              className={`overflow-hidden rounded-xl border-2 text-xs ${prefs.wallpaper === w.id ? "border-accent" : "border-border hover:border-muted"}`}
              onClick={() => prefs.update({ wallpaper: w.id })}
            >
              {/* Har bir variant o'z naqshi bilan ko'rsatiladi */}
              <span data-preview={w.id} className="wallpaper-preview block h-14" />
              <span className="block py-1">{w.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h3 className="mb-2 text-sm font-medium text-muted">Bildirishnomalar</h3>
        <label className="flex items-center gap-3 rounded-xl bg-panel px-3 py-2.5">
          <span className="flex-1">
            <span className="block">Yangi xabarlar haqida xabar berish</span>
            <span className="block text-xs text-muted">
              {permission === "unsupported"
                ? "Bu brauzer bildirishnomalarni qo'llab-quvvatlamaydi"
                : permission === "denied"
                  ? "Brauzer sozlamalarida ruxsat berilmagan"
                  : "Ovozsiz qilingan chatlardan xabar kelmaydi"}
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="h-5 w-5 accent-[var(--accent)]"
            disabled={permission === "unsupported" || permission === "denied"}
            checked={enabled}
            onChange={(e) => void toggleNotifications(e.target.checked)}
          />
        </label>
      </section>
    </Dialog>
  );
}
