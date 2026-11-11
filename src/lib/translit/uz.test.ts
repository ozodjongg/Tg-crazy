import { describe, expect, it } from "vitest";
import { cyrillicToLatin, hasCyrillic, latinToCyrillic, toggleScript } from "./uz";

describe("cyrillicToLatin", () => {
  it.each([
    ["Салом, дунё!", "Salom, dunyo!"],
    ["Ўзбекистон", "Oʻzbekiston"],
    ["ғишт", "gʻisht"],
    ["Шаҳар", "Shahar"],
    ["ШАҲАР", "SHAHAR"],
    ["чой", "choy"],
    ["қишлоқ", "qishloq"],
    ["ер", "yer"],
    ["мен", "men"],
    ["поезд", "poyezd"],
    ["эшик", "eshik"],
    ["маъно", "maʼno"],
    ["цирк", "sirk"],
    ["конституция", "konstitutsiya"],
    ["Яхши", "Yaxshi"],
    ["Я", "Ya"],
    ["Hello 123", "Hello 123"],
  ])("%s -> %s", (input, expected) => {
    expect(cyrillicToLatin(input)).toBe(expected);
  });
});

describe("latinToCyrillic", () => {
  it.each([
    ["Salom, dunyo!", "Салом, дунё!"],
    ["O'zbekiston", "Ўзбекистон"],
    ["Oʻzbekiston", "Ўзбекистон"],
    ["g‘isht", "ғишт"],
    ["Shahar", "Шаҳар"],
    ["SHAHAR", "ШАҲАР"],
    ["choy", "чой"],
    ["yer", "ер"],
    ["men", "мен"],
    ["eshik", "эшик"],
    ["poyezd", "поезд"],
    ["ma'no", "маъно"],
    ["Yaxshi", "Яхши"],
    ["bugun 5 ta", "бугун 5 та"],
  ])("%s -> %s", (input, expected) => {
    expect(latinToCyrillic(input)).toBe(expected);
  });
});

describe("toggleScript", () => {
  it("yozuvni aniqlaydi", () => {
    expect(hasCyrillic("салом")).toBe(true);
    expect(hasCyrillic("salom")).toBe(false);
    expect(toggleScript("салом")).toBe("salom");
    expect(toggleScript("salom")).toBe("салом");
  });
});
