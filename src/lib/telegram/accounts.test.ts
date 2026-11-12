import { describe, expect, it } from "vitest";
import { duplicateSlot, nextFreeSlot, removeSlot, sanitizeAccounts, slotKey, storageName, upsertAccount } from "./accounts";

const a = (slot: number, id = slot + 100) => ({ slot, id, name: `A${slot}` });

describe("akkaunt slotlari", () => {
  it("0-slot eski xotira nomini saqlaydi", () => {
    expect(storageName(0)).toBe("tg-crazy");
    expect(storageName(2)).toBe("tg-crazy:2");
    expect(slotKey("tg-crazy:refresh", 0)).toBe("tg-crazy:refresh");
    expect(slotKey("tg-crazy:refresh", 1)).toBe("tg-crazy:refresh:1");
  });

  it("bo'sh slot: eng kichigi, to'lsa null", () => {
    expect(nextFreeSlot([])).toBe(0);
    expect(nextFreeSlot([a(0), a(2)])).toBe(1);
    expect(nextFreeSlot([a(0), a(1), a(2)])).toBeNull();
  });

  it("qo'shish/yangilash va o'chirish", () => {
    expect(upsertAccount([a(1)], a(0))).toEqual([a(0), a(1)]);
    expect(upsertAccount([a(0)], { slot: 0, id: 100, name: "Yangi" })).toEqual([{ slot: 0, id: 100, name: "Yangi" }]);
    expect(removeSlot([a(0), a(1)], 0)).toEqual([a(1)]);
  });

  it("bir akkaunt ikki slotda", () => {
    expect(duplicateSlot([a(0, 7), a(1, 8)], 2, 7)).toBe(0);
    expect(duplicateSlot([a(0, 7)], 0, 7)).toBeNull();
  });

  it("buzilgan ma'lumot tozalanadi", () => {
    expect(sanitizeAccounts([a(1), { slot: 9, id: 1, name: "x" }, null, "x", { slot: 0, id: "1", name: "y" }])).toEqual([a(1)]);
    expect(sanitizeAccounts({})).toEqual([]);
  });
});
