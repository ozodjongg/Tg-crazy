import { create } from "zustand";
import * as tg from "@/lib/telegram/api";
import { hasCredentials } from "@/lib/telegram/client";
import { errorText } from "@/lib/telegram/errors";
import { forgetChatMedia } from "@/lib/telegram/media";
import { itemPreview, type ChatItem, type ChatKind, type Me, type MessageItem } from "@/lib/telegram/types";
import { toMarkdown } from "@/lib/markdown";
import { usePrefs } from "./prefs";
import { prependOlder, removeMessages, replaceMessage, toggleReaction, upsertMessage } from "@/lib/messages";

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

export type ChatAction =
  | "pin" | "unpin" | "mute" | "unmute" | "archive" | "unarchive" | "read" | "unread"
  | "delete" | "delete-both";

export type AuthStep = "loading" | "no-credentials" | "phone" | "code" | "password" | "ready";

interface AppState {
  step: AuthStep;
  me: Me | null;
  error: string | null;
  busy: boolean;
  theme: Theme;

  chats: ChatItem[];
  folders: tg.FolderRule[];
  activeChatId: number | null;
  messages: MessageItem[];
  messagesLoading: boolean;
  hasMore: boolean;
  loadingOlder: boolean;
  /** Ro'yxat eng so'nggi xabargacha yetmagan (xabarga o'tilganda) */
  hasNewer: boolean;
  loadingNewer: boolean;
  /** "O'qilmagan xabarlar" ajratgichi shu ID dan keyin */
  unreadAnchor: number | null;
  /** Ko'rsatilishi (scroll) kerak bo'lgan xabar */
  jumpTarget: number | null;
  /** Qadalgan xabarlar (yangidan eskiga) va paneldagi joriy indeks */
  pinned: MessageItem[];
  pinnedIndex: number;
  /** O'ng tomondagi profil paneli */
  profileOpen: boolean;
  /** Yozish maydoni holati: javob berilayotgan yoki tahrirlanayotgan xabar */
  replyTo: MessageItem | null;
  editing: MessageItem | null;
  /** chatId -> "yozmoqda" holati tugaydigan vaqt (ms) */
  typing: Record<number, number>;
  upload: { name: string; fraction: number } | null;
  /** Yozish maydonidagi matn */
  draft: string;
  /** Qisqa xabarnoma (bot javobi va h.k.) */
  notice: string | null;

  init: () => Promise<void>;
  setTheme: (theme: Theme) => void;
  submitPhone: (phone: string) => Promise<void>;
  submitCode: (code: string) => Promise<void>;
  submitPassword: (password: string) => Promise<void>;
  backToPhone: () => void;
  logOut: () => Promise<void>;
  clearError: () => void;

  openChat: (chatId: number | null) => Promise<void>;
  loadOlder: () => Promise<void>;
  loadNewer: () => Promise<void>;
  jumpTo: (messageId: number) => Promise<void>;
  /** Chatni ochib, berilgan xabarga o'tadi (global qidiruvdan). */
  openChatAt: (chatId: number, messageId: number) => Promise<void>;
  clearJump: () => void;
  backToLatest: () => Promise<void>;
  cyclePinned: () => void;
  setProfileOpen: (open: boolean) => void;
  setReplyTo: (msg: MessageItem | null) => void;
  setEditing: (msg: MessageItem | null) => void;
  setDraft: (text: string) => void;
  /** silent — qabul qiluvchida ovozsiz bildirishnoma */
  send: (text: string, silent?: boolean) => Promise<void>;
  sendFile: (file: File, caption: string) => Promise<void>;
  sendSticker: (key: string) => Promise<void>;
  sendGif: (key: string) => Promise<void>;
  /** Bitta chatdagi bir yoki bir nechta xabarni o'chiradi. */
  deleteMessages: (chatId: number, ids: number[], revoke: boolean) => Promise<void>;
  /** Bitta chatdagi xabarlarni (sana tartibida) boshqa chatga uzatadi. */
  forwardMessages: (chatId: number, ids: number[], toChatId: number) => Promise<void>;
  react: (msg: MessageItem, emoji: string) => Promise<void>;
  notifyTyping: () => void;
  /** Chat amallari (kontekst menyudan); muvaffaqiyatsiz bo'lsa holat qaytariladi. */
  chatAction: (chatId: number, action: ChatAction) => Promise<void>;
  votePoll: (msg: MessageItem, answers: string[]) => Promise<void>;
  pressButton: (msg: MessageItem, data: string) => Promise<void>;
  showNotice: (text: string | null) => void;
}

let phone = "";
let phoneCodeHash = "";
let initStarted = false;
let lastTypingSent = 0;

