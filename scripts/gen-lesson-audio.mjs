// Pre-makes read-aloud audio: one MP3 per lesson in the default voice, uploaded to Vercel Blob,
// plus src/content/generated/read-aloud.json (where each piece starts and ends in it). The player
// plays these instantly and only generates audio in the browser for pieces missing here
// (e.g. a paragraph edited since the last run). Design: docs/plans/2026-11-16-read-aloud-design.md
//
// Usage (needs the built site running, ffmpeg, and BLOB_READ_WRITE_TOKEN from `vercel env pull`):
//   pnpm build && pnpm start -p 3917 &
//   node --env-file=.env.local scripts/gen-lesson-audio.mjs [--base http://localhost:3917]
//        [--only course/slug] [--workers 3] [--dry-run]
// Unchanged lessons are skipped, so re-running after editing lessons only redoes those.
import { fork, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { audioKey, PREMADE_VOICE } from "../src/lib/read-aloud.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestFile = path.join(root, "src", "content", "generated", "read-aloud.json");
const lessonTextFile = path.join(root, "src", "content", "generated", "lesson-text.json");

const SAMPLE_RATE = 24000;
/** Pauses inserted between pieces of one block, and between blocks (seconds). */
const PIECE_GAP = 0.12;
const BLOCK_GAP = 0.45;
const BITRATE = "40k";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
}

if (process.argv.includes("--worker")) await worker();
else await main();

// ---------------------------------------------------------------------------------------------

async function main() {
  const base = arg("base", "http://localhost:3917");
  const only = arg("only", "");
  const workers = Number(arg("workers", "3"));
  const dryRun = process.argv.includes("--dry-run");
  if (!dryRun && !process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN missing: run with --env-file=.env.local");

  const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")) : {};
  const keys = Object.keys(JSON.parse(readFileSync(lessonTextFile, "utf8"))).filter((k) => !only || k === only);

  // 1. Split every lesson exactly as the player will: in a real browser, with the same helper code.
  // (Some lessons stream their content as data the browser renders, so their HTML alone isn't enough.)
  const { chromium } = await import("playwright-core");
  const { stripTypeScriptTypes } = await import("node:module");
  const helpers = stripTypeScriptTypes(readFileSync(path.join(root, "src", "lib", "read-aloud.ts"), "utf8")).replace(/^export\s+/gm, "");
  // Uses the installed Google Chrome, falling back to a Playwright-managed Chromium.
  const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
  const page = await browser.newPage();
  const jobs = [];
  let seconds = 0;
  for (const key of keys) {
    const res = await page.goto(`${base}/courses/${key}`, { waitUntil: "load" });
    if (!res?.ok()) {
      console.warn(`skip ${key}: HTTP ${res?.status()}`);
      continue;
    }
    await page.waitForSelector("[data-read-root] .lesson", { timeout: 15000 }).catch(() => {});
    const blocks = await page.evaluate((src) => {
      const collect = new Function(`${src}\nreturn collectBlocks;`)();
      const readRoot = document.querySelector("[data-read-root]");
      return readRoot ? collect(readRoot).map((b) => b.chunks) : null;
    }, helpers);
    if (!blocks) {
      console.warn(`skip ${key}: no [data-read-root] (private course?)`);
      continue;
    }
    const items = [];
    for (const [block, chunks] of blocks.entries())
      for (const text of chunks) items.push({ block, text, key: await audioKey(PREMADE_VOICE, text) });
    const known = manifest[key];
    const same = known?.voice === PREMADE_VOICE && known.items.length === items.length && known.items.every((it, i) => it[0] === items[i].key);
    if (same) continue;
    seconds += items.reduce((n, it) => n + it.text.length, 0) / 15;
    jobs.push({ lesson: key, items });
  }
  await browser.close();
  // Lessons that no longer exist drop out of the manifest.
  for (const key of Object.keys(manifest)) if (!only && !keys.includes(key)) delete manifest[key];

  console.log(`${jobs.length} lesson(s) to voice, ~${(seconds / 3600).toFixed(1)} h of audio`);
  if (dryRun || jobs.length === 0) {
    if (!dryRun) save(manifest);
    return;
  }

  // 2. Voice them in parallel worker processes, saving the manifest as each lesson lands.
  const started = Date.now();
  let done = 0;
  await Promise.all(
    Array.from({ length: Math.min(workers, jobs.length) }, () => {
      const child = fork(fileURLToPath(import.meta.url), ["--worker"], { stdio: ["inherit", "inherit", "inherit", "ipc"] });
      return new Promise((resolve, reject) => {
        let finished = false;
        const next = () => {
          const job = jobs.shift();
          if (job) return child.send(job);
          finished = true;
          child.disconnect();
        };
        child.on("message", (msg) => {
          if (msg.error) {
            console.error(`✗ ${msg.lesson}: ${msg.error}`);
          } else {
            manifest[msg.lesson] = msg.entry;
            save(manifest);
            done++;
            const mins = ((Date.now() - started) / 60000).toFixed(1);
            console.log(`✓ ${msg.lesson} (${done} done, ${jobs.length} queued, ${mins} min)`);
          }
          next();
        });
        // ONNX Runtime can crash while shutting down; once a worker's queue is empty that's harmless.
        child.on("exit", (code, signal) => (finished || code === 0 ? resolve() : reject(new Error(`worker exited (${code ?? signal})`))));
        child.on("error", reject);
        next();
      });
    }),
  );
}

function save(manifest) {
  const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
  writeFileSync(manifestFile, JSON.stringify(sorted) + "\n");
}

// ---------------------------------------------------------------------------------------------

async function worker() {
  const { KokoroTTS } = await import("kokoro-js");
  const { put } = await import("@vercel/blob");
  // fp32 is the reference-quality model and, on CPU, the fastest build.
  const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "fp32", device: "cpu" });

  process.on("message", async (job) => {
    try {
      process.send({ lesson: job.lesson, entry: await voiceLesson(tts, put, job) });
    } catch (err) {
      process.send({ lesson: job.lesson, error: err instanceof Error ? err.message : String(err) });
    }
  });
  process.on("disconnect", () => process.exit(0));
}

