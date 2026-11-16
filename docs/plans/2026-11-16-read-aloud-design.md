# Read aloud: design

## Goal
Learners can listen to a lesson instead of reading it, and follow along as each paragraph is highlighted.

## Decisions
- **Voice:** Kokoro-82M (Apache-2.0), an open-source voice model that runs in the learner's browser through `kokoro-js` (Transformers.js + ONNX Runtime Web). It's free, needs no API key or server, and sounds far better than device voices. Device voices (`speechSynthesis`) were tried first and rejected as too low quality. Paid APIs were ruled out (free services only).
- **Model build:** 8-bit weights on WebAssembly (~92 MB, downloaded once and then cached by the browser). The fp32 WebGPU build is faster but a 326 MB download.
- **Speed:** generation has to keep up with playback. Single-threaded WebAssembly managed ~0.6× real time (long silences). The site now sends `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`, which enables multi-threaded WebAssembly. Measured in headless Chromium on a 10-core Mac: about 0.9–1× real time from the start, then continuous playback with ~0.1 s between pieces. The headers apply site-wide because in-app navigation keeps the first page's headers. **Anything loaded from another origin must now send CORS or `Cross-Origin-Resource-Policy` headers.**
- **What gets read:** the lecture title, then the lesson's paragraphs, headings, list items, quotes and callouts. Code blocks, tables and interactive widgets (`[data-read-skip]`) are skipped.
- **Where it starts:** from the first block visible on screen. While the player is open, clicking a paragraph jumps there.

## How it works
- `tts.worker.ts` loads the model and turns text into WAV, one job at a time. A `reset` drops queued jobs (after a jump or a voice change).
- `voice-engine.ts` is the main-thread handle: `ready`, `generate(text, voice)`, `reset()`, `dispose()`.
- `ReadAloud.tsx` splits blocks into ≤220-character pieces at sentence boundaries. It prepares the next 3 pieces while one plays, and plays them through a single `<audio>` element, which is unlocked inside the first click for Safari. Speed is set with `playbackRate` (pitch preserved), so changing it is instant and needs no regeneration. Pause/resume continue mid-sentence.
- The first press shows a download progress bar (first time only), then "Preparing audio…".
- Speed and voice are remembered per browser (localStorage, wrapped in try/catch).

## Known limits
- Phones and older laptops may generate slower than real time and pause between sentences.
- The first audio arrives ~9 s after pressing Listen (model load + first piece). It's faster on later visits once the model is cached.

## Out of scope (YAGNI)
Server-side or pre-generated audio, lock-screen/media-key controls, and reading quizzes aloud.
