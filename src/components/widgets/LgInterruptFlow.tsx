"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Phase = "idle" | "paused" | "done-yes" | "done-no" | "error-nocp" | "wrong-thread";

type Log = { text: string; tone: "good" | "warn" | "bad" | "neutral" };

export function LgInterruptFlow() {
  const [checkpointer, setCheckpointer] = useState(true);
  const [sideEffectFirst, setSideEffectFirst] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [log, setLog] = useState<Log[]>([]);
  const [prefixRuns, setPrefixRuns] = useState(0);
  const [auditRows, setAuditRows] = useState(0);

  function reset() {
    setPhase("idle");
    setLog([]);
    setPrefixRuns(0);
    setAuditRows(0);
  }

  function firstInvoke() {
    const l: Log[] = [
      { text: 'invoke({"messages": [Human("Buy 10 shares of Apple")]}, thread "t-1")', tone: "neutral" },
      { text: "chat_node → AIMessage.tool_calls: purchase_stock(symbol='AAPL', quantity=10)", tone: "neutral" },
      { text: "tools node starts purchase_stock (first line of the tool runs)", tone: "neutral" },
    ];
    if (sideEffectFirst) l.push({ text: "audit_log.insert(...)  ← side effect BEFORE interrupt (row 1)", tone: "warn" });
    if (!checkpointer) {
      l.push({ text: "interrupt() → error: no checkpointer, so there's nowhere to save the paused run", tone: "bad" });
      setLog(l);
      setPhase("error-nocp");
      setPrefixRuns(1);
      setAuditRows(sideEffectFirst ? 1 : 0);
      return;
    }
    l.push(
      { text: "interrupt('Approve buying 10 shares of AAPL?') → run pauses", tone: "warn" },
      { text: "Checkpoint saved for thread t-1 (state + pending task: tools)", tone: "neutral" },
      { text: "invoke returns {..., '__interrupt__': [Interrupt(value='Approve buying 10 shares of AAPL?')]}", tone: "neutral" },
    );
    setLog(l);
    setPhase("paused");
    setPrefixRuns(1);
    setAuditRows(sideEffectFirst ? 1 : 0);
  }

  function resume(answer: "yes" | "no", sameThread: boolean) {
    if (!sameThread) {
      setLog((old) => [
        ...old,
        { text: `invoke(Command(resume="${answer}"), thread "t-2")`, tone: "neutral" },
        { text: "Thread t-2 has no paused run, so the answer never reaches the waiting tool. t-1 is still paused.", tone: "bad" },
      ]);
      setPhase("wrong-thread");
      return;
    }
    const l: Log[] = [
      { text: `invoke(Command(resume="${answer}"), thread "t-1")`, tone: "neutral" },
      { text: "Checkpoint loaded. purchase_stock re-runs from its FIRST line", tone: "neutral" },
    ];
    if (sideEffectFirst) l.push({ text: `audit_log.insert(...) runs again (row ${auditRows + 1}): duplicate!`, tone: "bad" });
    l.push({ text: `interrupt(...) returns "${answer}" this time instead of pausing`, tone: "neutral" });
    if (answer === "yes") {
      l.push(
        { text: "ToolMessage: {status: 'success', message: 'Purchase order placed for 10 shares of AAPL.'}", tone: "good" },
        { text: "chat_node → \"Done: 10 Apple shares purchased.\" → END", tone: "good" },
      );
    } else {
      l.push(
        { text: "ToolMessage: {status: 'cancelled', message: 'Purchase ... declined by the user.'}", tone: "warn" },
        { text: "chat_node → \"Okay, I didn't buy anything.\" → END", tone: "good" },
      );
    }
    setLog((old) => [...old, ...l]);
    setPhase(answer === "yes" ? "done-yes" : "done-no");
    setPrefixRuns((n) => n + 1);
    setAuditRows((n) => n + (sideEffectFirst ? 1 : 0));
  }

  const statusText: Record<Phase, string> = {
    idle: "Not started",
    paused: "Paused · next = ('tools',) · waiting for a human",
    "done-yes": "Finished · purchase placed",
    "done-no": "Finished · purchase declined",
    "error-nocp": "Failed · interrupts need a checkpointer",
    "wrong-thread": "t-1 still paused · resume sent to the wrong thread",
  };
  const statusTone = phase === "paused" || phase === "wrong-thread" ? "bg-warn-soft" : phase === "error-nocp" ? "bg-bad-soft" : phase === "idle" ? "bg-surface-2" : "bg-good-soft";

  return (
    <Widget title="Interrupt and resume" hint="A buy order needs approval. Run it, then resume with the human's answer. Try breaking it: no checkpointer, the wrong thread, or a side effect before interrupt().">
      <div className="flex flex-wrap gap-2">
        <Pill active={checkpointer} onClick={() => { setCheckpointer((v) => !v); reset(); }}>
          Checkpointer: {checkpointer ? "InMemorySaver" : "none"}
        </Pill>
        <Pill active={sideEffectFirst} onClick={() => { setSideEffectFirst((v) => !v); reset(); }}>
          Side effect before interrupt: {sideEffectFirst ? "yes" : "no"}
        </Pill>
      </div>

      <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-2 p-2 font-mono text-[0.72rem]">
{`@tool
def purchase_stock(symbol: str, quantity: int) -> dict:
    """Buy shares for the user."""${sideEffectFirst ? "\n    audit_log.insert(symbol, quantity)   # runs again on resume!" : ""}
    decision = interrupt(f"Approve buying {quantity} shares of {symbol}?")
    if decision == "yes":
        return {"status": "success", ...}
    return {"status": "cancelled", ...}`}
      </pre>

      <div className={`mt-3 rounded-lg p-2 text-sm ${statusTone}`}>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Run status</span>
        <p>{statusText[phase]}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {phase === "idle" && (
          <button type="button" onClick={firstInvoke} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
            User: &quot;Buy 10 shares of Apple&quot;
          </button>
        )}
        {(phase === "paused" || phase === "wrong-thread") && (
          <>
            <div className="w-full rounded-lg border border-accent p-2 text-sm">
              <p className="text-xs text-muted">Frontend shows the interrupt payload</p>
              <p className="font-medium">Approve buying 10 shares of AAPL?</p>
            </div>
            <button type="button" onClick={() => resume("yes", true)} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
              Approve (resume=&quot;yes&quot;)
            </button>
            <button type="button" onClick={() => resume("no", true)} className="min-h-10 flex-1 rounded-lg border border-border px-3 text-sm">
              Reject (resume=&quot;no&quot;)
            </button>
            <button type="button" onClick={() => resume("yes", false)} className="min-h-10 w-full rounded-lg border border-border px-3 text-sm text-muted sm:w-auto">
              Approve, but on thread t-2
            </button>
          </>
        )}
        {phase !== "idle" && (
          <button type="button" onClick={reset} className="min-h-10 rounded-lg border border-border px-3 text-sm">
            Reset
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
        <div className="min-w-0 rounded-lg bg-surface-2 p-2"><p className="text-xs text-muted">Tool body started</p><p className="font-mono">{prefixRuns}×</p></div>
        <div className={`min-w-0 rounded-lg p-2 ${auditRows > 1 ? "bg-bad-soft" : "bg-surface-2"}`}><p className="text-xs text-muted">Audit rows written</p><p className="font-mono">{auditRows}</p></div>
      </div>

      <ol className="mt-3 space-y-1">
        {log.map((e, i) => (
          <li key={i} className={`rounded px-2 py-1 font-mono text-[0.72rem] break-all ${e.tone === "good" ? "bg-good-soft" : e.tone === "warn" ? "bg-warn-soft" : e.tone === "bad" ? "bg-bad-soft" : "bg-surface-2"}`}>
            {e.text}
          </li>
        ))}
      </ol>
    </Widget>
  );
}
