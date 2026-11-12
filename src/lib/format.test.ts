import { describe, expect, it } from "vitest";
import { formatScheduleLabel, schedulePresets, toLocalInput } from "./format";

const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();

describe("formatScheduleLabel", () => {
  const now = local(2026, 11, 12, 14, 5);
  it("bugun, ertaga va boshqa kun", () => {
    expect(formatScheduleLabel(local(2026, 11, 12, 21, 0), now)).toBe("Bugun 21:00");
    expect(formatScheduleLabel(local(2026, 11, 13, 9, 30), now)).toBe("Ertaga 09:30");
    expect(formatScheduleLabel(local(2026, 11, 20, 10, 0), now)).toBe("20-noyabr 10:00");
  });
});

describe("schedulePresets", () => {
  it("kunduzi — uchala variant, hammasi kelajakda", () => {
    const now = local(2026, 11, 12, 14, 5);
    const p = schedulePresets(now);
    expect(p.map((x) => x.label)).toEqual(["1 soatdan keyin", "Bugun kechqurun", "Ertaga ertalab"]);
    expect(p.every((x) => x.ts > now)).toBe(true);
    expect(p[2].ts).toBe(local(2026, 11, 13, 9));
  });

  it("kechqurun 20:00 o'tgan bo'lsa — 'bugun kechqurun' yo'q", () => {
    expect(schedulePresets(local(2026, 11, 12, 19, 45)).map((x) => x.label)).not.toContain("Bugun kechqurun");
  });
});

describe("toLocalInput", () => {
  it("datetime-local formati", () => {
    expect(toLocalInput(local(2026, 1, 5, 7, 3))).toBe("2026-01-05T07:03");
  });
});
