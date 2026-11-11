const MESSAGES: Record<string, string> = {
  PHONE_NUMBER_INVALID: "Telefon raqami noto'g'ri",
  PHONE_NUMBER_BANNED: "Bu raqam Telegram tomonidan bloklangan",
  PHONE_CODE_INVALID: "Kod noto'g'ri",
  PHONE_CODE_EXPIRED: "Kod muddati tugagan, qaytadan so'rang",
  PHONE_CODE_EMPTY: "Kodni kiriting",
  PASSWORD_HASH_INVALID: "Parol noto'g'ri",
  API_ID_INVALID: "API_ID yoki API_HASH noto'g'ri",
  PHONE_NUMBER_UNOCCUPIED: "Bu raqam Telegram'da ro'yxatdan o'tmagan",
  AUTH_RESTART: "Kirishni qaytadan boshlang",
};

export function errorText(err: unknown): string {
  const text =
    typeof err === "object" && err !== null && "text" in err
      ? String((err as { text: unknown }).text)
      : "";
  if (text) {
    if (MESSAGES[text]) return MESSAGES[text];
    const flood = /^FLOOD_WAIT_(\d+)$/.exec(text);
    if (flood) return `Juda ko'p urinish. ${flood[1]} soniyadan keyin urinib ko'ring`;
    return `Telegram xatosi: ${text}`;
  }
  return err instanceof Error ? err.message : "Noma'lum xato";
}

export function isRpcError(err: unknown, text: string): boolean {
  return (
    typeof err === "object" && err !== null && "text" in err && (err as { text: unknown }).text === text
  );
}
