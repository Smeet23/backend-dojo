"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "invoke" | "node";
type Kv = Record<string, string>;

const Q = "What is gravity?";
const ENG = "Gravity is the force that pulls masses toward each other.";
const HIN = "गुरुत्वाकर्षण वह बल है जो द्रव्यमानों को एक-दूसरे की ओर खींचता है।";

type Snapshot = { step: string; parent: Kv; sub: Kv | null; note: string; bad?: boolean };

function run(mode: Mode, mismatch: boolean): Snapshot[] {
  const p0 = { question: Q, answer_eng: "", answer_hin: "" };
  const p1 = { ...p0, answer_eng: ENG };
  const snaps: Snapshot[] = [
    { step: "START", parent: p0, sub: null, note: "Parent state holds the question." },
    { step: "generate_answer", parent: p1, sub: null, note: "The parent model writes answer_eng." },
  ];
  if (mode === "invoke") {
    snaps.push(
      {
        step: "translate_answer (wrapper)",
        parent: p1,
        sub: { input_text: ENG, translated_text: "" },
        note: "Wrapper calls translator.invoke({\"input_text\": state[\"answer_eng\"]}). The subgraph has its own keys.",
      },
      {
        step: "subgraph: translate_text",
        parent: p1,
        sub: { input_text: ENG, translated_text: HIN },
        note: "Inside the subgraph only SubState exists. The parent's keys are invisible here.",
      },
      {
        step: "END",
        parent: { ...p1, answer_hin: HIN },
        sub: null,
        note: "Wrapper returns {\"answer_hin\": result[\"translated_text\"]}. You mapped names by hand, so they can differ freely.",
      },
    );
    return snaps;
  }
  const outKey = mismatch ? "hindi_text" : "answer_hin";
  snaps.push(
    {
      step: "translate (subgraph as node)",
      parent: p1,
      sub: mismatch ? { answer_eng: ENG, hindi_text: "" } : { answer_eng: ENG, answer_hin: "" },
      note: mismatch
        ? "Shared by name: answer_eng flows in. hindi_text isn't a parent key, so it starts private."
        : "Shared by name: answer_eng and answer_hin flow in automatically. No wrapper code.",
    },
    {
      step: "subgraph: translate_text",
      parent: p1,
      sub: { answer_eng: ENG, [outKey]: HIN },
      note: `The subgraph writes ${outKey}.`,
    },
    {
      step: "END",
      parent: mismatch ? p1 : { ...p1, answer_hin: HIN },
      sub: null,
      note: mismatch
        ? "hindi_text isn't a parent key, so it's dropped silently. answer_hin stays empty and nothing raises."
        : "Shared key answer_hin flows back to the parent (through the parent's reducer, here plain overwrite).",
      bad: mismatch,
    },
  );
  return snaps;
}

function StateBox({ title, kv, tone }: { title: string; kv: Kv | null; tone: string }) {
  return (
    <div className={`min-w-0 rounded-lg border p-2 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      {kv ? (
        <ul className="mt-1 space-y-1 font-mono text-[0.72rem]">
          {Object.entries(kv).map(([k, v]) => (
            <li key={k} className="break-words">
              <span className="text-accent">{k}</span>: {v ? `"${v.length > 46 ? v.slice(0, 46) + "…" : v}"` : <span className="text-muted">&quot;&quot;</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-muted">not running</p>
      )}
    </div>
  );
}

export function LgSubgraphStateLab() {
  const [mode, setMode] = useState<Mode>("invoke");
  const [mismatch, setMismatch] = useState(false);
  const [pos, setPos] = useState(0);

  const snaps = run(mode, mismatch);
  const s = snaps[Math.min(pos, snaps.length - 1)];

  return (
    <Widget title="Separate vs shared state" hint="Step through the answer-then-translate graph in both wiring styles. In shared mode, rename the subgraph's output key and watch the answer vanish.">
      <div className="flex flex-wrap gap-2">
        <Pill active={mode === "invoke"} onClick={() => { setMode("invoke"); setPos(0); }}>Invoke from a node</Pill>
        <Pill active={mode === "node"} onClick={() => { setMode("node"); setPos(0); }}>Subgraph as node</Pill>
      </div>
      {mode === "node" && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Pill active={mismatch} onClick={() => { setMismatch((v) => !v); setPos(0); }}>
            Subgraph output key: {mismatch ? "hindi_text" : "answer_hin"}
          </Pill>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        {snaps.map((sn, i) => (
          <span key={sn.step} className={`rounded-md border px-2 py-1 font-mono text-[0.7rem] ${i === pos ? "border-accent bg-accent text-white dark:text-bg" : i < pos ? "border-accent" : "border-border text-muted"}`}>
            {sn.step}
          </span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <StateBox title="Parent state" kv={s.parent} tone={s.bad ? "border-bad bg-bad-soft" : "border-border"} />
        <StateBox title={mode === "invoke" ? "Subgraph state (SubState)" : "Subgraph state (TranslateState)"} kv={s.sub} tone={s.sub ? "border-accent bg-accent-soft" : "border-dashed border-border"} />
      </div>

      <p className={`mt-3 rounded-lg p-2 text-sm ${s.bad ? "bg-bad-soft" : "bg-surface-2"}`}>{s.note}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={pos === 0} onClick={() => setPos((p) => p - 1)} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-40">
          Back
        </button>
        <button
          type="button"
          disabled={pos >= snaps.length - 1}
          onClick={() => setPos((p) => p + 1)}
          className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
        >
          Next step
        </button>
      </div>
    </Widget>
  );
}
