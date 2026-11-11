"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useApp } from "@/store/app";

const inputClass =
  "w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-base outline-none focus:border-accent";
const buttonClass =
  "w-full rounded-lg bg-accent px-3 py-2.5 font-medium text-accent-text disabled:opacity-50";

function Shell({ title, hint, children }: { title: string; hint: ReactNode; children?: ReactNode }) {
  const error = useApp((s) => s.error);
  return (
    <main className="flex min-h-full items-center justify-center bg-panel p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-bg p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted">{hint}</p>
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {children}
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
            <code>.env.local</code> faylida <code>NEXT_PUBLIC_TG_API_ID</code> va{" "}
            <code>NEXT_PUBLIC_TG_API_HASH</code> ko&apos;rsatilmagan. Ularni my.telegram.org saytidan oling,{" "}
            <code>.env.example</code> dan nusxa ko&apos;chirib to&apos;ldiring va ilovani qayta ishga tushiring.
          </>
        }
      />
    );
  }

  if (step === "code") {
    return (
      <Shell title="Kodni kiriting" hint={`${phone} raqamiga Telegram orqali kod yuborildi.`}>
        <form className="mt-4 space-y-3" onSubmit={on(() => submitCode(code))}>
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
          <button type="button" className="w-full text-sm text-accent" onClick={backToPhone}>
            Raqamni o&apos;zgartirish
          </button>
        </form>
      </Shell>
    );
  }

  if (step === "password") {
    return (
      <Shell title="Ikki bosqichli parol" hint="Akkauntingizda bulutli parol yoqilgan.">
        <form className="mt-4 space-y-3" onSubmit={on(() => submitPassword(password))}>
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
      <form className="mt-4 space-y-3" onSubmit={on(() => submitPhone(phone))}>
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
