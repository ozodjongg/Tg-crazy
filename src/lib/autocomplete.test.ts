import { describe, expect, it } from "vitest";
import { applyCompletion, findTrigger } from "./autocomplete";

describe("findTrigger", () => {
  it("@mention so'z boshida", () => {
    expect(findTrigger("salom @al", 9)).toEqual({ kind: "mention", query: "al", start: 6, end: 9 });
    expect(findTrigger("@", 1)).toEqual({ kind: "mention", query: "", start: 0, end: 1 });
  });

  it("e-pochta mention emas", () => {
    expect(findTrigger("ali@mail", 8)).toBeNull();
  });

  it("buyruq faqat matn boshida", () => {
    expect(findTrigger("/sta", 4)).toEqual({ kind: "command", query: "sta", start: 0, end: 4 });
    expect(findTrigger("salom /sta", 10)).toBeNull();
  });

  it("emoji: kamida 2 harf, vaqt va smaylik emas", () => {
    expect(findTrigger("zo'r :kul", 9)).toEqual({ kind: "emoji", query: "kul", start: 5, end: 9 });
    expect(findTrigger(":k", 2)).toBeNull();
    expect(findTrigger("soat 12:30", 10)).toBeNull();
    expect(findTrigger("ha :)", 5)).toBeNull();
  });

  it("kursor so'z o'rtasida bo'lsa taklif yo'q", () => {
    expect(findTrigger("@alisher", 3)).toBeNull();
  });

  it("kursor joyi hisobga olinadi", () => {
    expect(findTrigger("@ali va boshqa", 4)).toEqual({ kind: "mention", query: "ali", start: 0, end: 4 });
  });
});

describe("applyCompletion", () => {
  it("almashtiradi va bo'sh joy qo'shadi", () => {
    const t = findTrigger("salom @al", 9)!;
    expect(applyCompletion("salom @al", t, "@alisher")).toEqual({ text: "salom @alisher ", cursor: 15 });
  });

  it("keyingi bo'sh joyni takrorlamaydi", () => {
    const t = findTrigger("@al dedi", 3)!;
    expect(applyCompletion("@al dedi", t, "@alisher")).toEqual({ text: "@alisher dedi", cursor: 9 });
  });
});
