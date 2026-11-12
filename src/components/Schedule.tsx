"use client";

import { useEffect, useState } from "react";
import { formatScheduleLabel, schedulePresets, toLocalInput } from "@/lib/format";
import { itemPreview, type MessageItem } from "@/lib/telegram/types";
import { useApp } from "@/store/app";
import { Dialog, primaryButton, secondaryButton } from "./Dialog";
import { Icon } from "./Icon";

/** Telegram "onlayn bo'lganda" xabarlarga shu sanani qo'yadi (0x7FFFFFFE soniya). */
const WHEN_ONLINE = 2147483646 * 1000;
const YEAR = 365 * 864e5;

export const scheduleLabel = (ts: number) => (ts >= WHEN_ONLINE ? "Onlayn bo'lganda" : formatScheduleLabel(ts));

/** Yuborish vaqtini tanlash. */
export function ScheduleDialog({
  title = "Xabarni rejalashtirish", confirm = "Rejalashtirish", onPick, onClose,
}: { title?: string; confirm?: string; onPick: (ts: number) => void; onClose: () => void }) {
  const [opened] = useState(() => Date.now());
  const presets = schedulePresets(opened);
  const [value, setValue] = useState(() => toLocalInput(presets[0].ts));
  const ts = new Date(value).getTime();
  const valid = Number.isFinite(ts) && ts > opened + 60e3 && ts < opened + YEAR;

  return (
    <Dialog title={title} onClose={onClose}>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            className="rounded-full border border-border px-3 py-1.5 text-sm hover:bg-hover"
            onClick={() => onPick(p.ts)}
          >
            {p.label} <span className="text-muted">· {formatScheduleLabel(p.ts, opened)}</span>
          </button>
        ))}
      </div>
      <label className="mt-4 block text-sm text-muted" htmlFor="schedule-at">
        Yoki aniq sana va vaqt
      </label>
      <input
        id="schedule-at"
        type="datetime-local"
        className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 focus:border-accent"
        value={value}
        min={toLocalInput(opened)}
        onChange={(e) => setValue(e.target.value)}
      />
      {!valid && value && <p className="mt-1 text-sm text-danger">Kelajakdagi vaqtni tanlang (1 yil ichida)</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button className={secondaryButton} onClick={onClose}>
          Bekor qilish
        </button>
        <button className={primaryButton} disabled={!valid} onClick={() => onPick(ts)}>
          {confirm}
        </button>
      </div>
    </Dialog>
  );
}

/** Chatdagi rejalashtirilgan xabarlar ro'yxati. */
export function ScheduledDialog({ onClose }: { onClose: () => void }) {
  const scheduled = useApp((s) => s.scheduled);
  const sendNow = useApp((s) => s.sendScheduledNow);
  const remove = useApp((s) => s.deleteScheduled);
  const reschedule = useApp((s) => s.reschedule);
  const [busy, setBusy] = useState<number | null>(null);
  const [moving, setMoving] = useState<MessageItem | null>(null);
  const refresh = useApp((s) => s.refreshScheduled);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (id: number, fn: () => Promise<void>) => {
    setBusy(id);
    await fn().catch(() => {});
    setBusy(null);
  };

  if (moving) {
    return (
      <ScheduleDialog
        title="Yangi vaqt"
        confirm="Saqlash"
        onClose={() => setMoving(null)}
        onPick={(ts) => {
          const id = moving.id;
          setMoving(null);
          void act(id, () => reschedule(id, ts));
        }}
      />
    );
  }

  const iconBtn = "flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-text disabled:opacity-40";
  return (
    <Dialog title="Rejalashtirilgan xabarlar" onClose={onClose}>
      {scheduled.length === 0 && <p className="py-6 text-center text-sm text-muted">Rejalashtirilgan xabar yo&apos;q</p>}
      <ul className="space-y-2">
        {scheduled.map((m) => (
          <li key={m.id} className="rounded-2xl border border-border p-3">
            <div className="flex items-center gap-2">
              <Icon name="clock" size={16} className="shrink-0 text-accent" />
              <span className="flex-1 text-sm font-medium text-accent">{scheduleLabel(m.date)}</span>
              <button className={iconBtn} title="Hozir yuborish" aria-label="Hozir yuborish" disabled={busy === m.id} onClick={() => void act(m.id, () => sendNow([m.id]))}>
                <Icon name="send" size={18} />
              </button>
              <button className={iconBtn} title="Vaqtni o'zgartirish" aria-label="Vaqtni o'zgartirish" disabled={busy === m.id} onClick={() => setMoving(m)}>
                <Icon name="edit" size={18} />
              </button>
              <button className={`${iconBtn} hover:text-danger`} title="O'chirish" aria-label="O'chirish" disabled={busy === m.id} onClick={() => void act(m.id, () => remove([m.id]))}>
                <Icon name="trash" size={18} />
              </button>
            </div>
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm">{m.text || itemPreview(m)}</p>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
