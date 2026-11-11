import { describe, expect, it } from "vitest";
import { formatDuration, formatSize, pickForAi, prependOlder, removeMessages, replaceMessage, toggleReaction, upsertMessage } from "./messages";
import type { MessageItem } from "./telegram/types";

const msg = (id: number, over: Partial<MessageItem> = {}): MessageItem => ({
  id, chatId: 1, text: `m${id}`, date: id * 1000, outgoing: false, senderId: 2, senderName: "A",
  service: false, edited: false, replyToId: null, media: null, reactions: [], ...over,
});
const ids = (list: MessageItem[]) => list.map((m) => m.id);

describe("xabarlar ro'yxati", () => {
  it("upsert: oxiriga qo'shadi, takrorni yangilaydi, tartibni saqlaydi", () => {
    let list = [msg(1), msg(3)];
    list = upsertMessage(list, msg(5));
    expect(ids(list)).toEqual([1, 3, 5]);
    list = upsertMessage(list, msg(3, { text: "yangi" }));
    expect(ids(list)).toEqual([1, 3, 5]);
    expect(list[1].text).toBe("yangi");
    expect(ids(upsertMessage(list, msg(2)))).toEqual([1, 2, 3, 5]);
  });

  it("replace: yo'q xabarni qo'shmaydi", () => {
    const list = [msg(1)];
    expect(replaceMessage(list, msg(9))).toBe(list);
    expect(replaceMessage(list, msg(1, { edited: true }))[0].edited).toBe(true);
  });

  it("remove va prependOlder", () => {
    const list = [msg(4), msg(5)];
    expect(ids(removeMessages(list, [5, 7]))).toEqual([4]);
    expect(removeMessages(list, [9])).toBe(list);
    expect(ids(prependOlder(list, [msg(2), msg(3), msg(4)]))).toEqual([2, 3, 4, 5]);
    expect(prependOlder(list, [msg(4)])).toBe(list);
  });
});

describe("toggleReaction", () => {
  it("qo'shadi, almashtiradi va olib tashlaydi", () => {
    const base = msg(1, { reactions: [{ emoji: "👍", count: 2, chosen: false }] });
    const a = toggleReaction(base, "👍");
    expect(a.chosen).toBe("👍");
    expect(a.next.reactions).toEqual([{ emoji: "👍", count: 3, chosen: true }]);

    const b = toggleReaction(a.next, "❤️");
    expect(b.next.reactions).toEqual([
      { emoji: "👍", count: 2, chosen: false },
      { emoji: "❤️", count: 1, chosen: true },
    ]);

    const c = toggleReaction(b.next, "❤️");
    expect(c.chosen).toBeNull();
    expect(c.next.reactions).toEqual([{ emoji: "👍", count: 2, chosen: false }]);
  });
});

describe("format", () => {
  it("hajm va davomiylik", () => {
    expect(formatSize(null)).toBe("");
    expect(formatSize(512)).toBe("512 B");
    expect(formatSize(2048)).toBe("2 KB");
    expect(formatSize(5 * 1024 ** 2)).toBe("5.0 MB");
    expect(formatDuration(75)).toBe("1:15");
    expect(formatDuration(5)).toBe("0:05");
  });
});

describe("pickForAi", () => {
  it("so'nggi matnli xabarlarni tartib bilan oladi", () => {
    const list = [msg(1), msg(2, { service: true }), msg(3, { text: " " }), msg(4, { outgoing: true })];
    expect(pickForAi(list)).toEqual([
      { sender: "A", text: "m1", mine: false },
      { sender: "A", text: "m4", mine: true },
    ]);
  });

  it("limitga sig'maganini kesmaydi, tashlab ketadi", () => {
    const list = [msg(1, { text: "a".repeat(10) }), msg(2, { text: "b".repeat(10) }), msg(3, { text: "c".repeat(10) })];
    expect(pickForAi(list, 25).map((m) => m.text[0])).toEqual(["b", "c"]);
    expect(pickForAi(list, 1000, 1).map((m) => m.text[0])).toEqual(["c"]);
  });
});
