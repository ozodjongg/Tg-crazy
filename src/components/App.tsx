"use client";

import { useEffect } from "react";
import { useApp } from "@/store/app";
import { ChatList } from "./ChatList";
import { Login } from "./Login";
import { Logo } from "./Logo";
import { MessagePane } from "./MessagePane";

export function App() {
  const step = useApp((s) => s.step);
  const init = useApp((s) => s.init);
  const activeChatId = useApp((s) => s.activeChatId);

  useEffect(() => {
    void init();
  }, [init]);

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
    </main>
  );
}
