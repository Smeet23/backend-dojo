"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Saver = "none" | "memory" | "sqlite";
type Crash = "exception" | "killed";
const STEPS = ["step_1", "step_2", "step_3"] as const;

const SAVER_LABEL: Record<Saver, string> = { none: "No checkpointer", memory: "InMemorySaver", sqlite: "SqliteSaver" };
const CRASH_LABEL: Record<Crash, string> = { exception: "Node raises (process lives)", killed: "Process killed (OOM, redeploy)" };

type Sim = {
  /** Index of the next step to run per the saved checkpoint; null when nothing is saved. */
  saved: number | null;
  done: Record<string, boolean>;
  runs: Record<string, number>;
  log: { text: string; tone: "good" | "warn" | "bad" | "neutral" }[];
};

const fresh = (): Sim => ({ saved: null, done: {}, runs: { step_1: 0, step_2: 0, step_3: 0 }, log: [] });

export function LgCrashResume() {
  const [saver, setSaver] = useState<Saver>("memory");
  const [crash, setCrash] = useState<Crash>("exception");
  const [sim, setSim] = useState<Sim>(fresh);

  function execute(s: Sim, from: number, crashAt2: boolean): Sim {
    const runs = { ...s.runs };
    const done = { ...s.done };
    const log = [...s.log];
    let saved: number | null = saver === "none" ? null : from;
    for (let i = from; i < STEPS.length; i++) {
      const name = STEPS[i];
      runs[name] += 1;
      if (crashAt2 && name === "step_2") {
        log.push({ text: `${name} started… crashed`, tone: "bad" });
        if (saver === "memory" && crash === "killed") {
          saved = null;
          log.push({ text: "Process died: InMemorySaver's checkpoints were in its RAM and are gone", tone: "bad" });
        }
        return { saved, done, runs, log };
      }
      done[name] = true;
      log.push({ text: `${name} finished${saver === "none" ? "" : ", checkpoint saved"}`, tone: "neutral" });
      if (saver !== "none") saved = i + 1;
    }
    log.push({ text: "Reached END", tone: "good" });
    return { saved: saver === "none" ? null : STEPS.length, done, runs, log };
  }

  const runWithCrash = () => setSim(() => execute({ ...fresh(), log: [{ text: 'invoke({"input": "start"}, config)', tone: "neutral" }] }, 0, true));

  const resume = () =>
    setSim((s) => {
      const log = [...s.log, { text: "invoke(None, config)  # resume", tone: "neutral" as const }];
      if (s.saved === null) {
        return { ...s, log: [...log, { text: "Nothing to resume: no saved checkpoint for this thread. You'd have to start over.", tone: "bad" as const }] };
      }
      if (s.saved >= STEPS.length) return { ...s, log: [...log, { text: "Already at END: nothing left to run.", tone: "warn" as const }] };
      return execute({ ...s, log }, s.saved, false);
    });

  const rerun = () => setSim((s) => execute({ ...s, done: {}, log: [...s.log, { text: 'invoke({"input": "start"}, config)  # start over', tone: "neutral" as const }] }, 0, false));

  return (
    <Widget title="Crash, then resume" hint="A three-step workflow crashes during step_2. Choose a checkpointer and a kind of crash, then try to resume. Watch how many times each step runs.">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SAVER_LABEL) as Saver[]).map((k) => (
          <Pill key={k} active={saver === k} onClick={() => { setSaver(k); setSim(fresh()); }}>
            {SAVER_LABEL[k]}
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {(Object.keys(CRASH_LABEL) as Crash[]).map((k) => (
          <Pill key={k} active={crash === k} onClick={() => { setCrash(k); setSim(fresh()); }}>
            {CRASH_LABEL[k]}
          </Pill>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {STEPS.map((name) => (
          <div key={name} className={`min-w-0 rounded-lg border p-2 text-center text-[0.75rem] ${sim.done[name] ? "border-good bg-good-soft" : "border-border"}`}>
            <p className="font-mono font-semibold break-all">{name}</p>
            <p className="text-muted">ran {sim.runs[name]}×</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={runWithCrash} className="min-h-10 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
          Run (crashes in step_2)
        </button>
        <button type="button" onClick={resume} className="min-h-10 rounded-lg border border-accent px-3 text-sm">
          Resume with invoke(None)
        </button>
        <button type="button" onClick={rerun} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
          Start over
        </button>
        <button type="button" onClick={() => setSim(fresh())} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
          Reset
        </button>
      </div>

      <ol className="mt-3 space-y-1">
        {sim.log.map((l, i) => (
          <li key={i} className={`rounded px-2 py-1 font-mono text-[0.7rem] break-words ${l.tone === "good" ? "bg-good-soft" : l.tone === "warn" ? "bg-warn-soft" : l.tone === "bad" ? "bg-bad-soft" : "bg-surface-2"}`}>
            {l.text}
          </li>
        ))}
      </ol>
    </Widget>
  );
}
