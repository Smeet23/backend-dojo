# Read aloud: design

## Goal
Learners can listen to a lesson instead of reading it, follow along as each paragraph is highlighted, and hear the first words right away.

## Voice
Kokoro-82M (Apache-2.0), a free open-source voice model, in two forms:

1. **Pre-made audio (default voice "Heart").** One MP3 per lesson, generated on a Mac and hosted in Vercel Blob's free tier (public store `grokstack-audio`). It's instant on every device: the first words play ~0.4 s after pressing Listen, and jumps take ~15 ms, with no gaps and no model download.
2. **In-browser generation** (`kokoro-js`, 8-bit model, ~92 MB, cached after the first download). It covers the other five voices, and any paragraph whose text changed since its audio was made. It's slower: ~2–3 s to first words on a repeat visit, more on phones.

History: device voices (`speechSynthesis`) were rejected as too low quality. Paid TTS APIs were ruled out (free services only). In-browser-only generation worked but had too much latency (≈2.7 s to first words, 1–2 s gaps, 92 MB first-visit download), so pre-made audio was added.

## Matching audio to text
- `src/lib/read-aloud.ts` is shared by the player and the generator script. `collectBlocks` picks the title and the lesson's paragraphs, headings, list items, quotes and callouts. It skips code, tables and widgets (`[data-read-skip]`); when blocks nest, the outermost wins. `splitIntoChunks` cuts each block into ≤220-character pieces at sentence boundaries.
- Each piece is identified by `audioKey(voice, text)`, the first 16 hex characters of a SHA-256 hash. `src/content/read-aloud-audio.json` maps each lesson to `{ voice, url, items: [key, start, end][] }`. A piece's range runs to the next piece's start, so consecutive pieces play seamlessly.
- The player looks up each piece's key. A hit plays from the MP3 (seek to `start`); a miss is generated in the browser.

## Generating the audio
`scripts/gen-lesson-audio.mjs`:
1. Opens every lesson of the built site (`pnpm build && pnpm start -p 3917`) in headless Chrome (Playwright) and runs the same `collectBlocks` in the page. Some lessons stream their content as data the browser renders, so their raw HTML isn't enough.
2. Skips lessons whose piece keys match the manifest, so only edited lessons are redone.
3. Voices the rest in 3 worker processes (`onnxruntime-node`, fp32, ~7× real time in total on an M4). It inserts 0.12 s between pieces and 0.45 s between blocks, then encodes each lesson to a 40 kbps CBR mono MP3 (CBR keeps seeking exact; about 6 MB per 20 minutes).
4. Uploads `read-aloud/<course>/<slug>-<voice>-<hash>.mp3` (content-hashed, cached for a year) and saves the manifest after each lesson.

Run it with `node --env-file=.env.local scripts/gen-lesson-audio.mjs` (needs `BLOB_READ_WRITE_TOKEN` from `vercel env pull`, plus ffmpeg). Use `--only course/slug` for one lesson and `--dry-run` to see what would change. Commit the updated `read-aloud-audio.json`. Old MP3s stay in the store until deleted.

## Player (`src/components/lesson/ReadAloud.tsx`)
- One `<audio>` element (`crossOrigin="anonymous"`), unlocked inside the first click for Safari. It plays the lesson MP3, or a WAV blob from the in-browser voice.
- While the MP3 plays, a `requestAnimationFrame` loop (plus `timeupdate` for background tabs) moves the highlight as pieces go by. It leaves the MP3 when the next piece isn't in it.
- The in-browser voice runs in a web worker (`tts.worker.ts`, `voice-engine.ts`). It starts as soon as the player opens if any piece will need it, and prepares the next 4 missing pieces ahead. If the MP3 fails to load, everything falls back to in-browser generation.
- Speed uses `playbackRate` (pitch preserved), so changes are instant. Pause/resume continue mid-sentence. Starting position is the first block on screen; clicking a paragraph jumps there. Speed and voice are remembered per browser.

## Cross-origin isolation
The site sends `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (site-wide, because in-app navigation keeps the first page's headers). This enables multi-threaded WebAssembly, which in-browser generation needs to keep up with playback. **Anything loaded from another origin must send CORS or `Cross-Origin-Resource-Policy` headers.** Vercel Blob sends `Access-Control-Allow-Origin: *`.

## Out of scope (YAGNI)
Pre-made audio for the other voices, lock-screen/media-key controls, and reading quizzes aloud.
