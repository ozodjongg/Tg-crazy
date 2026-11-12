"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { applyCompletion, findTrigger, type Trigger } from "@/lib/autocomplete";
import { insertAt, rememberEmoji, searchEmoji } from "@/lib/emoji";
import { wrapSelection } from "@/lib/markdown";
import { pickForAi } from "@/lib/messages";
import * as tg from "@/lib/telegram/api";
import { itemPreview } from "@/lib/telegram/types";
import { toggleScript } from "@/lib/translit/uz";
import { useApp } from "@/store/app";
import { useServices } from "@/store/services";
import { AttachDialog } from "./AttachDialog";
import { EmojiPanel } from "./EmojiPanel";
import { Icon } from "./Icon";
import { PopupMenu } from "./PopupMenu";
import { Suggestions, type Suggestion } from "./Suggestions";
import { VoiceBar } from "./VoiceBar";
import { ScheduleDialog } from "./Schedule";
import { voiceSupported } from "@/lib/voice/recorder";

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
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attach, setAttach] = useState<File | null>(null);
  const sendSticker = useApp((s) => s.sendSticker);
  const sendGif = useApp((s) => s.sendGif);
  const sendVoice = useApp((s) => s.sendVoice);
  const showNotice = useApp((s) => s.showNotice);
  const [recording, setRecording] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [sendMenu, setSendMenu] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatId = useApp((s) => s.activeChatId);
  const chatKind = useApp((s) => s.chats.find((c) => c.id === s.activeChatId)?.kind ?? null);

  // Avtoto'ldirish: kursor joyi, topilgan belgi va takliflar
  const [cursor, setCursor] = useState(0);
  const [suggest, setSuggest] = useState<{ for: string; items: Suggestion[] }>({ for: "", items: [] });
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const trigger = findTrigger(text, cursor);
  const triggerKey = trigger ? `${trigger.kind}:${trigger.start}:${trigger.query}` : "";
  const suggestions = trigger && dismissed !== triggerKey && suggest.for === triggerKey ? suggest.items : [];

  useEffect(() => {
    if (!trigger || chatId === null) return;
    let alive = true;
    const t: Trigger = trigger;
    const done = (items: Suggestion[]) => {
      if (!alive) return;
      setSuggest({ for: triggerKey, items });
      setActive(0);
    };
    // Tarmoq so'rovlari yozish to'xtagach yuboriladi
    const timer = setTimeout(() => {
      if (t.kind === "mention" && chatKind === "group") {
        tg.searchMentions(chatId, t.query).then(
          (list) =>
            done(
              list.slice(0, 20).map((m) => ({
                key: String(m.id),
                value: m.username ? `@${m.username}` : `[${m.name.replace(/[[\]]/g, "")}](tg://user?id=${m.id})`,
                title: m.name,
                subtitle: m.username ? `@${m.username}` : undefined,
                peerId: m.id,
              })),
            ),
          () => done([]),
        );
      } else if (t.kind === "command" && (chatKind === "bot" || chatKind === "group")) {
        tg.loadBotCommands(chatId).then(
          (list) =>
            done(
              list
                .filter((c) => c.command.toLowerCase().startsWith(t.query.toLowerCase()))
                .map((c) => ({ key: c.command, value: `/${c.command}`, title: `/${c.command}`, subtitle: c.description, glyph: "⌘" })),
            ),
          () => done([]),
        );
      } else if (t.kind === "emoji") {
        done(searchEmoji(t.query, 12).map((e) => ({ key: e.emoji, value: e.emoji, title: e.label, glyph: e.emoji })));
      } else {
        done([]);
      }
    }, t.kind === "mention" && t.query ? 200 : 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // triggerKey trigger'ni to'liq ifodalaydi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerKey, chatId, chatKind]);

  function pickSuggestion(s: Suggestion) {
    if (!trigger) return;
    if (trigger.kind === "emoji") rememberEmoji(s.value);
    const next = applyCompletion(text, trigger, s.value);
    setDraft(next.text);
    setCursor(next.cursor);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(next.cursor, next.cursor);
    });
  }

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

  async function submit(silent = false, schedule?: tg.Schedule) {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await send(text, silent, schedule);
    } catch {
      // Xato store orqali ko'rsatiladi; matn saqlanib qoladi
    } finally {
      setSending(false);
      ref.current?.focus();
    }
  }

  /** Kursor joyiga qo'yadi va kursorni qo'yilgan matndan keyinga suradi. */
  function insert(value: string) {
    const el = ref.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = insertAt(text, start, end, value);
    setDraft(next.text);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.cursor, next.cursor);
    });
  }

  function wrap(marker: string) {
    const el = ref.current;
    if (!el || el.selectionStart === el.selectionEnd) return false;
    const next = wrapSelection(text, el.selectionStart, el.selectionEnd, marker);
    setDraft(next.text);
    requestAnimationFrame(() => el.setSelectionRange(next.start, next.end));
    return true;
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setActive((i) => (i + step + suggestions.length) % suggestions.length);
        return;
      }
      if ((e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) || e.key === "Tab") {
        e.preventDefault();
        pickSuggestion(suggestions[Math.min(active, suggestions.length - 1)]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setDismissed(triggerKey);
        return;
      }
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === "b" || e.key === "i")) {
      if (wrap(e.key === "b" ? "**" : "__")) e.preventDefault();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    } else if (e.key === "Escape" && (replyTo || editing)) {
      e.preventDefault();
      if (editing) setEditing(null);
      else setReplyTo(null);
    }
  }

  function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (file) setAttach(file);
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
        <Suggestions
          items={suggestions}
          active={active}
          label={trigger?.kind === "command" ? "Bot buyruqlari" : trigger?.kind === "emoji" ? "Emoji" : "Eslatish"}
          compact={trigger?.kind === "emoji"}
          onPick={pickSuggestion}
          onHover={setActive}
        />
        {recording ? (
          <VoiceBar
            onSend={(v) => void sendVoice(v.file, v.duration, v.waveform)}
            onClose={() => setRecording(false)}
            onError={(t) => showNotice(t)}
          />
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex min-w-0 flex-1 items-end rounded-3xl border border-border bg-bg py-1 pl-1 pr-1 shadow-sm focus-within:border-accent">
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => onFiles(e.target.files)} />
              <div className="relative">
                <button
                  className={iconButton}
                  title="Emoji va stikerlar"
                  aria-label="Emoji va stikerlar"
                  aria-expanded={emojiOpen}
                  disabled={busy}
                  onClick={() => setEmojiOpen((v) => !v)}
                >
                  <span className="text-lg leading-none" aria-hidden>🙂</span>
                </button>
                {emojiOpen && (
                  <EmojiPanel
                    onEmoji={insert}
                    onSticker={(key) => void sendSticker(key)}
                    onGif={(key) => void sendGif(key)}
                    onClose={() => setEmojiOpen(false)}
                  />
                )}
              </div>
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
                placeholder={editing ? "Xabarni tahrirlang…" : "Xabar yozing…  (**qalin**, __kursiv__, `kod`)"}
                aria-label="Xabar matni"
                value={text}
                onSelect={(e) => setCursor(e.currentTarget.selectionStart)}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setCursor(e.target.selectionStart);
                  if (e.target.value && !editing) notifyTyping();
                }}
                onKeyDown={onKeyDown}
                onPaste={(e) => {
                  const file = [...e.clipboardData.files][0];
                  if (file && !editing) {
                    e.preventDefault();
                    setAttach(file);
                  }
                }}
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
            {empty && !editing && voiceSupported() ? (
              <button
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-text hover:bg-accent-hover disabled:opacity-40"
                aria-label="Ovozli xabar yozish"
                title="Ovozli xabar yozish"
                disabled={busy}
                onClick={() => setRecording(true)}
              >
                <Icon name="mic" size={22} />
              </button>
            ) : (
              <button
                onContextMenu={(e) => {
                  if (editing || !text.trim()) return;
                  e.preventDefault();
                  setSendMenu({ x: e.clientX, y: e.clientY });
                }}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-text hover:bg-accent-hover disabled:opacity-40 disabled:hover:bg-accent"
                aria-label={editing ? "Saqlash" : "Yuborish"}
                title={editing ? "Saqlash (Enter)" : "Yuborish (Enter) · o'ng tugma — ovozsiz yoki rejalashtirish"}
                disabled={empty || busy}
                onClick={() => void submit()}
              >
                <Icon name={editing ? "check" : "send"} size={22} />
              </button>
            )}
          </div>
        )}
      </div>
      {sendMenu && (
        <PopupMenu
          x={sendMenu.x - 220}
          y={sendMenu.y - 140}
          label="Yuborish usuli"
          actions={[
            { key: "silent", label: "Ovozsiz yuborish", icon: "mute", run: () => void submit(true) },
            { key: "schedule", label: "Rejalashtirish…", icon: "clock", run: () => setScheduling(true) },
            ...(chatKind === "user"
              ? [{ key: "online", label: "Onlayn bo'lganda yuborish", icon: "user" as const, run: () => void submit(false, "online") }]
              : []),
          ]}
          onClose={() => setSendMenu(null)}
        />
      )}
      {scheduling && (
        <ScheduleDialog
          onClose={() => setScheduling(false)}
          onPick={(ts) => {
            setScheduling(false);
            void submit(false, ts);
          }}
        />
      )}
      {attach && (
        <AttachDialog
          file={attach}
          initialCaption={text}
          onClose={() => setAttach(null)}
          onSend={(caption) => {
            const file = attach;
            setAttach(null);
            // Matn izohga o'tdi — yozish maydoni tozalanadi
            setDraft("");
            void sendFile(file, caption).catch(() => setDraft(caption));
          }}
        />
      )}
    </footer>
  );
}
