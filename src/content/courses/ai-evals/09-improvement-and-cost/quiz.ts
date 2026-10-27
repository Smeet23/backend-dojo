import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "ev-cost-accuracy-ladder",
    lectures: [9],
    tags: ["accuracy"],
    type: "order",
    prompt:
      "Error analysis on your recipe bot shows it often ignores dietary restrictions. Put these fixes in the order you should try them, measuring with your evals after each.",
    steps: [
      "Clarify the dietary-restriction instructions in the prompt",
      "Add 2 or 3 few-shot examples that show restrictions being respected",
      "Decompose: extract the restrictions first, then generate the recipe with them as explicit input",
      "Fine-tune a model on hundreds of labeled examples",
    ],
    explanation:
      "Start with the cheapest, highest-impact change (a clearer prompt), then targeted examples, then a structural change. Fine-tuning comes last: it needs hundreds of labeled examples, hosting and on-call, and re-tuning as base models improve.",
    lessonAnchor: "quick-wins-fix-the-prompt",
  },
  {
    id: "ev-cost-fewshot-leak",
    lectures: [9],
    tags: ["accuracy", "few-shot"],
    type: "mcq",
    prompt:
      "To fix a recurring failure, a teammate copies the three worst traces from the CI golden set into the prompt as few-shot examples. CI pass rate jumps from 82% to 97%. What is the problem?",
    options: [
      "Nothing: the failure is fixed and CI proves it",
      "The examples now overlap with the test cases, so CI overstates the improvement",
      "Few-shot examples never help modern models",
      "Three examples is too few; it needs at least twenty",
    ],
    answer: "The examples now overlap with the test cases, so CI overstates the improvement",
    explanation:
      "Few-shot examples should target the observed failures but be distinct from the cases you measure on. Otherwise the model is partly being tested on answers it was shown, the same overfitting trap as testing a judge on its own few-shot examples.",
    lessonAnchor: "quick-wins-fix-the-prompt",
  },
  {
    id: "ev-cost-structural",
    lectures: [9],
    tags: ["accuracy", "rag", "tools"],
    type: "scenario",
    prompt:
      "Your leasing assistant's prompt has been refined three times and accuracy has plateaued. Traces show two remaining failure modes. Pick the most likely effective fix for each.",
    fields: [
      {
        label: "Answers cite the wrong pet policy; the correct policy document is often not among the retrieved chunks",
        options: [
          "Add 'be accurate about pet policies' to the prompt",
          "Fix retrieval: build a retrieval eval, then tune the query rewrite, chunking or re-ranking",
          "Switch to a larger generation model",
          "Fine-tune on pet policy questions",
        ],
        answer: "Fix retrieval: build a retrieval eval, then tune the query rewrite, chunking or re-ranking",
      },
      {
        label: "The calendar tool is often called with dates like 'next Tuesday' instead of YYYY-MM-DD; the system prompt and the tool schema describe the date parameter differently",
        options: [
          "Retry the call until it succeeds",
          "Make one consistent, explicit description of the date format in the tool spec and remove the conflicting one",
          "Remove the calendar tool",
          "Raise the temperature",
        ],
        answer: "Make one consistent, explicit description of the date format in the tool spec and remove the conflicting one",
      },
    ],
    explanation:
      "If the right document never reaches the model, no generation change will fix it: in RAG the problem is usually retrieval. Tool misuse is a gulf of specification for tools, and descriptions duplicated in the prompt and the schema drift apart, so keep one clear source of truth.",
    lessonAnchor: "structural-changes",
  },
  {
    id: "ev-cost-premature",
    lectures: [9],
    tags: ["cost"],
    type: "mcq",
    prompt:
      "Your support bot fails on 30% of sampled traces for its top failure mode, and finance asks you to halve the LLM bill this quarter. What should you do first?",
    options: [
      "Swap every call to the smallest available model",
      "Build a model cascade with a 90% agreement target",
      "Keep working on accuracy until your evals show the failure modes are under control, then cut cost with evals guarding quality",
      "Cut the system prompt in half",
    ],
    answer: "Keep working on accuracy until your evals show the failure modes are under control, then cut cost with evals guarding quality",
    explanation:
      "Cost optimization on an application that still produces bad outputs just makes wrong answers cheaper. The instructors stress fixing accuracy first. When you do cut cost, every change is rerun through the evals so you know quality held.",
    lessonAnchor: "cost-only-once-quality-is-good",
  },
  {
    id: "ev-cost-tiered",
    lectures: [9],
    tags: ["cost", "models"],
    type: "scenario",
    prompt:
      "A support pipeline has two LLM steps: (1) classify the incoming message as billing, technical or general; (2) write a detailed, personalized reply for complex technical issues. Both use the flagship model.",
    fields: [
      {
        label: "Best candidate to move to a small model",
        options: ["Step 1, the classifier", "Step 2, the detailed reply", "Neither: never mix models", "Both, immediately"],
        answer: "Step 1, the classifier",
      },
      {
        label: "How you decide the small model is good enough",
        options: [
          "It's from the same provider, so it behaves the same",
          "Run it through the same evals and compare against the flagship's results",
          "Check its score on a public benchmark",
          "Ship it and watch for complaints",
        ],
        answer: "Run it through the same evals and compare against the flagship's results",
      },
    ],
    explanation:
      "Simple, high-volume steps like classification or routing often run fine on a model 10x to 100x cheaper, while nuanced generation may need the big one. Public benchmarks don't measure your task; your own evals do.",
    lessonAnchor: "simple-cost-strategies",
  },
  {
    id: "ev-cost-cache-layout",
    lectures: [9],
    tags: ["caching"],
    type: "scenario",
    prompt:
      "Your prompt is laid out as: current timestamp, then a 4,000-token system prompt with tool definitions and examples, then retrieved documents, then the user's question. The provider dashboard shows almost no cached tokens.",
    fields: [
      {
        label: "Why the cache never hits",
        options: [
          "The system prompt is too long to cache",
          "The timestamp at the very top changes every request, so the shared prefix ends at the first token",
          "Retrieved documents are never cacheable",
          "Caching only works for output tokens",
        ],
        answer: "The timestamp at the very top changes every request, so the shared prefix ends at the first token",
      },
      {
        label: "Best layout",
        options: [
          "Timestamp, system prompt, documents, question",
          "Question, documents, system prompt",
          "System prompt and tool definitions, then timestamp, documents and question",
          "Documents, system prompt, question, timestamp",
        ],
        answer: "System prompt and tool definitions, then timestamp, documents and question",
      },
    ],
    explanation:
      "Providers reuse cached keys and values only for an identical prefix; one differing token stops the match. Put everything static first and every dynamic piece (timestamps, retrieved text, the user message) after it.",
    lessonAnchor: "how-provider-prompt-caching-works",
  },
  {
    id: "ev-cost-cache-math",
    lectures: [9],
    tags: ["caching", "math"],
    type: "scenario",
    prompt:
      "Each request has a 2,000-token static prefix and 1,000 variable input tokens. You serve 50,000 requests a day. Input costs $2 per million tokens, and cached tokens are 90% off. Assume every request hits the cache. Input tokens only.",
    fields: [
      { label: "Daily input cost without caching", options: ["$100", "$200", "$300", "$3,000"], answer: "$300" },
      { label: "Daily input cost with the prefix cached", options: ["$30", "$120", "$200", "$270"], answer: "$120" },
    ],
    explanation:
      "Without caching: 3,000 × 50,000 = 150M tokens × $2/M = $300. With caching: the prefix is 100M tokens at $0.20/M = $20, plus 50M variable tokens at $2/M = $100, total $120. The variable part, not the prefix, now dominates the bill.",
    lessonAnchor: "worked-example-caching-a-long-system-prompt",
  },
  {
    id: "ev-cost-logprob",
    lectures: [9],
    tags: ["cascades", "logprobs"],
    type: "scenario",
    prompt:
      "Your proxy judge returns logprob(Pass) = -0.2 and logprob(Fail) = -1.8. The tuned threshold for Pass predictions is 0.90.",
    fields: [
      { label: "Normalized confidence in Pass", options: ["About 18%", "About 67%", "About 83%", "About 98%"], answer: "About 83%" },
      {
        label: "What the cascade does",
        options: ["Returns Pass from the proxy", "Escalates to the oracle", "Returns Fail", "Asks the proxy again"],
        answer: "Escalates to the oracle",
      },
    ],
    explanation:
      "e^-0.2 ≈ 0.819 and e^-1.8 ≈ 0.165. Normalized: 0.819 / 0.984 ≈ 0.83. That is below the 0.90 threshold, so the query goes to the oracle and the oracle's answer is returned.",
    lessonAnchor: "confidence-from-logprobs",
  },
  {
    id: "ev-cost-threshold",
    lectures: [9],
    tags: ["cascades", "math"],
    type: "scenario",
    prompt:
      "On a 200-example dev set labeled by the oracle, you simulate the cascade. At T = 0.7 the proxy keeps 160 answers, 12 of them wrong. At T = 0.8 it keeps 130, 5 wrong. At T = 0.9 it keeps 90, 1 wrong. Escalated examples get the oracle's answer. Target: 95% agreement with the oracle. A proxy call costs $0.001 and an oracle call $0.02.",
    fields: [
      { label: "Threshold to choose", options: ["0.7", "0.8", "0.9", "Infinity (always escalate)"], answer: "0.8" },
      { label: "Share of queries the proxy handles", options: ["45%", "65%", "80%", "97.5%"], answer: "65%" },
      { label: "Cascade cost as a share of oracle-only cost", options: ["35%", "40%", "65%", "100%"], answer: "40%" },
    ],
    explanation:
      "Agreement is 1 minus wrong kept over 200: 94% at 0.7 (misses), 97.5% at 0.8, 99.5% at 0.9. Pick the lowest T that meets the target, 0.8, so the proxy keeps 130/200 = 65%. Cost: 200 proxy calls ($0.20) plus 70 oracle calls ($1.40) = $1.60, against $4.00 for oracle-only, which is 40%.",
    lessonAnchor: "tuning-the-threshold",
  },
  {
    id: "ev-cost-oracle-relative",
    lectures: [9],
    tags: ["cascades"],
    type: "mcq",
    prompt:
      "Your oracle judge agrees with human labels 85% of the time. You tune a cascade to 95% agreement with the oracle. A PM concludes the cascade is '95% accurate'. What is correct?",
    options: [
      "The PM is right: the cascade is 95% accurate against ground truth",
      "The cascade reproduces the oracle's answers 95% of the time; it does not fix the oracle's own errors, so against humans expect roughly the oracle's 85%, not 95%",
      "The cascade beats the oracle, because the proxy catches some of its mistakes",
      "Agreement cannot be measured without ground-truth labels for every query",
    ],
    answer:
      "The cascade reproduces the oracle's answers 95% of the time; it does not fix the oracle's own errors, so against humans expect roughly the oracle's 85%, not 95%",
    explanation:
      "A cascade's guarantee is relative to the oracle. Its job is to imitate the oracle cheaply, not to exceed it, so the oracle's own accuracy against ground truth is the ceiling you should report alongside the agreement number.",
    lessonAnchor: "model-cascades",
  },
];
