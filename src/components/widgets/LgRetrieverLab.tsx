"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

/** Toy 5-dimensional "embeddings": [trees, neighbours, generalisation, neural nets, evaluation]. */
type Vec = [number, number, number, number, number];
type Chunk = { id: string; page: number; text: string; v: Vec };

const DIMS = ["trees", "neighbours", "generalisation", "neural nets", "evaluation"];

const CHUNKS: Chunk[] = [
  { id: "c1", page: 41, text: "k-nearest neighbours classifies a point by majority vote among the k closest training points.", v: [0, 0.95, 0.1, 0, 0.1] },
  { id: "c2", page: 43, text: "Pick k with cross-validation: small k is noisy, large k blurs class boundaries. Odd k avoids ties.", v: [0, 0.8, 0.3, 0, 0.5] },
  { id: "c3", page: 87, text: "A decision tree splits each node on the feature and threshold that most reduce impurity (Gini or entropy).", v: [0.95, 0, 0.1, 0, 0.1] },
  { id: "c4", page: 89, text: "Pruning and a maximum depth stop a tree from memorising the training set.", v: [0.7, 0, 0.6, 0, 0.1] },
  { id: "c5", page: 112, text: "Overfitting: a model fits noise in the training data and performs poorly on unseen data.", v: [0.1, 0.05, 0.95, 0.1, 0.3] },
  { id: "c6", page: 113, text: "Regularisation and more data reduce variance, so the model generalises to new examples.", v: [0, 0, 0.85, 0.2, 0.2] },
  { id: "c7", page: 150, text: "A neural network stacks layers of weighted sums followed by non-linear activations.", v: [0, 0, 0.1, 0.95, 0] },
  { id: "c8", page: 171, text: "Hold out a test set and report accuracy, precision and recall on data the model never saw.", v: [0, 0, 0.4, 0, 0.9] },
];

type Q = { id: string; text: string; tool: boolean; query?: string; v?: Vec };

const QUESTIONS: Q[] = [
  { id: "k", text: "Using the PDF, how should I choose k in KNN?", tool: true, query: "choosing k in k-nearest neighbours", v: [0, 0.9, 0.2, 0, 0.35] },
  { id: "tree", text: "From the notes: how does a decision tree split a node?", tool: true, query: "how a decision tree splits a node", v: [0.95, 0, 0.15, 0, 0.05] },
  { id: "over", text: "Per the book, why is my model great on training data but bad on new data?", tool: true, query: "model good on training data, poor on new data", v: [0.1, 0, 0.9, 0.05, 0.35] },
  { id: "hi", text: "hi!", tool: false },
];

function cosine(a: Vec, b: Vec) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function LgRetrieverLab() {
  const [qid, setQid] = useState("over");
  const [k, setK] = useState(2);

  const q = QUESTIONS.find((x) => x.id === qid) ?? QUESTIONS[0];
  const ranked = q.v ? CHUNKS.map((c) => ({ c, s: cosine(q.v as Vec, c.v) })).sort((a, b) => b.s - a.s) : [];
  const top = ranked.slice(0, k);

  return (
    <Widget title="Retrieval as a tool" hint="Pick a question. The agent decides whether to call rag_tool; if it does, the retriever ranks chunks by vector similarity and returns the top k.">
      <div className="flex flex-col gap-2">
        {QUESTIONS.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setQid(x.id)}
            className={`min-h-10 rounded-lg border px-3 py-1.5 text-left text-sm ${qid === x.id ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-2"}`}
          >
            {x.text}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">k =</span>
        {[1, 2, 3, 4].map((n) => (
          <Pill key={n} active={k === n} onClick={() => setK(n)}>{n}</Pill>
        ))}
      </div>

      {!q.tool && (
        <div className="mt-3 rounded-lg bg-good-soft p-3 text-sm">
          <p className="font-mono text-xs text-muted">chat_node → END</p>
          <p className="mt-1">No tool call: the model answers &quot;Hi! How can I help?&quot; directly. No embedding call, no search, no extra tokens. That&apos;s the benefit of letting the agent decide.</p>
        </div>
      )}

      {q.tool && (
        <>
          <p className="mt-3 break-words rounded-lg bg-accent-soft px-2 py-1.5 font-mono text-[0.75rem]">
            AIMessage.tool_calls: rag_tool(query=&quot;{q.query}&quot;)
          </p>
          <p className="mt-2 text-xs text-muted">
            Query vector [{DIMS.map((d, i) => `${d} ${(q.v as Vec)[i].toFixed(2)}`).join(", ")}]
          </p>
          <ol className="mt-2 space-y-1">
            {ranked.map(({ c, s }, i) => {
              const hit = i < k;
              return (
                <li key={c.id} className={`rounded-lg border p-2 text-[0.78rem] ${hit ? "border-accent bg-accent-soft" : "border-border opacity-60"}`}>
                  <div className="flex flex-wrap justify-between gap-2 font-mono text-[0.7rem] text-muted">
                    <span>#{i + 1} · page {c.page}</span>
                    <span>similarity {s.toFixed(2)}{hit ? " · returned" : ""}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded bg-surface-2">
                    <div className="h-1.5 rounded bg-accent" style={{ width: `${Math.max(0, s) * 100}%` }} />
                  </div>
                  <p className="mt-1 break-words">{c.text}</p>
                </li>
              );
            })}
          </ol>
          <div className="mt-3 rounded-lg bg-warn-soft p-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">ToolMessage sent back to chat_node</p>
            <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-[0.7rem]">
{JSON.stringify({ query: q.query, context: top.map((t) => t.c.text), metadata: top.map((t) => ({ page: t.c.page })) }, null, 1)}
            </pre>
          </div>
          {qid === "over" && (
            <p className="mt-2 text-xs text-muted">
              The question never says &quot;overfitting&quot;, yet page 112 ranks first: embeddings match meaning, not exact words.
            </p>
          )}
        </>
      )}
    </Widget>
  );
}
