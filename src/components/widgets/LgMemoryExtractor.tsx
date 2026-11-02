"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Fact = { id: string; text: string };
type Stored = { key: number; id: string; text: string };

/** What a well-prompted extractor would pull from each message. `id` marks facts with the same meaning. */
const MESSAGES: { text: string; facts: Fact[]; note?: string }[] = [
  { text: "Hi, my name is Asha.", facts: [{ id: "name", text: "User's name is Asha" }] },
  { text: "I teach AI on YouTube.", facts: [{ id: "job", text: "User teaches AI on YouTube" }] },
  { text: "My favourite language is Python.", facts: [{ id: "python", text: "User's favourite language is Python" }] },
  { text: "Explain generative AI simply.", facts: [], note: "A one-off request: nothing durable." },
  { text: "I'm in a rush today, keep it short.", facts: [], note: "Temporary: true today, not a lasting preference." },
  { text: "Call me Asha, by the way.", facts: [{ id: "name", text: "User goes by Asha" }] },
  { text: "I mostly code in Python these days.", facts: [{ id: "python", text: "User mostly codes in Python" }] },
  { text: "I'm Asha and I'm building MCP servers.", facts: [{ id: "name", text: "User's name is Asha" }, { id: "mcp", text: "User is building MCP servers" }] },
];

type Log = { msg: string; output: string; written: string[] };

export function LgMemoryExtractor() {
  const [dedup, setDedup] = useState(false);
  const [store, setStore] = useState<Stored[]>([]);
  const [log, setLog] = useState<Log | null>(null);

  function send(i: number) {
    const m = MESSAGES[i];
    const known = new Set(store.map((s) => s.id));
    const items = m.facts.map((f) => ({ ...f, isNew: !known.has(f.id) }));
    const toWrite = dedup ? items.filter((f) => f.isNew) : items;
    let next = store.length ? Math.max(...store.map((s) => s.key)) + 1 : 1;
    const added = toWrite.map((f) => ({ key: next++, id: f.id, text: f.text }));
    setStore((s) => [...s, ...added]);

    const output = dedup
      ? `MemoryDecision(should_write=${items.length > 0 ? "True" : "False"}, memories=[${items.map((f) => `MemoryItem(text="${f.text}", is_new=${f.isNew ? "True" : "False"})`).join(", ")}])`
      : `MemoryDecision(should_write=${items.length > 0 ? "True" : "False"}, memories=[${items.map((f) => `"${f.text}"`).join(", ")}])`;
    setLog({ msg: m.text, output, written: added.map((a) => a.text) });
  }

  const counts = store.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.id]: (acc[s.id] ?? 0) + 1 }), {});
  const dupes = Object.values(counts).filter((n) => n > 1).reduce((a, n) => a + n - 1, 0);

  return (
    <Widget title="The remember node, with and without dedup" hint="Send user messages through the extractor. Some repeat facts in new words. Then switch dedup on, reset, and compare the store.">
      <div className="flex flex-wrap gap-2">
        <Pill active={!dedup} onClick={() => { setDedup(false); setStore([]); setLog(null); }}>
          Naive extractor
        </Pill>
        <Pill active={dedup} onClick={() => { setDedup(true); setStore([]); setLog(null); }}>
          Extractor sees existing memories
        </Pill>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {MESSAGES.map((m, i) => (
          <button key={i} type="button" onClick={() => send(i)} className="min-h-10 min-w-0 rounded-lg border border-border px-3 py-1.5 text-left text-sm break-words hover:bg-surface-2">
            {m.text}
          </button>
        ))}
      </div>

      {log && (
        <div className="mt-3 rounded-lg bg-surface-2 p-3">
          <p className="text-xs text-muted">user: {log.msg}</p>
          <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-[0.7rem]">{log.output}</pre>
          <p className={`mt-1 text-xs ${log.written.length ? "text-good" : "text-muted"}`}>
            {log.written.length ? `store.put × ${log.written.length}` : "Nothing written."}
            {MESSAGES.find((m) => m.text === log.msg)?.note && <span className="text-muted"> {MESSAGES.find((m) => m.text === log.msg)?.note}</span>}
          </p>
        </div>
      )}

      <div className="mt-3 rounded-lg border border-border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-xs text-accent">(&quot;users&quot;, &quot;u1&quot;, &quot;details&quot;)</p>
          <p className="text-xs">
            {store.length} memories
            {dupes > 0 && <span className="ml-2 rounded-full bg-bad-soft px-2 py-0.5">{dupes} duplicate{dupes === 1 ? "" : "s"}</span>}
          </p>
        </div>
        {store.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Empty. Send a message.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {store.map((s) => (
              <li key={s.key} className={`rounded px-2 py-1 text-[0.8rem] break-words ${counts[s.id] > 1 ? "bg-bad-soft" : "bg-good-soft"}`}>
                <span className="mr-1 font-mono text-[0.68rem] text-muted">{s.key}</span>
                {s.text}
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={() => { setStore([]); setLog(null); }} className="mt-2 min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset store
        </button>
      </div>
    </Widget>
  );
}
