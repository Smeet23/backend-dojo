"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Recipe = { id: string; name: string; text: string };

const RECIPES: Recipe[] = [
  { id: "A", name: "amish friendship bread", text: "Stir the sourdough starter with milk, sugar and flour. Beat in eggs, oil, cinnamon and vanilla pudding mix. Pour into greased loaf pans and bake at 325 F for 1 hour." },
  { id: "B", name: "100% whole wheat bread", text: "Proof the yeast in warm water with honey. Knead in whole wheat flour, let the dough rise until doubled, shape a loaf and bake in a 350 F oven for 35 minutes." },
  { id: "C", name: "4th of july salmon with egg sauce", text: "Heat white wine and lemon slices in a deep skillet until barely bubbling. Add the salmon, cover and cook over low heat 8 to 10 minutes until just opaque. Serve with egg cream sauce." },
  { id: "D", name: "amazingly juicy grilled lemon chicken", text: "Marinate chicken breasts in lemon juice, garlic and olive oil for at least 4 hours. Grill over medium high heat 6 minutes per side until the juices run clear." },
  { id: "E", name: "crispy oven chicken tenders", text: "Soak chicken strips in buttermilk, pat dry, coat with panko and parmesan, and bake on a rack at 425 F for 15 minutes until golden." },
  { id: "F", name: "2 hour turkey really", text: "Roast a 12 lb turkey breast side up at 450 F for about 2 hours, until a thermometer in the thigh reads 165 F. Rest 20 minutes before carving." },
  { id: "G", name: "3 step fall off the bone ribs", text: "Rub pork ribs with brown sugar and paprika, wrap in foil and bake at 275 F for 3 hours, then brush with barbecue sauce and broil." },
  { id: "H", name: "5 cheese crab lasagna with roasted garlic", text: "Roast whole garlic heads wrapped in foil at 400 F for 45 minutes. Layer lasagna noodles with crab, ricotta, roasted vegetables and five cheeses." },
];

type Query = { label: string; target: string; original: string; rewrite: string };

const QUERIES: Query[] = [
  { label: "Roast garlic", target: "H", original: "How long should I roast garlic for a white lasagna with crab and veggies?", rewrite: "roast garlic minutes foil lasagna crab vegetables" },
  { label: "Poach fish", target: "C", original: "What's the best way to poach fish so it's not dry, and how hot should the water be?", rewrite: "poach salmon fish fillet skillet wine lemon simmer low heat minutes" },
  { label: "Sweet bread", target: "A", original: "What oven temperature and how long do I bake this sweet, yeast-based bread?", rewrite: "bake sweet yeast bread loaf oven temperature time" },
  { label: "Citrus chicken", target: "D", original: "How long should the chicken soak in the citrus mixture before grilling?", rewrite: "marinate chicken lemon juice hours before grill" },
  { label: "Turkey done", target: "F", original: "What should the thermometer read in the thigh when the turkey is done?", rewrite: "poultry chicken internal temperature thermometer doneness" },
  { label: "Tender ribs", target: "G", original: "How do I make pork ribs so tender they fall off the bone?", rewrite: "pork ribs tender fall off the bone low slow bake foil hours" },
];

type Mode = "original" | "rewrite";

const tokenize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter(Boolean);

// BM25 index built once over name + text (k1 = 1.5, b = 0.75).
const DOCS = RECIPES.map((r) => tokenize(`${r.name} ${r.text}`));
const AVG_LEN = DOCS.reduce((s, d) => s + d.length, 0) / DOCS.length;
const DF = new Map<string, number>();
for (const d of DOCS) for (const w of new Set(d)) DF.set(w, (DF.get(w) ?? 0) + 1);

function search(query: string) {
  const terms = tokenize(query);
  return RECIPES.map((r, i) => {
    const doc = DOCS[i];
    let score = 0;
    const matched = new Set<string>();
    for (const w of terms) {
      const n = DF.get(w) ?? 0;
      if (!n) continue;
      const tf = doc.filter((t) => t === w).length;
      if (!tf) continue;
      matched.add(w);
      const idf = Math.log(1 + (DOCS.length - n + 0.5) / (n + 0.5));
      score += (idf * tf * 2.5) / (tf + 1.5 * (0.25 + (0.75 * doc.length) / AVG_LEN));
    }
    return { recipe: r, score, matched: [...matched] };
  }).sort((a, b) => b.score - a.score);
}

const rankOf = (query: string, target: string) => search(query).findIndex((h) => h.recipe.id === target) + 1;

function summary(ranks: number[]) {
  const n = ranks.length;
  return {
    r1: ranks.filter((r) => r <= 1).length / n,
    r3: ranks.filter((r) => r <= 3).length / n,
    mrr: ranks.reduce((s, r) => s + (r <= 5 ? 1 / r : 0), 0) / n,
  };
}

