/** Pure helpers for the lesson read-aloud player (see docs/plans/2026-11-16-read-aloud-design.md). */

/** Chrome stops speaking long utterances after ~15 s, so text is spoken in pieces this size. */
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

export function englishVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
}

// macOS sound-effect voices: fun, but not for a lesson.
const NOVELTY =
  /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Jester|Organ|Pipe Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox)\b/i;

function score(v: SpeechSynthesisVoice): number {
  if (/natural|neural/i.test(v.name)) return 4;
  if (/premium|enhanced/i.test(v.name)) return 3;
  if (/google/i.test(v.name)) return 2;
  return 0;
}

/** English voices with the most natural-sounding first (stable within a score). */
export function rankVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return englishVoices(voices)
    .filter((v) => !NOVELTY.test(v.name))
    .map((v, i) => ({ v, i, s: score(v) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.v);
}
