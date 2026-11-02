"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Item = { ns: string[]; key: string; data: string };
type Op = "put" | "get" | "search" | "semantic" | "delete";

const NAMESPACES: string[][] = [
  ["users", "u1"],
  ["users", "u2"],
];
const PREFIXES: string[][] = [["users", "u1"], ["users", "u2"], ["users"]];

const SEED: Item[] = [
  ["User's name is Asha"],
  ["Teaches backend engineering on YouTube"],
  ["Prefers dark mode in every app"],
  ["Prefers bullet points over paragraphs"],
  ["Prefers concise answers"],
  ["Is learning machine learning"],
  ["Likes code examples in Python"],
  ["Is planning a trip to Mumbai in two months"],
  ["Has a dog called Biscuit"],
  ["Works from Bengaluru"],
  ["Is vegetarian"],
  ["Building MCP servers in Python"],
]
  .map(([data], i): Item => ({ ns: ["users", "u1"], key: String(i + 1), data }))
  .concat([
    { ns: ["users", "u2"], key: "1", data: "Likes pasta" },
    { ns: ["users", "u2"], key: "2", data: "Prefers grid-style navigation" },
  ]);

/** Toy "embedding": words map to concepts, and similarity is concept overlap. */
const CONCEPTS: Record<string, string> = {
  learning: "study", learn: "study", studying: "study", study: "study", course: "study", machine: "study",
  prefers: "pref", prefer: "pref", preferences: "pref", likes: "pref", like: "pref", favourite: "pref", style: "pref",
  dark: "ui", mode: "ui", ui: "ui", navigation: "ui", grid: "ui", theme: "ui", app: "ui",
  trip: "travel", travel: "travel", travelling: "travel", mumbai: "travel", plans: "travel", visiting: "travel", holiday: "travel",
  food: "food", eat: "food", cook: "food", pasta: "food", pizza: "food", vegetarian: "food", dinner: "food",
  name: "identity", called: "identity", who: "identity",
  python: "code", code: "code", programming: "code", language: "code", mcp: "code",
  answers: "format", bullet: "format", paragraphs: "format", concise: "format", format: "format", short: "format",
  teaches: "work", work: "work", job: "work", works: "work", youtube: "work",
  dog: "pet", pet: "pet", pets: "pet",
};

function concepts(text: string) {
  const out = new Set<string>();
  for (const w of text.toLowerCase().match(/[a-z]+/g) ?? []) if (CONCEPTS[w]) out.add(CONCEPTS[w]);
  return out;
}

function similarity(a: string, b: string) {
  const ca = concepts(a);
  const cb = concepts(b);
  if (!ca.size || !cb.size) return 0;
  let shared = 0;
  ca.forEach((c) => cb.has(c) && shared++);
  return shared / Math.sqrt(ca.size * cb.size);
}

const fmtNs = (ns: string[]) => `(${ns.map((s) => `"${s}"`).join(", ")}${ns.length === 1 ? "," : ""})`;
const sameNs = (a: string[], b: string[]) => a.join("/") === b.join("/");
const hasPrefix = (ns: string[], p: string[]) => p.every((s, i) => ns[i] === s);

type Result = { code: string; lines: string[]; tone: "good" | "warn" | "neutral" };

