import type { Question } from "@/lib/types";

const NEXT = ["Fix the prompt, no eval yet", "Build an automated evaluator"];
const KIND = ["Code-based eval", "LLM-as-judge"];

export const quiz: Question[] = [
  {
    id: "ev-auto-spec-vs-gen",
    lectures: [4],
    tags: ["what-to-measure", "gulfs"],
    type: "scenario",
    prompt:
      "Error analysis on the leasing assistant turned up three failure modes. For each, decide the next step.",
    fields: [
      {
        label: "Users ask about the gym; the agent confirms it exists but never shares photos. The system prompt says nothing about photos.",
        options: NEXT,
        answer: "Fix the prompt, no eval yet",
      },
      {
        label: "Tours land on the wrong day. The prompt doesn't include today's date.",
        options: NEXT,
        answer: "Fix the prompt, no eval yet",
      },
      {
        label: "The prompt says to honor every stated filter, yet \"under $2,000\" sometimes disappears from the generated query.",
        options: NEXT,
        answer: "Build an automated evaluator",
      },
    ],
    explanation:
      "The first two are specification failures: the model was never told. An obvious fix you're nearly sure will work beats an eval. The third is a generalization failure: clear instructions, inconsistent execution across inputs. That is exactly what evaluators are for.",
    lessonAnchor: "specification-or-generalization",
  },
  {
    id: "ev-auto-code-or-judge",
    lectures: [4],
    tags: ["code-evals", "llm-judge"],
    type: "scenario",
    prompt: "These are all generalization failures you want to measure. Pick the evaluator type for each.",
    fields: [
      { label: "The agent calls tools that aren't in its tool schemas", options: KIND, answer: "Code-based eval" },
      { label: "Replies mention the internal database (\"our Postgres tables show...\")", options: KIND, answer: "Code-based eval" },
      {
        label: "On ambiguous questions, the agent gives generic facts instead of clarifying what the user needs",
        options: KIND,
        answer: "LLM-as-judge",
      },
    ],
    explanation:
      "Tool names can be checked against an allowlist built from your schemas, and database names with a keyword match: deterministic, cheap, and usable as guardrails. Whether a reply moves an ambiguous conversation forward requires interpretation, so it needs a judge with precise pass/fail definitions.",
    lessonAnchor: "code-based-evaluators",
  },
  {
    id: "ev-auto-broad-judge",
    lectures: [4],
    tags: ["judge-prompt"],
    type: "mcq",
    prompt:
      "A teammate proposes one judge for all leasing-assistant replies: \"Rate from 1 to 10 how good this reply is, considering accuracy, tone, helpfulness and formatting.\" What is the best change?",
    options: [
      "Split it into separate judges, one per observed failure mode, each returning Pass or Fail",
      "Keep it, but use a 1 to 5 scale so it's easier to calibrate",
      "Keep it, but set temperature to 0 so the scores become reliable",
      "Use a stronger model so it can weigh all four aspects at once",
    ],
    answer: "Split it into separate judges, one per observed failure mode, each returning Pass or Fail",
    explanation:
      "A broad multi-aspect score is hard to validate: you'd need to check what every score value means, and a low score doesn't tell you what broke. Binary judges scoped to one failure mode from error analysis are easy to align and to act on. Temperature 0 doesn't remove inconsistency, and a stronger model doesn't fix a vague criterion.",
    lessonAnchor: "judge-prerequisites",
  },
  {
    id: "ev-auto-tpr-tnr-math",
    lectures: [4],
    tags: ["tpr", "tnr"],
    type: "scenario",
    prompt:
      "Your dev set has 50 traces you labeled Pass and 30 you labeled Fail. The judge says Pass on 45 of your Passes, and Fail on 18 of your Fails.",
    fields: [
      { label: "TPR", options: ["0.60", "0.79", "0.90", "0.94"], answer: "0.90" },
      { label: "TNR", options: ["0.36", "0.60", "0.79", "0.90"], answer: "0.60" },
      {
        label: "Where to look first",
        options: [
          "The 12 traces the judge passed but you failed",
          "The 5 traces the judge failed but you passed",
          "The test set, to confirm the numbers",
          "Nowhere: overall agreement is 79%, good enough",
        ],
        answer: "The 12 traces the judge passed but you failed",
      },
    ],
    explanation:
      "TPR = 45/50 = 0.90 and TNR = 18/30 = 0.60. Overall agreement is (45 + 18)/80 ≈ 79%, which hides the weak spot: the judge misses 12 of 30 real failures. Inspect those false passes, then sharpen the fail definition or swap in training examples like them. The test set stays untouched until the prompt is final.",
    lessonAnchor: "measuring-agreement-tpr-and-tnr",
  },
  {
    id: "ev-auto-always-pass",
    lectures: [4],
    tags: ["tpr", "tnr", "imbalance"],
    type: "mcq",
    prompt:
      "About 8% of your traces fail a criterion. A vendor demo shows a judge with 92% agreement with human labels on a random sample of your traffic. Which follow-up question exposes whether it's any good?",
    options: [
      "What are its TPR and TNR separately?",
      "Which model does it use?",
      "Was it run at temperature 0?",
      "How many traces was the 92% measured on?",
    ],
    answer: "What are its TPR and TNR separately?",
    explanation:
      "A function that always says Pass scores 92% agreement here, with TPR 100% and TNR 0%. Agreement on imbalanced data says almost nothing about catching failures. Sample size matters too, but even a huge sample can't rescue a judge that never says Fail.",
    lessonAnchor: "why-accuracy-alone-lies",
  },
  {
    id: "ev-auto-split-roles",
    lectures: [4],
    tags: ["data-splits"],
    type: "scenario",
    prompt: "You've labeled 100 traces for \"unhelpful response to ambiguous queries\", 50 Pass and 50 Fail.",
    fields: [
      { label: "Roughly how many go to the training set?", options: ["About 15 to 20", "About 50", "About 70 to 80", "None"], answer: "About 15 to 20" },
      { label: "Few-shot examples may come from", options: ["Train only", "Train or dev", "Any split", "Test only"], answer: "Train only" },
      { label: "You hill-climb prompt edits against", options: ["Dev", "Train", "Test", "Train and test combined"], answer: "Dev" },
      { label: "Test is used", options: ["Once, after the prompt is final", "After every prompt edit", "To pick few-shot examples", "Never"], answer: "Once, after the prompt is final" },
    ],
    explanation:
      "You're not fitting parameters, just choosing a few examples, so train needs only 10 to 20% of the labels. The rest measures the judge: dev for iterating, test for one unbiased final reading of TPR and TNR, which the next lesson uses to correct the judge's estimates.",
    lessonAnchor: "train-dev-and-test-splits",
  },
  {
    id: "ev-auto-leak",
    lectures: [4],
    tags: ["data-splits", "leakage"],
    type: "mcq",
    prompt:
      "To fix a stubborn judge, a teammate pastes the three dev traces it got wrong into the prompt as few-shot examples. Dev TNR jumps from 0.62 to 0.91. What should you do?",
    options: [
      "Move those three traces to the training set so they no longer count in dev, then re-measure on the rest of dev",
      "Report 0.91: the judge clearly improved",
      "Run the test set now to confirm the jump",
      "Keep the examples and delete those traces from dev, keeping the 0.91 figure",
    ],
    answer: "Move those three traces to the training set so they no longer count in dev, then re-measure on the rest of dev",
    explanation:
      "Hard cases make great few-shot examples, but a trace in the prompt can't also be scored: the judge has been given the answer, so 0.91 is inflated. Moving them to train is legitimate; the honest number is the dev score without them, recomputed with the new prompt. Using test to check every edit would just turn it into a second dev set.",
    lessonAnchor: "dont-overfit",
  },
  {
    id: "ev-auto-loop-order",
    lectures: [4],
    tags: ["refinement-loop"],
    type: "order",
    prompt: "Put the steps of building a trustworthy LLM judge in order.",
    steps: [
      "Pick one well-scoped failure mode and label traces Pass or Fail for it",
      "Split the labels into train, dev and test",
      "Write a baseline prompt with definitions, train-set examples and JSON output",
      "Run the judge on dev and compute TPR and TNR",
      "Inspect disagreements and refine definitions or swap examples, repeating on dev",
      "Run the final prompt once on test and record TPR and TNR",
    ],
    explanation:
      "Labels and splits come before the prompt, because the few-shot examples must come from train. The loop iterates on dev only. Test is touched once at the end, giving the unbiased TPR and TNR needed to correct success-rate estimates later.",
    lessonAnchor: "the-refinement-loop",
  },
  {
    id: "ev-auto-substantiated",
    lectures: [4],
    tags: ["refinement-loop", "worked-example"],
    type: "scenario",
    prompt:
      "Your judge for \"are all assistant claims substantiated by tool data?\" uses five random Pass and five random Fail examples from train. It scores TPR 0.93 and TNR 0.80 on train, but on dev its TNR drops sharply.",
    fields: [
      {
        label: "Most likely reason",
        options: [
          "The random failing examples don't represent the kinds of unsupported claims in dev",
          "The dev labels are wrong",
          "The judge needs a 1 to 5 scale",
          "Train is too large",
        ],
        answer: "The random failing examples don't represent the kinds of unsupported claims in dev",
      },
      {
        label: "First thing to try",
        options: [
          "Read the dev false passes and swap in more representative failing examples from train",
          "Copy the dev false passes into the prompt",
          "Check test to see whether it's also low",
          "Label 200 more traces",
        ],
        answer: "Read the dev false passes and swap in more representative failing examples from train",
      },
      {
        label: "If that still stalls, after trying a stronger judge model",
        options: [
          "Split the criterion, e.g. unsupported claims about units vs about programs and partnerships",
          "Ship it, since train scores are good",
          "Ask the judge to also check tone",
          "Average train and dev scores",
        ],
        answer: "Split the criterion, e.g. unsupported claims about units vs about programs and partnerships",
      },
    ],
    explanation:
      "Train looks good because the examples came from train. The dev drop says they don't generalize. Look at the errors and choose better training examples (never copy dev traces in without moving them). If alignment stalls, upgrade the model, then split the failure mode into narrower ones, e.g. by clustering the unsupported claims. Collecting more labels is the last resort.",
    lessonAnchor: "worked-example-are-claims-substantiated",
  },
  {
    id: "ev-auto-few-shot",
    lectures: [4],
    tags: ["few-shot", "judge-prompt"],
    type: "mcq",
    prompt:
      "You're choosing few-shot examples for a judge whose traces are short chat exchanges. Which choice follows the course's guidance?",
    options: [
      "A few passes and a few fails, diverse and including tricky borderline cases",
      "Ten obvious passes, since the judge should learn what good looks like",
      "Only failures, since the judge's job is to find failures",
      "No examples: definitions are enough for a modern model",
    ],
    answer: "A few passes and a few fails, diverse and including tricky borderline cases",
    explanation:
      "Two or three of each is a good default (more is fine when traces are short). Examples should carry information: easy cases the judge would get right anyway teach little, while hard and varied ones calibrate the decision boundary. A judge does one task, so examples are cheap and help alignment.",
    lessonAnchor: "choosing-few-shot-examples",
  },
];
