"use client";

import { useEffect, useState } from "react";
import { mediaUrl } from "@/lib/telegram/media";
import type { MessageItem } from "@/lib/telegram/types";
import { useApp } from "@/store/app";
import { Icon } from "./Icon";

function WebPreview({ msg }: { msg: MessageItem }) {
  const page = msg.webpage!;
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    if (!page.hasPhoto) return;
    let alive = true;
    mediaUrl(msg.chatId, msg.id, "preview", "image/jpeg").then((u) => alive && setImg(u), () => {});
    return () => {
      alive = false;
    };
  }, [msg.chatId, msg.id, page.hasPhoto]);

  return (
    <a
      href={/^https?:/i.test(page.url) ? page.url : undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 block max-w-sm overflow-hidden rounded-lg border-l-[3px] border-accent bg-accent/10 hover:bg-accent/15"
    >
      <div className={`flex gap-2 p-2 ${page.largePhoto ? "flex-col" : ""}`}>
        <div className="min-w-0 flex-1 text-sm">
          {page.siteName && <p className="font-medium text-accent">{page.siteName}</p>}
          {page.title && <p className="font-medium">{page.title}</p>}
          {page.description && <p className="line-clamp-4 text-muted">{page.description}</p>}
        </div>
        {img &&
          (page.largePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob URL
            <img src={img} alt="" className="max-h-56 w-full rounded-md object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- blob URL
            <img src={img} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
          ))}
      </div>
    </a>
  );
}

function Poll({ msg }: { msg: MessageItem }) {
  const poll = msg.poll!;
  const vote = useApp((s) => s.votePoll);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const voted = poll.answers.some((a) => a.chosen);
  const showResults = voted || poll.closed;
  const max = Math.max(1, ...poll.answers.map((a) => a.voters));

  async function submit(answers: string[]) {
    setBusy(true);
    await vote(msg, answers);
    setBusy(false);
    setPicked([]);
  }

  return (
    <div className="min-w-56 max-w-sm py-1">
      <p className="font-medium">{poll.question}</p>
      <p className="mb-2 text-xs text-muted">
        {[poll.closed ? "Yakunlangan" : poll.isPublic ? "Ochiq" : "Anonim", poll.quiz ? "viktorina" : "so'rovnoma"].join(" ")}
        {poll.multiple && " · bir nechta javob"}
      </p>
      <ul className="space-y-1.5">
        {poll.answers.map((a) => {
          const percent = poll.voters ? Math.round((a.voters / poll.voters) * 100) : 0;
          if (showResults) {
            return (
              <li key={a.data} className="text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="w-9 shrink-0 text-right font-medium">{percent}%</span>
                  <span className="min-w-0 flex-1">
                    {a.text}
                    {a.chosen && <Icon name="check" size={14} className="ml-1 inline text-accent" />}
                    {poll.quiz && a.correct && <span className="ml-1 text-xs text-[#4caf50]">to&apos;g&apos;ri</span>}
                  </span>
                </div>
                <div className="ml-11 mt-1 h-1 overflow-hidden rounded-full bg-hover">
                  <div
                    className={`h-full rounded-full ${poll.quiz && a.correct ? "bg-[#4caf50]" : "bg-accent"}`}
                    style={{ width: `${(a.voters / max) * 100}%` }}
                  />
                </div>
              </li>
            );
          }
          const checked = picked.includes(a.data);
          return (
            <li key={a.data}>
              <button
                className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-sm hover:bg-black/5 disabled:opacity-60"
                disabled={busy}
                aria-pressed={checked}
                onClick={() => {
                  if (!poll.multiple) return void submit([a.data]);
                  setPicked((p) => (checked ? p.filter((x) => x !== a.data) : [...p, a.data]));
                }}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 border-accent ${poll.multiple ? "rounded-md" : "rounded-full"} ${checked ? "bg-accent text-accent-text" : ""}`}>
                  {checked && <Icon name="check" size={12} />}
                </span>
                {a.text}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>{poll.voters} ta ovoz</span>
        {!showResults && poll.multiple && (
          <button className="font-medium text-accent disabled:opacity-50" disabled={!picked.length || busy} onClick={() => void submit(picked)}>
            Ovoz berish
          </button>
        )}
        {voted && !poll.closed && !poll.quiz && (
          <button className="text-accent disabled:opacity-50" disabled={busy} onClick={() => void submit([])}>
            Ovozni qaytarish
          </button>
        )}
      </div>
    </div>
  );
}

function Place({ msg }: { msg: MessageItem }) {
  const p = msg.place!;
  const href = `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=16/${p.lat}/${p.lon}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex min-w-56 items-center gap-3 rounded-lg py-1 hover:opacity-80">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-text">
        <Icon name="location" />
      </span>
      <span className="min-w-0 text-sm">
        <span className="block font-medium">{p.title || (p.live ? "Jonli joylashuv" : "Joylashuv")}</span>
        <span className="block truncate text-muted">{p.address || `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`}</span>
        <span className="block text-xs text-accent">Xaritada ochish</span>
      </span>
    </a>
  );
}

function Contact({ msg }: { msg: MessageItem }) {
  const c = msg.contact!;
  const openChat = useApp((s) => s.openChat);
  return (
    <div className="min-w-56 py-1">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-text">
          <Icon name="user" />
        </span>
        <span className="min-w-0 text-sm">
          <span className="block font-medium">{c.name || "Kontakt"}</span>
          <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="block text-muted hover:text-accent">
            {c.phone}
          </a>
        </span>
      </div>
      {c.userId > 0 && (
        <button className="mt-2 w-full rounded-lg border border-accent/40 py-1 text-sm font-medium text-accent hover:bg-accent/10" onClick={() => void openChat(c.userId)}>
          Xabar yozish
        </button>
      )}
    </div>
  );
}

export function InlineKeyboard({ msg }: { msg: MessageItem }) {
  const press = useApp((s) => s.pressButton);
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <div className="mt-1 flex w-full max-w-sm flex-col gap-1">
      {msg.keyboard!.map((row, r) => (
        <div key={r} className="flex gap-1">
          {row.map((b, i) => {
            const k = `${r}:${i}`;
            const cls = "flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl bg-bg/80 px-2 py-2 text-sm font-medium text-accent shadow-sm backdrop-blur hover:bg-bg disabled:opacity-60";
            if (b.kind === "url" && b.url && /^(https?:|tg:)/i.test(b.url)) {
              return (
                <a key={k} href={b.url} target="_blank" rel="noopener noreferrer" className={cls}>
                  <span className="truncate">{b.text}</span>
                  <Icon name="link" size={13} className="shrink-0" />
                </a>
              );
            }
            return (
              <button
                key={k}
                className={cls}
                disabled={b.kind !== "callback" || busy !== null}
                title={b.kind === "other" ? "Bu turdagi tugma hali qo'llab-quvvatlanmaydi" : undefined}
                onClick={async () => {
                  setBusy(k);
                  await press(msg, b.data!);
                  setBusy(null);
                }}
              >
                <span className="truncate">{busy === k ? "…" : b.text}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function MessageExtras({ msg }: { msg: MessageItem }) {
  if (msg.webpage) return <WebPreview msg={msg} />;
  if (msg.poll) return <Poll msg={msg} />;
  if (msg.place) return <Place msg={msg} />;
  if (msg.contact) return <Contact msg={msg} />;
  return null;
}
