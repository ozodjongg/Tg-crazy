"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeQuery } from "@/lib/chats";
import * as tg from "@/lib/telegram/api";
import { useApp } from "@/store/app";
import { Avatar } from "./Avatar";
import { Dialog, primaryButton, secondaryButton } from "./Dialog";
import { Icon } from "./Icon";

export type NewChatMode = "contacts" | "group" | "channel";

const PRESENCE: Record<string, string> = { online: "onlayn", recently: "yaqinda bo'lgan" };
const field = "w-full rounded-xl border border-border bg-bg px-3 py-2 placeholder:text-muted focus:border-accent";

function useContacts() {
  const [contacts, setContacts] = useState<tg.Contact[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    tg.loadContacts().then(
      (c) => alive && setContacts(c),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, []);
  return { contacts, failed };
}

/** Kontaktlar ro'yxati: oddiy (bosilsa chat ochiladi) yoki belgilash rejimida. */
function ContactList({
  selected, onPick,
}: { selected?: ReadonlySet<number>; onPick: (c: tg.Contact) => void }) {
  const { contacts, failed } = useContacts();
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = normalizeQuery(query.trim());
    if (!contacts || !q) return contacts ?? [];
    return contacts.filter((c) => normalizeQuery(c.name).includes(q) || (c.username ?? "").toLowerCase().includes(q));
  }, [contacts, query]);

  return (
    <>
      <input
        className="mb-2 w-full rounded-full border border-border bg-bg px-4 py-2 text-sm placeholder:text-muted focus:border-accent"
        type="search"
        placeholder="Kontaktlarni qidirish"
        aria-label="Kontaktlarni qidirish"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {failed && <p className="p-4 text-center text-sm text-muted">Kontaktlarni yuklab bo&apos;lmadi</p>}
      {!contacts && !failed && <p className="p-4 text-center text-sm text-muted">Yuklanmoqda…</p>}
      {contacts && visible.length === 0 && <p className="p-4 text-center text-sm text-muted">Hech kim topilmadi</p>}
      <ul className="space-y-0.5">
        {visible.map((c) => {
          const on = selected?.has(c.id);
          return (
            <li key={c.id}>
              <button
                className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-hover ${on ? "bg-accent-soft hover:bg-accent-soft" : ""}`}
                role={selected ? "checkbox" : undefined}
                aria-checked={selected ? on : undefined}
                onClick={() => onPick(c)}
              >
                <Avatar id={c.id} title={c.name} size={38} online={c.presence === "online"} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className={`block truncate text-sm ${c.presence === "online" ? "text-accent" : "text-muted"}`}>
                    {PRESENCE[c.presence ?? ""] ?? (c.username ? `@${c.username}` : "")}
                  </span>
                </span>
                {selected && (
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${on ? "border-accent bg-accent text-accent-text" : "border-muted/60"}`} aria-hidden>
                    {on && <Icon name="check" size={12} />}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function NewChatDialog({ mode, onClose }: { mode: NewChatMode; onClose: () => void }) {
  const chats = useApp((s) => s.chats);
  const openChat = useApp((s) => s.openChat);
  const openPeer = useApp((s) => s.openPeer);
  const createChat = useApp((s) => s.createChat);
  const [members, setMembers] = useState<Map<number, tg.Contact>>(new Map());
  const [step, setStep] = useState<"members" | "details">(mode === "group" ? "members" : "details");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  if (mode === "contacts") {
    return (
      <Dialog title="Kontaktlar" onClose={onClose}>
        <ContactList
          onPick={(c) => {
            onClose();
            if (chats.some((x) => x.id === c.id)) void openChat(c.id);
            else
              void openPeer({
                id: c.id, title: c.name, username: c.username, kind: "user", members: null, verified: false,
                isMember: true, isContact: true, presence: c.presence,
              });
          }}
        />
      </Dialog>
    );
  }

  if (mode === "group" && step === "members") {
    return (
      <Dialog title={`Yangi guruh — a'zolar${members.size ? ` (${members.size})` : ""}`} onClose={onClose}>
        {members.size > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {[...members.values()].map((c) => (
              <button
                key={c.id}
                className="flex items-center gap-1 rounded-full bg-accent-soft py-0.5 pl-0.5 pr-2 text-sm"
                aria-label={`${c.name} — olib tashlash`}
                onClick={() => setMembers((m) => {
                  const next = new Map(m);
                  next.delete(c.id);
                  return next;
                })}
              >
                <Avatar id={c.id} title={c.name} size={22} />
                <span className="max-w-28 truncate">{c.name}</span>
                <Icon name="close" size={12} />
              </button>
            ))}
          </div>
        )}
        <ContactList
          selected={new Set(members.keys())}
          onPick={(c) =>
            setMembers((m) => {
              const next = new Map(m);
              if (!next.delete(c.id)) next.set(c.id, c);
              return next;
            })
          }
        />
        <div className="sticky bottom-0 mt-3 flex justify-end gap-2 bg-bg pt-2">
          <button className={secondaryButton} onClick={onClose}>
            Bekor qilish
          </button>
          <button className={primaryButton} onClick={() => setStep("details")}>
            Keyingi
          </button>
        </div>
      </Dialog>
    );
  }

  const isGroup = mode === "group";
  const submit = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    await createChat(mode, title.trim(), { userIds: [...members.keys()], description: description.trim() }).catch(() => {});
    setBusy(false);
    onClose();
  };

  return (
    <Dialog title={isGroup ? "Yangi guruh" : "Yangi kanal"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="block text-sm text-muted" htmlFor="new-chat-title">
          {isGroup ? "Guruh nomi" : "Kanal nomi"}
        </label>
        <input id="new-chat-title" className={`${field} mt-1`} maxLength={128} autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
        {!isGroup && (
          <>
            <label className="mt-3 block text-sm text-muted" htmlFor="new-chat-about">
              Tavsif (ixtiyoriy)
            </label>
            <textarea
              id="new-chat-about"
              className={`${field} mt-1 resize-none`}
              rows={3}
              maxLength={255}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </>
        )}
        {isGroup && (
          <p className="mt-3 text-sm text-muted">
            {members.size ? `${members.size} ta a'zo qo'shiladi.` : "A'zolarni keyinroq ham qo'shish mumkin."}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={secondaryButton} onClick={() => (isGroup ? setStep("members") : onClose())}>
            {isGroup ? "Orqaga" : "Bekor qilish"}
          </button>
          <button type="submit" className={primaryButton} disabled={!title.trim() || busy}>
            {busy ? "Yaratilmoqda…" : "Yaratish"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
