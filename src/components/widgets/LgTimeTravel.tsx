"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Values = { topic?: string; joke?: string; explanation?: string };
type Checkpoint = {
  id: string;
  parent: string | null;
  step: number;
  source: "input" | "loop" | "update";
  values: Values;
  next: string[];
};

const JOKES: Record<string, string[]> = {
  pizza: ["Why did the pizza see a doctor? It felt a little cheesy.", "Why did the pizza go to the party? It wanted to get saucy."],
  samosa: ["Why was the samosa so calm? It had everything folded in.", "Why did the samosa win the debate? Its points were sharp on all three sides."],
  pasta: ["Why did the pasta break up? It felt drained.", "Why was the spaghetti late? It got tangled up."],
};
const TOPICS = Object.keys(JOKES);

const mk = (n: number) => `cp-${n.toString().padStart(2, "0")}`;

function firstRun(): Checkpoint[] {
  const [a, b, c, d] = [mk(1), mk(2), mk(3), mk(4)];
  const joke = JOKES.pizza[0];
  const explanation = `Explains the pun in: "${joke.split("?")[0]}?"`;
  return [
    { id: a, parent: null, step: -1, source: "input", values: {}, next: ["__start__"] },
    { id: b, parent: a, step: 0, source: "loop", values: { topic: "pizza" }, next: ["generate_joke"] },
    { id: c, parent: b, step: 1, source: "loop", values: { topic: "pizza", joke }, next: ["generate_explanation"] },
    { id: d, parent: c, step: 2, source: "loop", values: { topic: "pizza", joke, explanation }, next: [] },
  ];
}

