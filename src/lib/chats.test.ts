import { describe, expect, it } from "vitest";
import { filterChats, unreadChats } from "./chats";
import { formatDayLabel, isSameDay } from "./format";
import type { ChatItem, ChatKind } from "./telegram/types";

const chat = (id: number, title: string, kind: ChatKind, unread = 0, muted = false): ChatItem => ({
  id, title, kind, unread, muted,
  lastText: "", lastDate: null, pinned: false, lastOutgoing: false, lastSender: "", readOutboxMaxId: 0,
});

const chats = [
  chat(1, "Dilshod", "user", 2),
  chat(2, "Yordamchi bot", "bot"),
  chat(-3, "Sinfdoshlar", "group", 5, true),
  chat(-4, "Тошкент янгиликлари", "channel", 9),
];

describe("filterChats", () => {
  it("papka bo'yicha ajratadi", () => {
    expect(filterChats(chats, "all", "").map((c) => c.id)).toEqual([1, 2, -3, -4]);
    expect(filterChats(chats, "personal", "").map((c) => c.id)).toEqual([1, 2]);
    expect(filterChats(chats, "groups", "").map((c) => c.id)).toEqual([-3]);
    expect(filterChats(chats, "channels", "").map((c) => c.id)).toEqual([-4]);
  });

  it("qidiruv yozuvga bog'liq emas", () => {
    expect(filterChats(chats, "all", "toshkent").map((c) => c.id)).toEqual([-4]);
    expect(filterChats(chats, "all", "дилшод").map((c) => c.id)).toEqual([1]);
    expect(filterChats(chats, "groups", "toshkent")).toEqual([]);
  });
});

describe("unreadChats", () => {
  it("ovozi o'chirilganlarni sanamaydi", () => {
    expect(unreadChats(chats, "all")).toBe(2);
    expect(unreadChats(chats, "groups")).toBe(0);
  });
});

describe("formatDayLabel", () => {
  const now = new Date(2026, 10, 12, 15, 0).getTime();
  it.each([
    [new Date(2026, 10, 12, 0, 5), "Bugun"],
    [new Date(2026, 10, 11, 23, 59), "Kecha"],
    [new Date(2026, 10, 10, 12, 0), "10-noyabr"],
    [new Date(2024, 2, 3, 12, 0), "3-mart, 2024"],
  ])("%s -> %s", (date, expected) => {
    expect(formatDayLabel(date.getTime(), now)).toBe(expected);
  });

  it("isSameDay", () => {
    expect(isSameDay(new Date(2026, 0, 1, 1).getTime(), new Date(2026, 0, 1, 23).getTime())).toBe(true);
    expect(isSameDay(new Date(2026, 0, 1, 23).getTime(), new Date(2026, 0, 2, 0).getTime())).toBe(false);
  });
});
