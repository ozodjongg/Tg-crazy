"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MessageItem } from "@/lib/telegram/types";
import { Icon, type IconName } from "./Icon";

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export interface MenuAction {
  key: string;
  label: string;
  icon: IconName;
  danger?: boolean;
  run: () => void;
}

export function MessageMenu({
  msg, x, y, actions, onReact, onClose,
}: {
  msg: MessageItem;
  x: number;
  y: number;
  actions: MenuAction[];
  onReact: (emoji: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  // Ekrandan chiqib ketmasligi uchun joyini o'lchab to'g'rilaymiz
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      left: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
    });
  }, [x, y]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <button
        className="fixed inset-0 z-30 cursor-default"
        aria-label="Menyuni yopish"
        tabIndex={-1}
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        ref={ref}
        role="menu"
        aria-label="Xabar amallari"
        className="fixed z-40 w-56 rounded-2xl border border-border bg-bg p-1.5 shadow-xl"
        style={pos}
      >
        <div className="flex justify-between px-1 pb-1.5">
          {QUICK_REACTIONS.map((emoji) => {
            const chosen = msg.reactions.some((r) => r.emoji === emoji && r.chosen);
            return (
              <button
                key={emoji}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-hover ${
                  chosen ? "bg-accent-soft" : ""
                }`}
                aria-label={`Reaksiya ${emoji}`}
                aria-pressed={chosen}
                onClick={() => {
                  onReact(emoji);
                  onClose();
                }}
              >
                {emoji}
              </button>
            );
          })}
        </div>
        <div className="border-t border-border pt-1">
          {actions.map((a) => (
            <button
              key={a.key}
              role="menuitem"
              className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-hover ${
                a.danger ? "text-danger hover:bg-danger-soft" : ""
              }`}
              onClick={() => {
                onClose();
                a.run();
              }}
            >
              <Icon name={a.icon} size={17} />
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
