// Ko'p akkaunt: har bir akkaunt o'z "slot"ida, alohida mtcute xotirasi (IndexedDB) bilan.
// 0-slot eski nom ("tg-crazy") bilan — ilgari kirilgan sessiya yo'qolmaydi.
// Akkaunt almashtirish sahifani qayta yuklash orqali: bitta sahifada bitta klient.

export interface AccountEntry {
  slot: number;
  id: number;
  name: string;
}

export const MAX_ACCOUNTS = 3;
const LIST_KEY = "tg-crazy:accounts";
const ACTIVE_KEY = "tg-crazy:active-slot";

/** mtcute xotirasi nomi (va slotga bog'liq boshqa kalitlar uchun qo'shimcha) */
export const storageName = (slot: number) => (slot === 0 ? "tg-crazy" : `tg-crazy:${slot}`);
export const slotKey = (base: string, slot: number) => (slot === 0 ? base : `${base}:${slot}`);

export function nextFreeSlot(list: AccountEntry[]): number | null {
  for (let s = 0; s < MAX_ACCOUNTS; s++) if (!list.some((a) => a.slot === s)) return s;
  return null;
}

export function upsertAccount(list: AccountEntry[], entry: AccountEntry): AccountEntry[] {
  const rest = list.filter((a) => a.slot !== entry.slot);
  return [...rest, entry].sort((a, b) => a.slot - b.slot);
}

export function removeSlot(list: AccountEntry[], slot: number): AccountEntry[] {
  return list.filter((a) => a.slot !== slot);
}

/** Shu Telegram akkaunti boshqa slotda allaqachon bormi */
export function duplicateSlot(list: AccountEntry[], slot: number, id: number): number | null {
  return list.find((a) => a.id === id && a.slot !== slot)?.slot ?? null;
}

export function sanitizeAccounts(raw: unknown): AccountEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (a): a is AccountEntry =>
        !!a && typeof a === "object" && Number.isInteger(a.slot) && a.slot >= 0 && a.slot < MAX_ACCOUNTS &&
        typeof a.id === "number" && typeof a.name === "string",
    )
    .sort((a, b) => a.slot - b.slot);
}

// ---- Brauzer xotirasi ----

export function readAccounts(): AccountEntry[] {
  try {
    return sanitizeAccounts(JSON.parse(localStorage.getItem(LIST_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export function writeAccounts(list: AccountEntry[]): void {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(list));
  } catch {
    // Saqlab bo'lmasa ro'yxat faqat shu seansda qoladi
  }
}

export function activeSlot(): number {
  try {
    const n = Number(localStorage.getItem(ACTIVE_KEY) ?? "0");
    return Number.isInteger(n) && n >= 0 && n < MAX_ACCOUNTS ? n : 0;
  } catch {
    return 0;
  }
}

/** Slotni almashtirib sahifani qayta yuklaydi. */
export function switchToSlot(slot: number): void {
  try {
    localStorage.setItem(ACTIVE_KEY, String(slot));
  } catch {
    return;
  }
  window.location.reload();
}
