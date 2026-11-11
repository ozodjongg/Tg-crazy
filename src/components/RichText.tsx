"use client";

import { Fragment, useState, type ReactNode } from "react";
import { safeHref, toRichTree, type RichNode } from "@/lib/richtext";
import type { Entity } from "@/lib/telegram/types";

function Spoiler({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      role={open ? undefined : "button"}
      tabIndex={open ? undefined : 0}
      aria-label={open ? undefined : "Yashirin matn — ochish uchun bosing"}
      className={open ? "rounded bg-hover/60" : "spoiler cursor-pointer rounded"}
      onClick={() => setOpen(true)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(true)}
    >
      {children}
    </span>
  );
}

function textOf(nodes: RichNode[]): string {
  return nodes.map((n) => (typeof n === "string" ? n : textOf(n.children))).join("");
}

function wrap(entity: Entity, children: ReactNode, plain: string): ReactNode {
  switch (entity.kind) {
    case "bold":
      return <strong className="font-semibold">{children}</strong>;
    case "italic":
      return <em>{children}</em>;
    case "underline":
      return <u>{children}</u>;
    case "strike":
      return <s>{children}</s>;
    case "spoiler":
      return <Spoiler>{children}</Spoiler>;
    case "code":
      return <code className="rounded bg-black/5 px-1 font-mono text-[0.9em] text-accent dark:bg-white/10">{children}</code>;
    case "pre":
      return (
        <pre className="my-1 overflow-x-auto rounded-lg bg-black/5 p-2 font-mono text-[0.85em] leading-snug dark:bg-white/10">
          {entity.language && <span className="mb-1 block text-xs font-sans font-medium text-accent">{entity.language}</span>}
          <code>{children}</code>
        </pre>
      );
    case "blockquote":
      return <blockquote className="my-1 border-l-[3px] border-accent bg-accent/10 py-0.5 pl-2 pr-1">{children}</blockquote>;
    case "url":
    case "text_link":
    case "email":
    case "phone": {
      const href = safeHref(entity, plain);
      if (!href) return children;
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
          title={entity.kind === "text_link" ? href : undefined}
        >
          {children}
        </a>
      );
    }
    case "mention":
    case "text_mention":
    case "hashtag":
    case "cashtag":
    case "bot_command":
      return <span className="text-accent">{children}</span>;
  }
}

function render(nodes: RichNode[]): ReactNode[] {
  return nodes.map((n, i) =>
    typeof n === "string" ? (
      <Fragment key={i}>{n}</Fragment>
    ) : (
      <Fragment key={i}>{wrap(n.entity, render(n.children), textOf(n.children))}</Fragment>
    ),
  );
}

/** Telegram formatlashi bilan matn. Entity'lar o'girilgan (lotin↔kirill) matnda ishlatilmaydi. */
export function RichText({ text, entities }: { text: string; entities: Entity[] }) {
  return <>{render(toRichTree(text, entities))}</>;
}
