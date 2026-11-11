"use client";

import { useEffect, useState } from "react";
import { avatarColor, initials } from "@/lib/format";
import { avatarUrl, hasAvatar } from "@/lib/telegram/media";
import { Icon } from "./Icon";

export function Avatar({
  id, title, size = 48, online = false, saved = false,
}: { id: number; title: string; size?: number; online?: boolean; saved?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (saved || !hasAvatar(id)) return;
    let alive = true;
    avatarUrl(id).then((u) => alive && setUrl(u), () => {});
    return () => {
      alive = false;
    };
  }, [id, saved]);

  return (
    <span aria-hidden className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {saved ? (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-accent text-accent-text">
          <Icon name="bookmark" size={size * 0.48} />
        </span>
      ) : url ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob URL
        <img src={url} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full font-medium text-white"
          style={{ background: avatarColor(id), fontSize: size * 0.38 }}
        >
          {initials(title)}
        </span>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-panel bg-[#4caf50]"
          style={{ width: Math.max(10, size * 0.28), height: Math.max(10, size * 0.28) }}
        />
      )}
    </span>
  );
}
