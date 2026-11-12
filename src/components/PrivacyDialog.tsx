"use client";

import { useEffect, useState } from "react";
import { exceptionsLabel, LEVEL_LABEL, PRIVACY_KEYS, type PrivacyKey, type PrivacyLevel, type PrivacyState } from "@/lib/privacy";
import * as tg from "@/lib/telegram/api";
import { Dialog } from "./Dialog";

type Row = PrivacyState | "loading" | "error";

export function PrivacyDialog({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const [rows, setRows] = useState<Record<PrivacyKey, Row>>(
    () => Object.fromEntries(PRIVACY_KEYS.map((k) => [k.key, "loading"])) as Record<PrivacyKey, Row>,
  );
  const [saving, setSaving] = useState<PrivacyKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    for (const k of PRIVACY_KEYS) {
      tg.loadPrivacy(k.tl).then(
        (state) => alive && setRows((r) => ({ ...r, [k.key]: state })),
        () => alive && setRows((r) => ({ ...r, [k.key]: "error" })),
      );
    }
    return () => {
      alive = false;
    };
  }, []);

  async function change(key: PrivacyKey, tlKey: string, level: PrivacyLevel) {
    const before = rows[key];
    if (typeof before !== "object" || before.level === level) return;
    const next = { ...before, level };
    setRows((r) => ({ ...r, [key]: next }));
    setSaving(key);
    setError(null);
    try {
      await tg.savePrivacy(tlKey, next);
    } catch {
      setRows((r) => ({ ...r, [key]: before }));
      setError("Saqlab bo'lmadi, qayta urinib ko'ring");
    } finally {
      setSaving(null);
    }
  }

  return (
    <Dialog title="Maxfiylik" onClose={onClose}>
      <button className="mb-3 text-sm text-accent hover:text-accent-hover" onClick={onBack}>
        ← Sozlamalar
      </button>
      <p className="mb-3 text-sm text-muted">Ma&apos;lumotlaringizni kim ko&apos;ra olishini tanlang.</p>
      {error && <p role="alert" className="mb-3 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      <ul className="space-y-3">
        {PRIVACY_KEYS.map((k) => {
          const row = rows[k.key];
          const extra = typeof row === "object" ? exceptionsLabel(row) : "";
          return (
            <li key={k.key}>
              <p className="mb-1 flex items-baseline justify-between text-sm">
                <span className="font-medium">{k.label}</span>
                {extra && <span className="text-xs text-muted" title="Istisnolar (rasmiy ilovada tahrirlanadi)">{extra} istisno</span>}
              </p>
              {row === "loading" && <div className="h-9 animate-pulse rounded-xl bg-panel" />}
              {row === "error" && <p className="text-sm text-muted">Yuklab bo&apos;lmadi</p>}
              {typeof row === "object" && (
                <div
                  role="radiogroup"
                  aria-label={k.label}
                  className={`grid gap-1 rounded-xl bg-panel p-1 ${k.levels.length === 3 ? "grid-cols-3" : "grid-cols-2"} ${saving === k.key ? "opacity-60" : ""}`}
                >
                  {k.levels.map((level) => (
                    <button
                      key={level}
                      role="radio"
                      aria-checked={row.level === level}
                      disabled={saving !== null}
                      className={`rounded-lg px-1 py-1.5 text-xs ${row.level === level ? "bg-bg text-text shadow-sm" : "text-muted hover:text-text"}`}
                      onClick={() => void change(k.key, k.tl, level)}
                    >
                      {LEVEL_LABEL[level]}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
