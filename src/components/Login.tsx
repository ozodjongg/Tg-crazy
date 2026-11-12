"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useApp } from "@/store/app";
import { activeSlot, readAccounts, switchToSlot } from "@/lib/telegram/accounts";
import { Logo } from "./Logo";

const inputClass =
  "w-full rounded-xl border border-border bg-bg px-4 py-3 text-base placeholder:text-muted focus:border-accent";
const buttonClass =
  "w-full rounded-xl bg-accent px-4 py-3 font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent";

/** Yangi akkaunt qo'shilayotganda — mavjud akkauntlarga qaytish. */
function BackToAccounts() {
  const [list] = useState(() => {
    const slot = activeSlot();
    return readAccounts().filter((a) => a.slot !== slot);
  });
  if (list.length === 0) return null;
  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="mb-2 text-sm text-muted">Yoki mavjud akkauntga qaytish:</p>
      <div className="flex flex-wrap gap-2">
        {list.map((a) => (
          <button key={a.slot} className="rounded-full border border-border px-3 py-1.5 text-sm hover:bg-hover" onClick={() => switchToSlot(a.slot)}>
            {a.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function Shell({ title, hint, children }: { title: string; hint: ReactNode; children?: ReactNode }) {
  const error = useApp((s) => s.error);
  return (
    <main className="flex min-h-full items-center justify-center bg-panel p-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-bg p-7">
        <Logo size={52} />
        <h1 className="mt-5 font-serif text-3xl">{title}</h1>
        <p className="mt-2 text-muted">{hint}</p>
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {children}
        <BackToAccounts />
        <p className="mt-6 text-xs text-muted">
          Norasmiy klient. Sessiya faqat shu qurilmada saqlanadi va to&apos;g&apos;ridan-to&apos;g&apos;ri Telegram
          serverlariga ulanadi.
        </p>
      </div>
    </main>
  );
}

export function Login() {
  const step = useApp((s) => s.step);
  const busy = useApp((s) => s.busy);
  const submitPhone = useApp((s) => s.submitPhone);
  const submitCode = useApp((s) => s.submitCode);
  const submitPassword = useApp((s) => s.submitPassword);
  const backToPhone = useApp((s) => s.backToPhone);

  const [phone, setPhone] = useState("+998");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  const on = (fn: () => Promise<void>) => (e: FormEvent) => {
    e.preventDefault();
    void fn();
  };

  if (step === "no-credentials") {
    return (
      <Shell
        title="Sozlash kerak"
        hint={
          <>
            <code className="rounded bg-panel px-1 text-sm text-text">.env.local</code> faylida <code className="rounded bg-panel px-1 text-sm text-text">NEXT_PUBLIC_TG_API_ID</code> va{" "}
            <code className="rounded bg-panel px-1 text-sm text-text">NEXT_PUBLIC_TG_API_HASH</code> ko&apos;rsatilmagan. Ularni my.telegram.org saytidan oling,{" "}
            <code className="rounded bg-panel px-1 text-sm text-text">.env.example</code> dan nusxa ko&apos;chirib to&apos;ldiring va ilovani qayta ishga tushiring.
          </>
        }
      />
    );
  }

  if (step === "code") {
    return (
      <Shell title="Kodni kiriting" hint={`${phone} raqamiga Telegram orqali kod yuborildi.`}>
        <form className="mt-5 space-y-3" onSubmit={on(() => submitCode(code))}>
          <input
            className={inputClass}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="Kod"
            aria-label="Tasdiqlash kodi"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button className={buttonClass} disabled={busy || !code.trim()}>
            {busy ? "Tekshirilmoqda…" : "Davom etish"}
          </button>
          <button type="button" className="w-full py-1 text-sm text-accent hover:text-accent-hover" onClick={backToPhone}>
            Raqamni o&apos;zgartirish
          </button>
        </form>
      </Shell>
    );
  }

  if (step === "password") {
    return (
      <Shell title="Ikki bosqichli parol" hint="Akkauntingizda bulutli parol yoqilgan.">
        <form className="mt-5 space-y-3" onSubmit={on(() => submitPassword(password))}>
          <input
            className={inputClass}
            type="password"
            autoComplete="current-password"
            autoFocus
            placeholder="Parol"
            aria-label="Parol"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className={buttonClass} disabled={busy || !password}>
            {busy ? "Tekshirilmoqda…" : "Kirish"}
          </button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell title="Tg-crazy" hint="Telegram akkauntingizga kirish uchun telefon raqamingizni kiriting.">
      <form className="mt-5 space-y-3" onSubmit={on(() => submitPhone(phone))}>
        <input
          className={inputClass}
          type="tel"
          autoComplete="tel"
          autoFocus
          placeholder="+998 90 123 45 67"
          aria-label="Telefon raqami"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button className={buttonClass} disabled={busy || phone.replace(/\D/g, "").length < 9}>
          {busy ? "Yuborilmoqda…" : "Kod olish"}
        </button>
      </form>
    </Shell>
  );
}
