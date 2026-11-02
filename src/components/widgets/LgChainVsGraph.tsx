"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "chain" | "graph";
type NodeId = "receive_request" | "create_jd" | "review_jd" | "post_jd" | "wait_for_applicants" | "count_applications" | "revise_jd" | "shortlist" | "END";
type Tone = "neutral" | "good" | "warn" | "bad";

type Wf = { jd_version: number; approved: boolean | null; posted: boolean; applications: number | null; checks: number };
type Run = {
  at: NodeId;
  wf: Wf;
  waiting: null | "human" | "time";
  checkpoints: number;
  executions: number;
  sinceStart: number;
  wasted: number;
  llmCalls: number;
  postings: number;
  log: { text: string; tone: Tone }[];
};

const NODES: NodeId[] = ["receive_request", "create_jd", "review_jd", "post_jd", "wait_for_applicants", "count_applications", "revise_jd", "shortlist"];
const THRESHOLD = 20;
const EMPTY_WF: Wf = { jd_version: 0, approved: null, posted: false, applications: null, checks: 0 };
const START: Run = { at: "receive_request", wf: EMPTY_WF, waiting: null, checkpoints: 0, executions: 0, sinceStart: 0, wasted: 0, llmCalls: 0, postings: 0, log: [] };

const CODE: Record<Mode, string> = {
  chain: `jd = jd_chain.invoke({"request": req})        # LCEL chain
while input("Approve? y/n ") != "y":       # glue: loop + blocking input
    jd = jd_chain.invoke({"request": req, "feedback": ...})
post_jd(jd)
state = {"jd": jd, "posted": True}           # glue: hand-rolled state
time.sleep(7 * 24 * 3600)                    # glue: process must stay alive
while count_apps() < 20: ...                 # glue: another loop`,
  graph: `builder.add_edge("create_jd", "review_jd")
builder.add_conditional_edges("review_jd", route_review)   # loop back or post
builder.add_edge("post_jd", "wait_for_applicants")
builder.add_conditional_edges("count_applications", route_count)
graph = builder.compile(checkpointer=saver)  # state saved after every node
# review_jd calls interrupt(); later: graph.invoke(Command(resume=...), config)`,
};

function push(run: Run, text: string, tone: Tone = "neutral"): Run["log"] {
  return [{ text, tone }, ...run.log].slice(0, 9);
}

