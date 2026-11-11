"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "@/lib/backend/client";
import { useApp } from "@/store/app";
import { useServices, type AiRequest } from "@/store/services";
import { Dialog, primaryButton, secondaryButton } from "./Dialog";

const TITLES: Record<AiRequest["kind"], string> = {
  summary: "Suhbat xulosasi",
  translate: "Tarjima",
  draft: "Javob qoralamasi",
};

const LANGS: { id: api.AiLang; label: string }[] = [
  { id: "uz", label: "O'zbekcha (lotin)" },
  { id: "uz-cyrl", label: "Ўзбекча (кирилл)" },
  { id: "ru", label: "Русский" },
  { id: "en", label: "English" },
];

type Phase = { name: "confirm" } | { name: "loading" } | { name: "done"; text: string } | { name: "error"; message: string };

function describe(req: AiRequest): string {
  if (req.kind === "translate") return `Tanlangan xabar matni (${req.text.length} belgi)`;
  const chars = req.messages.reduce((n, m) => n + m.text.length, 0);
  return `Shu chatdagi so'nggi ${req.messages.length} ta xabar matni va yuboruvchilar ismi (${chars} belgi)`;
}

function Body({ req }: { req: AiRequest }) {
  const lang = useServices((s) => s.aiLang);
  const setLang = useServices((s) => s.setAiLang);
  const skip = useServices((s) => s.aiSkipConfirm);
  const setSkip = useServices((s) => s.setAiSkipConfirm);
  const quota = useServices((s) => s.profile?.ai ?? null);
  const run = useServices((s) => s.ai);
  const close = useServices((s) => s.closeAi);
  const setDraft = useApp((s) => s.setDraft);

  const empty = req.kind !== "translate" && req.messages.length === 0;
  const exhausted = quota !== null && quota.used >= quota.limit;
  // "So'ramasdan yuborish" yoqilgan bo'lsa oyna ochilishi bilan so'rov ketadi.
  // Qoralamada istak maydoni bor — u doim tasdiqlash bosqichidan boshlanadi.
  const [autoStart] = useState(skip && req.kind !== "draft" && !empty && !exhausted);
  const [phase, setPhase] = useState<Phase>(autoStart ? { name: "loading" } : { name: "confirm" });
  const [hint, setHint] = useState("");
  const [copied, setCopied] = useState(false);
  const launched = useRef(false);

  const request = useCallback(
    (hintText: string) =>
      run(() =>
        req.kind === "summary"
          ? api.aiSummarize(req.messages, lang)
          : req.kind === "translate"
            ? api.aiTranslate(req.text, lang)
            : api.aiReplyDraft(req.messages, hintText, lang),
      ).then(
        (text) => setPhase({ name: "done", text }),
        (err) => setPhase({ name: "error", message: err instanceof Error ? err.message : "Noma'lum xato" }),
      ),
    [req, lang, run],
  );

  useEffect(() => {
    // Bir marta: qayta render yoki StrictMode ikkinchi so'rov yubormasin (har so'rov limitdan yechiladi)
    if (!autoStart || launched.current) return;
    launched.current = true;
    void request("");
  }, [autoStart, request]);

  function start() {
    setPhase({ name: "loading" });
    void request(hint);
  }

  if (phase.name === "loading") {
    return <p className="py-8 text-center text-muted" role="status">AI ishlamoqda…</p>;
  }

  if (phase.name === "done") {
    return (
      <>
        <p className="whitespace-pre-wrap rounded-2xl bg-panel p-4 leading-relaxed">{phase.text}</p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            className={secondaryButton}
            onClick={() => {
              void navigator.clipboard.writeText(phase.text).then(() => setCopied(true));
            }}
          >
            {copied ? "Nusxalandi" : "Nusxa olish"}
          </button>
          {req.kind === "draft" ? (
            <button
              className={primaryButton}
              onClick={() => {
                setDraft(phase.text);
                close();
              }}
            >
              Yozish maydoniga qo&apos;yish
            </button>
          ) : (
            <button className={primaryButton} onClick={close}>
              Yopish
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {phase.name === "error" && (
        <p role="alert" className="mb-3 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {phase.message}
        </p>
      )}
      {empty ? (
        <p className="text-muted">Bu chatda AI uchun matnli xabar yo&apos;q.</p>
      ) : (
        <>
          <p className="text-sm text-muted">Tg-crazy serveriga va u orqali AI modeliga yuboriladi:</p>
          <p className="mt-1 rounded-xl bg-panel px-3 py-2 text-sm">{describe(req)}</p>
          <p className="mt-2 text-xs text-muted">
            Matn serverda saqlanmaydi. Boshqa chatlar va Telegram sessiyangiz yuborilmaydi.
          </p>
        </>
      )}

      <label className="mt-4 block text-sm">
        <span className="text-muted">{req.kind === "translate" ? "Qaysi tilga" : "Javob tili"}</span>
        <select
          className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2"
          value={lang}
          onChange={(e) => setLang(e.target.value as api.AiLang)}
        >
          {LANGS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </label>

      {req.kind === "draft" && (
        <label className="mt-3 block text-sm">
          <span className="text-muted">Nima deb javob bermoqchisiz? (ixtiyoriy)</span>
          <input
            className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 placeholder:text-muted focus:border-accent"
            placeholder="Masalan: muloyimlik bilan rad et"
            maxLength={500}
            value={hint}
            onChange={(e) => setHint(e.target.value)}
          />
        </label>
      )}

      {req.kind !== "draft" && (
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-[var(--accent)]" checked={skip} onChange={(e) => setSkip(e.target.checked)} />
          Keyingi safar so&apos;ramasdan yuborish
        </label>
      )}

      <div className="mt-5 flex items-center gap-3">
        <span className="flex-1 text-xs text-muted">
          {quota && (exhausted ? "Bugungi limit tugadi" : `Bugun: ${quota.used} / ${quota.limit}`)}
        </span>
        <button className={secondaryButton} onClick={close}>
          Bekor qilish
        </button>
        <button className={primaryButton} disabled={empty || exhausted} onClick={start}>
          {phase.name === "error" ? "Qayta urinish" : "Yuborish"}
        </button>
      </div>
    </>
  );
}

export function AiDialog() {
  const req = useServices((s) => s.aiRequest);
  const close = useServices((s) => s.closeAi);
  if (!req) return null;
  // Body har so'rov uchun yangidan yaratiladi (oyna yopilganda o'chadi)
  return (
    <Dialog title={TITLES[req.kind]} onClose={close} wide>
      <Body req={req} />
    </Dialog>
  );
}