const f2 = (x: number) => x.toFixed(2);

export function EvRecipeBm25Lab() {
  const [qi, setQi] = useState(1);
  const [mode, setMode] = useState<Mode>("original");
  const [edits, setEdits] = useState<Record<string, string>>({});

  const textFor = (i: number, m: Mode) => edits[`${i}-${m}`] ?? QUERIES[i][m];
  const q = QUERIES[qi];
  const text = textFor(qi, mode);
  const hits = search(text).slice(0, 5);
  const targetRank = rankOf(text, q.target);
  const targetName = RECIPES.find((r) => r.id === q.target)?.name;

  const ranks = (m: Mode) => QUERIES.map((qq, i) => rankOf(textFor(i, m), qq.target));
  const origRanks = ranks("original");
  const rwRanks = ranks("rewrite");
  const so = summary(origRanks);
  const sr = summary(rwRanks);

  return (
    <Widget
      title="Mini BM25 over recipe snippets"
      hint="Eight short recipes, six synthetic queries, each with a known target recipe. Pick a query, flip between the user's wording and an LLM-style rewrite, or edit the text yourself."
    >
      <div className="flex flex-wrap gap-2">
        {QUERIES.map((qq, i) => (
          <Pill key={qq.label} active={qi === i} onClick={() => setQi(i)}>
            {qq.label}
          </Pill>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Pill active={mode === "original"} onClick={() => setMode("original")}>
          Original query
        </Pill>
        <Pill active={mode === "rewrite"} onClick={() => setMode("rewrite")}>
          Query rewrite
        </Pill>
        {edits[`${qi}-${mode}`] !== undefined && (
          <button
            type="button"
            onClick={() => setEdits((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== `${qi}-${mode}`)))}
            className="min-h-9 rounded-full border border-border px-3 text-sm text-muted"
          >
            Undo my edit
          </button>
        )}
      </div>
      <textarea
        value={text}
        onChange={(e) => setEdits((ed) => ({ ...ed, [`${qi}-${mode}`]: e.target.value }))}
        rows={2}
        aria-label="Query text"
        className="mt-2 w-full rounded-lg border border-border bg-surface-2 p-2 font-mono text-sm"
      />
      <p className="mt-1 text-sm">
        Target: <span className="font-semibold">{targetName}</span>, found at{" "}
        <span className={`font-mono font-semibold ${targetRank === 1 ? "text-good" : targetRank <= 3 ? "text-accent" : "text-warn"}`}>
          rank {targetRank}
        </span>{" "}
        of {RECIPES.length}
      </p>

      <ol className="mt-3 space-y-1.5">
        {hits.map((h, i) => {
          const isTarget = h.recipe.id === q.target;
          return (
            <li key={h.recipe.id} className={`rounded-lg border px-3 py-2 text-sm ${isTarget ? "border-good bg-good-soft" : "border-border bg-surface"}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate">
                  <span className="mr-1 font-mono text-xs text-muted">{i + 1}.</span>
                  {h.recipe.name}
                  {isTarget && <span className="ml-1 text-xs font-semibold text-good">target</span>}
                </span>
                <span className="shrink-0 font-mono text-xs">{h.score.toFixed(2)}</span>
              </div>
              <p className="mt-0.5 break-words text-xs text-muted">matched: {h.matched.length ? h.matched.join(", ") : "nothing"}</p>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-1 pr-2 font-normal">Query</th>
              <th className="py-1 pr-2 font-normal">Original rank</th>
              <th className="py-1 font-normal">Rewrite rank</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {QUERIES.map((qq, i) => (
              <tr key={qq.label} className={`border-t border-border ${i === qi ? "bg-surface-2" : ""}`}>
                <td className="py-1 pr-2 font-sans">{qq.label}</td>
                <td className="py-1 pr-2">{origRanks[i]}</td>
                <td className={`py-1 ${rwRanks[i] < origRanks[i] ? "text-good" : rwRanks[i] > origRanks[i] ? "text-warn" : ""}`}>{rwRanks[i]}</td>
              </tr>
            ))}
            {(["Recall@1", "Recall@3", "MRR@5"] as const).map((name, j) => {
              const key = (["r1", "r3", "mrr"] as const)[j];
              return (
                <tr key={name} className="border-t border-border font-semibold">
                  <td className="py-1 pr-2 font-sans">{name}</td>
                  <td className="py-1 pr-2">{f2(so[key])}</td>
                  <td className="py-1">{f2(sr[key])}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">
        Tokens are lowercased words with punctuation stripped; no stemming, no stopword list. Edits count toward the table, so you can try to beat the
        rewrite column by hand.
      </p>
    </Widget>
  );
}