async function voiceLesson(tts, put, { lesson, items }) {
  const parts = [];
  const timings = [];
  let at = 0;
  for (let i = 0; i < items.length; i++) {
    const audio = await tts.generate(items[i].text, { voice: PREMADE_VOICE });
    if (audio.sampling_rate !== SAMPLE_RATE) throw new Error(`unexpected sample rate ${audio.sampling_rate}`);
    const last = i === items.length - 1;
    const gap = last ? 0 : items[i + 1].block !== items[i].block ? BLOCK_GAP : PIECE_GAP;
    const silence = new Float32Array(Math.round(gap * SAMPLE_RATE));
    parts.push(audio.audio, silence);
    const start = at;
    at += audio.audio.length + silence.length;
    // A piece's range runs to the next piece's start, so consecutive pieces play seamlessly.
    timings.push([items[i].key, +(start / SAMPLE_RATE).toFixed(3), +(at / SAMPLE_RATE).toFixed(3)]);
  }

  const dir = mkdtempSync(path.join(tmpdir(), "read-aloud-"));
  try {
    const wav = path.join(dir, "lesson.wav");
    const mp3 = path.join(dir, "lesson.mp3");
    writeFileSync(wav, toWav(parts, at));
    // Constant bitrate keeps seeking exact.
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", wav, "-ac", "1", "-ar", String(SAMPLE_RATE), "-c:a", "libmp3lame", "-b:a", BITRATE, mp3]);
    const bytes = readFileSync(mp3);
    const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 10);
    const blob = await put(`read-aloud/${lesson}-${PREMADE_VOICE}-${hash}.mp3`, bytes, {
      access: "public",
      contentType: "audio/mpeg",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return { voice: PREMADE_VOICE, url: blob.url, items: timings };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** 16-bit mono WAV from float sample arrays. */
function toWav(parts, length) {
  const buf = Buffer.alloc(44 + length * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + length * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(length * 2, 40);
  let o = 44;
  for (const part of parts)
    for (const s of part) {
      buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), o);
      o += 2;
    }
  return buf;
}
