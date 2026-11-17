import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkSpam } from "../src/moderation/spam.js";

// spam.js keeps state per group+user, so every test uses a unique user id.
let n = 0;
const nextUser = () => `user${++n}@c.us`;
const G = "group@g.us";
const msg = (body, mentionedIds = []) => ({ body, mentionedIds });

describe("checkSpam", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("allows normal conversation", () => {
    const user = nextUser();
    for (const text of ["hi", "how are you", "match at 7?", "ok cool"]) {
      expect(checkSpam(G, user, msg(text)).isSpam).toBe(false);
    }
  });

  it("flags flooding: more than 6 messages within 10 seconds", () => {
    const user = nextUser();
    for (let i = 0; i < 6; i++) {
      expect(checkSpam(G, user, msg(`message ${i}`)).isSpam).toBe(false);
    }
    expect(checkSpam(G, user, msg("message 7"))).toEqual({
      isSpam: true,
      reason: "Message flooding",
    });
  });

  it("forgets messages older than the flood window", () => {
    const user = nextUser();
    for (let i = 0; i < 6; i++) checkSpam(G, user, msg(`message ${i}`));
    vi.advanceTimersByTime(10_001);
    expect(checkSpam(G, user, msg("back again")).isSpam).toBe(false);
  });

  it("flags the same text sent 3 times in a row (case-insensitive)", () => {
    const user = nextUser();
    expect(checkSpam(G, user, msg("Buy now")).isSpam).toBe(false);
    expect(checkSpam(G, user, msg("buy NOW")).isSpam).toBe(false);
    expect(checkSpam(G, user, msg("buy now"))).toEqual({
      isSpam: true,
      reason: "Repeated messages",
    });
  });

  it("resets the repeat count when the text changes", () => {
    const user = nextUser();
    checkSpam(G, user, msg("same"));
    checkSpam(G, user, msg("same"));
    checkSpam(G, user, msg("different"));
    expect(checkSpam(G, user, msg("same")).isSpam).toBe(false);
  });

  it("does not count empty (media) messages as repeats", () => {
    const user = nextUser();
    for (let i = 0; i < 3; i++) {
      expect(checkSpam(G, user, msg("")).isSpam).toBe(false);
    }
  });

  it("flags more than 5 mentions in one message", () => {
    const user = nextUser();
    const five = ["a", "b", "c", "d", "e"];
    expect(checkSpam(G, user, msg("hey", five)).isSpam).toBe(false);
    expect(checkSpam(G, user, msg("hey all", [...five, "f"]))).toEqual({
      isSpam: true,
      reason: "Mass mentions",
    });
  });

  it("tracks users and groups independently", () => {
    const user = nextUser();
    const other = nextUser();
    checkSpam(G, user, msg("spam"));
    checkSpam(G, user, msg("spam"));
    expect(checkSpam(G, other, msg("spam")).isSpam).toBe(false);
    expect(checkSpam("other@g.us", user, msg("spam")).isSpam).toBe(false);
  });
});
