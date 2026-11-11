import { create } from "zustand";
import * as tg from "@/lib/telegram/api";
import { hasCredentials } from "@/lib/telegram/client";
import { errorText } from "@/lib/telegram/errors";
import type { ChatItem, ChatKind, Me, MessageItem } from "@/lib/telegram/types";

export type Theme = "system" | "light" | "dark";
const THEME_KEY = "tg-crazy:theme";

function applyTheme(theme: Theme) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

export type AuthStep = "loading" | "no-credentials" | "phone" | "code" | "password" | "ready";

interface AppState {
  step: AuthStep;
  me: Me | null;
  error: string | null;
  busy: boolean;
  theme: Theme;

  chats: ChatItem[];
  activeChatId: number | null;
  messages: MessageItem[];
  messagesLoading: boolean;

  init: () => Promise<void>;
  setTheme: (theme: Theme) => void;
  submitPhone: (phone: string) => Promise<void>;
  submitCode: (code: string) => Promise<void>;
  submitPassword: (password: string) => Promise<void>;
  backToPhone: () => void;
  logOut: () => Promise<void>;

  openChat: (chatId: number | null) => Promise<void>;
  send: (text: string) => Promise<void>;
}

let phone = "";
let phoneCodeHash = "";
let initStarted = false;

export function sortChats(chats: ChatItem[]): ChatItem[] {
  return [...chats].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || (b.lastDate ?? 0) - (a.lastDate ?? 0),
  );
}

export const useApp = create<AppState>((set, get) => {
  /** So'rovni bajaradi; xatoni o'zbekcha matnga aylantirib ko'rsatadi. */
  async function run(action: () => Promise<void>) {
    set({ busy: true, error: null });
    try {
      await action();
    } catch (err) {
      set({ error: errorText(err) });
    } finally {
      set({ busy: false });
    }
  }

  async function enter(me: Me) {
    set({ step: "ready", me, error: null });
    await tg.onNewMessage(handleIncoming);
    set({ chats: sortChats(await tg.loadChats()) });
  }

  function handleIncoming(msg: MessageItem, chat?: { title: string; kind: ChatKind }) {
    const { chats, activeChatId, messages } = get();
    const isActive = msg.chatId === activeChatId;
    const existing = chats.find((c) => c.id === msg.chatId);
    const updated: ChatItem = {
      id: msg.chatId,
      title: existing?.title ?? chat?.title ?? "Chat",
      kind: existing?.kind ?? chat?.kind ?? (msg.chatId > 0 ? "user" : "group"),
      readOutboxMaxId: existing?.readOutboxMaxId ?? 0,
      lastOutgoing: msg.outgoing,
      lastSender: msg.senderName,
      pinned: existing?.pinned ?? false,
      muted: existing?.muted ?? false,
      lastText: msg.text,
      lastDate: msg.date,
      unread: isActive || msg.outgoing ? 0 : (existing?.unread ?? 0) + 1,
    };
    set({
      chats: sortChats([updated, ...chats.filter((c) => c.id !== msg.chatId)]),
      messages:
        isActive && !messages.some((m) => m.id === msg.id) ? [...messages, msg] : messages,
    });
    if (isActive && !msg.outgoing) void tg.markRead(msg.chatId).catch(() => {});
  }

  return {
    step: "loading",
    me: null,
    error: null,
    busy: false,
    theme: "system",
    chats: [],
    activeChatId: null,
    messages: [],
    messagesLoading: false,

    async init() {
      if (initStarted) return;
      initStarted = true;
      const theme = readTheme();
      applyTheme(theme);
      set({ theme });
      if (!hasCredentials()) {
        set({ step: "no-credentials" });
        return;
      }
      try {
        const me = await tg.restoreSession();
        if (me) await enter(me);
        else set({ step: "phone" });
      } catch (err) {
        set({ step: "phone", error: errorText(err) });
      }
    },

    setTheme(theme) {
      applyTheme(theme);
      try {
        if (theme === "system") localStorage.removeItem(THEME_KEY);
        else localStorage.setItem(THEME_KEY, theme);
      } catch {
        // Saqlash imkoni bo'lmasa (maxfiy rejim) — tanlov faqat shu seansda amal qiladi
      }
      set({ theme });
    },

    submitPhone: (value) =>
      run(async () => {
        phone = value.replace(/[^\d+]/g, "");
        const res = await tg.sendCode(phone);
        if (res.done) return enter(res.me);
        phoneCodeHash = res.phoneCodeHash;
        set({ step: "code" });
      }),

    submitCode: (code) =>
      run(async () => {
        const res = await tg.signIn(phone, phoneCodeHash, code.trim());
        if (res.needPassword) set({ step: "password" });
        else await enter(res.me);
      }),

    submitPassword: (password) => run(async () => enter(await tg.checkPassword(password))),

    backToPhone: () => set({ step: "phone", error: null }),

    logOut: () =>
      run(async () => {
        await tg.logOut();
        // Klient va lokal sessiyani toza holatdan boshlash uchun sahifani qayta yuklaymiz
        window.location.reload();
      }),

    async openChat(chatId) {
      set({ activeChatId: chatId, messages: [], messagesLoading: chatId !== null, error: null });
      if (chatId === null) return;
      try {
        const messages = await tg.loadHistory(chatId);
        if (get().activeChatId !== chatId) return;
        set({
          messages,
          messagesLoading: false,
          chats: get().chats.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)),
        });
        void tg.markRead(chatId).catch(() => {});
      } catch (err) {
        if (get().activeChatId === chatId) set({ messagesLoading: false, error: errorText(err) });
      }
    },

    async send(text) {
      const chatId = get().activeChatId;
      const body = text.trim();
      if (chatId === null || !body) return;
      try {
        const msg = await tg.sendText(chatId, body);
        // O'z xabarimiz update orqali ham kelishi mumkin — handleIncoming takrorni tashlaydi
        handleIncoming(msg);
      } catch (err) {
        set({ error: errorText(err) });
        throw err;
      }
    },
  };
});

// Faqat ishlab chiqish rejimida: brauzer konsolidan holatni ko'rish/sinash uchun
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __app?: typeof useApp }).__app = useApp;
}
