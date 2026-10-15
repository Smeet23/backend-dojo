"use client";

import { useSyncStatus } from "./progress";

/** AI features need the passcode session; while unknown ("loading") they stay hidden. */
export function useAiStatus(): "ready" | "locked" | "loading" {
  const status = useSyncStatus();
  if (status === "loading") return "loading";
  return status === "locked" ? "locked" : "ready";
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function errorOf(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  if (body && typeof body.error === "string") return body.error;
  return res.status === 504 ? "The AI took too long. Try again." : `Request failed (${res.status})`;
}

export async function postJson<T>(url: string, body: unknown): Promise<Result<T>> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) return { ok: false, error: await errorOf(res) };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again." };
  }
}

export async function getJson<T>(url: string): Promise<Result<T>> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { ok: false, error: await errorOf(res) };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again." };
  }
}

/** POSTs and calls `onText` with the growing text of a plain-text stream. */
export async function streamText(url: string, body: unknown, onText: (text: string) => void): Promise<Result<string>> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok || !res.body) return { ok: false, error: await errorOf(res) };
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += value;
      onText(text);
    }
    if (!text.trim()) return { ok: false, error: "The AI returned nothing. Try again." };
    return { ok: true, data: text };
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again." };
  }
}
