"use client";

import { useEffect, useRef, useState } from "react";
import * as tg from "@/lib/telegram/api";
import { USERNAME_ISSUE_TEXT, usernameIssue } from "@/lib/username";
import { useApp } from "@/store/app";
import { Avatar } from "./Avatar";
import { Dialog, primaryButton, secondaryButton } from "./Dialog";
import { Icon } from "./Icon";

const BIO_MAX = 70;
const field = "mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 placeholder:text-muted focus:border-accent";

type UsernameState = "idle" | "checking" | "free" | "taken" | "error";

export function ProfileEditDialog({ onClose }: { onClose: () => void }) {
  const me = useApp((s) => s.me);
  const meVersion = useApp((s) => s.meVersion);
  const setMe = useApp((s) => s.setMe);
  const showNotice = useApp((s) => s.showNotice);
  const [orig, setOrig] = useState<tg.MyProfile | null>(null);
  const [failed, setFailed] = useState(false);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");
  const [uState, setUState] = useState<UsernameState>("idle");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    tg.loadMyProfile().then(
      (p) => {
        if (!alive) return;
        setOrig(p);
        setFirst(p.firstName);
        setLast(p.lastName);
        setBio(p.bio);
        setUsername(p.username ?? "");
      },
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, []);

  const uname = username.replace(/^@/, "");
  const issue = usernameIssue(uname);
  const unameChanged = !!orig && uname !== (orig.username ?? "");

  // Username band emasligini yozish to'xtagach tekshiramiz
  useEffect(() => {
    if (!unameChanged || issue || !uname) return;
    let alive = true;
    const timer = setTimeout(() => {
      setUState("checking");
      tg.checkUsername(uname).then(
        (free) => alive && setUState(free ? "free" : "taken"),
        () => alive && setUState("error"),
      );
    }, 500);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [uname, unameChanged, issue]);

  const effectiveUState: UsernameState = !unameChanged || issue || !uname ? "idle" : uState;
  const canSave =
    !!orig && first.trim().length > 0 && bio.length <= BIO_MAX && !issue && effectiveUState !== "taken" && !busy;

  async function save() {
    if (!orig || !canSave) return;
    setBusy(true);
    setError(null);
    try {
      if (first !== orig.firstName || last !== orig.lastName || bio !== orig.bio) {
        setMe(await tg.updateMyProfile({ firstName: first.trim(), lastName: last.trim(), bio }));
      }
      if (unameChanged) await tg.setMyUsername(uname);
      showNotice("Profil saqlandi");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saqlab bo'lmadi");
    } finally {
      setBusy(false);
    }
  }

  async function photo(action: () => Promise<void>) {
    setPhotoBusy(true);
    setError(null);
    try {
      await action();
      if (me) setMe({ ...me });
    } catch {
      setError("Rasmni o'zgartirib bo'lmadi");
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <Dialog title="Profilni tahrirlash" onClose={onClose}>
      {failed && <p className="py-6 text-center text-sm text-muted">Profilni yuklab bo&apos;lmadi</p>}
      {!orig && !failed && <p className="py-6 text-center text-sm text-muted">Yuklanmoqda…</p>}
      {orig && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="flex flex-col items-center gap-2 pb-3">
            <div className={`relative ${photoBusy ? "opacity-50" : ""}`}>
              <Avatar key={meVersion} id={orig.id} title={`${first} ${last}`} size={88} />
              <button
                type="button"
                className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-bg bg-accent text-accent-text hover:bg-accent-hover"
                aria-label="Profil rasmini o'zgartirish"
                disabled={photoBusy}
                onClick={() => fileRef.current?.click()}
              >
                <Icon name="edit" size={16} />
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void photo(() => tg.setMyPhoto(f));
              }}
            />
            <button type="button" className="text-xs text-muted hover:text-danger" disabled={photoBusy} onClick={() => void photo(tg.removeMyPhoto)}>
              Rasmni olib tashlash
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm text-muted">
              Ism
              <input className={field} value={first} maxLength={64} autoFocus onChange={(e) => setFirst(e.target.value)} />
            </label>
            <label className="text-sm text-muted">
              Familiya
              <input className={field} value={last} maxLength={64} onChange={(e) => setLast(e.target.value)} />
            </label>
          </div>

          <label className="mt-3 block text-sm text-muted">
            <span className="flex justify-between">
              O&apos;zim haqimda
              <span className={bio.length > BIO_MAX ? "text-danger" : ""}>{BIO_MAX - bio.length}</span>
            </span>
            <textarea className={`${field} resize-none`} rows={2} value={bio} onChange={(e) => setBio(e.target.value)} />
          </label>

          <label className="mt-3 block text-sm text-muted">
            Username
            <span className="mt-1 flex items-center rounded-xl border border-border bg-bg pl-3 focus-within:border-accent">
              <span className="text-muted">@</span>
              <input
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-text outline-none"
                value={uname}
                maxLength={33}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setUState("idle");
                }}
              />
            </span>
          </label>
          <p className={`mt-1 min-h-5 text-xs ${issue || effectiveUState === "taken" ? "text-danger" : effectiveUState === "free" ? "text-accent" : "text-muted"}`} aria-live="polite">
            {issue
              ? USERNAME_ISSUE_TEXT[issue]
              : effectiveUState === "checking"
                ? "Tekshirilmoqda…"
                : effectiveUState === "taken"
                  ? "Bu username band"
                  : effectiveUState === "free"
                    ? "Bo'sh ✓"
                    : uname
                      ? `t.me/${uname}`
                      : "Username bo'lmasa, sizni faqat raqam orqali topishadi"}
          </p>
          {orig.phone && <p className="mt-2 text-sm text-muted">Telefon: +{orig.phone}</p>}
          {error && <p role="alert" className="mt-2 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={secondaryButton} onClick={onClose}>
              Bekor qilish
            </button>
            <button type="submit" className={primaryButton} disabled={!canSave}>
              {busy ? "Saqlanmoqda…" : "Saqlash"}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
