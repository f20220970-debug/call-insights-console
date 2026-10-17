import { describe, expect, it } from "vitest";
import { parseTranscript, validCallId } from "./parse";

describe("parseTranscript", () => {
  it("splits speakers and normalises names", () => {
    const t = parseTranscript("Agent: Your EMI is due.\nCaller: I will pay Friday.\nRep: Noted.");
    expect(t).toEqual([
      { speaker: "agent", text: "Your EMI is due." },
      { speaker: "customer", text: "I will pay Friday." },
      { speaker: "agent", text: "Noted." },
    ]);
  });
  it("joins wrapped lines and skips blanks", () => {
    const t = parseTranscript("Customer: My parcel\n\n  never arrived.");
    expect(t).toEqual([{ speaker: "customer", text: "My parcel never arrived." }]);
  });
  it("ignores text before the first speaker", () => {
    expect(parseTranscript("hello\nAgent: Hi")).toEqual([{ speaker: "agent", text: "Hi" }]);
  });
});

describe("validCallId", () => {
  it("matches the API's rules", () => {
    expect(validCallId("bank-011")).toBe(true);
    expect(validCallId("has space")).toBe(false);
    expect(validCallId("ab")).toBe(false);
  });
});
