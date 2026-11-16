import type { VoiceId } from "@/lib/read-aloud";

/** Messages between the read-aloud player and its voice worker. */
export type TtsRequest =
  | { type: "load" }
  | { type: "reset"; epoch: number }
  | { type: "generate"; id: number; epoch: number; text: string; voice: VoiceId };

export type TtsResponse =
  | { type: "progress"; loaded: number; total: number }
  | { type: "ready" }
  | { type: "load-error"; message: string }
  | { type: "audio"; id: number; wav: Blob }
  | { type: "skipped"; id: number }
  | { type: "error"; id: number; message: string };
