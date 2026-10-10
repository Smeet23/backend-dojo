import { beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, passcodeMatches, verifySessionToken } from "./session";

beforeEach(() => {
  process.env.SESSION_SECRET = "test-secret-that-is-long-enough-for-hmac-0001";
  process.env.APP_PASSCODE = "correct horse battery staple";
});

describe("passcodeMatches", () => {
  it("accepts the exact passcode only", () => {
    expect(passcodeMatches("correct horse battery staple")).toBe(true);
    expect(passcodeMatches("correct horse battery stapl")).toBe(false);
    expect(passcodeMatches("")).toBe(false);
  });

  it("refuses to run without a configured passcode", () => {
    delete process.env.APP_PASSCODE;
    expect(() => passcodeMatches("anything")).toThrow();
  });
});

describe("session tokens", () => {
  it("verifies a fresh token", () => {
    expect(verifySessionToken(createSessionToken())).toBe(true);
  });

  it("rejects expired tokens", () => {
    const yearsAgo = Date.now() - 2 * 365 * 24 * 3600 * 1000;
    expect(verifySessionToken(createSessionToken(yearsAgo))).toBe(false);
  });

  it("rejects a token whose expiry was edited", () => {
    const [exp, sig] = createSessionToken().split(".");
    expect(verifySessionToken(`${Number(exp) + 999999}.${sig}`)).toBe(false);
  });

  it("rejects tokens signed with another secret", () => {
    const token = createSessionToken();
    process.env.SESSION_SECRET = "a-completely-different-secret-value-0002";
    expect(verifySessionToken(token)).toBe(false);
  });

  it("rejects garbage", () => {
    for (const t of [undefined, "", "abc", "123.", ".abc", "12.zz", `1.${"0".repeat(64)}`]) {
      expect(verifySessionToken(t)).toBe(false);
    }
  });
});
