// Telegram username qoidalari: 5–32 belgi, lotin harf/raqam/_; harf bilan boshlanadi,
// "_" bilan tugamaydi va ketma-ket "__" bo'lmaydi.

export type UsernameIssue = "short" | "long" | "chars" | "start" | "end" | "double";

export function usernameIssue(raw: string): UsernameIssue | null {
  const u = raw.replace(/^@/, "");
  if (u.length === 0) return null; // bo'sh — username olib tashlanadi
  if (/[^a-zA-Z0-9_]/.test(u)) return "chars";
  if (!/^[a-zA-Z]/.test(u)) return "start";
  if (u.length < 5) return "short";
  if (u.length > 32) return "long";
  if (u.endsWith("_")) return "end";
  if (u.includes("__")) return "double";
  return null;
}

export const USERNAME_ISSUE_TEXT: Record<UsernameIssue, string> = {
  short: "Kamida 5 ta belgi bo'lishi kerak",
  long: "Ko'pi bilan 32 ta belgi",
  chars: "Faqat lotin harflari, raqamlar va _",
  start: "Harf bilan boshlanishi kerak",
  end: "_ bilan tugamasligi kerak",
  double: "Ketma-ket ikkita _ bo'lmasin",
};
