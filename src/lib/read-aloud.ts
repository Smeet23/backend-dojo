/** Pure helpers for the lesson read-aloud player (see docs/plans/2026-11-16-read-aloud-design.md). */

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
