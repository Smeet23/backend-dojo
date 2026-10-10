"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

type Doc = { title: string; description: string };
type Field = "title" | "description";

const START: Doc[] = [
  { title: "Lightweight laptop, 16GB RAM", description: "A thin laptop for work and travel with all-day battery." },
  { title: "Laptop bag", description: "Padded bag that fits laptops up to 15 inches." },
  { title: "Gaming mouse", description: "Lightweight wireless mouse. Works with any laptop or desktop." },
  { title: "USB-C charger", description: "Fast charger for phones, tablets and laptops." },
];

const STOP = new Set(["a", "an", "and", "the", "for", "with", "to", "of", "or", "up", "any", "all", "that"]);

function stem(word: string) {
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function analyze(text: string, useStem: boolean): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOP.has(w))
    .map((w) => (useStem ? stem(w) : w));
}

/** Levenshtein distance with adjacent swaps counted as one edit. */
function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

export function InvertedIndexLab() {
  const [docs, setDocs] = useState<Doc[]>(START);
  const [query, setQuery] = useState("lightweight laptops");
  const [useStem, setUseStem] = useState(true);
  const [fuzzy, setFuzzy] = useState(false);
  const [boost, setBoost] = useState(true);

  const tokens = useMemo(
    () => docs.map((d) => ({ title: analyze(d.title, useStem), description: analyze(d.description, useStem) })),
    [docs, useStem],
  );

  const index = useMemo(() => {
    const map = new Map<string, Set<number>>();
    tokens.forEach((t, i) => {
      for (const term of [...t.title, ...t.description]) {
        if (!map.has(term)) map.set(term, new Set());
        map.get(term)!.add(i + 1);
      }
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [tokens]);

  const queryTerms = analyze(query, useStem);

  const expanded = queryTerms.map((q) => {
    const exact = index.some(([term]) => term === q);
    if (exact || !fuzzy) return { q, terms: exact ? [q] : [] };
    const max = q.length <= 2 ? 0 : q.length <= 5 ? 1 : 2;
    return { q, terms: index.map(([term]) => term).filter((term) => editDistance(q, term) <= max) };
  });
  const usedTerms = new Set(expanded.flatMap((e) => e.terms));

  const results = (() => {
    const n = docs.length;
    const avg = (f: Field) => tokens.reduce((s, t) => s + t[f].length, 0) / n || 1;
    const weights: Record<Field, number> = { title: boost ? 3 : 1, description: 1 };
    return tokens
      .map((t, i) => {
        let score = 0;
        for (const { terms } of expanded) {
          for (const term of terms) {
            const df = tokens.filter((x) => x.title.includes(term) || x.description.includes(term)).length;
            const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
            for (const f of ["title", "description"] as Field[]) {
              const tf = t[f].filter((w) => w === term).length;
              if (!tf) continue;
              const norm = 1 - 0.75 + 0.75 * (t[f].length / avg(f));
              score += weights[f] * idf * ((tf * 2.2) / (tf + 1.2 * norm));
            }
          }
        }
        return { id: i + 1, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
  })();

  function edit(i: number, field: Field, value: string) {
    setDocs((d) => d.map((doc, j) => (j === i ? { ...doc, [field]: value } : doc)));
  }

  return (
    <Widget title="Inverted index builder" hint="Edit the products, then search. Toggle stemming, fuzzy matching and the title boost to see what changes.">
      <div className="grid gap-2 sm:grid-cols-2">
        {docs.map((d, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface-2 p-2">
            <p className="text-xs font-semibold text-muted">Doc {i + 1}</p>
            <input
              aria-label={`Doc ${i + 1} title`}
              value={d.title}
              onChange={(e) => edit(i, "title", e.target.value)}
              className="mt-1 min-h-10 w-full rounded-md border border-border bg-surface px-2 text-sm font-medium"
            />
            <textarea
              aria-label={`Doc ${i + 1} description`}
              value={d.description}
              onChange={(e) => edit(i, "description", e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1 text-sm"
            />
          </div>
        ))}
      </div>

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="iil-query">
        Search query
      </label>
      <input
        id="iil-query"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Pill active={useStem} onClick={() => setUseStem((v) => !v)}>Stemming</Pill>
        <Pill active={fuzzy} onClick={() => setFuzzy((v) => !v)}>Fuzzy (typos)</Pill>
        <Pill active={boost} onClick={() => setBoost((v) => !v)}>Title boost ×3</Pill>
      </div>
      <p className="mt-2 text-xs text-muted">
        Query terms after analysis:{" "}
        {expanded.length === 0
          ? "(none)"
          : expanded.map((e) => `${e.q}${e.terms.length && e.terms[0] !== e.q ? ` → ${e.terms.join("/")}` : e.terms.length ? "" : " (no match)"}`).join(", ")}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Results (BM25-style score)</p>
          <ol className="mt-1 space-y-1">
            {results.length === 0 && <li className="text-sm text-muted">No matches</li>}
            {results.map((r, rank) => (
              <li key={r.id} className={`rounded-md border px-2 py-1 text-sm ${rank === 0 ? "border-good bg-good-soft" : "border-border"}`}>
                <span className="font-mono text-muted">{r.score.toFixed(2)}</span> · Doc {r.id}: {docs[r.id - 1].title}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Inverted index (term → docs)</p>
          <ul className="mt-1 flex max-h-56 flex-wrap gap-1 overflow-y-auto">
            {index.map(([term, ids]) => (
              <li
                key={term}
                className={`rounded px-1.5 py-0.5 font-mono text-[0.75rem] ${usedTerms.has(term) ? "bg-accent text-white dark:text-bg" : "bg-surface-2"}`}
              >
                {term} → {[...ids].join(",")}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Widget>
  );
}
