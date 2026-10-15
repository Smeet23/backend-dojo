"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AiBadge, AiGate } from "./AiGate";
import { ChatView } from "./ChatView";

const QUICK = [
  "Explain this lesson simply, like I'm new to it",
  "Give me a real-world example from a well-known product",
  "How is this asked in interviews? Give me 3 questions",
  "Summarise this lesson as 8 flashcards",
  "How does this connect to the other courses?",
];

/** "Ask about this lesson": a chat grounded in the lesson on this page. */
export function LessonTutor({ courseId, slug }: { courseId: string; slug: string }) {
  const [open, setOpen] = useState(false);
  return (
    <AiGate quiet>
      <section className="mt-12 rounded-xl border border-border bg-surface">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-h-12 w-full items-center justify-between gap-2 px-4 text-left"
        >
          <span className="flex items-center gap-2 font-semibold">
            💬 Ask about this lesson <AiBadge />
          </span>
          <span className="text-muted">{open ? "−" : "+"}</span>
        </button>
        {open && (
          <div className="border-t border-border px-4 py-4">
            <TutorChat courseId={courseId} slug={slug} />
          </div>
        )}
      </section>
    </AiGate>
  );
}

function TutorChat({ courseId, slug }: { courseId: string; slug: string }) {
  const chat = useChat({ transport: new DefaultChatTransport({ api: "/api/ai/tutor" }) });
  const send = (text: string) => chat.sendMessage({ text }, { body: { courseId, slug } });
  const busy = chat.status === "submitted" || chat.status === "streaming";

  return (
    <ChatView
      chat={chat}
      send={send}
      placeholder="Ask anything about this lesson…"
      empty={<p className="mb-3 text-sm text-muted">Answers are based on this lesson. Try one of these, or ask your own:</p>}
      footer={
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              disabled={busy}
              onClick={() => send(q)}
              className="min-h-9 rounded-full border border-border px-3 text-xs hover:bg-surface-2 disabled:opacity-40"
            >
              {q}
            </button>
          ))}
          {chat.messages.length > 0 && !busy && (
            <button type="button" onClick={() => chat.setMessages([])} className="min-h-9 px-2 text-xs text-muted hover:text-text">
              Clear chat
            </button>
          )}
        </div>
      }
    />
  );
}
