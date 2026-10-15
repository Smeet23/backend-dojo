"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { UIMessage } from "ai";
import type { UseChatHelpers } from "@ai-sdk/react";
import { Markdown } from "./Markdown";
import { ErrorNote } from "./AiGate";

export function messageText(m: UIMessage): string {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

/** useChat surfaces the server's error body as the message; show its `error` field when it's JSON. */
export function chatError(error: Error | undefined): string {
  if (!error) return "";
  try {
    const parsed = JSON.parse(error.message);
    if (typeof parsed.error === "string") return parsed.error;
  } catch {}
  return error.message || "Something went wrong. Try again.";
}

type Props = {
  chat: UseChatHelpers<UIMessage>;
  /** Sends a user message with whatever extra body the caller needs. */
  send: (text: string) => void;
  placeholder: string;
  /** Hide these user messages (e.g. the automatic "start the interview" kickoff). */
  hiddenUserTexts?: string[];
  labels?: { user: string; assistant: string };
  empty?: ReactNode;
  footer?: ReactNode;
};

export function ChatView({ chat, send, placeholder, hiddenUserTexts = [], labels = { user: "You", assistant: "Tutor" }, empty, footer }: Props) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const busy = chat.status === "submitted" || chat.status === "streaming";
  const visible = chat.messages.filter((m) => !(m.role === "user" && hiddenUserTexts.includes(messageText(m))));

  // Keep the newest message in view while it streams, without yanking the page on first render.
  const count = chat.messages.length;
  useEffect(() => {
    if (count > 0) endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [count, chat.status]);

  function submit() {
    const text = input.trim();
    if (!text || busy) return;
    send(text);
    setInput("");
  }

  return (
    <div>
      {visible.length === 0 && empty}
      <div className="space-y-3">
        {visible.map((m) => (
          <div key={m.id} className={m.role === "user" ? "ml-6 rounded-lg bg-accent-soft px-3 py-2 sm:ml-12" : "mr-2 rounded-lg border border-border bg-surface px-3 py-2"}>
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-muted">{m.role === "user" ? labels.user : labels.assistant}</p>
            {m.role === "user" ? <p className="whitespace-pre-wrap text-sm">{messageText(m)}</p> : <Markdown>{messageText(m)}</Markdown>}
          </div>
        ))}
        {chat.status === "submitted" && <p className="px-1 text-sm text-muted">Thinking…</p>}
      </div>
      {chat.error && <ErrorNote error={chatError(chat.error)} />}
      <div ref={endRef} />
      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          maxLength={4000}
          placeholder={placeholder}
          className="min-h-11 flex-1 resize-y rounded-lg border border-border bg-surface px-3 py-2 text-base sm:text-sm"
        />
        {busy ? (
          <button type="button" onClick={() => chat.stop()} className="min-h-11 rounded-lg border border-border px-4 text-sm font-medium">
            Stop
          </button>
        ) : (
          <button type="button" onClick={submit} disabled={!input.trim()} className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-40 dark:text-bg">
            Send
          </button>
        )}
      </div>
      {footer}
    </div>
  );
}
