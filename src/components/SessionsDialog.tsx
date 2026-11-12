"use client";

import { useEffect, useState } from "react";
import { formatChatDate } from "@/lib/format";
import * as tg from "@/lib/telegram/api";
import { Dialog, secondaryButton } from "./Dialog";
import { Icon } from "./Icon";

function SessionRow({ s, onEnd, busy }: { s: tg.Session; onEnd?: () => void; busy?: boolean }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-border p-3">
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${s.current ? "bg-accent text-accent-text" : "bg-panel text-muted"}`}>
        <Icon name="monitor" size={18} />
      </span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="block truncate font-medium">{s.device || "Noma'lum qurilma"}</span>
        <span className="block truncate text-muted">
          {s.app}
          {!s.official && " · norasmiy ilova"}
        </span>
        <span className="block truncate text-muted">
          {[s.place, s.ip].filter(Boolean).join(" · ")}
          {" · "}
          {s.current ? <span className="text-accent">hozir faol</span> : formatChatDate(s.active)}
        </span>
      </span>
      {onEnd && (
        <button
          className="shrink-0 rounded-full px-3 py-1 text-sm text-danger hover:bg-danger-soft disabled:opacity-50"
          disabled={busy}
          onClick={onEnd}
        >
          Tugatish
        </button>
      )}
    </li>
  );
}

export function SessionsDialog({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const [sessions, setSessions] = useState<tg.Session[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    tg.loadSessions().then(
      (s) => alive && setSessions(s),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, []);

  async function end(id: string | "others") {
    setBusy(id);
    setError(null);
    try {
      if (id === "others") await tg.terminateOtherSessions();
      else await tg.terminateSession(id);
      setSessions((list) => list?.filter((s) => (id === "others" ? s.current : s.id !== id)) ?? null);
    } catch {
      // Yangi kirilgan qurilmadan 24 soat ichida boshqa seanslarni tugatib bo'lmaydi
      setError("Tugatib bo'lmadi. Yangi kirilgan qurilmadan bu amal 24 soatdan keyin ruxsat etiladi.");
    } finally {
      setBusy(null);
    }
  }

  const current = sessions?.filter((s) => s.current) ?? [];
  const others = sessions?.filter((s) => !s.current) ?? [];

  return (
    <Dialog title="Faol seanslar" onClose={onClose}>
      <button className="mb-3 text-sm text-accent hover:text-accent-hover" onClick={onBack}>
        ← Sozlamalar
      </button>
      {failed && <p className="py-6 text-center text-sm text-muted">Seanslarni yuklab bo&apos;lmadi</p>}
      {!sessions && !failed && <p className="py-6 text-center text-sm text-muted">Yuklanmoqda…</p>}
      {error && <p role="alert" className="mb-3 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      {sessions && (
        <>
          <h3 className="mb-2 text-sm font-medium text-muted">Shu qurilma</h3>
          <ul className="space-y-2">{current.map((s) => <SessionRow key={s.id} s={s} />)}</ul>
          {others.length > 0 && (
            <>
              <button
                className={`${secondaryButton} mt-3 w-full text-danger`}
                disabled={busy !== null}
                onClick={() => {
                  if (window.confirm("Boshqa barcha qurilmalardan chiqilsinmi?")) void end("others");
                }}
              >
                Boshqa barcha seanslarni tugatish
              </button>
              <h3 className="mb-2 mt-5 text-sm font-medium text-muted">Boshqa seanslar ({others.length})</h3>
              <ul className="space-y-2">
                {others.map((s) => (
                  <SessionRow key={s.id} s={s} busy={busy !== null} onEnd={() => void end(s.id)} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </Dialog>
  );
}