const TYPING_TTL = 6000;
const TYPING_THROTTLE = 4000;

export function sortChats(chats: ChatItem[]): ChatItem[] {
  return [...chats].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || (b.lastDate ?? 0) - (a.lastDate ?? 0),
  );
}

/** Supergruppa va kanallarda xabar ID lari chatga xos; qolganlarida umumiy. */
const isChannelId = (chatId: number) => chatId <= -1_000_000_000_000;

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

  /** Xatoni ko'rsatadi va chaqiruvchiga qayta uzatadi (UI holatini tiklashi uchun). */
  function fail(err: unknown): never {
    set({ error: errorText(err) });
    throw err;
  }

  async function enter(me: Me) {
    set({ step: "ready", me, error: null });
    await tg.subscribe({
      onMessage: handleIncoming,
      onEdit(msg) {
        const s = get();
        set({
          messages: msg.chatId === s.activeChatId ? replaceMessage(s.messages, msg) : s.messages,
          chats: s.chats.map((c) => (c.id === msg.chatId && c.lastId === msg.id ? { ...c, lastText: itemPreview(msg) } : c)),
        });
      },
      onDelete(ids, channelId) {
        const { activeChatId, messages } = get();
        if (activeChatId === null) return;
        const sameScope = channelId === null ? !isChannelId(activeChatId) : channelId === activeChatId;
        if (sameScope) set({ messages: removeMessages(messages, ids) });
      },
      onReadOutbox(chatId, maxId) {
        set({
          chats: get().chats.map((c) =>
            c.id === chatId && c.readOutboxMaxId < maxId ? { ...c, readOutboxMaxId: maxId } : c,
          ),
        });
      },
      onTyping(chatId, userId, active) {
        if (userId === get().me?.id) return;
        const typing = { ...get().typing };
        if (!active) {
          delete typing[chatId];
          set({ typing });
          return;
        }
        const until = Date.now() + TYPING_TTL;
        typing[chatId] = until;
        set({ typing });
        setTimeout(() => {
          const current = get().typing;
          if (current[chatId] !== until) return;
          const next = { ...current };
          delete next[chatId];
          set({ typing: next });
        }, TYPING_TTL);
      },
      onPresence(userId, presence) {
        set({ chats: get().chats.map((c) => (c.id === userId && c.kind === "user" ? { ...c, presence } : c)) });
      },
    });
    set({ chats: sortChats(await tg.loadChats()) });
    // Papkalar ixtiyoriy: yuklanmasa lokal turkumlar ishlatiladi
    tg.loadFolders().then((folders) => set({ folders })).catch(() => {});
  }

  function handleIncoming(msg: MessageItem, chat?: { title: string; kind: ChatKind }) {
    const { chats, activeChatId, messages, typing } = get();
    const isActive = msg.chatId === activeChatId;
    const existing = chats.find((c) => c.id === msg.chatId);
    const isNewest = !existing || msg.id >= existing.lastId;
    const base: ChatItem = existing ?? {
      id: msg.chatId,
      title: chat?.title ?? "Chat",
      kind: chat?.kind ?? (msg.chatId > 0 ? "user" : "group"),
      pinned: false, muted: false, archived: false, isContact: false, presence: null, verified: false,
      isSelf: msg.chatId === get().me?.id, readOutboxMaxId: 0, readInboxMaxId: 0, mentions: 0,
      markedUnread: false, draft: "", lastId: 0, lastText: "", lastDate: null, lastOutgoing: false,
      lastSender: "", unread: 0,
    };
    const counts = !isActive && !msg.outgoing;
    const updated: ChatItem = {
      ...base,
      ...(isNewest
        ? { lastId: msg.id, lastText: itemPreview(msg), lastDate: msg.date, lastOutgoing: msg.outgoing, lastSender: msg.senderName }
        : {}),
      unread: counts ? base.unread + 1 : isActive || msg.outgoing ? 0 : base.unread,
      mentions: counts && msg.mention ? base.mentions + 1 : isActive ? 0 : base.mentions,
      // Yangi xabar kelsa yoki o'zimiz yozsak — qo'lda qo'yilgan "o'qilmagan" belgisi olinadi
      markedUnread: msg.outgoing || isActive ? false : base.markedUnread,
      // Javob yuborilgach qoralama tozalanadi
      draft: msg.outgoing ? "" : base.draft,
    };
    // Xabar keldi — yuboruvchi endi "yozmayapti"
    const nextTyping = { ...typing };
    if (!msg.outgoing) delete nextTyping[msg.chatId];
    set({
      chats: sortChats([updated, ...chats.filter((c) => c.id !== msg.chatId)]),
      messages: isActive && !get().hasNewer ? upsertMessage(messages, msg) : messages,
      typing: nextTyping,
    });
    if (isActive && !msg.outgoing) void tg.markRead(msg.chatId).catch(() => {});
    if (!msg.outgoing && !updated.muted && (!isActive || document.hidden)) notify(updated, msg);
  }

  /** Brauzer bildirishnomasi (ruxsat berilgan va sozlamada yoqilgan bo'lsa). */
  function notify(chat: ChatItem, msg: MessageItem) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (!usePrefs.getState().notifications) return;
    const title = chat.kind === "group" ? `${chat.title}: ${msg.senderName}` : chat.title;
    const n = new Notification(title, { body: itemPreview(msg) || "Yangi xabar", tag: `chat-${chat.id}` });
    n.onclick = () => {
      window.focus();
      void get().openChat(chat.id);
      n.close();
    };
  }

  return {
    step: "loading",
    me: null,
    error: null,
    busy: false,
    theme: "system",
    chats: [],
    folders: [],
    activeChatId: null,
    messages: [],
    messagesLoading: false,
    hasMore: false,
    loadingOlder: false,
    hasNewer: false,
    loadingNewer: false,
    unreadAnchor: null,
    jumpTarget: null,
    pinned: [],
    pinnedIndex: 0,
    profileOpen: false,
    replyTo: null,
    editing: null,
    typing: {},
    upload: null,
    draft: "",
    notice: null,

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

    clearError: () => set({ error: null }),

    async openChat(chatId) {
      const previous = get().activeChatId;
      if (previous !== null && previous !== chatId) {
        forgetChatMedia(previous);
        // Yozilgan, lekin yuborilmagan matn qoralama sifatida saqlanadi
        const left = get().chats.find((c) => c.id === previous);
        const text = get().editing ? left?.draft ?? "" : get().draft;
        if (left && text !== left.draft) {
          set({ chats: get().chats.map((c) => (c.id === previous ? { ...c, draft: text } : c)) });
          void tg.saveDraft(previous, text).catch(() => {});
        }
      }
      const chat = get().chats.find((c) => c.id === chatId);
      const anchor = chat && chat.unread > 0 && chat.readInboxMaxId > 0 ? chat.readInboxMaxId : null;
      set({
        activeChatId: chatId, messages: [], messagesLoading: chatId !== null, hasMore: false, hasNewer: false,
        loadingOlder: false, loadingNewer: false, replyTo: null, editing: null, error: null, upload: null,
        draft: chat?.draft ?? "", unreadAnchor: anchor, jumpTarget: null, pinned: [], pinnedIndex: 0,
      });
      if (chatId === null) return;
      // Qadalgan xabarlar fonda yuklanadi
      tg.loadShared(chatId, "pinned", 20).then(
        (pinned) => get().activeChatId === chatId && set({ pinned, pinnedIndex: 0 }),
        () => {},
      );
      try {
        // O'qilmaganlar ko'p bo'lsa birinchi o'qilmagan atrofidan ochamiz
        const fromAnchor = anchor !== null && chat!.unread > tg.PAGE_SIZE - 10;
        const messages = fromAnchor ? await tg.loadAround(chatId, anchor) : await tg.loadHistory(chatId);
        if (get().activeChatId !== chatId) return;
        set({
          messages,
          messagesLoading: false,
          hasMore: messages.length >= tg.PAGE_SIZE / 2,
          hasNewer: fromAnchor,
          chats: get().chats.map((c) => (c.id === chatId ? { ...c, unread: 0, mentions: 0, markedUnread: false } : c)),
        });
        void tg.markRead(chatId).catch(() => {});
      } catch (err) {
        if (get().activeChatId === chatId) set({ messagesLoading: false, error: errorText(err) });
      }
    },

    async loadNewer() {
      const { activeChatId: chatId, messages, hasNewer, loadingNewer } = get();
      const newest = messages[messages.length - 1];
      if (chatId === null || !newest || !hasNewer || loadingNewer) return;
      set({ loadingNewer: true });
      try {
        const newer = await tg.loadNewer(chatId, newest.id);
        if (get().activeChatId !== chatId) return;
        let list = get().messages;
        for (const m of newer) list = upsertMessage(list, m);
        set({ messages: list, hasNewer: newer.length >= tg.PAGE_SIZE / 2 });
      } catch (err) {
        if (get().activeChatId === chatId) set({ error: errorText(err) });
      } finally {
        if (get().activeChatId === chatId) set({ loadingNewer: false });
      }
    },

    async jumpTo(messageId) {
      const chatId = get().activeChatId;
      if (chatId === null) return;
      if (get().messages.some((m) => m.id === messageId)) {
        set({ jumpTarget: messageId });
        return;
      }
      try {
        const around = await tg.loadAround(chatId, messageId);
        if (get().activeChatId !== chatId) return;
        set({ messages: around, hasMore: true, hasNewer: true, jumpTarget: messageId });
      } catch (err) {
        set({ error: errorText(err) });
      }
    },

    clearJump: () => set({ jumpTarget: null }),

    async openChatAt(chatId, messageId) {
      await get().openChat(chatId);
      if (get().activeChatId === chatId) await get().jumpTo(messageId);
    },

    async backToLatest() {
      const chatId = get().activeChatId;
      if (chatId === null || !get().hasNewer) return;
      try {
        const messages = await tg.loadHistory(chatId);
        if (get().activeChatId !== chatId) return;
        set({ messages, hasMore: messages.length >= tg.PAGE_SIZE, hasNewer: false, jumpTarget: messages.at(-1)?.id ?? null });
      } catch (err) {
        set({ error: errorText(err) });
      }
    },

    cyclePinned() {
      const { pinned, pinnedIndex } = get();
      if (pinned.length === 0) return;
      void get().jumpTo(pinned[pinnedIndex].id);
      set({ pinnedIndex: (pinnedIndex + 1) % pinned.length });
    },

    setProfileOpen: (profileOpen) => set({ profileOpen }),

    async loadOlder() {
      const { activeChatId: chatId, messages, hasMore, loadingOlder } = get();
      const oldest = messages[0];
      if (chatId === null || !oldest || !hasMore || loadingOlder) return;
      set({ loadingOlder: true });
      try {
        const older = await tg.loadHistory(chatId, { id: oldest.id, date: Math.floor(oldest.date / 1000) });
        if (get().activeChatId !== chatId) return;
        set({ messages: prependOlder(get().messages, older), hasMore: older.length >= tg.PAGE_SIZE });
      } catch (err) {
        if (get().activeChatId === chatId) set({ error: errorText(err) });
      } finally {
        if (get().activeChatId === chatId) set({ loadingOlder: false });
      }
    },

    setReplyTo: (msg) => set({ replyTo: msg, editing: null }),
    // Tahrirlashda formatlash belgilarga qaytariladi, saqlashda yana o'giriladi
    setEditing: (msg) => set({ editing: msg, replyTo: null, draft: msg ? toMarkdown(msg.text, msg.entities) : "" }),
    setDraft: (draft) => set({ draft }),

    async send(text, silent = false) {
      const { activeChatId: chatId, editing, replyTo } = get();
      const body = text.trim();
      if (chatId === null || !body) return;
      try {
        if (editing) {
          if (body !== toMarkdown(editing.text, editing.entities)) {
            const msg = await tg.editText(chatId, editing.id, body);
            if (get().activeChatId === chatId) set({ messages: replaceMessage(get().messages, msg) });
          }
          set({ editing: null, draft: "" });
          return;
        }
        const msg = await tg.sendText(chatId, body, replyTo?.id, silent);
        set({ replyTo: null, draft: "" });
        // O'z xabarimiz update orqali ham kelishi mumkin — upsert takrorni birlashtiradi
        handleIncoming(msg);
        // Eski joyda turgan bo'lsak — yuborilgan xabarni ko'rish uchun oxiriga qaytamiz
        if (get().hasNewer) void get().backToLatest();
      } catch (err) {
        fail(err);
      }
    },

    async sendFile(file, caption) {
      const { activeChatId: chatId, replyTo } = get();
      if (chatId === null) return;
      set({ upload: { name: file.name, fraction: 0 }, error: null });
      try {
        const msg = await tg.sendFile(chatId, file, {
          caption: caption.trim(),
          replyTo: replyTo?.id,
          onProgress: (fraction) => {
            if (get().upload) set({ upload: { name: file.name, fraction } });
          },
        });
        set({ replyTo: null, draft: "" });
        handleIncoming(msg);
      } catch (err) {
        fail(err);
      } finally {
        set({ upload: null });
      }
    },

    async sendSticker(key) {
      const { activeChatId: chatId, replyTo } = get();
      if (chatId === null) return;
      try {
        const msg = await tg.sendSticker(chatId, key, replyTo?.id);
        set({ replyTo: null });
        handleIncoming(msg);
      } catch (err) {
        set({ error: errorText(err) });
      }
    },

    async sendGif(key) {
      const { activeChatId: chatId, replyTo } = get();
      if (chatId === null) return;
      try {
        const msg = await tg.sendGif(chatId, key, replyTo?.id);
        set({ replyTo: null });
        handleIncoming(msg);
      } catch (err) {
        set({ error: errorText(err) });
      }
    },

    async deleteMessages(chatId, ids, revoke) {
      if (ids.length === 0) return;
      try {
        await tg.deleteMessages(chatId, ids, revoke);
        if (get().activeChatId === chatId) set({ messages: removeMessages(get().messages, ids) });
      } catch (err) {
        fail(err);
      }
    },

    async forwardMessages(chatId, ids, toChatId) {
      if (ids.length === 0) return;
      try {
        const sent = await tg.forwardMessages(chatId, [...ids].sort((a, b) => a - b), toChatId);
        sent.forEach((m) => handleIncoming(m));
      } catch (err) {
        fail(err);
      }
    },

    async react(msg, emoji) {
      // Darhol ko'rsatamiz; server javobi kelgach aniq holat bilan almashtiriladi
      const { next, chosen } = toggleReaction(msg, emoji);
      set({ messages: replaceMessage(get().messages, next) });
      try {
        const updated = await tg.setReaction(msg.chatId, msg.id, chosen);
        if (updated && get().activeChatId === msg.chatId) set({ messages: replaceMessage(get().messages, updated) });
      } catch (err) {
        if (get().activeChatId === msg.chatId) set({ messages: replaceMessage(get().messages, msg) });
        set({ error: errorText(err) });
      }
    },

    async chatAction(chatId, action) {
      const before = get().chats;
      const patch = (p: Partial<ChatItem>) =>
        set({ chats: sortChats(get().chats.map((c) => (c.id === chatId ? { ...c, ...p } : c))) });
      // Darhol ko'rsatamiz, server javobini kutmaymiz
      switch (action) {
        case "pin": patch({ pinned: true }); break;
        case "unpin": patch({ pinned: false }); break;
        case "mute": patch({ muted: true }); break;
        case "unmute": patch({ muted: false }); break;
        case "archive": patch({ archived: true, pinned: false }); break;
        case "unarchive": patch({ archived: false }); break;
        case "read": patch({ unread: 0, mentions: 0, markedUnread: false }); break;
        case "unread": patch({ markedUnread: true }); break;
        case "delete":
        case "delete-both":
          set({ chats: get().chats.filter((c) => c.id !== chatId) });
          if (get().activeChatId === chatId) void get().openChat(null);
          break;
      }
      try {
        switch (action) {
          case "pin":
          case "unpin":
            await tg.setPinned(chatId, action === "pin");
            break;
          case "mute":
          case "unmute":
            await tg.setMuted(chatId, action === "mute");
            break;
          case "archive":
          case "unarchive":
            await tg.setArchived(chatId, action === "archive");
            break;
          case "read":
            await tg.markRead(chatId);
            break;
          case "unread":
            await tg.markUnread(chatId);
            break;
          case "delete":
          case "delete-both":
            await tg.deleteChat(chatId, action === "delete-both");
            break;
        }
      } catch (err) {
        set({ chats: before, error: errorText(err) });
      }
    },

    async votePoll(msg, answers) {
      try {
        const poll = await tg.votePoll(msg.chatId, msg.id, answers);
        if (get().activeChatId === msg.chatId) {
          const current = get().messages.find((m) => m.id === msg.id) ?? msg;
          set({ messages: replaceMessage(get().messages, { ...current, poll }) });
        }
      } catch (err) {
        set({ error: errorText(err) });
      }
    },

    async pressButton(msg, data) {
      try {
        const res = await tg.pressButton(msg.chatId, msg.id, data);
        if (res.text) {
          if (res.alert) window.alert(res.text);
          else get().showNotice(res.text);
        }
        if (res.url && window.confirm(`Havolani ochasizmi?\n${res.url}`)) {
          window.open(res.url, "_blank", "noopener,noreferrer");
        }
      } catch (err) {
        set({ error: errorText(err) });
      }
    },

    showNotice(notice) {
      set({ notice });
      if (notice) {
        setTimeout(() => {
          if (get().notice === notice) set({ notice: null });
        }, 4000);
      }
    },

    notifyTyping() {
      const chatId = get().activeChatId;
      const now = Date.now();
      if (chatId === null || now - lastTypingSent < TYPING_THROTTLE) return;
      lastTypingSent = now;
      void tg.sendTyping(chatId).catch(() => {});
    },
  };
});

// Faqat ishlab chiqish rejimida: brauzer konsolidan holatni ko'rish/sinash uchun
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __app?: typeof useApp }).__app = useApp;
}
