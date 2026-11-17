"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { audioKey, collectBlocks, isVoiceId, VOICES, type LessonAudio, type VoiceId } from "@/lib/read-aloud";
import { VoiceEngine } from "./voice-engine";

/**
 * "Listen": reads the lesson aloud and highlights each block as it's read.
 *
 * Pieces come from the lesson's pre-made MP3 when it has them (instant, any device), otherwise
 * from Kokoro, a free open-source voice model running in the learner's browser (other voices,
 * or paragraphs edited since the audio was made). Design: docs/plans/2026-11-16-read-aloud-design.md.
 */

type Item = { block: number; text: string };
type Range = { start: number; end: number };
type Prefs = { rate: number; voice: VoiceId };
type Status = "idle" | "buffering" | "playing" | "paused" | "error";

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];
/** How many pieces ahead the in-browser voice prepares while one plays. */
const LOOKAHEAD = 4;
const PREFS_KEY = "grokstack:read-aloud";
const READ_ROOT = "[data-read-root]";
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

function once(target: EventTarget, event: string) {
  return new Promise<void>((resolve) => target.addEventListener(event, () => resolve(), { once: true }));
}

const noop = () => () => {};
const canRun = () => typeof Audio !== "undefined";

export function ReadAloud({ audio: lessonAudio }: { audio?: LessonAudio }) {
  const supported = useSyncExternalStore(noop, canRun, () => false);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [engineReady, setEngineReady] = useState(false);
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
  /** Each item's place in the pre-made MP3 for the current voice, or null to generate it. */
  const premadeRef = useRef<(Range | null)[]>([]);
  /** Index of each block's first item. */
  const blockStartRef = useRef<number[]>([]);
  const posRef = useRef(0);
  /** Which item the audio element is positioned on (-1: none). */
  const loadedRef = useRef(-1);
  const modeRef = useRef<"premade" | "generated">("generated");
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

  /** The in-browser voice, started on first need (and kept for the page's lifetime). */
  function engine(): VoiceEngine {
    if (!engineRef.current) {
      const e = new VoiceEngine(setProgress);
      engineRef.current = e;
      e.ready.then(
        () => setEngineReady(true),
        (err: unknown) => {
          if (engineRef.current !== e) return;
          e.dispose();
          engineRef.current = null;
          setError(err instanceof Error ? err.message : "Couldn't load the voice.");
          setStatusBoth("error");
        },
      );
    }
    return engineRef.current;
  }

  /** Which items the lesson's MP3 covers for the current voice. */
  async function mapPremade(voice: VoiceId) {
    const items = itemsRef.current;
    if (!lessonAudio || lessonAudio.voice !== voice) {
      premadeRef.current = items.map(() => null);
      return;
    }
    const byKey = new Map(lessonAudio.items.map(([key, start, end]) => [key, { start, end }]));
    premadeRef.current = await Promise.all(items.map(async (it) => byKey.get(await audioKey(voice, it.text)) ?? null));
  }

  function ensure(i: number) {
    const item = itemsRef.current[i];
    if (!item || premadeRef.current[i] || cacheRef.current.has(i)) return;
    const job = engine().generate(item.text, prefsRef.current.voice);
    cacheRef.current.set(i, job);
    const forget = () => {
      if (cacheRef.current.get(i) === job) cacheRef.current.delete(i);
    };
    job.then((wav) => !wav && forget(), forget);
  }

  /** Prepares upcoming pieces the MP3 doesn't cover, and drops ones far behind. */
  function prefetch(from: number) {
    for (let i = from; i <= from + LOOKAHEAD; i++) ensure(i);
    for (const i of cacheRef.current.keys()) if (i < from - 1 || i > from + LOOKAHEAD) cacheRef.current.delete(i);
  }

  /** Throws away queued in-browser audio (after a jump or a voice change). */
  function discardQueued() {
    engineRef.current?.reset();
    cacheRef.current.clear();
  }

  function finish() {
    audioRef.current?.pause();
    posRef.current = 0;
    loadedRef.current = -1;
    highlight(null);
    setCurrent(0);
    setStatusBoth("paused");
  }

  async function playFrom(i: number) {
    const token = ++tokenRef.current;
    const audio = audioRef.current;
    if (!audio) return;
    if (i >= itemsRef.current.length) return finish();
    posRef.current = i;
    highlight(itemsRef.current[i].block);
    prefetch(i);
    setStatusBoth("buffering");

    const range = premadeRef.current[i];
    if (range && lessonAudio) {
      try {
        if (audio.src !== lessonAudio.url) {
          audio.src = lessonAudio.url;
          if (audio.readyState < HTMLMediaElement.HAVE_METADATA) await once(audio, "loadedmetadata");
          if (token !== tokenRef.current) return;
        }
        audio.currentTime = range.start;
        audio.playbackRate = audio.defaultPlaybackRate = prefsRef.current.rate;
        modeRef.current = "premade";
        loadedRef.current = i;
        await audio.play();
        if (token === tokenRef.current) setStatusBoth("playing");
      } catch (err) {
        if (token !== tokenRef.current) return;
        if (err instanceof DOMException && err.name === "NotAllowedError") return setStatusBoth("paused");
        // The MP3 couldn't load: voice everything in the browser instead.
        premadeRef.current = premadeRef.current.map(() => null);
        void playFrom(i);
      }
      return;
    }

    let wav: Blob | null;
    try {
      wav = await cacheRef.current.get(i)!;
    } catch (err) {
      if (token !== tokenRef.current) return;
      setError(err instanceof Error ? err.message : "Couldn't generate the audio.");
      return setStatusBoth("error");
    }
    if (token !== tokenRef.current) return;
    if (!wav) return void playFrom(i); // Dropped by a reset; ask again.

    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(wav);
    audio.src = urlRef.current;
    audio.playbackRate = audio.defaultPlaybackRate = prefsRef.current.rate;
    modeRef.current = "generated";
    loadedRef.current = i;
    try {
      await audio.play();
      if (token === tokenRef.current) setStatusBoth("playing");
    } catch {
      if (token === tokenRef.current) setStatusBoth("paused");
    }
  }

  /**
   * While the MP3 plays: move the highlight as pieces go by, and leave the MP3 when the next
   * piece isn't in it (so it's voiced in the browser instead).
   */
  function trackPremade() {
    const audio = audioRef.current;
    if (!audio || modeRef.current !== "premade" || statusRef.current !== "playing") return;
    const premade = premadeRef.current;
    let i = posRef.current;
    while (premade[i] && audio.currentTime >= premade[i]!.end - 0.02) {
      const next = premade[i + 1];
      if (next && Math.abs(next.start - premade[i]!.end) < 0.01) {
        i++;
        posRef.current = loadedRef.current = i;
        highlight(itemsRef.current[i].block);
        prefetch(i);
      } else {
        audio.pause();
        void playFrom(i + 1);
        return;
      }
    }
  }

  function play() {
    const audio = audioRef.current;
    if (!audio) return;
    if (loadedRef.current === posRef.current && audio.src && !audio.ended) {
      // Resume where it paused.
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

  /** Stops what's playing and forgets queued audio, before playing from somewhere else. */
  function interrupt() {
    tokenRef.current++;
    audioRef.current?.pause();
    discardQueued();
    loadedRef.current = -1;
  }

  function jumpToBlock(block: number) {
    const starts = blockStartRef.current;
    if (!Number.isFinite(block) || starts.length === 0) return;
    const b = Math.max(0, Math.min(starts.length - 1, block));
    const wasActive = statusRef.current === "playing" || statusRef.current === "buffering";
    interrupt();
    posRef.current = starts[b];
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
      // The MP3 lives on another origin; this site is cross-origin isolated, so it must load via CORS.
      audio.crossOrigin = "anonymous";
      audio.preload = "auto";
      audio.onended = () => {
        if (statusRef.current === "playing") void playFrom(posRef.current + 1);
      };
      audio.ontimeupdate = trackPremade;
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
    setStatusBoth("buffering");

    const token = ++tokenRef.current;
    await mapPremade(prefs.voice);
    if (token !== tokenRef.current) return;
    // Warm up the in-browser voice now if any piece will need it.
    if (premadeRef.current.some((r) => !r)) engine();
    void playFrom(posRef.current);
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
    if (audioRef.current) audioRef.current.playbackRate = audioRef.current.defaultPlaybackRate = value;
  }

  async function changeVoice(id: VoiceId) {
    setVoice(id);
    prefsRef.current = { ...prefsRef.current, voice: id };
    savePrefs(prefsRef.current);
    const wasActive = statusRef.current === "playing" || statusRef.current === "buffering";
    interrupt();
    const token = tokenRef.current;
    await mapPremade(id);
    if (token !== tokenRef.current) return;
    if (premadeRef.current.some((r) => !r)) engine();
    if (wasActive) void playFrom(posRef.current);
  }

  // While playing the MP3, follow along every frame (timeupdate covers background tabs).
  useEffect(() => {
    if (status !== "playing") return;
    let frame = requestAnimationFrame(function tick() {
      trackPremade();
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  });

  // While open, clicking a paragraph reads from there.
  const clickRef = useRef<(target: HTMLElement) => void>(() => {});
  clickRef.current = (target) => {
    if (target.closest(INTERACTIVE) || window.getSelection()?.toString()) return;
    const block = elementsRef.current.findIndex((el) => el.contains(target));
    if (block < 0 || statusRef.current === "error") return;
    interrupt();
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
  const waitingOnEngine = status === "buffering" && modeRef.current !== "premade" && engineRef.current && !engineReady;
  const statusText =
    status === "buffering"
      ? waitingOnEngine
        ? progress > 0 && progress < 1
          ? `Downloading voice (first time only)… ${Math.round(progress * 100)}%`
          : "Loading voice…"
        : "Preparing audio…"
      : status === "error"
        ? `Voice unavailable: ${error}`
        : null;

  return (
    <>
      <button
        type="button"
        onClick={() => (open ? (active ? pause() : play()) : void openPlayer())}
        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium hover:bg-surface-2"
      >
        <SpeakerIcon />
        {!open ? "Listen to this lesson" : active ? "Pause" : "Resume"}
      </button>

      {open && (
        <div
          role="region"
          aria-label="Read aloud player"
          className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-2 shadow-lg">
            {waitingOnEngine && (
              <div className="mx-1 mb-2 h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <IconButton label="Previous paragraph" onClick={() => jumpToBlock((itemsRef.current[posRef.current]?.block ?? 0) - 1)}>
                  <PrevIcon />
                </IconButton>
                <button
                  type="button"
                  onClick={active ? pause : play}
                  disabled={status === "error"}
                  aria-label={active ? "Pause" : "Play"}
                  className="flex size-11 items-center justify-center rounded-full bg-accent text-white disabled:opacity-50 dark:text-bg"
                >
                  {status === "buffering" ? <Spinner /> : active ? <PauseIcon /> : <PlayIcon />}
                </button>
                <IconButton label="Next paragraph" onClick={() => jumpToBlock((itemsRef.current[posRef.current]?.block ?? -1) + 1)}>
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
                onChange={(e) => isVoiceId(e.target.value) && void changeVoice(e.target.value)}
                className="min-h-10 w-32 rounded-lg border border-border bg-surface px-2 text-sm sm:w-48"
              >
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                    {lessonAudio?.voice === v.id ? " · instant" : ""}
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
