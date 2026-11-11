import { describe, expect, it } from "vitest";
import { LOCAL_FOLDERS, buildFolders, filterChats, matchesRule, unreadChats } from "./chats";
import type { FolderRule } from "./telegram/api";
import { formatDayLabel, isSameDay } from "./format";
import type { ChatItem, ChatKind } from "./telegram/types";

const chat = (id: number, title: string, kind: ChatKind, unread = 0, muted = false): ChatItem => ({
  id, title, kind, unread, muted,
  lastText: "", lastId: 0, lastDate: null, pinned: false, lastOutgoing: false, lastSender: "", readOutboxMaxId: 0,
  archived: false, isContact: false, presence: null,
});

const [ALL, PERSONAL, GROUPS, CHANNELS] = LOCAL_FOLDERS;
const rule = (over: Partial<FolderRule>): FolderRule => ({
  id: 2, title: "Ish", contacts: false, nonContacts: false, groups: false, channels: false, bots: false,
  excludeMuted: false, excludeRead: false, excludeArchived: false, include: [], exclude: [], ...over,
});

const chats = [
  chat(1, "Dilshod", "user", 2),
  chat(2, "Yordamchi bot", "bot"),
  chat(-3, "Sinfdoshlar", "group", 5, true),
  chat(-4, "Тошкент янгиликлари", "channel", 9),
];

describe("filterChats", () => {
  it("papka bo'yicha ajratadi", () => {
    expect(filterChats(chats, ALL, "").map((c) => c.id)).toEqual([1, 2, -3, -4]);
    expect(filterChats(chats, PERSONAL, "").map((c) => c.id)).toEqual([1, 2]);
    expect(filterChats(chats, GROUPS, "").map((c) => c.id)).toEqual([-3]);
    expect(filterChats(chats, CHANNELS, "").map((c) => c.id)).toEqual([-4]);
  });

  it("qidiruv yozuvga bog'liq emas", () => {
    expect(filterChats(chats, ALL, "toshkent").map((c) => c.id)).toEqual([-4]);
    expect(filterChats(chats, ALL, "дилшод").map((c) => c.id)).toEqual([1]);
    // Qidiruv papkadan qat'i nazar barcha chatlarda ishlaydi
    expect(filterChats(chats, GROUPS, "toshkent").map((c) => c.id)).toEqual([-4]);
  });
});

describe("Telegram papkalari", () => {
  it("turlar, istisnolar va aniq ro'yxat", () => {
    const [dilshod, bot, sinf, kanal] = chats;
    expect(matchesRule(sinf, rule({ groups: true }))).toBe(true);
    expect(matchesRule(sinf, rule({ groups: true, excludeMuted: true }))).toBe(false);
    expect(matchesRule(kanal, rule({ groups: true }))).toBe(false);
    expect(matchesRule(kanal, rule({ include: [-4] }))).toBe(true);
    expect(matchesRule(kanal, rule({ channels: true, exclude: [-4] }))).toBe(false);
    expect(matchesRule(bot, rule({ bots: true, excludeRead: true }))).toBe(false);
    expect(matchesRule(dilshod, rule({ contacts: true }))).toBe(false);
    expect(matchesRule({ ...dilshod, isContact: true }, rule({ contacts: true }))).toBe(true);
    expect(matchesRule(dilshod, rule({ nonContacts: true }))).toBe(true);
  });

  it("papkalar bo'lmasa lokal turkumlar", () => {
    expect(buildFolders([])).toBe(LOCAL_FOLDERS);
    const folders = buildFolders([rule({ groups: true })]);
    expect(folders.map((f) => f.label)).toEqual(["Hammasi", "Ish"]);
    expect(filterChats(chats, folders[1], "").map((c) => c.id)).toEqual([-3]);
  });

  it("arxivdagilar ro'yxatda ko'rinmaydi, qidiruvda topiladi", () => {
    const withArchived = [...chats, { ...chat(9, "Eski chat", "user"), archived: true }];
    expect(filterChats(withArchived, ALL, "").map((c) => c.id)).not.toContain(9);
    expect(filterChats(withArchived, ALL, "eski").map((c) => c.id)).toEqual([9]);
  });
});

describe("unreadChats", () => {
  it("ovozi o'chirilganlarni sanamaydi", () => {
    expect(unreadChats(chats, ALL)).toBe(2);
    expect(unreadChats(chats, GROUPS)).toBe(0);
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
