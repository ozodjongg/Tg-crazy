"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { toggleScript } from "@/lib/translit/uz";
import { useApp } from "@/store/app";
import { Icon } from "./Icon";

export function Composer() {
  const send = useApp((s) => s.send);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  /** Matnga qarab balandlikni moslaydi (CSS'dagi max-height bilan cheklanadi). */
  function update(value: string) {
    setText(value);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    });
  }

  async function submit() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await send(text);
      update("");
    } catch {
      // Xato store orqali ko'rsatiladi; matn saqlanib qoladi
    } finally {
      setSending(false);
      ref.current?.focus();
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  }

  const empty = !text.trim();

  return (
    <footer className="px-3 pb-3 pt-1 md:pb-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <div className="flex min-w-0 flex-1 items-end rounded-3xl border border-border bg-bg py-1 pl-4 pr-1 shadow-sm focus-within:border-accent">
          <textarea
            ref={ref}
            className="max-h-40 min-w-0 flex-1 resize-none bg-transparent py-2 outline-none placeholder:text-muted"
            rows={1}
            placeholder="Xabar yozing…"
            aria-label="Xabar matni"
            value={text}
            onChange={(e) => update(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            className="mb-0.5 shrink-0 rounded-full px-2.5 py-2 text-xs font-medium text-muted hover:bg-hover hover:text-text disabled:opacity-40 disabled:hover:bg-transparent"
            title="Yozilgan matnni lotin ↔ kirillga o'girish"
            aria-label="Yozilgan matnni lotin yoki kirillga o'girish"
            disabled={empty}
            onClick={() => update(toggleScript(text))}
          >
            Aa↔Аа
          </button>
        </div>
        <button
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-text hover:bg-accent-hover disabled:opacity-40 disabled:hover:bg-accent"
          aria-label="Yuborish"
          title="Yuborish (Enter)"
          disabled={empty || sending}
          onClick={() => void submit()}
        >
          <Icon name="send" size={22} />
        </button>
      </div>
    </footer>
  );
}