export function LgTimeTravel() {
  const [cps, setCps] = useState<Checkpoint[]>(firstRun);
  const [selected, setSelected] = useState<string>("cp-02");
  const [newTopic, setNewTopic] = useState("samosa");
  const [jokeCount, setJokeCount] = useState<Record<string, number>>({ pizza: 1, samosa: 0, pasta: 0 });
  const [last, setLast] = useState<{ code: string; result: string; tone: "good" | "warn" | "neutral" }>({
    code: 'graph.invoke({"topic": "pizza"}, config)',
    result: "First run on thread-1 created 4 checkpoints.",
    tone: "neutral",
  });

  const sel = cps.find((c) => c.id === selected) ?? cps[0];
  const history = [...cps].reverse(); // get_state_history is newest first

  function replay() {
    if (sel.next.length === 0) {
      setLast({ code: `graph.invoke(None, {"configurable": {"thread_id": "thread-1", "checkpoint_id": "${sel.id}"}})`, result: "No-op: this checkpoint has no next node, so there is nothing left to run.", tone: "warn" });
      return;
    }
    const added: Checkpoint[] = [];
    let n = cps.length;
    const newId = () => mk(++n);
    let parent = sel;
    let values: Values = { ...sel.values };
    let step = sel.step;
    let counts = { ...jokeCount };
    let next = sel.next[0];
    while (next) {
      step += 1;
      if (next === "__start__") {
        values = { topic: values.topic ?? "pizza" };
        next = "generate_joke";
        const cp: Checkpoint = { id: newId(), parent: parent.id, step, source: "loop", values: { ...values }, next: [next] };
        added.push(cp); parent = cp; continue;
      }
      if (next === "generate_joke") {
        const t = values.topic ?? "pizza";
        const list = JOKES[t] ?? JOKES.pizza;
        const joke = list[(counts[t] ?? 0) % list.length];
        counts = { ...counts, [t]: (counts[t] ?? 0) + 1 };
        values = { topic: t, joke };
        next = "generate_explanation";
        const cp: Checkpoint = { id: newId(), parent: parent.id, step, source: "loop", values: { ...values }, next: [next] };
        added.push(cp); parent = cp; continue;
      }
      values = { ...values, explanation: `Explains the pun in: "${(values.joke ?? "").split("?")[0]}?"` };
      const cp: Checkpoint = { id: newId(), parent: parent.id, step, source: "loop", values: { ...values }, next: [] };
      added.push(cp); parent = cp; next = "";
    }
    setJokeCount(counts);
    setCps((c) => [...c, ...added]);
    setSelected(parent.id);
    setLast({
      code: `graph.invoke(None, {"configurable": {"thread_id": "thread-1", "checkpoint_id": "${sel.id}"}})`,
      result: `Nodes before ${sel.id} were not re-run. ${added.length} new checkpoint(s) branch off ${sel.id}. Topic used: "${parent.values.topic}".`,
      tone: "good",
    });
  }

  function fork() {
    const cp: Checkpoint = { id: mk(cps.length + 1), parent: sel.id, step: sel.step + 1, source: "update", values: { ...sel.values, topic: newTopic }, next: sel.next };
    setCps((c) => [...c, cp]);
    setSelected(cp.id);
    setLast({
      code: `fork_config = graph.update_state(<config of ${sel.id}>, {"topic": "${newTopic}"})`,
      result: `New checkpoint ${cp.id} (source "update") branches off ${sel.id}. It is now selected: replay from it to run with "${newTopic}". Replaying ${sel.id} would still use "${sel.values.topic ?? "the original input"}".`,
      tone: "good",
    });
  }

  function reset() {
    setCps(firstRun());
    setSelected("cp-02");
    setJokeCount({ pizza: 1, samosa: 0, pasta: 0 });
    setLast({ code: 'graph.invoke({"topic": "pizza"}, config)', result: "First run on thread-1 created 4 checkpoints.", tone: "neutral" });
  }

  return (
    <Widget title="Checkpoint time travel" hint="A two-node joke graph on thread-1. Pick a checkpoint from the history, then replay from it, or fork it with a different topic and replay the fork.">
      <p className="text-xs text-muted">graph.get_state_history(config): newest first, {cps.length} checkpoints</p>
      <ol className="mt-1 max-h-72 space-y-1 overflow-y-auto">
        {history.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setSelected(c.id)}
              className={`min-h-10 w-full rounded-lg border px-2 py-1 text-left text-[0.72rem] ${selected === c.id ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-2"}`}
            >
              <span className="font-mono font-semibold">{c.id}</span>
              <span className="text-muted"> · step {c.step} · {c.source} · parent {c.parent ?? "none"}</span>
              <span className="block font-mono break-words">
                next={c.next.length ? `("${c.next.join('", "')}",)` : "()"} · topic={c.values.topic ?? "—"}
                {c.values.joke ? " · joke ✓" : ""}
                {c.values.explanation ? " · explanation ✓" : ""}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-3 rounded-lg border border-border p-2 text-[0.75rem]">
        <p className="font-semibold">Selected {sel.id}: values</p>
        <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[0.7rem]">{JSON.stringify(sel.values, null, 2)}</pre>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={replay} className="min-h-10 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
          Replay from {sel.id}
        </button>
        <span className="text-xs text-muted">Fork with topic</span>
        {TOPICS.map((t) => (
          <Pill key={t} active={newTopic === t} onClick={() => setNewTopic(t)}>
            {t}
          </Pill>
        ))}
        <button type="button" onClick={fork} className="min-h-10 rounded-lg border border-accent px-3 text-sm">
          update_state on {sel.id}
        </button>
        <button type="button" onClick={reset} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
          Reset
        </button>
      </div>

      <div className={`mt-3 rounded-lg p-2 ${last.tone === "good" ? "bg-good-soft" : last.tone === "warn" ? "bg-warn-soft" : "bg-surface-2"}`}>
        <pre className="whitespace-pre-wrap break-all font-mono text-[0.7rem]">{last.code}</pre>
        <p className="mt-1 text-sm">{last.result}</p>
      </div>
    </Widget>
  );
}
