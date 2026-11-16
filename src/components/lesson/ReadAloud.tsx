"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { rankVoices, splitIntoChunks } from "@/lib/read-aloud";

/**
 * "Listen": reads the lesson aloud with the device's own voices and highlights each block as
 * it's spoken. Design: docs/plans/2026-11-16-read-aloud-design.md.
 */

type Block = { el: HTMLElement; chunks: string[] };
type Prefs = { rate: number; voiceURI: string };

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];
const PREFS_KEY = "grokstack:read-aloud";
const READ_ROOT = "[data-read-root]";
const BLOCKS = "h1, .lesson :is(p, h2, h3, h4, li, blockquote)";
const SKIP = "pre, table, [data-read-skip]";
const INTERACTIVE = "a, button, input, select, textarea, label, summary, [data-read-skip]";
/** Room taken by the sticky header (top) and the player bar (bottom). */
const TOP_OFFSET = 72;
const BOTTOM_OFFSET = 120;

function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as Partial<Prefs>;
    return { rate: RATES.includes(p.rate ?? 1) ? (p.rate ?? 1) : 1, voiceURI: p.voiceURI ?? "" };
  } catch {
    return { rate: 1, voiceURI: "" };
  }
}

function savePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage blocked: the settings just won't be remembered.
  }
}

/** Readable blocks in page order. When blocks nest (a list item's paragraph), the outermost wins. */
function collectBlocks(root: HTMLElement): Block[] {
  const kept = new Set<Element>();
  const blocks: Block[] = [];
  for (const el of root.querySelectorAll<HTMLElement>(BLOCKS)) {
    if (el.closest(SKIP)) continue;
    let parent = el.parentElement;
    while (parent && parent !== root && !kept.has(parent)) parent = parent.parentElement;
    if (parent && parent !== root) continue;
    const chunks = splitIntoChunks(el.textContent ?? "");
    if (chunks.length === 0) continue;
    kept.add(el);
    blocks.push({ el, chunks });
  }
  return blocks;
}

const noop = () => () => {};
const canSpeak = () => "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

