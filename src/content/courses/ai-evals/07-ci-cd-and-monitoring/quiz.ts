import type { Question } from "@/lib/types";

const GOLDEN = ["Include in the golden set", "Leave it out"];
const KIND = ["Code assertion", "LLM judge"];
const WHERE = ["Guardrail (in the request path)", "Async eval (sampled, after the request)"];

export const quiz: Question[] = [
  {
    id: "ev-cicd-known-unknowns",
    lectures: [7],
    tags: ["framing"],
    type: "scenario",
    prompt:
      "Your team is wiring evals into the real estate assistant's release process. Match each activity to the part of CI/CD it belongs to.",
    fields: [
      {
        label: "Replaying 12 traces where the agent emailed the wrong client, before merging a prompt change",
        options: ["CI: known unknowns", "CD: unknown unknowns"],
        answer: "CI: known unknowns",
      },
      {
        label: "Reading a random sample of last week's production traces to find failure types nobody has named yet",
        options: ["CI: known unknowns", "CD: unknown unknowns"],
        answer: "CD: unknown unknowns",
      },
      {
        label: "Running the factual-consistency judge on golden examples after swapping the model",
        options: ["CI: known unknowns", "CD: unknown unknowns"],
        answer: "CI: known unknowns",
      },
    ],
    explanation:
      "CI replays failure modes you already found through error analysis, as regression tests before a change ships. CD watches live traffic to discover failures you have not seen yet. Both rely on error analysis: CI reuses its results, CD keeps generating new ones.",
    lessonAnchor: "known-unknowns-and-unknown-unknowns",
  },
  {
    id: "ev-cicd-golden-set",
    lectures: [7],
    tags: ["golden-dataset", "data-leakage"],
    type: "scenario",
    prompt: "You are assembling the CI golden set for the real estate assistant. Decide for each candidate.",
    fields: [
      {
        label: "A trace from March where the agent invented a pool for 456 Oak Avenue, now with the listing data as reference",
        options: GOLDEN,
        answer: "Include in the golden set",
      },
      {
        label: "500 production traces pulled at random last night, not yet reviewed by anyone",
        options: GOLDEN,
        answer: "Leave it out",
      },
      {
        label: "The 4 example conversations that already appear as few-shot examples in the system prompt",
        options: GOLDEN,
        answer: "Leave it out",
      },
      {
        label: "A query mixing up \"West Berkeley\" and \"Berkeley West\", found during error analysis",
        options: GOLDEN,
        answer: "Include in the golden set",
      },
    ],
    explanation:
      "Golden sets are curated: past failures and edge cases belong, each with a reference. A random, unread dump is not curated, and a big set nobody has read gives false confidence. Examples already in the pipeline's prompt are leakage: the pipeline would be tested on its own answer key.",
    lessonAnchor: "building-the-golden-dataset",
  },
  {
    id: "ev-cicd-check-kind",
    lectures: [7],
    tags: ["ci-checks"],
    type: "scenario",
    prompt: "For each CI check on the real estate assistant, choose the evaluator type.",
    fields: [
      { label: "The recipient of a send_email call is a real address in the client database", options: KIND, answer: "Code assertion" },
      { label: "The reply doesn't state property features that the listing data doesn't support", options: KIND, answer: "LLM judge" },
      { label: "Arguments to the calendar tool conform to its JSON schema", options: KIND, answer: "Code assertion" },
      { label: "The reply's tone matches the agent's configured persona", options: KIND, answer: "LLM judge" },
    ],
    explanation:
      "Prefer code wherever the check is objective: a database lookup and schema validation are exact, free and instant. Faithfulness to listing data and tone need reading for meaning, so they get judges, pinned to exact model versions so CI doesn't shift when the provider updates.",
    lessonAnchor: "what-to-check-in-ci",
  },
  {
    id: "ev-cicd-ci-cost",
    lectures: [7],
    tags: ["ci-cost"],
    type: "scenario",
    prompt:
      "Your CI suite has 150 golden examples. Each runs the pipeline once ($0.002) and then 3 LLM judges ($0.004 per judge call) plus 2 code checks (free). The team pushes 25 commits a day.",
    fields: [
      { label: "Judge calls per full run", options: ["150", "300", "450", "750"], answer: "450" },
      { label: "Cost of one full run", options: ["$0.30", "$1.80", "$2.10", "$3.00"], answer: "$2.10" },
      {
        label: "Cheapest change that keeps every check in place before code reaches main",
        options: [
          "Delete two of the judges",
          "Run code checks on every commit and the judges only before merge",
          "Cut the golden set to 20 examples",
          "Switch judges to an unpinned model alias",
        ],
        answer: "Run code checks on every commit and the judges only before merge",
      },
    ],
    explanation:
      "150 × 3 = 450 judge calls, costing 450 × $0.004 = $1.80, plus 150 × $0.002 = $0.30 for the pipeline: $2.10 a run, or $52.50 a day at 25 commits. Moving judges to the pre-merge run keeps full coverage where it matters while commits only pay $0.30. Shrinking the set or dropping judges loses coverage, and an unpinned alias makes results unstable.",
    lessonAnchor: "keeping-ci-fast-and-cheap",
  },
  {
    id: "ev-cicd-98-percent",
    lectures: [7],
    tags: ["ci-mistakes"],
    type: "mcq",
    prompt:
      "A teammate wants to announce \"our assistant is 98% accurate\" because the CI suite of 110 golden examples passes at 98%. None of the examples appear in any prompt. What is the right response?",
    options: [
      "Fine to announce, since there is no data leakage",
      "The number shows stability on known issues; production accuracy needs monitoring on live traffic",
      "Fine if the 110 examples are split into a held-out partition first",
      "Add 50 more examples and then announce it",
    ],
    answer: "The number shows stability on known issues; production accuracy needs monitoring on live traffic",
    explanation:
      "A golden set is small and built around known failures, not sampled from real traffic, so even a clean hold-out of it says little about live behavior. The CI pass rate is a regression signal. For production quality, run evaluators on sampled traces and report corrected success rates with intervals.",
    lessonAnchor: "ci-common-mistakes",
  },
  {
    id: "ev-cicd-always-green",
    lectures: [7],
    tags: ["ci-maintenance"],
    type: "mcq",
    prompt:
      "Your CI suite has passed at 100% on every commit for four months. Meanwhile, the weekly trace review has found two new failure modes in production. What should you do?",
    options: [
      "Nothing: a green suite means the pipeline is healthy",
      "Add examples of the two new failure modes, and some harder cases, so the suite has signal again",
      "Lower the judges' pass thresholds so they fail more often",
      "Replace the golden set with a fresh random sample of production traffic",
    ],
    answer: "Add examples of the two new failure modes, and some harder cases, so the suite has signal again",
    explanation:
      "A suite that never fails may not be measuring anything, and the pipeline may have been tuned to its exact cases. Every newly discovered failure mode should become golden examples. A random sample is not what a golden set is for, and loosening judges just adds noise.",
    lessonAnchor: "maintaining-the-suite",
  },
  {
    id: "ev-cicd-guardrail-or-async",
    lectures: [7],
    tags: ["guardrails", "async-evals"],
    type: "scenario",
    prompt: "The real estate assistant serves 100,000 requests a day. Decide where each check runs.",
    fields: [
      { label: "Regex for SSN-shaped strings in an email draft, before it is sent", options: WHERE, answer: "Guardrail (in the request path)" },
      { label: "LLM judge: did the agent claim a tool result it never received?", options: WHERE, answer: "Async eval (sampled, after the request)" },
      { label: "Parse generated SQL before executing it", options: WHERE, answer: "Guardrail (in the request path)" },
      { label: "LLM judge: was an ambiguous location handled well?", options: WHERE, answer: "Async eval (sampled, after the request)" },
    ],
    explanation:
      "Guardrails sit on the critical path, so they must be fast with near-zero false fails: a regex and a parser qualify, and both guard against harm or breakage you can't undo afterwards. Judges add seconds and have real false-fail rates, so they run on a 1 to 5% sample after the request, reported as corrected rates.",
    lessonAnchor: "guardrail-or-async-eval",
  },
  {
    id: "ev-cicd-judge-guardrail",
    lectures: [7],
    tags: ["guardrails"],
    type: "scenario",
    prompt:
      "A PM proposes using the tone judge as a guardrail: block any reply it fails. The judge adds about 2 seconds per call and fails 3% of replies that humans rate as fine. Traffic is 100,000 requests a day.",
    fields: [
      { label: "Good replies blocked per day", options: ["30", "300", "3,000", "30,000"], answer: "3,000" },
      { label: "Latency added", options: ["Only on sampled requests", "About 2 s on every request", "None, it runs after the reply", "Only on failed replies"], answer: "About 2 s on every request" },
      {
        label: "Better plan",
        options: [
          "Keep it as a guardrail but retry every failure twice",
          "Run it async on a sample and track the corrected tone pass rate",
          "Run it as a guardrail only during business hours",
          "Drop tone evaluation entirely",
        ],
        answer: "Run it async on a sample and track the corrected tone pass rate",
      },
    ],
    explanation:
      "3% of roughly 100,000 good replies is about 3,000 wrongly blocked interactions a day, and every user waits 2 extra seconds. Tone is subjective and a slightly off tone isn't dangerous, so it belongs in async monitoring, where TPR and TNR correct for the judge's errors instead of punishing users for them.",
    lessonAnchor: "guardrail-or-async-eval",
  },
  {
    id: "ev-cicd-judge-drift",
    lectures: [7],
    tags: ["judge-drift", "theta"],
    type: "scenario",
    prompt:
      "Your hallucination judge was validated at TPR 0.90 and TNR 0.85. This month its raw pass rate on sampled traces is 0.70. The periodic re-labeling of recent traces now measures TPR 0.75 and TNR 0.85.",
    fields: [
      { label: "θ̂ using the old rates", options: ["0.55", "0.70", "0.73", "0.92"], answer: "0.73" },
      { label: "θ̂ using the fresh rates", options: ["0.70", "0.73", "0.85", "0.92"], answer: "0.92" },
      {
        label: "Most likely explanation",
        options: [
          "The pipeline regressed and should be rolled back",
          "The judge got stricter, failing more good replies, so stale rates understate quality",
          "The sample was too small to say anything",
          "TNR matters more than TPR, so the old estimate stands",
        ],
        answer: "The judge got stricter, failing more good replies, so stale rates understate quality",
      },
    ],
    explanation:
      "θ̂ = (p_obs + TNR − 1) / (TPR + TNR − 1). Old: (0.70 + 0.85 − 1) / 0.75 = 0.55 / 0.75 ≈ 0.73. Fresh: 0.55 / 0.60 ≈ 0.92. A lower TPR means the judge now fails more good replies. Pin judge models, re-label every few weeks, and update the judge (prompt or few-shot examples) when its rates drop.",
    lessonAnchor: "keeping-judges-accurate-over-time",
  },
  {
    id: "ev-cicd-flywheel",
    lectures: [7],
    tags: ["flywheel"],
    type: "order",
    prompt:
      "After a new neighborhood feature ships, sessions in those neighborhoods get shorter. Put the response in flywheel order.",
    steps: [
      "Notice the location-ambiguity failure rate spike on the dashboard alongside shorter sessions",
      "Read the flagged traces and find \"West Berkeley\" confused with \"Berkeley West\"",
      "Run targeted error analysis and name a new failure mode for directional location qualifiers",
      "Add examples to the golden set and an evaluator for the new failure mode",
      "Fix the pipeline, redeploy, and watch the targeted rate improve",
    ],
    explanation:
      "Monitoring raises the flag, humans read traces to understand it, error analysis names it, the eval artifacts are updated so it can never silently return, and only then is the fix shipped and measured. The new golden examples make CI catch any future regression of the same bug.",
    lessonAnchor: "the-continuous-improvement-flywheel",
  },
];
