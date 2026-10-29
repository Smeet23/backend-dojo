"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

type Route = {
  q: string;
  gist: string;
  keys: string[];
  here: string;
  lesson: { text: string; slug: string };
};

const ROUTES: Route[] = [
  { q: "What RAG problems show up most?", gist: "Usually retrieval, found only after error analysis. Fit the metric to the system, e.g. hit rate for a fixed top 7.", keys: ["rag", "retrieval", "retriever", "search", "recall", "hit rate", "documents"], here: "what-rag-problems-show-up-most-in-practice", lesson: { text: "Evaluating RAG, tools and agents", slug: "rag-and-agents#retrieval-metrics" } },
  { q: "How much of the context window should I fill?", gist: "About 70% at most, about 35% for exhaustive extraction. Roughly 50 PDF pages per prompt.", keys: ["context", "window", "tokens", "long", "pages", "prompt size"], here: "how-much-of-the-context-window-should-i-fill", lesson: { text: "Long documents", slug: "rag-and-agents#long-documents" } },
  { q: "How should I chunk?", gist: "By units an expert recognizes (pages, sections) and attach document-level metadata to every chunk.", keys: ["chunk", "chunking", "split", "splitter", "metadata", "sections"], here: "how-should-i-chunk", lesson: { text: "Evaluating and tuning chunking", slug: "rag-and-agents#evaluating-and-tuning-chunking" } },
  { q: "Documents amend or contradict each other", gist: "Precompute a link table, fetch linked docs with each hit, eval retrieval first.", keys: ["conflict", "amend", "change order", "linked", "version", "contract", "precedence", "ontology"], here: "documents-amend-or-contradict-each-other", lesson: { text: "Pitfalls in evaluating RAG", slug: "rag-evaluation-pitfalls" } },
  { q: "Citations through summaries", gist: "Ask for line numbers, pull source lines in code, carry them through every layer.", keys: ["citation", "cite", "grounding", "summary", "summaries", "source", "line number", "pdf"], here: "citations-that-survive-summaries-of-summaries", lesson: { text: "Pitfall 6: hallucination", slug: "rag-evaluation-pitfalls#pitfall-6-hallucination" } },
  { q: "Extraction misses fields and costs too much", gist: "Baseline with evals, then simplify: multimodal input, a schema per document type.", keys: ["extraction", "ocr", "scanned", "textract", "fields", "schema", "invoice", "json"], here: "scanned-documents-missing-fields-and-high-cost", lesson: { text: "PDFs", slug: "rag-and-agents#pdfs" } },
  { q: "Describe tools in the system prompt?", gist: "Schemas first; add usage guidance only if evals show wrong tool choice. Never be inconsistent.", keys: ["tool", "tools", "function", "schema", "system prompt", "hallucinated tool"], here: "should-tools-be-described-in-the-system-prompt-too", lesson: { text: "Beyond RAG: tool calling", slug: "rag-and-agents#beyond-rag-tool-calling" } },
  { q: "Generated code or SQL is wrong", gist: "Back-translate known code into questions to get ground-truth pairs.", keys: ["code", "sql", "text to sql", "codegen", "ground truth", "strategy"], here: "generated-code-gets-the-logic-backwards", lesson: { text: "Reference-based metrics", slug: "evals-fundamentals#reference-based-and-reference-free-metrics" } },
  { q: "Should we add memory?", gist: "Fix other problems first; let users @-reference earlier chats.", keys: ["memory", "remember", "previous chats", "letta", "learn from feedback"], here: "what-about-long-term-memory", lesson: { text: "Truncate to N-1 turns", slug: "collaborative-evaluation#truncate-to-n-1-turns-for-memory-failures" } },
  { q: "Catching errors at run time", gist: "Guardrails: fast, targeted, low false positives. Approximate code checks go far. Read vendor prompts.", keys: ["guardrail", "guardrails", "runtime", "production", "retry", "block", "pii", "critical path"], here: "guardrails-versus-evaluators", lesson: { text: "Guardrails in the request path", slug: "ci-cd-and-monitoring#guardrails-in-the-request-path" } },
  { q: "Run the judge several times?", gist: "Binary judges rarely need it; Likert ones vary more. Keep it simple.", keys: ["judge", "majority", "vote", "repeat", "runs", "variance", "consistency"], here: "should-we-run-each-judge-several-times", lesson: { text: "Scaling judge compute", slug: "scaling-judge-compute#why-voting-helps-and-where-it-stops" } },
  { q: "Use a published 1 to 5 rubric?", gist: "Fine as a start, but Likert is harder to align; start binary and validate on your data.", keys: ["likert", "rubric", "scale", "1 to 5", "score", "icc", "published"], here: "a-published-rubric-uses-a-1-to-5-scale", lesson: { text: "Prefer binary pass/fail", slug: "evals-fundamentals#prefer-binary-passfail-over-1-to-5-scales" } },
  { q: "Compare two models", gist: "Blind pairwise preference on identical inputs; about 100 comparisons.", keys: ["compare", "comparison", "pairwise", "gpt-5", "new model", "benchmark", "release", "upgrade"], here: "comparing-two-models-fairly", lesson: { text: "Direct grading versus comparisons", slug: "evals-fundamentals#direct-grading-versus-comparisons" } },
  { q: "Which model, without overspending?", gist: "Split into subtasks; step down from strong models or up from nano.", keys: ["cost", "cheap", "expensive", "model choice", "nano", "mini", "budget", "spend"], here: "picking-a-model-without-overspending", lesson: { text: "Model cascades", slug: "improvement-and-cost#model-cascades" } },
  { q: "Fine-tune, LoRA or RL?", gist: "LoRA cuts serving cost; count retraining, servers and people. RL still needs error analysis.", keys: ["fine-tune", "fine tune", "finetune", "lora", "rl", "reinforcement", "sft", "train"], here: "lora-rl-and-the-fine-tuning-question", lesson: { text: "Heavier fixes", slug: "improvement-and-cost#heavier-fixes" } },
  { q: "Reviewing reports, not chats", gist: "Design around the one cell the reviewer edits; one screen per area.", keys: ["review", "annotation", "interface", "ui", "spreadsheet", "report", "dashboard", "annotate"], here: "our-output-is-a-report-not-a-chat", lesson: { text: "Interfaces for human review", slug: "human-review-interfaces#principles-of-effective-review-interfaces" } },
  { q: "Build our own tool, or where to store traces?", gist: "Platforms as a database; one row per trace, JSON blob, a column per annotator.", keys: ["platform", "langsmith", "braintrust", "phoenix", "datadog", "postgres", "store", "storage", "labels", "logging", "traces", "notebook", "tool"], here: "where-should-traces-and-labels-live", lesson: { text: "Eval platforms", slug: "eval-platforms#when-a-platform-helps-and-when-it-doesnt" } },
  { q: "Richer user feedback", gist: "After a thumbs-down, three domain-specific yes/no questions.", keys: ["feedback", "thumbs", "users", "form", "granular"], here: "users-want-to-give-more-than-a-thumbs-down", lesson: { text: "Three kinds of feedback", slug: "evaluating-agents#three-kinds-of-feedback" } },
  { q: "Automate the improvement loop", gist: "Automate one kind of fix (prompt optimization); humans steer the rest.", keys: ["automate", "automation", "optimizer", "dspy", "agentic", "auto"], here: "can-we-automate-the-improvement-loop", lesson: { text: "DSPy fireside chat", slug: "dspy-fireside-chat" } },
  { q: "Which failures first?", gist: "Prevalence and severity; user-flagged failures are the tip of the iceberg.", keys: ["prioritize", "priority", "prioritization", "severity", "impact", "which failure"], here: "how-do-we-prioritize-failure-modes", lesson: { text: "Frequency is not the whole risk", slug: "evals-with-domain-experts#frequency-is-not-the-whole-risk" } },
  { q: "Getting a team or company on board", gist: "Look at data with people, publish results, wait for a motivating moment; agree error rates up front.", keys: ["team", "culture", "org", "company", "adopt", "convince", "manager", "leadership", "standardize", "ready"], here: "changing-a-prompt-and-pray-culture", lesson: { text: "From no evals to five as a PM", slug: "evals-for-product-managers" } },
  { q: "Career and buying AI products", gist: "Lead with results, not ideology; a product's moat is its data and eval loop.", keys: ["career", "job", "vendor", "buy", "product", "hype", "showcase"], here: "showing-these-skills-when-everyone-talks-benchmarks", lesson: { text: "Testing real AI products live", slug: "testing-ai-products-live" } },
];

