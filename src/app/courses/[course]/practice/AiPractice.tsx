"use client";

import { useEffect, useState } from "react";
import type { Question } from "@/lib/types";
import { getJson, postJson } from "@/lib/ai-client";
import { pickWeighted } from "@/lib/quiz";
import { useProgress } from "@/lib/progress";
import { AiBadge, AiGate, ErrorNote } from "@/components/ai/AiGate";
import { Quiz } from "@/components/quiz/Quiz";

type Props = { courseId: string; lectures: { id: number; title: string }[]; lectureSlugs: Record<string, string> };
type Generated = { questions: Question[]; focus: { id: number; title: string }[] };

/** Fresh AI-written questions on weak spots or a chosen lecture, plus replays of earlier ones. */
export function AiPractice(props: Props) {
  return (
    <section className="mt-12">
      <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        New questions <AiBadge />
      </h2>
      <p className="mb-4 mt-1 text-sm text-muted">
        The AI writes new scenarios from the lessons, aimed at the topics you miss most, so you aren&apos;t just memorising the same questions.
      </p>
      <AiGate what="AI practice questions">
        <AiPracticeInner {...props} />
      </AiGate>
    </section>
  );
}

function AiPracticeInner({ courseId, lectures, lectureSlugs }: Props) {
  const progress = useProgress();
  const [focus, setFocus] = useState("weak");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Question[] | null>(null);
  const [round, setRound] = useState<{ n: number; title: string; questions: Question[] } | null>(null);

  useEffect(() => {
    let live = true;
    getJson<Question[]>(`/api/ai/practice?course=${courseId}`).then((r) => live && r.ok && setSaved(r.data));
    return () => {
      live = false;
    };
  }, [courseId]);

  async function generate() {
    setBusy(true);
    setError("");
    const res = await postJson<Generated>("/api/ai/practice", { courseId, lectureId: focus === "weak" ? null : Number(focus), count: 5 });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setSaved((s) => [...res.data.questions, ...(s ?? [])]);
    setRound((r) => ({ n: (r?.n ?? 0) + 1, title: `New: ${res.data.focus.map((f) => f.title).join(", ")}`, questions: res.data.questions }));
  }

  function replay() {
    if (!saved?.length) return;
    setRound((r) => ({ n: (r?.n ?? 0) + 1, title: "AI question replay", questions: pickWeighted(saved, progress.misses, 10) }));
  }

  if (round) {
    return (
      <div>
        <Quiz key={round.n} questions={round.questions} courseId={courseId} lectureSlugs={lectureSlugs} title={round.title} onRestart={() => setRound(null)} />
        <button type="button" onClick={() => setRound(null)} className="mt-3 text-sm text-muted hover:text-text">
          ← Back to AI practice
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <label className="block text-sm font-medium">
        Focus
        <select value={focus} onChange={(e) => setFocus(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base sm:text-sm">
          <option value="weak">My weak spots (most-missed topics)</option>
          {lectures.map((l) => (
            <option key={l.id} value={l.id}>
              Lecture {l.id}: {l.title}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="mt-3 min-h-11 w-full rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
      >
        {busy ? "Writing questions… (10-30s)" : "Write 5 new questions"}
      </button>
      {error && <ErrorNote error={error} />}
      {saved && saved.length > 0 && (
        <button type="button" onClick={replay} className="mt-2 min-h-11 w-full rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface-2">
          Replay earlier AI questions ({saved.length} saved)
        </button>
      )}
    </div>
  );
}
