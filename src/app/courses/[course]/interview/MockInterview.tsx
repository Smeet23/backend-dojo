"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { AiReport, Scorecard } from "@/lib/ai-schemas";
import { postJson } from "@/lib/ai-client";
import { AiGate, ErrorNote } from "@/components/ai/AiGate";
import { ChatView } from "@/components/ai/ChatView";
import { LecturePicker, PastReports, ScorecardView, type LectureOption } from "@/components/ai/Reports";

const KICKOFF = "Hi, I'm ready. Please start the interview.";
type Mode = "concepts" | "design";
type Props = { courseId: string; lectures: LectureOption[]; designFirst: boolean };

export function MockInterview(props: Props) {
  return (
    <AiGate what="Mock interviews">
      <Interview {...props} />
    </AiGate>
  );
}

function Interview({ courseId, lectures, designFirst }: Props) {
  const [mode, setMode] = useState<Mode>(designFirst ? "design" : "concepts");
  const [picked, setPicked] = useState<number[]>([]);
  const [phase, setPhase] = useState<"setup" | "live" | "done">("setup");
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(0);
  const chat = useChat({ transport: new DefaultChatTransport({ api: "/api/ai/interview" }) });

  const setup = { courseId, lectureIds: picked, mode };
  const send = (text: string) => chat.sendMessage({ text }, { body: setup });
  const answered = chat.messages.filter((m) => m.role === "user").length - 1;
  const busy = chat.status === "submitted" || chat.status === "streaming";

  function start() {
    chat.setMessages([]);
    setScorecard(null);
    setError("");
    setPhase("live");
    send(KICKOFF);
  }

  function title() {
    const what = picked.length === 0 ? "whole course" : picked.length <= 2 ? picked.map((id) => lectures.find((l) => l.id === id)?.title).join(", ") : `${picked.length} lectures`;
    return `${mode === "design" ? "System design" : "Concepts"} · ${what}`;
  }

  async function finish() {
    setScoring(true);
    setError("");
    const res = await postJson<AiReport>("/api/ai/interview/score", { ...setup, title: title(), messages: chat.messages });
    setScoring(false);
    if (!res.ok) return setError(res.error);
    if (res.data.kind === "interview") setScorecard(res.data.data);
    setPhase("done");
    setSaved((n) => n + 1);
  }

  return (
    <div>
      {phase === "setup" && (
        <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
          <div className="flex rounded-lg border border-border bg-surface-2 p-1 text-sm" role="tablist">
            {(
              [
                ["concepts", "Concepts & scenarios"],
                ["design", "System design"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => setMode(value)}
                className={`min-h-9 flex-1 rounded-md px-2 font-medium ${mode === value ? "bg-surface shadow-sm" : "text-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <LecturePicker lectures={lectures} selected={picked} onChange={setPicked} />
          <button type="button" onClick={start} className="min-h-11 w-full rounded-lg bg-accent px-4 text-sm font-medium text-white dark:text-bg">
            Start interview
          </button>
        </div>
      )}

      {phase !== "setup" && (
        <div className="rounded-xl border border-border bg-surface-2/40 p-3 sm:p-4">
          <p className="mb-3 text-xs text-muted">{title()} · answer as you would out loud; one question at a time.</p>
          <ChatView
            chat={chat}
            send={send}
            placeholder={phase === "done" ? "Interview finished" : "Your answer…"}
            hiddenUserTexts={[KICKOFF]}
            labels={{ user: "You", assistant: "Interviewer" }}
          />
          {phase === "live" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={finish}
                disabled={scoring || busy || answered < 1}
                className="min-h-11 flex-1 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
              >
                {scoring ? "Scoring… (10-30s)" : answered < 1 ? "Answer a question to finish" : `End & get scorecard (${answered} answered)`}
              </button>
              <button type="button" onClick={() => setPhase("setup")} disabled={scoring} className="min-h-11 rounded-lg border border-border px-4 text-sm">
                Cancel
              </button>
            </div>
          )}
          {error && <ErrorNote error={error} />}
        </div>
      )}

      {phase === "done" && scorecard && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-lg font-semibold">Scorecard</h2>
          <ScorecardView data={scorecard} courseId={courseId} lectures={lectures} />
          <button type="button" onClick={() => setPhase("setup")} className="mt-5 min-h-11 w-full rounded-lg bg-accent px-4 text-sm font-medium text-white dark:text-bg">
            New interview
          </button>
        </div>
      )}

      <PastReports courseId={courseId} kind="interview" lectures={lectures} refresh={saved} />
    </div>
  );
}
