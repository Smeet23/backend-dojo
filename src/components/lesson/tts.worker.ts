/// <reference lib="webworker" />
/**
 * Runs the Kokoro voice model off the main thread, so the page stays smooth while audio is
 * generated. Jobs run one at a time (the model can't run two at once); a "reset" drops every
 * queued job from before it, so jumping around the lesson doesn't wait on stale audio.
 */
import { KokoroTTS } from "kokoro-js";
import type { TtsRequest, TtsResponse } from "./tts-protocol";

const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";

const scope = self as unknown as DedicatedWorkerGlobalScope;
const post = (msg: TtsResponse) => scope.postMessage(msg);

let model: Promise<KokoroTTS> | null = null;
let epoch = 0;
let queue: Promise<void> = Promise.resolve();

function load(): Promise<KokoroTTS> {
  model ??= KokoroTTS.from_pretrained(MODEL, {
    dtype: "q8",
    device: "wasm",
    progress_callback: (p) => {
      // Only the model weights are big enough to be worth a progress bar.
      if (p.status === "progress" && p.file.endsWith(".onnx")) post({ type: "progress", loaded: p.loaded, total: p.total });
    },
  }).catch((err: unknown) => {
    model = null;
    throw err;
  });
  return model;
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

scope.onmessage = (e: MessageEvent<TtsRequest>) => {
  const req = e.data;
  if (req.type === "load") {
    load().then(
      () => post({ type: "ready" }),
      (err) => post({ type: "load-error", message: message(err) }),
    );
  } else if (req.type === "reset") {
    epoch = req.epoch;
  } else {
    queue = queue.then(async () => {
      if (req.epoch < epoch) return post({ type: "skipped", id: req.id });
      try {
        const tts = await load();
        const audio = await tts.generate(req.text, { voice: req.voice });
        post({ type: "audio", id: req.id, wav: audio.toBlob() });
      } catch (err) {
        post({ type: "error", id: req.id, message: message(err) });
      }
    });
  }
};
