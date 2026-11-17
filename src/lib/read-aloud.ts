/**
 * Helpers shared by the read-aloud player and scripts/gen-lesson-audio.mjs (see
 * docs/plans/2026-11-16-read-aloud-design.md). Both must split a lesson identically, so the
 * pre-made audio lines up with the player's pieces. Keep this file free of path aliases:
 * the script imports it directly with Node.
 */

/** Text is voiced in pieces this size, so playback can start after the first piece is ready. */
export const MAX_CHUNK = 220;

/** Normalises an element's text for speech. */
export function cleanText(text: string): string {
  return text
    .replace(/\s*(→|->|⟶)\s*/g, " to ")
    .replace(/\s+/g, " ")
    .trim();
}

// Each level splits a piece that is still too long into smaller ones, keeping the punctuation.
const LEVELS: ((s: string) => string[])[] = [
  (s) => s.split(/(?<=[.!?])\s+/),
  (s) => s.split(/(?<=[,;:])\s+/),
  (s) => s.split(/\s+/),
];

function split(text: string, max: number, level: number): string[] {
  if (text.length <= max) return [text];
  if (level >= LEVELS.length) {
    const out: string[] = [];
    for (let i = 0; i < text.length; i += max) out.push(text.slice(i, i + max));
    return out;
  }
  const pieces = LEVELS[level](text).flatMap((p) => split(p, max, level + 1));
  // Greedily pack neighbouring pieces back together up to the limit.
  const chunks: string[] = [];
  for (const piece of pieces) {
    const last = chunks.at(-1);
    if (last !== undefined && last.length + 1 + piece.length <= max) chunks[chunks.length - 1] = `${last} ${piece}`;
    else chunks.push(piece);
  }
  return chunks;
}

/** Splits text into speakable chunks of at most `max` characters, preferring sentence boundaries. */
export function splitIntoChunks(text: string, max = MAX_CHUNK): string[] {
  const clean = cleanText(text);
  return clean ? split(clean, max, 0) : [];
}

/** Kokoro voices worth offering (graded B- or better on the model card). The first is the default. */
export const VOICES = [
  { id: "af_heart", label: "Heart (US, female)" },
  { id: "af_bella", label: "Bella (US, female)" },
  { id: "af_nicole", label: "Nicole (US, female, soft)" },
  { id: "am_michael", label: "Michael (US, male)" },
  { id: "am_fenrir", label: "Fenrir (US, male)" },
  { id: "bf_emma", label: "Emma (UK, female)" },
] as const;

export type VoiceId = (typeof VOICES)[number]["id"];

export function isVoiceId(id: unknown): id is VoiceId {
  return VOICES.some((v) => v.id === id);
}

/** The voice used for pre-made lesson audio. */
export const PREMADE_VOICE: VoiceId = "af_heart";

// Relative to the read root ([data-read-root]).
const BLOCKS = "h1, .lesson :is(p, h2, h3, h4, li, blockquote)";
const SKIP = "pre, table, [data-read-skip]";

export type Block<E extends Element = Element> = { el: E; chunks: string[] };

/** Readable blocks in page order. When blocks nest (a list item's paragraph), the outermost wins. */
export function collectBlocks<E extends Element>(root: E): Block<E>[] {
  const kept = new Set<Element>();
  const blocks: Block<E>[] = [];
  for (const el of root.querySelectorAll(BLOCKS) as unknown as Iterable<E>) {
    if (el.closest(SKIP)) continue;
    const top: Element = root;
    let parent: Element | null = el.parentElement;
    while (parent && parent !== top && !kept.has(parent)) parent = parent.parentElement;
    if (parent && parent !== top) continue;
    const chunks = splitIntoChunks(el.textContent ?? "");
    if (chunks.length === 0) continue;
    kept.add(el);
    blocks.push({ el, chunks });
  }
  return blocks;
}

/** Identifies one piece of audio: the same voice and text always give the same key. */
export async function audioKey(voice: VoiceId, text: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${voice}\n${text}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Pre-made audio for one lesson: one MP3, plus where each piece starts and ends in it (seconds). */
export type LessonAudio = { voice: VoiceId; url: string; items: [key: string, start: number, end: number][] };