const EXAMPLES = ["our retriever misses documents", "PDF citations", "guardrail in production", "should we fine-tune with LoRA", "convince my team", "where to store traces and labels"];

function score(r: Route, text: string) {
  const t = text.toLowerCase();
  let s = 0;
  for (const k of r.keys) {
    const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")}`);
    if (re.test(t)) s += k.includes(" ") ? 2 : 1;
  }
  return s;
}

export function EvQuestionRouter() {
  const [text, setText] = useState(EXAMPLES[0]);
  const ranked = useMemo(
    () =>
      ROUTES.map((r) => ({ r, s: score(r, text) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 3),
    [text],
  );

  return (
    <Widget title="Where is my answer?" hint="Describe your problem in a few words, or tap an example. The router matches it against the questions on this page.">
      <label htmlFor="ev-oh2-q" className="block text-xs font-semibold uppercase tracking-wide text-muted">
        Your question
      </label>
      <input
        id="ev-oh2-q"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. our judge gives different answers each run"
        className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <Pill key={e} active={text === e} onClick={() => setText(e)}>
            {e}
          </Pill>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {ranked.length === 0 ? (
          <p className="rounded-lg border border-warn bg-warn-soft p-3 text-sm">
            No match. Try a key word such as retrieval, judge, cost, guardrail, team or review. If it is about getting started,
            sampling or stakeholders, see{" "}
            <Link href="/courses/ai-evals/office-hours-part-1" className="font-medium text-accent underline underline-offset-2">
              the first office hours
            </Link>
            .
          </p>
        ) : (
          ranked.map(({ r, s }, i) => (
            <div key={r.here} className={`rounded-lg border p-3 text-sm ${i === 0 ? "border-good bg-good-soft" : "border-border bg-surface-2"}`}>
              <div className="flex items-baseline justify-between gap-2">
                <a href={`#${r.here}`} className="font-medium text-accent underline underline-offset-2">
                  {r.q}
                </a>
                <span className="shrink-0 text-xs text-muted">{s} match{s === 1 ? "" : "es"}</span>
              </div>
              <p className="mt-1 leading-relaxed">{r.gist}</p>
              <p className="mt-1 text-xs text-muted">
                In depth:{" "}
                <Link href={`/courses/ai-evals/${r.lesson.slug}`} className="text-accent underline underline-offset-2">
                  {r.lesson.text}
                </Link>
              </p>
            </div>
          ))
        )}
      </div>
      <p className="mt-3 text-xs text-muted">
        {ROUTES.length} answers indexed. Matching is by keyword, so rephrase if the top hit looks wrong.
      </p>
    </Widget>
  );
}