function step(run: Run, mode: Mode): Run {
  if (run.waiting || run.at === "END") return run;
  const r: Run = { ...run, wf: { ...run.wf }, executions: run.executions + 1, sinceStart: run.sinceStart + 1 };
  let next: NodeId = r.at;
  let text = "";
  switch (r.at) {
    case "receive_request":
      text = "receive_request: request = remote backend engineer, 2-4 yrs";
      next = "create_jd";
      break;
    case "create_jd":
      r.wf.jd_version += 1;
      r.llmCalls += 1;
      text = `create_jd: LLM call → JD v${r.wf.jd_version}`;
      next = "review_jd";
      break;
    case "review_jd":
      r.waiting = "human";
      text =
        mode === "chain"
          ? "review_jd: input() blocks the Python process until someone answers"
          : "review_jd: interrupt() saves state; the run returns and nothing is held in memory";
      next = "review_jd";
      break;
    case "post_jd":
      r.wf.posted = true;
      r.postings += 1;
      text = `post_jd: job-board API → posted${r.postings > 1 ? ` (that's posting #${r.postings}: duplicate!)` : ""}`;
      next = "wait_for_applicants";
      break;
    case "wait_for_applicants":
      r.waiting = "time";
      text =
        mode === "chain"
          ? `wait: time.sleep() for ${r.wf.checks === 0 ? "7 days" : "48 hours"}; the process must stay up the whole time`
          : `wait: run ends here; a scheduler resumes this thread in ${r.wf.checks === 0 ? "7 days" : "48 hours"}`;
      next = "count_applications";
      break;
    case "count_applications":
      r.wf.checks += 1;
      r.wf.applications = r.wf.checks === 1 ? 10 : 25;
      next = r.wf.applications < THRESHOLD ? "revise_jd" : "shortlist";
      text = `count_applications: ${r.wf.applications} (need ${THRESHOLD}) → ${next}`;
      break;
    case "revise_jd":
      r.wf.jd_version += 1;
      r.llmCalls += 1;
      text = `revise_jd: LLM call → JD v${r.wf.jd_version} (wider title)`;
      next = "wait_for_applicants";
      break;
    case "shortlist":
      text = "shortlist: parse and score 25 resumes → done";
      next = "END";
      break;
  }
  r.at = next;
  r.log = push(run, text, r.waiting ? "warn" : "neutral");
  if (mode === "graph") {
    r.checkpoints += 1;
    const saved: Run["log"][number] = { text: `checkpoint #${r.checkpoints} saved (next: ${r.at})`, tone: "good" };
    r.log = [saved, ...r.log].slice(0, 9);
  }
  return r;
}

function answer(run: Run, mode: Mode, approved: boolean): Run {
  const r: Run = { ...run, wf: { ...run.wf, approved }, waiting: null };
  if (approved) {
    r.at = "post_jd";
    r.log = push(run, mode === "chain" ? "Human typed y: loop exits" : "Command(resume=approved) → conditional edge to post_jd", "good");
  } else {
    r.at = "create_jd";
    r.log = push(run, mode === "chain" ? "Human typed n: while loop goes round again" : "Command(resume=rejected) → conditional edge back to create_jd", "warn");
  }
  return r;
}

function advanceTime(run: Run, mode: Mode): Run {
  return { ...run, waiting: null, log: push(run, mode === "chain" ? "time.sleep() returns: the process survived the wait" : "scheduler: graph.invoke(None, config) resumes the thread", "good") };
}

function crash(run: Run, mode: Mode): Run {
  if (mode === "graph") {
    return {
      ...run,
      log: push(
        run,
        run.checkpoints === 0
          ? "Server restarted. No checkpoint yet, so start fresh: nothing lost"
          : `Server restarted. invoke(None, config) → resumed from checkpoint #${run.checkpoints} at ${run.at}`,
        "good",
      ),
    };
  }
  const lost = run.sinceStart;
  return {
    ...START,
    executions: run.executions,
    wasted: run.wasted + lost,
    llmCalls: run.llmCalls,
    postings: run.postings,
    log: push(
      run,
      `Server restarted. The state dict lived in memory, so it's gone. ${lost} completed step${lost === 1 ? "" : "s"} must rerun from receive_request${run.wf.posted ? ", and post_jd will post the job again" : ""}`,
      "bad",
    ),
  };
}

export function LgChainVsGraph() {
  const [mode, setMode] = useState<Mode>("chain");
  const [run, setRun] = useState<Run>(START);

  function switchMode(m: Mode) {
    setMode(m);
    setRun(START);
  }

  const done = run.at === "END";
  const status =
    run.waiting === null
      ? done
        ? "finished"
        : "ready"
      : mode === "chain"
        ? `process alive and blocked (${run.waiting === "human" ? "waiting for input" : "sleeping"})`
        : `paused: no process running, state in checkpointer (${run.waiting === "human" ? "waiting for approval" : "waiting for scheduler"})`;

  return (
    <Widget title="Chain plus glue code vs graph" hint="Run the hiring workflow both ways. Reject the JD once, let time pass, and crash the server at different points.">
      <div className="flex flex-wrap gap-2">
        <Pill active={mode === "chain"} onClick={() => switchMode("chain")}>LangChain chain + Python glue</Pill>
        <Pill active={mode === "graph"} onClick={() => switchMode("graph")}>LangGraph graph + checkpointer</Pill>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {NODES.map((n) => (
          <span key={n} className={`rounded-md border px-2 py-1 font-mono text-[0.68rem] ${run.at === n ? "border-accent bg-accent-soft text-accent" : "border-border text-muted"}`}>
            {n}
          </span>
        ))}
        <span className={`rounded-md border px-2 py-1 font-mono text-[0.68rem] ${done ? "border-accent bg-good-soft" : "border-border text-muted"}`}>END</span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-border bg-surface-2 p-2 text-[0.78rem]">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Workflow state</p>
          <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-[0.72rem]">{JSON.stringify(run.wf, null, 1)}</pre>
          <p className="mt-1 text-xs"><span className="font-semibold">Process:</span> {status}</p>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-2 text-center text-xs">
          <div className="rounded-lg bg-surface-2 p-2"><p className="text-muted">Node runs</p><p className="font-mono text-sm">{run.executions}</p></div>
          <div className={`rounded-lg p-2 ${run.wasted ? "bg-bad-soft" : "bg-surface-2"}`}><p className="text-muted">Redone after crash</p><p className="font-mono text-sm">{run.wasted}</p></div>
          <div className="rounded-lg bg-surface-2 p-2"><p className="text-muted">LLM calls paid</p><p className="font-mono text-sm">{run.llmCalls}</p></div>
          <div className={`rounded-lg p-2 ${run.postings > 1 ? "bg-bad-soft" : "bg-surface-2"}`}><p className="text-muted">Job postings</p><p className="font-mono text-sm">{run.postings}</p></div>
          <div className="col-span-2 rounded-lg bg-surface-2 p-2"><p className="text-muted">Checkpoints</p><p className="font-mono text-sm">{mode === "graph" ? run.checkpoints : "none"}</p></div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {run.waiting === "human" ? (
          <>
            <button type="button" onClick={() => setRun((r) => answer(r, mode, true))} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">Approve JD</button>
            <button type="button" onClick={() => setRun((r) => answer(r, mode, false))} className="min-h-10 flex-1 rounded-lg border border-border px-3 text-sm">Reject with feedback</button>
          </>
        ) : run.waiting === "time" ? (
          <button type="button" onClick={() => setRun((r) => advanceTime(r, mode))} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">Let time pass</button>
        ) : (
          <button type="button" disabled={done} onClick={() => setRun((r) => step(r, mode))} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-50 dark:text-bg">
            {done ? "Finished" : `Run ${run.at}`}
          </button>
        )}
        <button type="button" disabled={done} onClick={() => setRun((r) => crash(r, mode))} className="min-h-10 rounded-lg border border-border bg-bad-soft px-3 text-sm disabled:opacity-50">Crash server</button>
        <button type="button" onClick={() => setRun(START)} className="min-h-10 rounded-lg border border-border px-3 text-sm">Reset</button>
      </div>

      <ol className="mt-3 space-y-1">
        {run.log.map((l, i) => (
          <li key={`${run.executions}-${i}`} className={`rounded px-2 py-1 font-mono text-[0.72rem] break-words ${l.tone === "good" ? "bg-good-soft" : l.tone === "warn" ? "bg-warn-soft" : l.tone === "bad" ? "bg-bad-soft" : "bg-surface-2"}`}>
            {l.text}
          </li>
        ))}
      </ol>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">How the control flow is written</p>
      <pre className="mt-1 overflow-x-auto rounded-lg bg-surface-2 p-2 font-mono text-[0.7rem]">{CODE[mode]}</pre>
    </Widget>
  );
}
