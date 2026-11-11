import { describe, expect, it } from "vitest";
import { parseMarkdown, toMarkdown, toTlEntities, wrapSelection } from "./markdown";

describe("parseMarkdown", () => {
  it("oddiy matn o'zgarmaydi", () => {
    expect(parseMarkdown("salom dunyo")).toEqual({ text: "salom dunyo", entities: [] });
  });

  it("asosiy belgilar", () => {
    const r = parseMarkdown("**qalin** va __kursiv__, ~~eski~~ ||sir|| `kod`");
    expect(r.text).toBe("qalin va kursiv, eski sir kod");
    expect(r.entities).toEqual([
      { type: "bold", offset: 0, length: 5 },
      { type: "italic", offset: 9, length: 6 },
      { type: "strike", offset: 17, length: 4 },
      { type: "spoiler", offset: 22, length: 3 },
      { type: "code", offset: 26, length: 3 },
    ]);
  });

  it("ichma-ich", () => {
    const r = parseMarkdown("**juda __muhim__ gap**");
    expect(r.text).toBe("juda muhim gap");
    expect(r.entities).toEqual([
      { type: "bold", offset: 0, length: 14 },
      { type: "italic", offset: 5, length: 5 },
    ]);
  });

  it("juftsiz belgi matnda qoladi", () => {
    expect(parseMarkdown("2**3 = 8").text).toBe("2**3 = 8");
    expect(parseMarkdown("a__b").entities).toEqual([]);
    expect(parseMarkdown("`ochiq").text).toBe("`ochiq");
  });

  it("kod ichidagi belgilar o'girilmaydi; kod bloki tili bilan", () => {
    expect(parseMarkdown("`a**b**`")).toEqual({ text: "a**b**", entities: [{ type: "code", offset: 0, length: 6 }] });
    const r = parseMarkdown("Misol:\n```js\nconst x = **1**;\n```");
    expect(r.text).toBe("Misol:\nconst x = **1**;");
    expect(r.entities).toEqual([{ type: "pre", offset: 7, length: 16, language: "js" }]);
  });

  it("emoji bilan UTF-16 ofsetlar", () => {
    const r = parseMarkdown("😀 **salom**");
    expect(r.text).toBe("😀 salom");
    expect(r.entities).toEqual([{ type: "bold", offset: 3, length: 5 }]);
  });

  it("TL formatiga", () => {
    expect(toTlEntities([{ type: "pre", offset: 0, length: 3 }])).toEqual([
      { _: "messageEntityPre", offset: 0, length: 3, language: "" },
    ]);
  });
});

describe("wrapSelection", () => {
  it("tanlangan qismni o'raydi", () => {
    expect(wrapSelection("salom dunyo", 6, 11, "**")).toEqual({ text: "salom **dunyo**", start: 8, end: 13 });
  });
});

describe("toMarkdown", () => {
  it.each([
    "**qalin** va __kursiv__, ~~eski~~ ||sir|| `kod`",
    "**juda __muhim__ gap**",
    "Misol:\n```js\nconst x = 1;\n```",
    "oddiy",
  ])("aylanma: %s", (src) => {
    const parsed = parseMarkdown(src);
    const kinds = parsed.entities.map((e) => ({ ...e, kind: e.type }));
    expect(parseMarkdown(toMarkdown(parsed.text, kinds))).toEqual(parsed);
  });
});
