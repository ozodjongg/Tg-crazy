"use client";

import { useEffect, useRef } from "react";
import { Avatar } from "./Avatar";

export interface Suggestion {
  key: string;
  /** Tanlanganda matnga qo'yiladigan qiymat */
  value: string;
  title: string;
  subtitle?: string;
  /** Avatar uchun (mention) */
  peerId?: number;
  /** Chapdagi katta belgi (emoji, "/") */
  glyph?: string;
}

/** Yozish maydoni ustida chiqadigan taklif ro'yxati (@mention, /buyruq, :emoji). */
export function Suggestions({
  items, active, label, compact = false, onPick, onHover,
}: {
  items: Suggestion[];
  active: number;
  label: string;
  /** Ixcham gorizontal qator (emoji uchun) */
  compact?: boolean;
  onPick: (s: Suggestion) => void;
  onHover: (index: number) => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (items.length === 0) return null;
  if (compact) {
    return (
      <ul
        ref={listRef}
        role="listbox"
        aria-label={label}
        className="thin-scroll mb-2 flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-2xl border border-border bg-bg p-1 shadow-lg"
      >
        {items.map((s, i) => (
          <li
            key={s.key}
            data-index={i}
            role="option"
            aria-selected={i === active}
            title={s.title}
            className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-2xl ${i === active ? "bg-hover" : ""}`}
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(s);
            }}
            onMouseEnter={() => onHover(i)}
          >
            {s.glyph}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul
      ref={listRef}
      role="listbox"
      aria-label={label}
      className="thin-scroll mb-2 max-h-60 overflow-y-auto rounded-2xl border border-border bg-bg p-1 shadow-lg"
    >
      {items.map((s, i) => (
        <li
          key={s.key}
          data-index={i}
          role="option"
          aria-selected={i === active}
          className={`flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 ${i === active ? "bg-hover" : ""}`}
          // mousedown: textarea fokusini yo'qotmasdan tanlash
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(s);
          }}
          onMouseEnter={() => onHover(i)}
        >
          {s.peerId !== undefined ? (
            <Avatar id={s.peerId} title={s.title} size={32} />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center text-2xl leading-none" aria-hidden>
              {s.glyph}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-sm">
            <span className="font-medium">{s.title}</span>
            {s.subtitle && <span className="ml-2 text-muted">{s.subtitle}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
