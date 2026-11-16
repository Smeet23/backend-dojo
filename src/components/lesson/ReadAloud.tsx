"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isVoiceId, splitIntoChunks, VOICES, type VoiceId } from "@/lib/read-aloud";
import { VoiceEngine } from "./voice-engine";

/**
 * "Listen": reads the lesson aloud with Kokoro, a free open-source voice model that runs in
 * the learner's browser, and highlights each block as it's read.
 * Design: docs/plans/2026-11-16-read-aloud-design.md.
 */

type Item = { block: number; text: string };
type Prefs = { rate: number; voice: VoiceId };
type Status = "idle" | "loading" | "buffering" | "playing" | "paused" | "error";

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];
/** How many pieces ahead to prepare while the current one plays. */
const LOOKAHEAD = 3;
const PREFS_KEY = "grokstack:read-aloud";
const READ_ROOT = "[data-read-root]";
const BLOCKS = "h1, .lesson :is(p, h2, h3, h4, li, blockquote)";
const SKIP = "pre, table, [data-read-skip]";
const INTERACTIVE = "a, button, input, select, textarea, label, summary, [data-read-skip]";
/** Room taken by the sticky header (top) and the player bar (bottom). */
const TOP_OFFSET = 72;
const BOTTOM_OFFSET = 120;
/** A silent WAV, played inside the click so Safari lets the same element play later. */
const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as Partial<Prefs>;
    return {
      rate: typeof p.rate === "number" && RATES.includes(p.rate) ? p.rate : 1,
      voice: isVoiceId(p.voice) ? p.voice : VOICES[0].id,
    };
  } catch {
    return { rate: 1, voice: VOICES[0].id };
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
function collectBlocks(root: HTMLElement): { el: HTMLElement; chunks: string[] }[] {
  const kept = new Set<Element>();
  const blocks: { el: HTMLElement; chunks: string[] }[] = [];
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
const canRun = () => typeof Worker !== "undefined" && typeof WebAssembly !== "undefined";

export function ReadAloud() {
  const supported = useSyncExternalStore(noop, canRun, () => false);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [rate, setRate] = useState(1);
  const [voice, setVoice] = useState<VoiceId>(VOICES[0].id);

  const engineRef = useRef<VoiceEngine | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef("");
  const elementsRef = useRef<HTMLElement[]>([]);
  const itemsRef = useRef<Item[]>([]);
  /** Index of each block's first item. */
  const blockStartRef = useRef<number[]>([]);
  const posRef = useRef(0);
  /** Which item the audio element currently holds (-1: none). */
  const loadedRef = useRef(-1);
  const cacheRef = useRef(new Map<number, Promise<Blob | null>>());
  /** Bumped on every play/pause/jump so an outdated await can't start audio. */
  const tokenRef = useRef(0);
  const statusRef = useRef<Status>("idle");
  const prefsRef = useRef<Prefs>({ rate: 1, voice: VOICES[0].id });
  const litRef = useRef<HTMLElement | null>(null);

  function setStatusBoth(s: Status) {
    statusRef.current = s;
    setStatus(s);
  }

  function highlight(block: number | null) {
    const el = block === null ? null : (elementsRef.current[block] ?? null);
    if (el === litRef.current) return;
    litRef.current?.removeAttribute("data-reading");
    litRef.current = el;
    if (!el || block === null) return;
    el.setAttribute("data-reading", "");
    setCurrent(block);
    const r = el.getBoundingClientRect();
    if (r.top < TOP_OFFSET || r.bottom > window.innerHeight - BOTTOM_OFFSET) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
    }
  }

  function ensure(i: number) {
    const engine = engineRef.current;
    const item = itemsRef.current[i];
    if (!engine || !item || cacheRef.current.has(i)) return;
    const job = engine.generate(item.text, prefsRef.current.voice);
    cacheRef.current.set(i, job);
    job.then(
      (wav) => {
        if (!wav && cacheRef.current.get(i) === job) cacheRef.current.delete(i);
      },
      () => {
        if (cacheRef.current.get(i) === job) cacheRef.current.delete(i);
      },
    );
  }

  function prefetch(from: number) {
    for (let i = from; i <= from + LOOKAHEAD; i++) ensure(i);
    // Keep only audio near the current position; WAV pieces are a few hundred KB each.
    for (const i of cacheRef.current.keys()) if (i < from - 1 || i > from + LOOKAHEAD) cacheRef.current.delete(i);
  }

  /** Throws away queued audio (after a jump or a voice change). */
  function discardQueued() {
    engineRef.current?.reset();
    cacheRef.current.clear();
  }

  async function playFrom(i: number) {
    const token = ++tokenRef.current;
    const items = itemsRef.current;
    const audio = audioRef.current;
    if (!audio) return;
    if (i >= items.length) {
      // Finished: the next play starts from the top.
      audio.pause();
      posRef.current = 0;
      loadedRef.current = -1;
      highlight(null);
      setCurrent(0);
      setStatusBoth("paused");
      return;
    }
    posRef.current = i;
    highlight(items[i].block);
    prefetch(i);
    setStatusBoth("buffering");

    let wav: Blob | null;
    try {
      wav = await cacheRef.current.get(i)!;
    } catch (err) {
      if (token !== tokenRef.current) return;
      setError(err instanceof Error ? err.message : "Couldn't generate the audio.");
      setStatusBoth("error");
      return;
    }
    if (token !== tokenRef.current) return;
    if (!wav) return void playFrom(i); // Dropped by a reset; ask again.

    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(wav);
    audio.src = urlRef.current;
    audio.playbackRate = prefsRef.current.rate;
    loadedRef.current = i;
    try {
      await audio.play();
      if (token === tokenRef.current) setStatusBoth("playing");
    } catch {
      if (token === tokenRef.current) setStatusBoth("paused");
    }
  }

  function play() {
    const audio = audioRef.current;
    if (!audio) return;
    if (loadedRef.current === posRef.current && audio.src && !audio.ended) {
      // Resume mid-sentence.
      tokenRef.current++;
      audio.playbackRate = prefsRef.current.rate;
      audio.play().then(
        () => setStatusBoth("playing"),
        () => setStatusBoth("paused"),
      );
    } else {
      void playFrom(posRef.current);
    }
  }

  function pause() {
    tokenRef.current++;
    audioRef.current?.pause();
    setStatusBoth("paused");
  }

  function jumpToBlock(block: number) {
    const starts = blockStartRef.current;
    const b = Math.max(0, Math.min(starts.length - 1, block));
    const wasActive = statusRef.current === "playing" || statusRef.current === "buffering";
    tokenRef.current++;
    audioRef.current?.pause();
    discardQueued();
    posRef.current = starts[b];
    loadedRef.current = -1;
    if (wasActive) void playFrom(posRef.current);
    else highlight(b);
  }

  async function openPlayer() {
    const root = document.querySelector<HTMLElement>(READ_ROOT);
    if (!root) return;
    const blocks = collectBlocks(root);
    if (blocks.length === 0) return;
    elementsRef.current = blocks.map((b) => b.el);
    itemsRef.current = blocks.flatMap((b, block) => b.chunks.map((text) => ({ block, text })));
    let n = 0;
    blockStartRef.current = blocks.map((b) => {
      const start = n;
      n += b.chunks.length;
      return start;
    });
    setTotal(blocks.length);

    const prefs = loadPrefs();
    prefsRef.current = prefs;
    setRate(prefs.rate);
    setVoice(prefs.voice);

    // Created and played inside the click so browsers allow it to play later.
    if (!audioRef.current) {
      const audio = new Audio();
      audio.onended = () => {
        if (statusRef.current === "playing") void playFrom(posRef.current + 1);
      };
      audioRef.current = audio;
    }
    audioRef.current.src = SILENT_WAV;
    audioRef.current.play().catch(() => {});

    // Start from the first block on screen, so learners continue from where they are.
    const startBlock = Math.max(0, blocks.findIndex((b) => b.el.getBoundingClientRect().bottom > TOP_OFFSET));
    posRef.current = blockStartRef.current[startBlock];
    loadedRef.current = -1;
    root.setAttribute("data-read-active", "");
    setOpen(true);
    setError("");
    highlight(startBlock);

    engineRef.current ??= new VoiceEngine(setProgress);
    setStatusBoth("loading");
    const token = ++tokenRef.current;
    try {
      await engineRef.current.ready;
    } catch (err) {
      engineRef.current?.dispose();
      engineRef.current = null;
      setError(err instanceof Error ? err.message : "Couldn't load the voice.");
      setStatusBoth("error");
      return;
    }
    if (token === tokenRef.current) void playFrom(posRef.current);
  }

  function closePlayer() {
    pause();
    discardQueued();
    highlight(null);
    document.querySelector(READ_ROOT)?.removeAttribute("data-read-active");
    setOpen(false);
    setStatusBoth("idle");
  }

  function changeRate(value: number) {
    setRate(value);
    prefsRef.current = { ...prefsRef.current, rate: value };
    savePrefs(prefsRef.current);
    if (audioRef.current) audioRef.current.playbackRate = value;
  }

  function changeVoice(id: VoiceId) {
    setVoice(id);
    prefsRef.current = { ...prefsRef.current, voice: id };
    savePrefs(prefsRef.current);
    const wasActive = statusRef.current === "playing" || statusRef.current === "buffering";
    tokenRef.current++;
    audioRef.current?.pause();
    discardQueued();
    loadedRef.current = -1;
    if (wasActive) void playFrom(posRef.current);
  }

  // While open, clicking a paragraph reads from there.
  const clickRef = useRef<(target: HTMLElement) => void>(() => {});
  clickRef.current = (target) => {
    if (target.closest(INTERACTIVE) || window.getSelection()?.toString()) return;
    const block = elementsRef.current.findIndex((el) => el.contains(target));
    if (block < 0 || statusRef.current === "loading" || statusRef.current === "error") return;
    tokenRef.current++;
    audioRef.current?.pause();
    discardQueued();
    loadedRef.current = -1;
    void playFrom(blockStartRef.current[block]);
  };
  useEffect(() => {
    if (!open) return;
    const root = document.querySelector<HTMLElement>(READ_ROOT);
    const onClick = (e: MouseEvent) => {
      if (e.target instanceof HTMLElement) clickRef.current(e.target);
    };
    root?.addEventListener("click", onClick);
    return () => root?.removeEventListener("click", onClick);
  }, [open]);

  // Leaving the lesson stops the voice and frees the model.
  useEffect(
    () => () => {
      tokenRef.current++;
      audioRef.current?.pause();
      engineRef.current?.dispose();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      litRef.current?.removeAttribute("data-reading");
      document.querySelector(READ_ROOT)?.removeAttribute("data-read-active");
    },
    [],
  );

  if (!supported) return null;

  const active = status === "playing" || status === "buffering";
  const busy = status === "loading" || status === "buffering";
  const statusText =
    status === "loading"
      ? progress > 0 && progress < 1
        ? `Downloading voice (first time only)… ${Math.round(progress * 100)}%`
        : "Loading voice…"
      : status === "buffering"
        ? "Preparing audio…"
        : status === "error"
          ? `Voice unavailable: ${error}`
          : null;

  return (
    <>
      <button
        type="button"
        onClick={() => (open ? (active ? pause() : play()) : void openPlayer())}
        disabled={status === "loading"}
        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium hover:bg-surface-2 disabled:opacity-60"
      >
        <SpeakerIcon />
        {!open ? "Listen to this lesson" : active ? "Pause" : status === "loading" ? "Loading voice…" : "Resume"}
      </button>

      {open && (
        <div
          role="region"
          aria-label="Read aloud player"
          className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-2 shadow-lg">
            {status === "loading" && (
              <div className="mx-1 mb-2 h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <IconButton label="Previous paragraph" onClick={() => jumpToBlock(itemsRef.current[posRef.current]?.block - 1)}>
                  <PrevIcon />
                </IconButton>
                <button
                  type="button"
                  onClick={active ? pause : play}
                  disabled={status === "loading" || status === "error"}
                  aria-label={active ? "Pause" : "Play"}
                  className="flex size-11 items-center justify-center rounded-full bg-accent text-white disabled:opacity-50 dark:text-bg"
                >
                  {busy ? <Spinner /> : active ? <PauseIcon /> : <PlayIcon />}
                </button>
                <IconButton label="Next paragraph" onClick={() => jumpToBlock(itemsRef.current[posRef.current]?.block + 1)}>
                  <NextIcon />
                </IconButton>
              </div>

              <p className="min-w-0 flex-1 text-xs text-muted" aria-live="polite">
                {statusText ?? (
                  <>
                    <span className="font-medium text-text">
                      {current + 1} / {total}
                    </span>
                    <span className="hidden sm:inline"> · click any paragraph to jump</span>
                  </>
                )}
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

              <label className="sr-only" htmlFor="read-aloud-voice">
                Voice
              </label>
              <select
                id="read-aloud-voice"
                value={voice}
                onChange={(e) => isVoiceId(e.target.value) && changeVoice(e.target.value)}
                className="min-h-10 w-32 rounded-lg border border-border bg-surface px-2 text-sm sm:w-48"
              >
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>

              <IconButton label="Close player" onClick={closePlayer}>
                <CloseIcon />
              </IconButton>
            </div>
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

function Spinner() {
  return (
    <svg {...svg} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="animate-spin">
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}
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
