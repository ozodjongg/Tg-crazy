"use client";

import type { MessageItem } from "@/lib/telegram/types";
import { PopupMenu, type MenuAction } from "./PopupMenu";

export type { MenuAction } from "./PopupMenu";

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

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
  return (
    <PopupMenu
      x={x}
      y={y}
      label="Xabar amallari"
      actions={actions}
      onClose={onClose}
      header={
        <div className="flex justify-between px-1 pb-1.5">
          {QUICK_REACTIONS.map((emoji) => {
            const chosen = msg.reactions.some((r) => r.emoji === emoji && r.chosen);
            return (
              <button
                key={emoji}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-hover ${chosen ? "bg-accent-soft" : ""}`}
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
      }
    />
  );
}
