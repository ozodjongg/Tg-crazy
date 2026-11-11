import { create } from "zustand";
import * as api from "@/lib/backend/client";
import { sendBotStart } from "@/lib/telegram/api";
import { useApp, type Theme } from "./app";

// Tg-crazy xizmatlari (backend): ulanish, tarif, AI, sozlamalar sinxroni.

export type ServicesStatus =
  | "off" // backend sozlanmagan
  | "checking"
  | "unavailable" // server javob bermayapti yoki bot sozlanmagan
  | "disconnected"
  | "connecting"
  | "connected";

interface SyncedSettings {
  theme: Theme;
  aiLang: api.AiLang;
  /** AI'ga matn yuborishdan oldin har safar so'ramaslik */
  aiSkipConfirm: boolean;
}

export type AiRequest =
  | { kind: "summary"; messages: api.AiMessage[] }
  | { kind: "translate"; text: string }
  | { kind: "draft"; messages: api.AiMessage[] };

interface ServicesState {
  /** Ochiq AI oynasi */
  aiRequest: AiRequest | null;
  openAi: (req: AiRequest) => void;
  closeAi: () => void;
  status: ServicesStatus;
  profile: api.Profile | null;
  error: string | null;
  aiLang: api.AiLang;
  aiSkipConfirm: boolean;

  init: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  setAiLang: (lang: api.AiLang) => void;
  setAiSkipConfirm: (skip: boolean) => void;
  /** AI so'rovini bajaradi va limit ko'rsatkichini yangilaydi. */
  ai: (call: () => Promise<api.AiResult>) => Promise<string>;
}

let settingsVersion = 0;
let applyingRemote = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

const message = (err: unknown) => (err instanceof Error ? err.message : "Noma'lum xato");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const useServices = create<ServicesState>((set, get) => {
  function snapshot(): SyncedSettings {
    return { theme: useApp.getState().theme, aiLang: get().aiLang, aiSkipConfirm: get().aiSkipConfirm };
  }

  function applyRemote(remote: api.RemoteSettings<SyncedSettings>) {
    settingsVersion = remote.version;
    applyingRemote = true;
    try {
      const { theme, aiLang, aiSkipConfirm } = remote.data;
      if (theme === "system" || theme === "light" || theme === "dark") useApp.getState().setTheme(theme);
      set({
        aiLang: aiLang && ["uz", "uz-cyrl", "ru", "en"].includes(aiLang) ? aiLang : get().aiLang,
        aiSkipConfirm: typeof aiSkipConfirm === "boolean" ? aiSkipConfirm : get().aiSkipConfirm,
      });
    } finally {
      applyingRemote = false;
    }
  }

  /** O'zgarishlarni biroz kutib yuboradi; ziddiyatda serverdagi holat qabul qilinadi. */
  function schedulePush() {
    if (applyingRemote || get().status !== "connected") return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
      try {
        const res = await api.putSettings(snapshot(), settingsVersion);
        if (res.saved) settingsVersion = res.current.version;
        else applyRemote(res.current);
      } catch {
        // Sinxron ixtiyoriy: xato bo'lsa keyingi o'zgarishda qayta urinib ko'riladi
      }
    }, 800);
  }

  async function afterConnect() {
    const profile = await api.getProfile();
    set({ status: "connected", profile, error: null });
    const remote = await api.getSettings<SyncedSettings>();
    if (remote.version > 0) applyRemote(remote);
    else schedulePush(); // birinchi ulanish: lokal sozlamalar serverga yoziladi
  }

  useApp.subscribe((state, prev) => {
    if (state.theme !== prev.theme) schedulePush();
  });

  return {
    status: api.backendEnabled ? "checking" : "off",
    profile: null,
    error: null,
    aiLang: "uz",
    aiSkipConfirm: false,
    aiRequest: null,
    openAi: (aiRequest) => set({ aiRequest }),
    closeAi: () => set({ aiRequest: null }),

    async init() {
      if (!api.backendEnabled || get().status !== "checking") return;
      try {
        const health = await api.health();
        if (!health.auth) {
          set({ status: "unavailable" });
          return;
        }
        if (!api.hasSavedSession()) {
          set({ status: "disconnected" });
          return;
        }
        await afterConnect();
      } catch (err) {
        const expired = err instanceof api.BackendError && err.status === 401;
        set({ status: expired ? "disconnected" : "unavailable" });
      }
    },

    async connect() {
      if (get().status === "connecting") return;
      set({ status: "connecting", error: null });
      try {
        const start = await api.authStart();
        await sendBotStart(start.bot_username, start.nonce);
        const deadline = Date.now() + start.expires_in * 1000;
        while (Date.now() < deadline) {
          await sleep(1500);
          if (await api.authComplete(start.nonce, start.secret)) {
            await afterConnect();
            return;
          }
        }
        set({ status: "disconnected", error: "Bot tasdiqlamadi. Birozdan keyin qayta urinib ko'ring." });
      } catch (err) {
        set({ status: "disconnected", error: message(err) });
      }
    },

    async disconnect() {
      await api.logout();
      settingsVersion = 0;
      set({ status: "disconnected", profile: null, error: null });
    },

    setAiLang(aiLang) {
      set({ aiLang });
      schedulePush();
    },

    setAiSkipConfirm(aiSkipConfirm) {
      set({ aiSkipConfirm });
      schedulePush();
    },

    async ai(call) {
      try {
        const res = await call();
        const profile = get().profile;
        if (profile) set({ profile: { ...profile, ai: res.ai } });
        return res.text;
      } catch (err) {
        if (err instanceof api.BackendError && err.status === 429) {
          const profile = get().profile;
          if (profile) set({ profile: { ...profile, ai: { ...profile.ai, used: profile.ai.limit } } });
        }
        if (err instanceof api.BackendError && err.status === 401) set({ status: "disconnected", profile: null });
        throw err;
      }
    },
  };
});
