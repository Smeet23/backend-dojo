import { describe, expect, it } from "vitest";
import { cleanText, splitIntoChunks, rankVoices, englishVoices } from "./read-aloud";

describe("cleanText", () => {
  it("collapses whitespace and trims", () => {
    expect(cleanText("  Hello\n\n   world \t ")).toBe("Hello world");
  });

  it("speaks arrows instead of skipping them", () => {
    expect(cleanText("client → server")).toBe("client to server");
  });

  it("returns empty for whitespace-only text", () => {
    expect(cleanText(" \n ")).toBe("");
  });
});

describe("splitIntoChunks", () => {
  it("keeps short text as one chunk", () => {
    expect(splitIntoChunks("One sentence. Two sentences.", 220)).toEqual(["One sentence. Two sentences."]);
  });

  it("splits long text at sentence boundaries", () => {
    const a = "A".repeat(30) + ".";
    const b = "B".repeat(30) + "!";
    const c = "C".repeat(30) + "?";
    expect(splitIntoChunks(`${a} ${b} ${c}`, 70)).toEqual([`${a} ${b}`, c]);
  });

  it("falls back to commas, then words, when a sentence is too long", () => {
    const text = "alpha beta gamma, delta epsilon zeta, eta theta iota kappa lambda";
    const chunks = splitIntoChunks(text, 20);
    expect(chunks.every((c) => c.length <= 20)).toBe(true);
    expect(chunks.join(" ").replace(/\s+/g, " ")).toBe(text);
    expect(chunks[0]).toBe("alpha beta gamma,");
  });

  it("hard-splits a single word longer than the limit", () => {
    expect(splitIntoChunks("x".repeat(25), 10)).toEqual(["x".repeat(10), "x".repeat(10), "x".repeat(5)]);
  });

  it("returns nothing for empty text", () => {
    expect(splitIntoChunks("", 220)).toEqual([]);
  });
});

const v = (name: string, lang = "en-US", localService = true) =>
  ({ name, lang, localService, voiceURI: name, default: false }) as SpeechSynthesisVoice;

describe("englishVoices / rankVoices", () => {
  it("keeps only English voices", () => {
    const list = englishVoices([v("Amelie", "fr-FR"), v("Samantha"), v("Daniel", "en_GB")]);
    expect(list.map((x) => x.name)).toEqual(["Samantha", "Daniel"]);
  });

  it("puts natural-sounding voices first", () => {
    const ranked = rankVoices([
      v("Fred"),
      v("Microsoft Aria Online (Natural) - English (United States)", "en-US", false),
      v("Samantha (Enhanced)"),
      v("Google UK English Female", "en-GB", false),
    ]);
    expect(ranked[0].name).toContain("Natural");
    expect(ranked.at(-1)!.name).toBe("Fred");
  });

  it("drops novelty voices", () => {
    const ranked = rankVoices([v("Bubbles"), v("Zarvox"), v("Samantha")]);
    expect(ranked.map((x) => x.name)).toEqual(["Samantha"]);
  });
});
