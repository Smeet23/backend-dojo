import type { VoiceId } from "@/lib/read-aloud";
import type { TtsRequest, TtsResponse } from "./tts-protocol";

type Job = { resolve: (wav: Blob | null) => void; reject: (err: Error) => void };

/** Main-thread handle on the voice worker: load the model once, then turn text into WAV audio. */
export class VoiceEngine {
  readonly ready: Promise<void>;
  private worker: Worker;
  private jobs = new Map<number, Job>();
  private nextId = 1;
  private epoch = 0;

  constructor(onProgress: (fraction: number) => void) {
    this.worker = new Worker(new URL("./tts.worker.ts", import.meta.url), { type: "module" });
    let markReady!: () => void;
    let failLoad!: (err: Error) => void;
    this.ready = new Promise((resolve, reject) => {
      markReady = resolve;
      failLoad = reject;
    });
    // Callers that never await `ready` shouldn't trigger an unhandled rejection.
    this.ready.catch(() => {});

    this.worker.onmessage = (e: MessageEvent<TtsResponse>) => {
      const msg = e.data;
      if (msg.type === "progress") onProgress(msg.total ? msg.loaded / msg.total : 0);
      else if (msg.type === "ready") markReady();
      else if (msg.type === "load-error") failLoad(new Error(msg.message));
      else {
        const job = this.jobs.get(msg.id);
        this.jobs.delete(msg.id);
        if (!job) return;
        if (msg.type === "audio") job.resolve(msg.wav);
        else if (msg.type === "skipped") job.resolve(null);
        else job.reject(new Error(msg.message));
      }
    };
    this.worker.onerror = (e) => {
      const err = new Error(e.message || "The voice worker crashed");
      failLoad(err);
      for (const job of this.jobs.values()) job.reject(err);
      this.jobs.clear();
    };
    this.send({ type: "load" });
  }

  private send(msg: TtsRequest) {
    this.worker.postMessage(msg);
  }

  /** WAV audio for `text`, or null if a reset() dropped the job before it ran. */
  generate(text: string, voice: VoiceId): Promise<Blob | null> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.jobs.set(id, { resolve, reject });
      this.send({ type: "generate", id, epoch: this.epoch, text, voice });
    });
  }

  /** Drops every queued job (the one already running still finishes). */
  reset() {
    this.epoch++;
    this.send({ type: "reset", epoch: this.epoch });
  }

  dispose() {
    this.worker.terminate();
    for (const job of this.jobs.values()) job.resolve(null);
    this.jobs.clear();
  }
}
