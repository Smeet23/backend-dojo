import type { Question } from "@/lib/types";

const GULFS = ["Gulf of comprehension", "Gulf of specification", "Gulf of generalization"];
const METRIC = ["Reference-based", "Reference-free"];

export const quiz: Question[] = [
  {
    id: "ev-fund-gulf-sort",
    lectures: [1],
    tags: ["three-gulfs"],
    type: "scenario",
    prompt: "Your travel-assistant team reports three problems. Which gulf does each one come from?",
    fields: [
      {
        label: "The prompt says \"recommend affordable hotels\". Some replies cap at $80 a night, others suggest $250 boutique hotels.",
        options: GULFS,
        answer: "Gulf of specification",
      },
      {
        label: "The prompt clearly says to respect the stated budget. It does for one-city trips, but on multi-city itineraries it regularly exceeds the total.",
        options: GULFS,
        answer: "Gulf of generalization",
      },
      {
        label: "After launch you discover a third of queries are about visas, a topic nobody designed for, because no one had read real queries.",
        options: GULFS,
        answer: "Gulf of comprehension",
      },
    ],
    explanation:
      "\"Affordable\" was never defined, so the model guesses: specification. A clear rule applied inconsistently on harder inputs is generalization. Not knowing what users actually send is comprehension, closed by reading data.",
    lessonAnchor: "why-llm-pipelines-are-hard-the-three-gulfs",
  },
  {
    id: "ev-fund-premature-fix",
    lectures: [1],
    tags: ["three-gulfs", "lifecycle"],
    type: "mcq",
    prompt:
      "Your recipe bot's prompt is \"Suggest an easy recipe for {query}.\" Users say the recipes are sometimes too elaborate. An engineer proposes fine-tuning on 2,000 curated recipes. What should you do first?",
    options: [
      "Fine-tune, since it fixes generalization problems at the root",
      "Switch to the largest available model",
      "Define \"easy\" explicitly in the prompt (ingredient count, time, technique), rerun, and read the outputs",
      "Add a 1 to 5 \"easiness\" LLM judge to production",
    ],
    answer: "Define \"easy\" explicitly in the prompt (ingredient count, time, technique), rerun, and read the outputs",
    explanation:
      "This is a specification gap: the model can't know what you mean by easy. Generalization tools like fine-tuning or bigger models come only after comprehension and specification are closed, otherwise you pay more for the same guessing.",
    lessonAnchor: "gulf-of-generalization",
  },
  {
    id: "ev-fund-lifecycle-order",
    lectures: [1],
    tags: ["lifecycle"],
    type: "order",
    prompt: "Put the work on a new support bot in the order the course recommends.",
    steps: [
      "Write a reasonable initial prompt yourself",
      "Run it on a set of real or synthetic queries to collect traces",
      "Read the traces and categorize failure modes",
      "Build automated evaluators to measure how often each failure occurs",
      "Make targeted fixes to the most common failures, then repeat the loop",
    ],
    explanation:
      "Initial pipeline first, then Analyze (collect traces, find failure modes), Measure (quantify them with evaluators), Improve (targeted fixes). The loop repeats for the life of the product.",
    lessonAnchor: "the-analyze-measure-improve-lifecycle",
  },
  {
    id: "ev-fund-judge-leak",
    lectures: [1],
    tags: ["pitfalls", "llm-judge"],
    type: "mcq",
    prompt:
      "A teammate's LLM judge for \"tone is professional\" includes 12 labeled examples in its prompt. They test it on those same 12 examples, get 100% agreement with human labels, and want to ship it. What's the problem?",
    options: [
      "12 examples is too many for a judge prompt",
      "The test examples leaked from the prompt, so 100% says nothing about how it will do on new data",
      "LLM judges can never be trusted for tone",
      "They should have used a 1 to 5 scale instead of pass/fail",
    ],
    answer: "The test examples leaked from the prompt, so 100% says nothing about how it will do on new data",
    explanation:
      "Classic train/test leakage. A judge tested on its own few-shot examples looks perfect, then behaves like a random number on production traffic. Validate on labeled examples it has never seen.",
    lessonAnchor: "pitfalls-at-each-stage",
  },
  {
    id: "ev-fund-prompt-gaps",
    lectures: [1],
    tags: ["prompting"],
    type: "scenario",
    prompt:
      "Your system prompt reads: \"You are a recipe assistant. Suggest a recipe for the user.\" For each observed problem, which component is missing?",
    fields: [
      {
        label: "Your app's parser fails because replies come back in a different structure every time",
        options: ["Role and objective", "Output format", "Context", "Reasoning steps"],
        answer: "Output format",
      },
      {
        label: "The bot suggests a peanut sauce to a user whose profile says peanut allergy",
        options: ["Context", "Delimiters", "Few-shot examples", "Role and objective"],
        answer: "Context",
      },
      {
        label: "Recipes sometimes omit quantities, though you always want them",
        options: ["Instructions and response rules", "Reasoning steps", "Delimiters", "Role and objective"],
        answer: "Instructions and response rules",
      },
    ],
    explanation:
      "Format must be stated (or enforced by a structured-outputs API) before you analyze errors. The model can't respect a profile it was never shown, so include it as context, and also add a never-include-allergens rule. Requirements like \"always give quantities\" belong in explicit rules.",
    lessonAnchor: "components-of-a-good-prompt",
  },
  {
    id: "ev-fund-metric-kind",
    lectures: [1],
    tags: ["metrics"],
    type: "scenario",
    prompt: "Classify each eval for a text-to-SQL feature and a summarizer.",
    fields: [
      { label: "Generated SQL parses and runs without error", options: METRIC, answer: "Reference-free" },
      { label: "Generated SQL returns the same rows as a known-correct query", options: METRIC, answer: "Reference-based" },
      { label: "Summary contains no claims absent from the source document", options: METRIC, answer: "Reference-free" },
      { label: "ROUGE overlap with a human-written summary", options: METRIC, answer: "Reference-based" },
    ],
    explanation:
      "Reference-based means comparing to a prepared golden answer. Running code alone is a validity check (reference-free); comparing its result to an expected result is reference-based. Faithfulness to the source checks a property of the output, no golden summary needed.",
    lessonAnchor: "reference-based-and-reference-free-metrics",
  },
  {
    id: "ev-fund-benchmarks",
    lectures: [1],
    tags: ["benchmarks"],
    type: "mcq",
    prompt:
      "You're choosing a model for a legal-memo summarizer. Model A beats Model B by 4 points on MMLU. Your manager says \"pick A, done.\" What's the best response?",
    options: [
      "Agree: MMLU measures reasoning, which is what summarization needs",
      "Use MMLU to shortlist, then compare both on real memos with your own pass/fail criteria (e.g. attorneys judging accuracy and relevance)",
      "Ignore benchmarks entirely; they're always misleading",
      "Pick B, since smaller benchmark scores mean less overfitting",
    ],
    answer: "Use MMLU to shortlist, then compare both on real memos with your own pass/fail criteria (e.g. attorneys judging accuracy and relevance)",
    explanation:
      "Foundation benchmarks are like standardized tests: useful for a shortlist, not a hiring decision. Only application evals on your data and criteria tell you which model works for your task.",
    lessonAnchor: "benchmarks-versus-application-evals",
  },
  {
    id: "ev-fund-binary",
    lectures: [1],
    tags: ["labels"],
    type: "mcq",
    prompt:
      "Two annotators rate 50 recipe replies for helpfulness on a 1 to 5 scale. They agree exactly on only 18, mostly arguing over 3 versus 4. What's the best change?",
    options: [
      "Move to a 1 to 10 scale for finer resolution",
      "Average their scores and move on",
      "Replace the scale with a few binary pass/fail criteria (ingredients available? steps clear? fits time limit?)",
      "Drop human labels and let an LLM judge assign the 1 to 5 scores",
    ],
    answer: "Replace the scale with a few binary pass/fail criteria (ingredients available? steps clear? fits time limit?)",
    explanation:
      "Middle points on a scale are hard to define, so people disagree and the numbers turn into noise. Binary criteria force a clear decision, are easier to agree on and to validate a judge against, and point straight at what to fix. More points make it worse, and an LLM judge inherits the same ambiguity.",
    lessonAnchor: "prefer-binary-passfail-over-1-to-5-scales",
  },
  {
    id: "ev-fund-pairwise",
    lectures: [1],
    tags: ["labels"],
    type: "scenario",
    prompt: "Pick the labeling method for each goal.",
    fields: [
      {
        label: "Report what fraction of flight suggestions stay within the user's budget",
        options: ["Direct grading (pass/fail)", "Pairwise comparison", "Ranking"],
        answer: "Direct grading (pass/fail)",
      },
      {
        label: "Two prompt versions score the same pass rate; decide which reads more clearly to users",
        options: ["Direct grading (pass/fail)", "Pairwise comparison", "Reference-based exact match"],
        answer: "Pairwise comparison",
      },
    ],
    explanation:
      "Direct grading gives an absolute rate against a clear rule. Pairwise comparison on a specific criterion is the tool for choosing between versions, especially when they look similar on absolute metrics, and it's often easier for raters than precise scores.",
    lessonAnchor: "direct-grading-versus-comparisons",
  },
  {
    id: "ev-fund-spec-check",
    lectures: [1],
    tags: ["specifications"],
    type: "mcq",
    prompt: "Which recipe-bot specification is written well enough to evaluate?",
    options: [
      "Recipes should be good",
      "Be helpful and friendly",
      "If the user states an allergy, the recipe must not contain that ingredient",
      "Make users happy with their meal",
    ],
    answer: "If the user states an allergy, the recipe must not contain that ingredient",
    explanation:
      "A good specification passes the test \"could I check this?\" The allergy rule can be checked with code or a simple judge question. The others are too vague to verify, so each needs to be broken down into concrete always/never rules.",
    lessonAnchor: "specifications-always-and-never",
  },
];
