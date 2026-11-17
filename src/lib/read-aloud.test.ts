import { describe, expect, it } from "vitest";
import { audioKey, cleanText, collectBlocks, isVoiceId, splitIntoChunks, VOICES } from "./read-aloud";

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

describe("voices", () => {
  it("defaults to a known voice and validates ids", () => {
    expect(VOICES[0].id).toBe("af_heart");
    expect(isVoiceId("bf_emma")).toBe(true);
    expect(isVoiceId("nope")).toBe(false);
    expect(isVoiceId(undefined)).toBe(false);
  });
});

describe("collectBlocks", () => {
  const html = `<article data-read-root>
    <h1>Error analysis</h1>
    <p class="summary">Not inside the lesson, so skipped.</p>
    <div class="lesson">
      <p>First paragraph.</p>
      <ul><li><p>Item with a paragraph.</p></li><li>Plain item</li></ul>
      <pre><code>const skipped = true;</code></pre>
      <table><tbody><tr><td><p>In a table</p></td></tr></tbody></table>
      <section data-read-skip><p>Inside a widget</p></section>
      <aside><p>Tip</p><div><p>Callout body.</p></div></aside>
      <h2>Next section</h2>
      <p>   </p>
    </div>
  </article>`;

  it("reads the title and lesson blocks once each, skipping code, tables and widgets", async () => {
    const { parseHTML } = await import("linkedom");
    const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);
    const root = document.querySelector("[data-read-root]")!;
    expect(collectBlocks(root).map((b) => b.chunks.join(" "))).toEqual([
      "Error analysis",
      "First paragraph.",
      "Item with a paragraph.",
      "Plain item",
      "Tip",
      "Callout body.",
      "Next section",
    ]);
  });
});

describe("audioKey", () => {
  it("is stable, short, and depends on voice and text", async () => {
    const a = await audioKey("af_heart", "Hello.");
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(await audioKey("af_heart", "Hello.")).toBe(a);
    expect(await audioKey("bf_emma", "Hello.")).not.toBe(a);
    expect(await audioKey("af_heart", "Hello!")).not.toBe(a);
  });
});
