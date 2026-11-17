import { describe, it, expect } from "vitest";
import resolveUserMentions, { handleFor } from "../src/utils/mentionUser.js";

const PHONE_ID = "919876543210@c.us";
const LID_ID = "204857362910473@lid";
const handles = new Map([
  ["919876543210", PHONE_ID],
  ["204857362910473", LID_ID],
]);

describe("handleFor", () => {
  it("returns the user part of an id", () => {
    expect(handleFor(PHONE_ID)).toBe("919876543210");
    expect(handleFor(LID_ID)).toBe("204857362910473");
  });
});

describe("resolveUserMentions", () => {
  it("turns @handles into mentions for both phone and LID users", () => {
    const { text, mentions } = resolveUserMentions(
      "@919876543210 invited @204857362910473",
      handles
    );
    expect(text).toBe("@919876543210 invited @204857362910473");
    expect(mentions).toEqual([PHONE_ID, LID_ID]);
  });

  it("normalises the forms the model sometimes produces", () => {
    const { text, mentions } = resolveUserMentions(
      "@919876543210@c.us, 204857362910473@lid and 919876543210 again",
      handles
    );
    expect(text).toBe("@919876543210, @204857362910473 and @919876543210 again");
    expect(mentions).toEqual([PHONE_ID, LID_ID]);
  });

  it("de-duplicates repeated mentions", () => {
    const { mentions } = resolveUserMentions(
      "@919876543210 said hi. @919876543210 left.",
      handles
    );
    expect(mentions).toEqual([PHONE_ID]);
  });

  it("leaves numbers that are not participants untouched", () => {
    const input = "Call 9988776655 or pay 1000000 rupees";
    const { text, mentions } = resolveUserMentions(input, handles);
    expect(text).toBe(input);
    expect(mentions).toEqual([]);
  });
});
