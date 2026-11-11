"use client";

import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icon";

export function Dialog({
  title, onClose, children, wide = false,
}: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <button className="absolute inset-0 cursor-default" aria-label="Yopish" tabIndex={-1} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[85vh] w-full flex-col rounded-t-3xl border border-border bg-bg shadow-xl sm:rounded-3xl ${
          wide ? "sm:max-w-xl" : "sm:max-w-md"
        }`}
      >
        <header className="flex items-center gap-2 px-5 pb-2 pt-4">
          <h2 className="min-w-0 flex-1 truncate font-serif text-xl">{title}</h2>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-text"
            aria-label="Yopish"
            onClick={onClose}
          >
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

export const primaryButton =
  "rounded-xl bg-accent px-4 py-2.5 font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent";
export const secondaryButton =
  "rounded-xl border border-border px-4 py-2.5 font-medium hover:bg-hover disabled:opacity-50";