export function LgMemoryStore() {
  const [items, setItems] = useState<Item[]>(SEED);
  const [op, setOp] = useState<Op>("semantic");
  const [nsIdx, setNsIdx] = useState(0);
  const [prefixIdx, setPrefixIdx] = useState(0);
  const [key, setKey] = useState("3");
  const [text, setText] = useState("Prefers light mode");
  const [query, setQuery] = useState("What is the user studying?");
  const [limit, setLimit] = useState(3);
  const [useLimit, setUseLimit] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const ns = NAMESPACES[nsIdx];
  const prefix = PREFIXES[prefixIdx];

  function run() {
    if (op === "put") {
      const exists = items.some((it) => sameNs(it.ns, ns) && it.key === key);
      if (!key.trim() || !text.trim()) return setResult({ code: "", lines: ["Key and text are both required."], tone: "warn" });
      setItems((all) => [...all.filter((it) => !(sameNs(it.ns, ns) && it.key === key)), { ns, key, data: text }]);
      setResult({
        code: `store.put(${fmtNs(ns)}, "${key}", {"data": "${text}"})`,
        lines: [exists ? `Key "${key}" already existed in this namespace: overwritten (that's how you update).` : `Created a new memory with key "${key}".`],
        tone: "good",
      });
    } else if (op === "get") {
      const it = items.find((x) => sameNs(x.ns, ns) && x.key === key);
      setResult({ code: `store.get(${fmtNs(ns)}, "${key}")`, lines: [it ? `Item(key="${it.key}", value={"data": "${it.data}"})` : "None (no memory with that key in this namespace)"], tone: it ? "good" : "warn" });
    } else if (op === "delete") {
      const it = items.find((x) => sameNs(x.ns, ns) && x.key === key);
      setItems((all) => all.filter((x) => !(sameNs(x.ns, ns) && x.key === key)));
      setResult({ code: `store.delete(${fmtNs(ns)}, "${key}")`, lines: [it ? `Deleted "${it.data}".` : "Nothing to delete (no error is raised)."], tone: it ? "good" : "warn" });
    } else if (op === "search") {
      const max = useLimit ? limit : 10;
      const found = items.filter((x) => hasPrefix(x.ns, prefix));
      const shown = found.slice(0, max);
      const lines = shown.map((x) => `${fmtNs(x.ns)} ${x.key}: ${x.data}`);
      if (found.length > shown.length) lines.push(`… ${found.length - shown.length} more not returned (limit=${max}${useLimit ? "" : ", the default"})`);
      setResult({ code: `store.search(${fmtNs(prefix)}${useLimit ? `, limit=${limit}` : ""})`, lines, tone: found.length > shown.length ? "warn" : "good" });
    } else {
      const scored = items
        .filter((x) => hasPrefix(x.ns, prefix))
        .map((x) => ({ x, s: similarity(query, x.data) }))
        .sort((a, b) => b.s - a.s)
        .slice(0, limit);
      setResult({
        code: `store.search(${fmtNs(prefix)}, query="${query}", limit=${limit})`,
        lines: scored.map(({ x, s }) => `${s.toFixed(2)}  ${x.data}`),
        tone: scored[0]?.s ? "good" : "warn",
      });
    }
  }

  const groups = Array.from(new Set(items.map((it) => it.ns.join("/")))).sort();
  const input = "min-h-10 w-full min-w-0 rounded-lg border border-border bg-bg px-2 text-sm";

  return (
    <Widget title="A memory store with namespaces" hint="Run put, get, search and semantic search against an InMemoryStore. Similarity here is a toy stand-in for real embeddings.">
      <div className="flex flex-wrap gap-2">
        {(["put", "get", "search", "semantic", "delete"] as Op[]).map((o) => (
          <Pill key={o} active={op === o} onClick={() => { setOp(o); setResult(null); }}>
            {o === "semantic" ? "search + query" : o}
          </Pill>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {op === "search" || op === "semantic" ? (
          <label className="min-w-0 text-xs text-muted">
            namespace prefix
            <select value={prefixIdx} onChange={(e) => setPrefixIdx(Number(e.target.value))} className={`${input} mt-1 font-mono`}>
              {PREFIXES.map((p, i) => <option key={i} value={i}>{fmtNs(p)}</option>)}
            </select>
          </label>
        ) : (
          <label className="min-w-0 text-xs text-muted">
            namespace
            <select value={nsIdx} onChange={(e) => setNsIdx(Number(e.target.value))} className={`${input} mt-1 font-mono`}>
              {NAMESPACES.map((p, i) => <option key={i} value={i}>{fmtNs(p)}</option>)}
            </select>
          </label>
        )}
        {(op === "put" || op === "get" || op === "delete") && (
          <label className="min-w-0 text-xs text-muted">
            key
            <input value={key} onChange={(e) => setKey(e.target.value)} className={`${input} mt-1 font-mono`} />
          </label>
        )}
        {op === "put" && (
          <label className="min-w-0 text-xs text-muted sm:col-span-2">
            value[&quot;data&quot;]
            <input value={text} onChange={(e) => setText(e.target.value)} className={`${input} mt-1`} />
          </label>
        )}
        {op === "semantic" && (
          <label className="min-w-0 text-xs text-muted">
            query
            <input value={query} onChange={(e) => setQuery(e.target.value)} className={`${input} mt-1`} />
          </label>
        )}
        {(op === "semantic" || op === "search") && (
          <div className="min-w-0 text-xs text-muted sm:col-span-2">
            <span>limit</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {op === "search" && (
                <Pill active={!useLimit} onClick={() => setUseLimit(false)}>
                  default (10)
                </Pill>
              )}
              {[1, 3, 5].map((n) => (
                <Pill key={n} active={(op === "semantic" || useLimit) && limit === n} onClick={() => { setLimit(n); setUseLimit(true); }}>
                  {n}
                </Pill>
              ))}
            </div>
          </div>
        )}
      </div>

      {op === "semantic" && (
        <div className="mt-2 flex flex-wrap gap-2">
          {["What is the user studying?", "Any UI preferences?", "What should I cook for them?", "Where are they travelling?"].map((q) => (
            <button key={q} type="button" onClick={() => setQuery(q)} className="min-h-10 rounded-lg border border-border px-2 text-xs hover:bg-surface-2">
              {q}
            </button>
          ))}
        </div>
      )}

      <button type="button" onClick={run} className="mt-3 min-h-10 w-full rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
        Run
      </button>

      {result && (
        <div className={`mt-3 rounded-lg p-3 ${result.tone === "good" ? "bg-good-soft" : result.tone === "warn" ? "bg-warn-soft" : "bg-surface-2"}`}>
          {result.code && <pre className="overflow-x-auto font-mono text-[0.72rem]">{result.code}</pre>}
          <ul className="mt-1 space-y-0.5">
            {result.lines.map((l, i) => (
              <li key={i} className="font-mono text-[0.72rem] break-words">{l}</li>
            ))}
            {result.lines.length === 0 && <li className="font-mono text-[0.72rem]">[] (empty)</li>}
          </ul>
        </div>
      )}

      <details className="mt-3 rounded-lg border border-border">
        <summary className="min-h-10 cursor-pointer px-3 py-2 text-sm">Store contents ({items.length} memories)</summary>
        <div className="space-y-2 px-3 pb-3">
          {groups.map((g) => (
            <div key={g} className="min-w-0">
              <p className="font-mono text-xs text-accent">{fmtNs(g.split("/"))}</p>
              <ul className="mt-0.5 space-y-0.5">
                {items.filter((it) => it.ns.join("/") === g).map((it) => (
                  <li key={it.key} className="text-[0.75rem] break-words">
                    <span className="font-mono text-muted">{it.key}</span> {it.data}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </Widget>
  );
}
