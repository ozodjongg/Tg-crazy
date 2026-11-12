"use client";

import { useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/messages";
import { startVoice, type VoiceRecording, type VoiceResult } from "@/lib/voice/recorder";
import { Icon } from "./Icon";

const BARS = 48;

/** Ovozli xabar yozish paneli: ochilganda yozish boshlanadi. */
export function VoiceBar({
  onSend, onClose, onError,
}: {
  onSend: (v: VoiceResult) => void;
  onClose: () => void;
  onError: (text: string) => void;
}) {
  const rec = useRef<VoiceRecording | null>(null);
  const [ready, setReady] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => new Array(BARS).fill(0));
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    let alive = true;
    let pending: number[] = [];
    let frame = 0;
    const started = performance.now();
    startVoice((level) => {
      pending.push(level);
      // Bir kadrda bir marta chizamiz
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          const add = pending;
          pending = [];
          setLevels((l) => [...l, ...add].slice(-BARS));
          setElapsed(Math.floor((performance.now() - started) / 1000));
        });
      }
    }).then(
      (r) => {
        if (!alive) return r.cancel();
        rec.current = r;
        setReady(true);
      },
      (err: unknown) => {
        if (!alive) return;
        const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
        onError(denied ? "Mikrofonga ruxsat berilmagan. Brauzer sozlamalarida ruxsat bering." : "Mikrofonni ochib bo'lmadi.");
        onClose();
      },
    );
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      rec.current?.cancel();
      rec.current = null;
    };
    // Faqat ochilganda bir marta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    const r = rec.current;
    if (!r || stopping) return;
    setStopping(true);
    rec.current = null;
    try {
      const v = await r.stop();
      // Juda qisqa yozuv tasodifiy bosish — yuborilmaydi
      if (v.duration >= 1) onSend(v);
    } catch {
      onError("Yozuvni tayyorlab bo'lmadi.");
    }
    onClose();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") void send();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex items-end gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-3xl border border-border bg-bg py-1 pl-1 pr-4 shadow-sm">
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-danger hover:bg-danger-soft"
          aria-label="Yozuvni bekor qilish"
          title="Bekor qilish (Esc)"
          onClick={onClose}
        >
          <Icon name="trash" />
        </button>
        <span className="flex items-center gap-2 text-sm tabular-nums" aria-live="polite">
          <span className={`h-2.5 w-2.5 rounded-full bg-danger ${ready ? "animate-pulse" : "opacity-40"}`} aria-hidden />
          {ready ? formatDuration(elapsed) : "Mikrofon…"}
        </span>
        <span className="flex h-8 min-w-0 flex-1 items-center justify-end gap-[2px] overflow-hidden" aria-hidden>
          {levels.map((l, i) => (
            <span key={i} className="w-[3px] shrink-0 rounded-full bg-accent" style={{ height: `${Math.max(8, l * 100)}%` }} />
          ))}
        </span>
      </div>
      <button
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-text hover:bg-accent-hover disabled:opacity-40"
        aria-label="Ovozli xabarni yuborish"
        title="Yuborish (Enter)"
        disabled={!ready || stopping}
        onClick={() => void send()}
      >
        <Icon name="send" size={22} />
      </button>
    </div>
  );
}
