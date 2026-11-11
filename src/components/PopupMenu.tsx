"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export interface MenuAction {
  key: string;
  label: string;
  icon: IconName;
  danger?: boolean;
  run: () => void;
}

/** Sichqoncha joyida ochiladigan menyu; ekrandan chiqib ketmaydi. */
export function PopupMenu({
  x, y, label, actions, header, onClose,
}: { x: number; y: number; label: string; actions: MenuAction[]; header?: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

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
      <div ref={ref} role="menu" aria-label={label} className="fixed z-40 w-56 rounded-2xl border border-border bg-bg p-1.5 shadow-xl" style={pos}>
        {header}
        <div className={header ? "border-t border-border pt-1" : ""}>
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
