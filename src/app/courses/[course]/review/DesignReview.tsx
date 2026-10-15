"use client";

import { useState } from "react";
import type { AiReport, Review } from "@/lib/ai-schemas";
import { postJson } from "@/lib/ai-client";
import { AiGate, ErrorNote } from "@/components/ai/AiGate";
import { LecturePicker, PastReports, ReviewView, type LectureOption } from "@/components/ai/Reports";

type Props = { courseId: string; lectures: LectureOption[] };

export function DesignReview(props: Props) {
  return (
    <AiGate what="Design reviews">
      <ReviewForm {...props} />
    </AiGate>
  );
}

function ReviewForm({ courseId, lectures }: Props) {
  const [title, setTitle] = useState("");
  const [design, setDesign] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [saved, setSaved] = useState(0);

  async function submit() {
    setBusy(true);
    setError("");
    const res = await postJson<AiReport>("/api/ai/review", { courseId, lectureIds: picked, title: title.trim() || "Untitled design", design });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    if (res.data.kind === "review") setReview(res.data.data);
    setSaved((n) => n + 1);
  }

  return (
    <div>
      <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
        <label className="block text-sm font-medium">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="e.g. Order service with payment webhooks"
            className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base sm:text-sm"
          />
        </label>
        <label className="block text-sm font-medium">
          Your design or code
          <textarea
            value={design}
            onChange={(e) => setDesign(e.target.value)}
            rows={12}
            maxLength={20000}
            placeholder={"Describe the components, APIs, data model and flows — or paste code.\n\nThe more concrete (endpoints, tables, failure handling), the sharper the review."}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[0.85rem] leading-relaxed"
          />
          <span className="text-xs font-normal text-muted">{design.length.toLocaleString()} / 20,000</span>
        </label>
        <LecturePicker lectures={lectures} selected={picked} onChange={setPicked} />
        <button
          type="button"
          onClick={submit}
          disabled={busy || design.trim().length < 80}
          className="min-h-11 w-full rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
        >
          {busy ? "Reviewing… (10-40s)" : design.trim().length < 80 ? "Write at least a few sentences" : "Review my design"}
        </button>
        {error && <ErrorNote error={error} />}
      </div>

      {review && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-lg font-semibold">Review</h2>
          <ReviewView data={review} courseId={courseId} lectures={lectures} />
        </div>
      )}

      <PastReports courseId={courseId} kind="review" lectures={lectures} refresh={saved} />
    </div>
  );
}
