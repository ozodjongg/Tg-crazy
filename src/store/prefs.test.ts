import { describe, expect, it } from "vitest";
import { sanitizePrefs } from "./prefs";

describe("sanitizePrefs", () => {
  it("faqat ma'lum qiymatlarni qabul qiladi (serverdan kelgan ma'lumot ishonchsiz)", () => {
    expect(sanitizePrefs({ textSize: "lg", wallpaper: "warm", notifications: false, theme: "dark" })).toEqual({
      textSize: "lg", wallpaper: "warm", notifications: false,
    });
    expect(sanitizePrefs({ textSize: "huge", wallpaper: "url(x)", notifications: "yes" })).toEqual({});
    expect(sanitizePrefs(null)).toEqual({});
    expect(sanitizePrefs("x")).toEqual({});
  });
});
