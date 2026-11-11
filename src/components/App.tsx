"use client";

import { useEffect } from "react";
import { useApp } from "@/store/app";
import { ChatList } from "./ChatList";
import { Login } from "./Login";
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
      <main className="flex h-full items-center justify-center text-muted">Yuklanmoqda…</main>
    );
  }

  if (step !== "ready") return <Login />;

  // Tor ekranda bitta ustun: chat ochilmagan bo'lsa ro'yxat, ochilgan bo'lsa xabarlar
  return (
    <main className="flex h-full">
      <aside
        className={`${activeChatId === null ? "flex" : "hidden"} w-full flex-col border-r border-border md:flex md:w-80 lg:w-96`}
      >
        <ChatList />
      </aside>
      <section className={`${activeChatId === null ? "hidden" : "flex"} min-w-0 flex-1 flex-col md:flex`}>
        <MessagePane />
      </section>
    </main>
  );
}
