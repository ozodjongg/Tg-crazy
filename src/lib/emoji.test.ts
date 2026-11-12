import { describe, expect, it } from "vitest";
import { searchEmoji } from "./emoji";

const emojis = (q: string) => searchEmoji(q).map((r) => r.emoji);

describe("searchEmoji", () => {
  it("o'zbekcha va inglizcha nom", () => {
    expect(emojis("yurak")).toContain("❤️");
    expect(emojis("heart")).toContain("❤️");
    expect(emojis("olov")[0]).toBe("🔥");
  });

  it("kirillcha so'rov ham ishlaydi", () => {
    expect(emojis("юрак")).toContain("❤️");
  });

  it("apostrof farqi muhim emas", () => {
    expect(emojis("yig'i")).toContain("😢");
    expect(emojis("yigʻi")).toContain("😢");
  });

  it("aniq moslik birinchi", () => {
    expect(emojis("kul")[0]).not.toBe("🌸");
    expect(emojis("mushuk")[0]).toBe("🐱");
  });

  it("bo'sh so'rov — bo'sh natija", () => {
    expect(searchEmoji("  ")).toEqual([]);
  });
});
