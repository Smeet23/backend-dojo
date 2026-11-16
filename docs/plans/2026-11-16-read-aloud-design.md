# Read aloud: design

## Goal
Learners can listen to a lesson instead of reading it, and follow along as each paragraph is highlighted.

## Decisions
- **Voice source:** the device's own voices via the browser speech API (`speechSynthesis`). No cost, no API quota, works offline, and starts instantly. Quality depends on the device: excellent on macOS/iOS/Edge, plainer on some Chrome/Android setups. We pick the best English voice available ("Natural", "Premium", "Enhanced", "Neural" and Google voices rank first), and the learner can change it.
- **What gets read:** the lecture title, then the lesson's paragraphs, headings, list items, quotes and callouts. We skip code blocks, tables and interactive widgets (`<section>` frames marked `data-read-skip`), because they don't make sense spoken.
- **Where it starts:** from the first block visible on screen, so a learner who scrolled halfway down continues from there. Clicking any paragraph while the player is open jumps to it.

## UI
- A "🔊 Listen" button under the lecture summary. It's hidden when the browser can't speak.
- Pressing it opens a player bar fixed to the bottom of the screen: previous / play-pause / next paragraph, a speed menu (0.75×–2×), a voice menu, the position ("12 / 48") and a close button.
- The block being read gets a soft accent background and is scrolled into view only when it's off screen, so the reader doesn't fight the learner's own scrolling.
- Speed and voice are remembered per browser (localStorage, wrapped in try/catch).

## How it works
- On open, collect the readable elements from the page once (`h1` + `.lesson` blocks). When blocks are nested, the outermost one wins, so a list item and its inner paragraph aren't read twice.
- Each block is split into chunks of at most ~220 characters at sentence (then comma, then word) boundaries. Chrome silently stops long utterances after ~15 s; short chunks avoid that.
- One utterance is spoken at a time. Its `onend` advances to the next chunk or block.
- Pause = `cancel()` and remember the position; resume re-speaks the current chunk. That's more reliable across browsers than `pause()`/`resume()`. Each utterance carries a generation number, so a cancelled one's `onend` never advances the position.
- Changing the speed or voice while playing restarts the current chunk with the new setting.
- Leaving the page (unmount) cancels speech.

## Code
- `src/lib/read-aloud.ts`: pure helpers (text cleanup, chunking, voice ranking), unit tested.
- `src/components/lesson/ReadAloud.tsx`: client component with the button, player bar and speech engine.
- `Widget.tsx` gets `data-read-skip`; `globals.css` gets the highlight style.

## Out of scope (YAGNI)
AI voices, downloadable audio, lock-screen/media-key controls, and reading quizzes aloud.
