import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "ev-oh2-hit-rate",
    lectures: [28],
    tags: ["rag", "retrieval-metrics"],
    type: "mcq",
    prompt:
      "An internal support assistant can only pass the LLM 7 retrieved documents, a hard infrastructure limit. Many documents in the knowledge base could each contain a correct answer. Error analysis shows retrieval is the main problem. Which retrieval metric fits this system best?",
    options: [
      "Hit rate: the share of queries where at least one of the 7 documents contains the answer",
      "Recall@7: the share of all relevant documents that appear in the top 7",
      "Precision@50, to see how many relevant documents exist further down the ranking",
      "An LLM judge rating the final answer's helpfulness on a 1 to 5 scale",
    ],
    answer: "Hit rate: the share of queries where at least one of the 7 documents contains the answer",
    explanation:
      "With a fixed cutoff of 7 and many documents that could answer, the model only needs one good document in the window. Recall@7 would punish the retriever for missing redundant documents that don't matter, and Precision@50 measures documents the LLM never sees. Pick the metric that matches how the system actually uses retrieval.",
    lessonAnchor: "what-rag-problems-show-up-most-in-practice",
  },
  {
    id: "ev-oh2-doc-routing",
    lectures: [28],
    tags: ["rag", "long-documents", "citations"],
    type: "scenario",
    prompt: "Pick the fix the instructors suggested for each document problem.",
    fields: [
      {
        label: "Chunks from a 700-page medical chart are hard to interpret alone, because key facts sit in the discharge summary.",
        options: [
          "Attach LLM-extracted document metadata (summary, document type, key fields) to every chunk",
          "Shrink chunks to 200 tokens so more of them fit",
          "Put the whole chart in the prompt every time",
        ],
        answer: "Attach LLM-extracted document metadata (summary, document type, key fields) to every chunk",
      },
      {
        label: "A construction contract is modified by later change orders and addenda that nothing explicitly links.",
        options: [
          "Precompute a table of which documents can affect each document, and retrieve those links with every hit",
          "Tell the generator to prefer the newest document it happens to see",
          "Index only the latest version of each document",
        ],
        answer: "Precompute a table of which documents can affect each document, and retrieve those links with every hit",
      },
      {
        label: "Summaries of summaries must still cite the exact source text in a clinical record.",
        options: [
          "Ask for line-number citations, pull those lines in code, and carry them into each summary layer",
          "Ask the final summarizer to add citations from memory",
          "Use a Likert judge to rate citation quality",
        ],
        answer: "Ask for line-number citations, pull those lines in code, and carry them into each summary layer",
      },
    ],
    explanation:
      "Each fix moves information to where the model needs it. Document metadata gives every chunk its context, starting generous because removing metadata is easier than adding it. A precomputed link table makes hidden relationships retrievable, which is easier to keep correct offline than at query time. Line numbers turn citations into something code can resolve, so they survive any number of summary layers.",
    lessonAnchor: "chunks-lose-the-context-the-model-needs",
  },
  {
    id: "ev-oh2-context-budget",
    lectures: [28],
    tags: ["long-documents", "context-window"],
    type: "mcq",
    prompt:
      "You must extract every adverse-event mention from long reports, so the model has to attend to every sentence. Your model advertises a 1,000,000-token window. Using Shreya's rule of thumb, roughly how much text should you put in one prompt?",
    options: [
      "About 350,000 tokens: treat the effective window as about 35% of the advertised one",
      "About 700,000 tokens: the 70% cap applies to every task",
      "The full 1,000,000 tokens, since the provider supports it",
      "About 35,000 tokens: exhaustive tasks need 3.5% of the window",
    ],
    answer: "About 350,000 tokens: treat the effective window as about 35% of the advertised one",
    explanation:
      "Shreya caps general prompts at about 70% of the advertised window, but for exhaustive tasks such as finding every instance, she treats the effective window as about 35%: 0.35 times 1,000,000 is 350,000 tokens. She also thinks in pages rather than tokens, with about 50 PDF pages per prompt as her practical ceiling.",
    lessonAnchor: "how-much-of-the-context-window-should-i-fill",
  },
  {
    id: "ev-oh2-runtime-guardrail",
    lectures: [28],
    tags: ["guardrails", "production"],
    type: "scenario",
    prompt:
      "An agent sometimes answers factual questions without calling any lookup tool, so the answer must be invented. You want to catch this at run time.",
    fields: [
      {
        label: "Cheapest first guardrail to try",
        options: [
          "A code check that the answer's content words appear in the tool outputs, itself evaluated against labels",
          "An off-the-shelf hallucination guardrail used as is",
          "A fine-tuned BERT classifier trained on 50 examples",
        ],
        answer: "A code check that the answer's content words appear in the tool outputs, itself evaluated against labels",
      },
      {
        label: "What the user sees when it fires",
        options: [
          "A \"still working\" state while the error is fed back and the answer regenerated",
          "The raw guardrail error message",
          "The ungrounded answer with a warning banner",
        ],
        answer: "A \"still working\" state while the error is fed back and the answer regenerated",
      },
      {
        label: "The target failure rate",
        options: [
          "Whatever cost and latency allow; zero has infinite cost",
          "Exactly zero before launch",
          "The same as the offline judge's TNR",
        ],
        answer: "Whatever cost and latency allow; zero has infinite cost",
      },
    ],
    explanation:
      "Approximate code guardrails are cheap enough for the request path and can remove most of a failure even if not all; validate them like any evaluator. Retries usually look like extra thinking to the user. A fine-tuned classifier needs thousands of labels, not 50, and any vendor guardrail should have its prompt read before use. Driving errors to zero has unbounded cost, so the budget decides.",
    lessonAnchor: "errors-we-cant-drive-to-zero",
  },
  {
    id: "ev-oh2-compare-models",
    lectures: [28],
    tags: ["model-selection", "pairwise"],
    type: "mcq",
    prompt:
      "You want to know whether GPT-5 beats GPT-4.1 on your short two-sentence outputs. Which plan matches the office-hours advice?",
    options: [
      "Run both models on the same inputs, show pairs side by side without model names, and have a human pick the better one for about 100 pairs",
      "Ask GPT-5 to grade both models' outputs on a 1 to 5 scale",
      "Compare their public benchmark scores and pick the higher one",
      "Run each model on different recent production inputs and compare their pass rates",
    ],
    answer:
      "Run both models on the same inputs, show pairs side by side without model names, and have a human pick the better one for about 100 pairs",
    explanation:
      "Pairwise preference is valid only when the model is the sole difference, so inputs must be identical. Blinding avoids bias, and about 100 comparisons gives a solid ranking. A model grading itself is the problem you were trying to avoid, LLM judges favor things like verbosity, and benchmarks are a lossy guide to your own use case.",
    lessonAnchor: "comparing-two-models-fairly",
  },
  {
    id: "ev-oh2-finetune-bill",
    lectures: [28],
    tags: ["fine-tuning", "cost"],
    type: "mcq",
    prompt:
      "A teammate argues: \"A LoRA fine-tune of an open model costs about $50 to train, so it is obviously cheaper than paying for API calls.\" What is the strongest reply from these sessions?",
    options: [
      "Training is the small part: you also pay for servers kept up, retraining whenever the base model or data changes, and the people who run it",
      "LoRA is a different technique from fine-tuning and can't be served in production",
      "RL is cheaper than LoRA, so use reinforcement learning instead",
      "Fine-tuning removes the need for error analysis, so the savings are even larger",
    ],
    answer:
      "Training is the small part: you also pay for servers kept up, retraining whenever the base model or data changes, and the people who run it",
    explanation:
      "LoRA is just a fine-tuning method whose main benefit is cheaper serving. The full bill includes hosting, repeated retraining and staff, which for moderate traffic often exceeds paying a provider. RL is rare in production outside big labs, and any training still needs error analysis to design rewards and evals to check the result.",
    lessonAnchor: "lora-rl-and-the-fine-tuning-question",
  },
  {
    id: "ev-oh2-storage",
    lectures: [28],
    tags: ["review-tools", "infrastructure"],
    type: "scenario",
    prompt: "A team wants a simple setup for traces and human labels. Pick what Shreya described.",
    fields: [
      {
        label: "Trace logging",
        options: [
          "Log to the observability tool you already have, or pick one provider",
          "Log to three vendors to compare them",
          "Skip logging until the annotation app exists",
        ],
        answer: "Log to the observability tool you already have, or pick one provider",
      },
      {
        label: "Label storage",
        options: [
          "A database table with one row per trace, the trace as a JSON blob, and one column per annotator",
          "One row per LLM call, labels in a separate spreadsheet per annotator",
          "Labels kept only inside the vendor UI",
        ],
        answer: "A database table with one row per trace, the trace as a JSON blob, and one column per annotator",
      },
      {
        label: "Annotation app for three domain experts",
        options: [
          "A small hosted web app that reads and writes that table",
          "A local app on your laptop that they screen-share into",
          "The raw vendor trace viewer",
        ],
        answer: "A small hosted web app that reads and writes that table",
      },
    ],
    explanation:
      "Fragmenting traces across tools creates the SQL-stitching pain the team already had. People annotate whole traces, so one row per trace with a column per annotator keeps the data model simple. Local apps are fine when you are the only reviewer; experts need a hosted one. Vendors are \"equally subpar\" for annotation, so invest in exporting into your own app.",
    lessonAnchor: "where-should-traces-and-labels-live",
  },
  {
    id: "ev-oh2-prioritize",
    lectures: [28],
    tags: ["prioritization", "error-analysis"],
    type: "mcq",
    prompt:
      "Error analysis on traces with negative user feedback finds: formatting glitches in 15% of traces, and wrong dosage information in 5%. Your PM wants to fix the most frequent failure first. What does the office-hours advice say?",
    options: [
      "Fix the dosage errors first: severity can outweigh frequency, and user-flagged traces are only the tip of the iceberg, so look beyond them too",
      "Fix formatting first, because prevalence is the only objective way to prioritize",
      "Build a weighted scoring formula across all failure modes before fixing anything",
      "Wait for the next model release, since off-the-shelf quality can't be improved",
    ],
    answer:
      "Fix the dosage errors first: severity can outweigh frequency, and user-flagged traces are only the tip of the iceberg, so look beyond them too",
    explanation:
      "Counts are a good default, but not all failures are equal: a catastrophic one at 5% can outrank an annoying one at 15%. You usually don't need elaborate weights to say so. Negative feedback is a useful sample, but only the failures users noticed, so stay skeptical. Shipping fixes and showing the metric move is also how you counter the belief that AI quality can't be improved.",
    lessonAnchor: "how-do-we-prioritize-failure-modes",
  },
  {
    id: "ev-oh2-adoption",
    lectures: [28],
    tags: ["teams", "adoption"],
    type: "order",
    prompt:
      "Order the steps Hamel and Shreya described for bringing a skeptical team from \"prompt and pray\" to a working eval practice.",
    steps: [
      "When a problem surfaces, open the traces together and find the cause",
      "Repeat until looking at data becomes the team's reflex",
      "Turn the work into visible artifacts and a regular narrative of fixes and error rates",
      "Add judges, review tools and automation as the team asks to scale what it already does",
    ],
    explanation:
      "Neither instructor leads by arguing for evals. They start with a real problem and look at data together; after a few sessions where that finds the cause, skipping it feels embarrassing. Making the work visible (code repos, weekly notes) earns credit for it. Heavier machinery comes last, when people want to automate a habit they already have.",
    lessonAnchor: "changing-a-prompt-and-pray-culture",
  },
];
