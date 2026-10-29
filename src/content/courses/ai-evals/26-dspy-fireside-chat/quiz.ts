import type { Question } from "@/lib/types";

const HELP = ["Run an optimizer", "Change the program or spec first", "Do error analysis first"];

export const quiz: Question[] = [
  {
    id: "ev-dspy-when-optimizer",
    lectures: [26],
    tags: ["optimizers", "gulfs"],
    type: "scenario",
    prompt: "A team builds a support-ticket router in DSPy. For each situation, pick the best next step.",
    fields: [
      {
        label: "The program works well on GPT-5. You want to try a much cheaper model and already have 150 labeled tickets and a validated metric.",
        options: HELP,
        answer: "Run an optimizer",
      },
      {
        label: "Labels say tickets with a refund plus another request go to refunds, but nothing in the signature says so. Those tickets fail.",
        options: HELP,
        answer: "Change the program or spec first",
      },
      {
        label: "The router was just written as a one-liner. Nobody has read any outputs and there is no labeled data.",
        options: HELP,
        answer: "Do error analysis first",
      },
      {
        label: "Tickets about order status fail because the model can't see the order database.",
        options: HELP,
        answer: "Change the program or spec first",
      },
    ],
    explanation:
      "Optimizers close the generalization gulf: a clear spec that the model executes unevenly. A smaller model with an eval set in hand is the textbook case, and smaller models usually have the most headroom. A missing rule is a specification gap and a missing data source is a missing tool; both belong in the program. With no data and no metric there's nothing to optimize against, so start with error analysis.",
    lessonAnchor: "where-optimization-helps-and-where-it-doesnt",
  },
  {
    id: "ev-dspy-lax-metric",
    lectures: [26],
    tags: ["metrics", "optimizers"],
    type: "mcq",
    prompt:
      "An engineer runs an instruction optimizer on a summarizer. The metric returns 1 if the output parses into the expected fields. Every candidate scores 100% and the 'optimized' prompt reads worse than the original. What went wrong?",
    options: [
      "The metric can't distinguish good summaries from bad ones, so the search had nothing to climb",
      "The optimizer needed more trials to find a better instruction",
      "Instruction optimizers don't work on summarization; only few-shot optimizers do",
      "The training set was too large, so the optimizer overfit",
    ],
    answer: "The metric can't distinguish good summaries from bad ones, so the search had nothing to climb",
    explanation:
      "The optimizer sees only the program, the examples and the metric. Whatever the metric rewards is the spec. A parse check rewards everything equally, so any candidate is as good as any other. Measure what you care about (for a summarizer, often a validated LLM judge for a specific failure mode) before you optimize.",
    lessonAnchor: "the-metric-is-the-spec",
  },
  {
    id: "ev-dspy-train-inflated",
    lectures: [26],
    tags: ["overfitting", "splits"],
    type: "scenario",
    prompt:
      "After BootstrapFewShot, the compiled program scores 96% on its training set and 71% on a held-out dev set. Two of the chosen demos turn out to have wrong gold labels.",
    fields: [
      {
        label: "Which number should you report as the program's quality?",
        options: ["96% on train", "71% on dev", "The average, about 84%"],
        answer: "71% on dev",
      },
      {
        label: "Why is the train score so high?",
        options: [
          "Demos come from train, so those examples have their answers in the prompt",
          "Train examples are always easier than dev examples",
          "The optimizer evaluates train with a more lenient metric",
        ],
        answer: "Demos come from train, so those examples have their answers in the prompt",
      },
      {
        label: "Best first fix for the gap?",
        options: ["Fix the wrong labels and re-run", "Add more demos", "Report the train score with a caveat"],
        answer: "Fix the wrong labels and re-run",
      },
    ],
    explanation:
      "Training examples used as demos pass trivially, so train accuracy is inflated, and an optimizer that matches against gold labels rewards wrong labels by copying them into the prompt. The held-out number is the honest one. Clean the labels (the metric's data is part of the spec), then compile again and re-check on dev, keeping a test set for one final measurement.",
    lessonAnchor: "the-metric-is-the-spec",
  },
  {
    id: "ev-dspy-better-string",
    lectures: [26],
    tags: ["philosophy"],
    type: "mcq",
    prompt:
      "A teammate wants to give DSPy their current prompt string, get back an optimized string, and paste it into the codebase. Why does Omar refuse this workflow?",
    options: [
      "The pasted string is tuned to one model and documents none of the intent, like pasting hand-optimized assembly into source code",
      "Optimized strings are always longer and cost more tokens",
      "DSPy's license forbids exporting prompts",
      "Prompt tricks such as XML tags or all caps never actually help",
    ],
    answer:
      "The pasted string is tuned to one model and documents none of the intent, like pasting hand-optimized assembly into source code",
    explanation:
      "Omar grants that odd tricks can genuinely help a given model. The problem is maintaining them by hand: they lose readability and portability, and the next model may not benefit. Keep the intent (signatures, modules) and the eval set as your source, and let optimizers regenerate the model-specific last mile.",
    lessonAnchor: "why-give-me-a-better-string-is-the-wrong-ask",
  },
  {
    id: "ev-dspy-signature-format",
    lectures: [26],
    tags: ["signatures"],
    type: "mcq",
    prompt: "Which of these belongs in a DSPy signature's instructions?",
    options: [
      "\"If a ticket asks for a refund and anything else, route it to refunds.\"",
      "\"Respond only with valid JSON wrapped in <answer> tags.\"",
      "\"IMPORTANT!!! Read carefully before answering.\"",
      "\"Think step by step before giving the team.\"",
    ],
    answer: "\"If a ticket asks for a refund and anything else, route it to refunds.\"",
    explanation:
      "A signature defines the task: typed inputs and outputs plus the fuzzy intent in plain English. Output formatting is the adapter's job, chain of thought is a module applied on top, and emphasis tricks are the model-specific last mile that optimizers should handle. A business rule your labels depend on is exactly what belongs there.",
    lessonAnchor: "signatures-modules-and-adapters",
  },
  {
    id: "ev-dspy-outer-loop",
    lectures: [26],
    tags: ["workflow"],
    type: "order",
    prompt: "Put Omar's outer loop for building a DSPy system in order.",
    steps: [
      "Find out what stakeholders actually want",
      "Write a one-line program with chain of thought and the largest affordable model",
      "Read outputs and do error analysis to see where it falls apart",
      "Grow the signature and program with what you learned: instructions, types, tools, decomposition",
      "Collect failures and edge cases into a labeled dataset",
      "Run several optimizers and compare them on held-out data",
    ],
    explanation:
      "Start simple and add only what you learn the hard way, so the code becomes the spec. A dataset emerges from iteration, and once it exists, optimization is cheap to try. Optimizing before the program and data exist just tunes a guess.",
    lessonAnchor: "omars-outer-loop",
  },
  {
    id: "ev-dspy-three-ingredients",
    lectures: [26],
    tags: ["philosophy", "gulfs"],
    type: "scenario",
    prompt: "Match each piece of a system description to the ingredient Omar says carries it.",
    fields: [
      {
        label: "The summarizer step sees retrieved passages but not the user's account data",
        options: ["Code", "Natural language", "Evals"],
        answer: "Code",
      },
      {
        label: "Summaries should sound calm and avoid jargon for non-technical customers",
        options: ["Code", "Natural language", "Evals"],
        answer: "Natural language",
      },
      {
        label: "On 12 of 100 labeled tickets with typos, the router picks the wrong team",
        options: ["Code", "Natural language", "Evals"],
        answer: "Evals",
      },
    ],
    explanation:
      "Code holds structure and information flow, English holds the fuzzy intent, and evals capture the long tail where the model doesn't live up to what you asked. The last one is also what an optimizer consumes, which is why the eval set is the center of the work.",
    lessonAnchor: "programming-not-prompting",
  },
];