export function ReadAloud() {
  const supported = useSyncExternalStore(noop, canSpeak, () => false);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [rate, setRate] = useState(1);
  const [voiceURI, setVoiceURI] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const blocksRef = useRef<Block[]>([]);
  const posRef = useRef({ block: 0, chunk: 0 });
  /** Bumped whenever speech is cancelled, so a stale utterance's onend can't advance. */
  const genRef = useRef(0);
  const playingRef = useRef(false);
  const settingsRef = useRef({ rate: 1, voice: null as SpeechSynthesisVoice | null });
  const litRef = useRef<HTMLElement | null>(null);

  const selectedVoice = voices.find((v) => v.voiceURI === voiceURI) ?? voices[0] ?? null;
  useEffect(() => {
    settingsRef.current = { rate, voice: selectedVoice };
  }, [rate, selectedVoice]);

  function highlight(index: number | null) {
    litRef.current?.removeAttribute("data-reading");
    litRef.current = null;
    if (index === null) return;
    const el = blocksRef.current[index]?.el;
    if (!el) return;
    el.setAttribute("data-reading", "");
    litRef.current = el;
    setCurrent(index);
    const r = el.getBoundingClientRect();
    if (r.top < TOP_OFFSET || r.bottom > window.innerHeight - BOTTOM_OFFSET) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
    }
  }

  function stopSpeech() {
    genRef.current++;
    window.speechSynthesis.cancel();
  }

  function setPlayingState(value: boolean) {
    playingRef.current = value;
    setPlaying(value);
  }

  function speakCurrent() {
    stopSpeech();
    const gen = genRef.current;
    const blocks = blocksRef.current;
    let { block, chunk } = posRef.current;
    while (block < blocks.length && chunk >= blocks[block].chunks.length) {
      block++;
      chunk = 0;
    }
    if (block >= blocks.length) {
      // Finished: the next play starts from the top.
      posRef.current = { block: 0, chunk: 0 };
      setPlayingState(false);
      highlight(null);
      setCurrent(0);
      return;
    }
    posRef.current = { block, chunk };
    if (litRef.current !== blocks[block].el) highlight(block);

    const u = new SpeechSynthesisUtterance(blocks[block].chunks[chunk]);
    const { rate, voice } = settingsRef.current;
    u.rate = rate;
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = "en-US";
    }
    u.onend = () => {
      if (gen !== genRef.current) return;
      posRef.current = { block, chunk: chunk + 1 };
      speakCurrent();
    };
    u.onerror = (e) => {
      if (gen !== genRef.current || e.error === "interrupted" || e.error === "canceled") return;
      setPlayingState(false);
    };
    window.speechSynthesis.speak(u);
  }

  function play() {
    setPlayingState(true);
    speakCurrent();
  }

  function pause() {
    stopSpeech();
    setPlayingState(false);
  }

  function jump(index: number) {
    const last = blocksRef.current.length - 1;
    posRef.current = { block: Math.max(0, Math.min(last, index)), chunk: 0 };
    if (playingRef.current) speakCurrent();
    else highlight(posRef.current.block);
  }

  function openPlayer() {
    const root = document.querySelector<HTMLElement>(READ_ROOT);
    if (!root) return;
    const blocks = collectBlocks(root);
    if (blocks.length === 0) return;
    blocksRef.current = blocks;
    setTotal(blocks.length);

    const prefs = loadPrefs();
    const ranked = rankVoices(window.speechSynthesis.getVoices());
    setVoices(ranked);
    setRate(prefs.rate);
    setVoiceURI(prefs.voiceURI);
    settingsRef.current = { rate: prefs.rate, voice: ranked.find((v) => v.voiceURI === prefs.voiceURI) ?? ranked[0] ?? null };

    // Start from the first block on screen, so learners continue from where they are.
    const start = blocks.findIndex((b) => b.el.getBoundingClientRect().bottom > TOP_OFFSET);
    posRef.current = { block: Math.max(0, start), chunk: 0 };
    root.setAttribute("data-read-active", "");
    setOpen(true);
    play();
  }

  function closePlayer() {
    pause();
    highlight(null);
    document.querySelector(READ_ROOT)?.removeAttribute("data-read-active");
    setOpen(false);
  }

  function changeRate(value: number) {
    setRate(value);
    settingsRef.current = { ...settingsRef.current, rate: value };
    savePrefs({ rate: value, voiceURI });
    if (playingRef.current) speakCurrent();
  }

  function changeVoice(uri: string) {
    setVoiceURI(uri);
    settingsRef.current = { ...settingsRef.current, voice: voices.find((v) => v.voiceURI === uri) ?? null };
    savePrefs({ rate, voiceURI: uri });
    if (playingRef.current) speakCurrent();
  }

  // Voices load asynchronously in Chrome; refresh the list when they arrive.
  useEffect(() => {
    if (!open) return;
    const synth = window.speechSynthesis;
    const update = () => setVoices(rankVoices(synth.getVoices()));
    synth.addEventListener("voiceschanged", update);
    return () => synth.removeEventListener("voiceschanged", update);
  }, [open]);

  // While open, clicking a paragraph reads from there.
  const jumpRef = useRef<(target: HTMLElement) => void>(() => {});
  jumpRef.current = (target) => {
    if (target.closest(INTERACTIVE) || window.getSelection()?.toString()) return;
    const index = blocksRef.current.findIndex((b) => b.el.contains(target));
    if (index < 0) return;
    posRef.current = { block: index, chunk: 0 };
    play();
  };
  useEffect(() => {
    if (!open) return;
    const root = document.querySelector<HTMLElement>(READ_ROOT);
    const onClick = (e: MouseEvent) => {
      if (e.target instanceof HTMLElement) jumpRef.current(e.target);
    };
    root?.addEventListener("click", onClick);
    return () => root?.removeEventListener("click", onClick);
  }, [open]);

  // Leaving the lesson stops the voice.
  useEffect(
    () => () => {
      genRef.current++;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      litRef.current?.removeAttribute("data-reading");
      document.querySelector(READ_ROOT)?.removeAttribute("data-read-active");
    },
    [],
  );

  if (!supported) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => (open ? (playing ? pause() : play()) : openPlayer())}
        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium hover:bg-surface-2"
      >
        <SpeakerIcon />
        {open ? (playing ? "Pause" : "Resume") : "Listen to this lesson"}
      </button>

      {open && (
        <div
          role="region"
          aria-label="Read aloud player"
          className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-2 shadow-lg">
            <div className="flex items-center gap-1">
              <IconButton label="Previous paragraph" onClick={() => jump(posRef.current.block - 1)}>
                <PrevIcon />
              </IconButton>
              <button
                type="button"
                onClick={playing ? pause : play}
                aria-label={playing ? "Pause" : "Play"}
                className="flex size-11 items-center justify-center rounded-full bg-accent text-white dark:text-bg"
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <IconButton label="Next paragraph" onClick={() => jump(posRef.current.block + 1)}>
                <NextIcon />
              </IconButton>
            </div>

            <p className="min-w-0 flex-1 text-xs text-muted" aria-live="polite">
              <span className="font-medium text-text">
                {current + 1} / {total}
              </span>
              <span className="hidden sm:inline"> · click any paragraph to jump</span>
            </p>

            <label className="sr-only" htmlFor="read-aloud-rate">
              Speed
            </label>
            <select
              id="read-aloud-rate"
              value={rate}
              onChange={(e) => changeRate(Number(e.target.value))}
              className="min-h-10 rounded-lg border border-border bg-surface px-2 text-sm"
            >
              {RATES.map((r) => (
                <option key={r} value={r}>
                  {r}×
                </option>
              ))}
            </select>

            {voices.length > 1 && (
              <>
                <label className="sr-only" htmlFor="read-aloud-voice">
                  Voice
                </label>
                <select
                  id="read-aloud-voice"
                  value={selectedVoice?.voiceURI ?? ""}
                  onChange={(e) => changeVoice(e.target.value)}
                  className="min-h-10 w-32 rounded-lg border border-border bg-surface px-2 text-sm sm:w-44"
                >
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            <IconButton label="Close player" onClick={closePlayer}>
              <CloseIcon />
            </IconButton>
          </div>
        </div>
      )}
    </>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
    >
      {children}
    </button>
  );
}

const svg = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true } as const;

function SpeakerIcon() {
  return (
    <svg {...svg} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg {...svg}>
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg {...svg}>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
function PrevIcon() {
  return (
    <svg {...svg}>
      <rect x="5" y="5" width="2.5" height="14" rx="1" />
      <path d="M19 6.2v11.6a1 1 0 0 1-1.55.83L9.6 12.83a1 1 0 0 1 0-1.66l7.85-5.8A1 1 0 0 1 19 6.2Z" />
    </svg>
  );
}
function NextIcon() {
  return (
    <svg {...svg}>
      <rect x="16.5" y="5" width="2.5" height="14" rx="1" />
      <path d="M5 6.2v11.6a1 1 0 0 0 1.55.83l7.85-5.8a1 1 0 0 0 0-1.66L6.55 5.37A1 1 0 0 0 5 6.2Z" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg {...svg} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
