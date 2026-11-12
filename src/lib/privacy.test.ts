import { describe, expect, it } from "vitest";
import { buildRules, exceptionsLabel, parseRules } from "./privacy";

describe("parseRules", () => {
  it("daraja va istisnolar", () => {
    const s = parseRules([
      { _: "privacyValueDisallowUsers", users: [5, 6] },
      { _: "privacyValueAllowChatParticipants", chats: [77] },
      { _: "privacyValueAllowContacts" },
    ]);
    expect(s).toEqual({ level: "contacts", allow: { users: [], chats: [77] }, disallow: { users: [5, 6], chats: [] } });
  });

  it("qoida bo'lmasa — hech kim", () => {
    expect(parseRules([]).level).toBe("nobody");
    expect(parseRules([{ _: "privacyValueDisallowAll" }]).level).toBe("nobody");
    expect(parseRules([{ _: "privacyValueAllowAll" }]).level).toBe("everybody");
  });
});

describe("buildRules", () => {
  const ex = { level: "contacts" as const, allow: { users: [1], chats: [2] }, disallow: { users: [3], chats: [] } };

  it("kontaktlar: ikkala istisno va asosiy qoida oxirida", () => {
    expect(buildRules(ex)).toEqual([
      { _: "inputPrivacyValueAllowUsers", users: [1] },
      { _: "inputPrivacyValueAllowChatParticipants", chats: [2] },
      { _: "inputPrivacyValueDisallowUsers", users: [3] },
      { _: "inputPrivacyValueAllowContacts" },
    ]);
  });

  it("hamma: faqat taqiqlar; hech kim: faqat ruxsatlar", () => {
    expect(buildRules({ ...ex, level: "everybody" }).map((r) => r._)).toEqual(["inputPrivacyValueDisallowUsers", "inputPrivacyValueAllowAll"]);
    expect(buildRules({ ...ex, level: "nobody" }).map((r) => r._)).toEqual([
      "inputPrivacyValueAllowUsers", "inputPrivacyValueAllowChatParticipants", "inputPrivacyValueDisallowAll",
    ]);
  });

  it("aylanma: parse(build(x)) darajani saqlaydi", () => {
    const back = buildRules(ex).map((r) => ({ ...r, _: r._.replace("inputPrivacyValue", "privacyValue") }));
    expect(parseRules(back)).toEqual(ex);
  });
});

describe("exceptionsLabel", () => {
  it("joriy darajaga mos istisnolar", () => {
    const s = { level: "contacts" as const, allow: { users: [1, 2], chats: [] }, disallow: { users: [3], chats: [] } };
    expect(exceptionsLabel(s)).toBe("+2 · −1");
    expect(exceptionsLabel({ ...s, level: "everybody" })).toBe("−1");
    expect(exceptionsLabel({ ...s, level: "nobody" })).toBe("+2");
  });
});
