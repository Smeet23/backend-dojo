"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Chunk = { id: string; title: string; grade: number };

const START: Chunk[] = [
  { id: "c1", title: "Amenities overview", grade: 1 },
  { id: "c2", title: "Pool rules (2 guests max)", grade: 3 },
  { id: "c3", title: "Parking and garage", grade: 0 },
  { id: "c4", title: "Guest policy (all areas)", grade: 2 },
  { id: "c5", title: "Gym hours", grade: 0 },
  { id: "c6", title: "Lease renewal FAQ", grade: 0 },
];

const GRADE_NAME = ["irrelevant", "somewhat", "relevant", "highly"];
const GRADE_TONE = ["border-border bg-surface", "border-warn bg-warn-soft", "border-good bg-good-soft", "border-good bg-good text-white dark:text-bg"];
const THRESHOLD = 2;

const gain = (grades: number[]) => grades.reduce((sum, g, i) => sum + g / Math.log2(i + 2), 0);

function metrics(list: Chunk[], k: number, missed: number) {
  const top = list.slice(0, k);
  const isRel = (c: Chunk) => c.grade >= THRESHOLD;
  const relInTop = top.filter(isRel).length;
  const totalRel = list.filter(isRel).length + missed;
  const firstRank = list.findIndex(isRel) + 1;
  const rr = firstRank > 0 && firstRank <= k ? 1 / firstRank : 0;
  const dcg = gain(top.map((c) => c.grade));
  const idealRetrieved = gain(list.map((c) => c.grade).sort((a, b) => b - a).slice(0, k));
  const idealAll = gain([...list.map((c) => c.grade), ...Array(missed).fill(THRESHOLD)].sort((a, b) => b - a).slice(0, k));
  return {
    relInTop,
    totalRel,
    recall: totalRel ? relInTop / totalRel : 0,
    precision: relInTop / k,
    firstRank,
    rr,
    dcg,
    idealRetrieved,
    ndcg: idealRetrieved ? dcg / idealRetrieved : 0,
    ndcgAll: idealAll ? dcg / idealAll : 0,
  };
}

const f2 = (x: number) => x.toFixed(2);

function Stat({ name, value, detail }: { name: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-surface-2 p-2">
      <p className="text-xs text-muted">{name}</p>
      <p className="font-mono text-lg font-semibold">{value}</p>
      <p className="font-mono text-[0.68rem] text-muted break-words">{detail}</p>
    </div>
  );
}

export function EvRetrievalMetricsLab() {
  const [list, setList] = useState<Chunk[]>(START);
  const [k, setK] = useState(5);
  const [missed, setMissed] = useState(1);
  const m = metrics(list, k, missed);

  const cycle = (i: number) => setList((l) => l.map((c, j) => (j === i ? { ...c, grade: (c.grade + 1) % 4 } : c)));
  const move = (i: number, d: number) =>
    setList((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const next = [...l];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <Widget
      title="Retrieval metrics lab"
      hint={`Query: "Can I bring my friend to the pool?" Tap a chunk to change its relevance grade (0 to 3), use the arrows to reorder. Grade ${THRESHOLD}+ counts as relevant for recall, precision and MRR.`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">k =</span>
        {[1, 3, 5].map((v) => (
          <Pill key={v} active={k === v} onClick={() => setK(v)}>
            {v}
          </Pill>
        ))}
        <span className="ml-2 text-sm text-muted">relevant chunks never retrieved:</span>
        {[0, 1, 2].map((v) => (
          <Pill key={v} active={missed === v} onClick={() => setMissed(v)}>
            {v}
          </Pill>
        ))}
      </div>

      <ol className="mt-3 space-y-1.5">
        {list.map((c, i) => (
          <li key={c.id} className={`flex items-center gap-2 ${i >= k ? "opacity-45" : ""}`}>
            <span className="w-5 shrink-0 text-right font-mono text-xs text-muted">{i + 1}</span>
            <button
              type="button"
              onClick={() => cycle(i)}
              className={`flex min-h-10 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm ${GRADE_TONE[c.grade]}`}
            >
              <span className="truncate">{c.title}</span>
              <span className="shrink-0 font-mono text-xs">
                {c.grade} {GRADE_NAME[c.grade]}
              </span>
            </button>
            <button type="button" aria-label="Move up" onClick={() => move(i, -1)} className="min-h-10 w-9 shrink-0 rounded-lg border border-border">
              ↑
            </button>
            <button type="button" aria-label="Move down" onClick={() => move(i, 1)} className="min-h-10 w-9 shrink-0 rounded-lg border border-border">
              ↓
            </button>
          </li>
        ))}
      </ol>
      {k < list.length && <p className="mt-1 text-xs text-muted">Faded rows are outside the top {k} and do not count.</p>}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat name={`Recall@${k}`} value={f2(m.recall)} detail={`${m.relInTop} found / ${m.totalRel} relevant`} />
        <Stat name={`Precision@${k}`} value={f2(m.precision)} detail={`${m.relInTop} relevant / ${k} shown`} />
        <Stat name="Reciprocal rank" value={f2(m.rr)} detail={m.rr ? `first relevant at rank ${m.firstRank}` : "none in top k"} />
        <Stat name={`NDCG@${k}`} value={f2(m.ndcg)} detail={`DCG ${f2(m.dcg)} / ideal ${f2(m.idealRetrieved)}`} />
      </div>
      <p className="mt-2 text-xs text-muted">
        NDCG above uses the notes&apos; convention: the ideal is the same retrieved chunks in the best order, so it only judges ordering. If the ideal also
        includes the {missed} relevant chunk{missed === 1 ? "" : "s"} the retriever missed (grade {THRESHOLD}), NDCG@{k} is{" "}
        <span className="font-mono font-semibold text-accent">{f2(m.ndcgAll)}</span>.
      </p>
      <button type="button" onClick={() => setList(START)} className="mt-3 min-h-10 w-full rounded-lg border border-border px-3 text-sm">
        Reset order and grades
      </button>
    </Widget>
  );
}
