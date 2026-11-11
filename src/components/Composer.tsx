"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { pickForAi } from "@/lib/messages";
import { itemPreview } from "@/lib/telegram/types";
import { toggleScript } from "@/lib/translit/uz";
import { useApp } from "@/store/app";
import { useServices } from "@/store/services";
import { Icon } from "./Icon";

const iconButton =
  "mb-0.5 flex h-9 shrink-0 items-center justify-center rounded-full px-2.5 text-muted hover:bg-hover hover:text-text disabled:opacity-40 disabled:hover:bg-transparent";

export function Composer() {
  const send = useApp((s) => s.send);
  const sendFile = useApp((s) => s.sendFile);
  const text = useApp((s) => s.draft);
  const setDraft = useApp((s) => s.setDraft);
  const replyTo = useApp((s) => s.replyTo);
  const editing = useApp((s) => s.editing);
  const setReplyTo = useApp((s) => s.setReplyTo);
  const setEditing = useApp((s) => s.setEditing);
  const upload = useApp((s) => s.upload);
  const notifyTyping = useApp((s) => s.notifyTyping);
  const aiReady = useServices((s) => s.status === "connected" && !!s.profile?.ai_enabled);
  const openAi = useServices((s) => s.openAi);

  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Matn tashqaridan o'zgarganda ham (tahrir, AI qoralamasi) balandlik moslashadi
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  useEffect(() => {
    if (replyTo || editing) ref.current?.focus();
  }, [replyTo, editing]);

  async function submit() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await send(text);
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
    } else if (e.key === "Escape" && (replyTo || editing)) {
      e.preventDefault();
      if (editing) setEditing(null);
      else setReplyTo(null);
    }
  }

  async function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    // Yozilgan matn fayl izohi sifatida ketadi
    await sendFile(file, text).catch(() => {});
  }

  const empty = !text.trim();
  const context = editing ?? replyTo;
  const busy = sending || upload !== null;

  return (
    <footer className="px-3 pb-3 pt-1 md:pb-4">
      <div className="mx-auto max-w-3xl">
        {upload && (
          <div className="mb-2 rounded-2xl border border-border bg-bg px-4 py-2 text-sm" role="status">
            <p className="truncate">Yuklanmoqda: {upload.name}</p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-hover">
              <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(upload.fraction * 100)}%` }} />
            </div>
          </div>
        )}
        {context && (
          <div className="mb-2 flex items-center gap-3 rounded-2xl border border-border bg-bg py-2 pl-4 pr-2">
            <Icon name={editing ? "edit" : "reply"} size={18} className="shrink-0 text-accent" />
            <div className="min-w-0 flex-1 border-l-2 border-accent pl-2 text-sm">
              <p className="font-medium text-accent">{editing ? "Tahrirlash" : context.senderName}</p>
              <p className="truncate text-muted">{itemPreview(context) || "Xabar"}</p>
            </div>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-text"
              aria-label="Bekor qilish"
              onClick={() => (editing ? setEditing(null) : setReplyTo(null))}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="flex min-w-0 flex-1 items-end rounded-3xl border border-border bg-bg py-1 pl-1 pr-1 shadow-sm focus-within:border-accent">
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => void onFiles(e.target.files)} />
            <button
              className={iconButton}
              title="Fayl yoki rasm biriktirish"
              aria-label="Fayl yoki rasm biriktirish"
              disabled={busy || editing !== null}
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="clip" />
            </button>
            <textarea
              ref={ref}
              className="max-h-40 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 placeholder:text-muted"
              rows={1}
              placeholder={editing ? "Xabarni tahrirlang…" : "Xabar yozing…"}
              aria-label="Xabar matni"
              value={text}
              onChange={(e) => {
                setDraft(e.target.value);
                if (e.target.value && !editing) notifyTyping();
              }}
              onKeyDown={onKeyDown}
            />
            {aiReady && !editing && (
              <button
                className={iconButton}
                title="AI javob qoralamasi"
                aria-label="AI javob qoralamasi"
                onClick={() => openAi({ kind: "draft", messages: pickForAi(useApp.getState().messages, 12_000, 30) })}
              >
                <Icon name="sparkle" />
              </button>
            )}
            <button
              className={`${iconButton} text-xs font-medium`}
              title="Yozilgan matnni lotin ↔ kirillga o'girish"
              aria-label="Yozilgan matnni lotin yoki kirillga o'girish"
              disabled={empty}
              onClick={() => setDraft(toggleScript(text))}
            >
              Aa↔Аа
            </button>
          </div>
          <button
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-text hover:bg-accent-hover disabled:opacity-40 disabled:hover:bg-accent"
            aria-label={editing ? "Saqlash" : "Yuborish"}
            title={editing ? "Saqlash (Enter)" : "Yuborish (Enter)"}
            disabled={empty || busy}
            onClick={() => void submit()}
          >
            <Icon name={editing ? "check" : "send"} size={22} />
          </button>
        </div>
      </div>
    </footer>
  );
}
