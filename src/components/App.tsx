"use client";

import { useEffect } from "react";
import { useApp } from "@/store/app";
import { usePrefs } from "@/store/prefs";
import { useServices } from "@/store/services";
import { AiDialog } from "./AiDialog";
import { ChatList } from "./ChatList";
import { Login } from "./Login";
import { Logo } from "./Logo";
import { MessagePane } from "./MessagePane";
import { ProfilePanel } from "./ProfilePanel";

export function App() {
  const step = useApp((s) => s.step);
  const init = useApp((s) => s.init);
  const activeChatId = useApp((s) => s.activeChatId);
  const profileOpen = useApp((s) => s.profileOpen);

  const initServices = useServices((s) => s.init);

  useEffect(() => {
    usePrefs.getState().load();
    void init();
  }, [init]);

  // Brauzer sarlavhasida ovozi yoqilgan o'qilmagan chatlar soni
  const unreadChats = useApp((s) => s.chats.filter((c) => !c.muted && !c.archived && (c.unread > 0 || c.markedUnread)).length);
  useEffect(() => {
    document.title = unreadChats > 0 ? `(${unreadChats}) Tg-crazy` : "Tg-crazy";
  }, [unreadChats]);

  // Xizmatlar faqat Telegram'ga kirilgandan keyin tekshiriladi
  useEffect(() => {
    if (step === "ready") void initServices();
  }, [step, initServices]);

  if (step === "loading") {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-4 bg-panel text-muted">
        <Logo size={56} />
        Yuklanmoqda…
      </main>
    );
  }

  if (step !== "ready") return <Login />;

  // Tor ekranda bitta ustun: chat ochilmagan bo'lsa ro'yxat, ochilgan bo'lsa xabarlar
  return (
    <main className="flex h-full overflow-hidden">
      <aside
        className={`${activeChatId === null ? "flex" : "hidden"} w-full min-h-0 flex-col border-r border-border md:flex md:w-[340px] lg:w-[400px]`}
      >
        <ChatList />
      </aside>
      <section className={`${activeChatId === null ? "hidden" : "flex"} min-w-0 flex-1 flex-col md:flex`}>
        <MessagePane />
      </section>
      {/* Keng ekranda uchinchi ustun, torda — ustiga ochiladi */}
      {profileOpen && activeChatId !== null && (
        <div className="fixed inset-0 z-20 xl:static xl:z-auto xl:w-[360px] xl:shrink-0">
          <ProfilePanel />
        </div>
      )}
      <AiDialog />
    </main>
  );
}
