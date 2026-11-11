import { describe, expect, it } from "vitest";
import { emojiOnlyCount, safeHref, toRichTree } from "./richtext";
import type { Entity } from "./telegram/types";

const e = (kind: Entity["kind"], offset: number, length: number, extra: Partial<Entity> = {}): Entity => ({
  kind, offset, length, ...extra,
});

describe("toRichTree", () => {
  it("oddiy matn", () => {
    expect(toRichTree("salom", [])).toEqual(["salom"]);
  });

  it("ketma-ket va ichma-ich entity'lar", () => {
    const bold = e("bold", 0, 11);
    const italic = e("italic", 6, 5);
    const code = e("code", 12, 3);
    expect(toRichTree("salom dunyo kod", [code, italic, bold])).toEqual([
      { entity: bold, children: ["salom ", { entity: italic, children: ["dunyo"] }] },
      " ",
      { entity: code, children: ["kod"] },
    ]);
  });

  it("kesishgan va chegaradan chiqqan entity tashlanadi, matn yo'qolmaydi", () => {
    const a = e("bold", 0, 4);
    const crossing = e("italic", 2, 5);
    const outside = e("code", 5, 100);
    expect(toRichTree("abcdefgh", [a, crossing, outside])).toEqual([{ entity: a, children: ["abcd"] }, "efgh"]);
  });

  it("UTF-16 ofsetlar (emoji 2 birlik)", () => {
    const text = "😀 salom";
    const bold = e("bold", 3, 5);
    expect(toRichTree(text, [bold])).toEqual(["😀 ", { entity: bold, children: ["salom"] }]);
  });
});

describe("safeHref", () => {
  it.each([
    [e("url", 0, 0), "example.com", "https://example.com"],
    [e("url", 0, 0), "http://a.uz/x", "http://a.uz/x"],
    [e("text_link", 0, 0, { url: "https://t.me/x" }), "bu yerda", "https://t.me/x"],
    [e("text_link", 0, 0, { url: "javascript:alert(1)" }), "x", null],
    [e("text_link", 0, 0, { url: "data:text/html,x" }), "x", null],
    [e("email", 0, 0), "a@b.uz", "mailto:a@b.uz"],
    [e("phone", 0, 0), "+998 90 123-45-67", "tel:+998901234567"],
    [e("bold", 0, 0), "x", null],
  ])("%o %s -> %s", (entity, text, expected) => {
    expect(safeHref(entity, text)).toBe(expected);
  });
});

describe("emojiOnlyCount", () => {
  it.each([
    ["👍", 1],
    ["😂😂", 2],
    ["👨‍👩‍👧 ❤️ 🇺🇿", 3],
    ["😀😀😀😀", 0],
    ["salom 👍", 0],
    ["123", 0],
    ["", 0],
  ])("%s -> %d", (text, n) => {
    expect(emojiOnlyCount(text)).toBe(n);
  });
});
