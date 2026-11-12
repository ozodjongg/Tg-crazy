"use client";

import { useState } from "react";
import { formatChatDate } from "@/lib/format";
import type { Topic } from "@/lib/telegram/api";
import { useApp } from "@/store/app";
import { Dialog, primaryButton, secondaryButton } from "./Dialog";
import { Icon } from "./Icon";

function NewTopicDialog({ onClose }: { onClose: () => void }) {
  const createTopic = useApp((s) => s.createTopic);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog title="Yangi mavzu" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim()) return;
          setBusy(true);
          await createTopic(title.trim()).catch(() => {});
          onClose();
        }}
      >
        <input
          className="w-full rounded-xl border border-border bg-bg px-3 py-2 focus:border-accent"
          placeholder="Mavzu nomi"
          aria-label="Mavzu nomi"
          maxLength={128}
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className={secondaryButton} onClick={onClose}>
            Bekor qilish
          </button>
          <button type="submit" className={primaryButton} disabled={!title.trim() || busy}>
            Yaratish
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/** Forum guruh: mavzular ro'yxati (xabarlar o'rnida). */
export function TopicList({ topics }: { topics: Topic[] }) {
  const openTopic = useApp((s) => s.openTopic);
  const [creating, setCreating] = useState(false);
  return (
    <div className="thin-scroll flex-1 overflow-y-auto bg-bg">
      <ul className="mx-auto max-w-3xl space-y-0.5 p-2">
        <li>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-accent hover:bg-hover" onClick={() => setCreating(true)}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-xl" aria-hidden>
              +
            </span>
            <span className="font-medium">Yangi mavzu</span>
          </button>
        </li>
        {topics.length === 0 && <li className="p-6 text-center text-sm text-muted">Mavzular yuklanmoqda…</li>}
        {topics.map((t) => (
          <li key={t.id}>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-hover" onClick={() => void openTopic(t)}>
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
                style={{ background: t.color }}
                aria-hidden
              >
                {t.id === 1 ? "#" : Array.from(t.title)[0]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="min-w-0 truncate font-medium">{t.title}</span>
                  {t.closed && <Icon name="lock" size={14} className="shrink-0 text-muted" />}
                  <span className="flex-1" />
                  {t.lastDate !== null && <span className="shrink-0 text-xs text-muted">{formatChatDate(t.lastDate)}</span>}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate text-sm text-muted">
                    {t.lastSender && <span className="text-text">{t.lastSender.split(" ")[0]}: </span>}
                    {t.lastText}
                  </span>
                  {t.unread > 0 ? (
                    <span className="min-w-5 shrink-0 rounded-full bg-accent px-1.5 text-center text-xs font-medium leading-5 text-accent-text">{t.unread}</span>
                  ) : (
                    t.pinned && <Icon name="pin" size={15} className="shrink-0 text-muted" />
                  )}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {creating && <NewTopicDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
