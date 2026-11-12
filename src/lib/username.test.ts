import { describe, expect, it } from "vitest";
import { usernameIssue } from "./username";

describe("usernameIssue", () => {
  it("to'g'ri username", () => {
    expect(usernameIssue("ozodjon_dev")).toBeNull();
    expect(usernameIssue("@Abcde")).toBeNull();
    expect(usernameIssue("")).toBeNull();
  });

  it("qoidabuzarliklar", () => {
    expect(usernameIssue("abcd")).toBe("short");
    expect(usernameIssue("a".repeat(33))).toBe("long");
    expect(usernameIssue("ozod jon")).toBe("chars");
    expect(usernameIssue("ozodjоn")).toBe("chars"); // kirill "о"
    expect(usernameIssue("1ozodjon")).toBe("start");
    expect(usernameIssue("_ozodjon")).toBe("start");
    expect(usernameIssue("ozodjon_")).toBe("end");
    expect(usernameIssue("ozod__jon")).toBe("double");
  });
});
