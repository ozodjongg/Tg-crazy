"use client";

import { useState } from "react";
import { formatSize } from "@/lib/messages";
import { Dialog, primaryButton, secondaryButton } from "./Dialog";
import { Icon } from "./Icon";

/** Yuborishdan oldin fayl/rasmni ko'rsatish va izoh yozish. */
export function AttachDialog({
  file, initialCaption, onSend, onClose,
}: { file: File; initialCaption: string; onSend: (caption: string) => void; onClose: () => void }) {
  const [caption, setCaption] = useState(initialCaption);
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  // URL bir marta yaratiladi va oyna yopilganda (yuborish yoki bekor qilish) bo'shatiladi.
  // Effekt tozalashida bo'shatilmaydi: ishlab chiqish rejimida effekt ikki marta ishlaydi.
  const [preview] = useState(() => (isImage || isVideo ? URL.createObjectURL(file) : null));
  const release = () => {
    if (preview) URL.revokeObjectURL(preview);
  };
  const close = () => {
    release();
    onClose();
  };

  return (
    <Dialog title={isImage ? "Rasm yuborish" : isVideo ? "Video yuborish" : "Fayl yuborish"} onClose={close}>
      {preview && isImage && (
        // eslint-disable-next-line @next/next/no-img-element -- blob URL
        <img src={preview} alt="" className="mx-auto max-h-72 rounded-xl object-contain" />
      )}
      {preview && isVideo && <video src={preview} controls className="mx-auto max-h-72 rounded-xl" />}
      {!preview && (
        <div className="flex items-center gap-3 rounded-xl bg-panel p-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-text">
            <Icon name="file" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{file.name}</span>
            <span className="text-xs text-muted">{formatSize(file.size)}</span>
          </span>
        </div>
      )}
      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          release();
          onSend(caption);
        }}
      >
        <input
          autoFocus
          className="w-full rounded-xl border border-border bg-bg px-3 py-2 placeholder:text-muted focus:border-accent"
          placeholder="Izoh qo'shing…"
          aria-label="Izoh"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className={secondaryButton} onClick={close}>
            Bekor qilish
          </button>
          <button className={primaryButton}>Yuborish</button>
        </div>
      </form>
    </Dialog>
  );
}
