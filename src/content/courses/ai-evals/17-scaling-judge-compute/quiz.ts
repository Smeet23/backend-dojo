import type { Question } from "@/lib/types";

const PRIMITIVES = ["Ensemble / panel", "Debate", "Self-verification", "Per-criterion rubric"];
const SETUP = ["Distilled small judge", "Multi-call judge pipeline", "Code-based check"];

export const quiz: Question[] = [
  {
    id: "ev-ticj-vote-math",
    lectures: [17],
    tags: ["ensembles", "majority-vote"],
    type: "scenario",
    prompt:
      "A single call of your judge is right 80% of the time, and you assume the calls make independent mistakes. You take the majority verdict of several calls.",
    fields: [
      { label: "Accuracy with 3 votes", options: ["80.0%", "84.0%", "89.6%", "99.2%"], answer: "89.6%" },
      { label: "Accuracy with 5 votes", options: ["89.6%", "94.2%", "96.0%", "99.7%"], answer: "94.2%" },
      { label: "Judge cost with 5 votes, relative to one call", options: ["1x", "2.5x", "5x", "25x"], answer: "5x" },
    ],
    explanation:
      "With 3 votes the majority is right when at least 2 are: 3 × 0.8² × 0.2 + 0.8³ = 0.384 + 0.512 = 0.896. With 5 votes you need at least 3 right, which sums to 0.942. Each vote is a full judge call, so 5 votes cost 5x. Note the diminishing returns: the first two extra calls cut errors from 20% to 10.4%, the next two only to 5.8%. And all of it rests on independence.",
    lessonAnchor: "why-voting-helps-and-where-it-stops",
  },
  {
    id: "ev-ticj-correlated",
    lectures: [17],
    tags: ["ensembles", "correlation"],
    type: "mcq",
    prompt:
      "You sample the same judge model with the same prompt 7 times at temperature 0.7 and take the majority. Single-call accuracy on your dev set is 78%; the 7-vote majority reaches only 80%. What is the most likely reason?",
    options: [
      "The samples share the same blind spots, so on the hard traces all 7 votes are wrong together",
      "Seven is too few votes; majority voting needs at least 25 to show its benefit",
      "Temperature 0.7 is too low; at temperature 1.5 the votes would be independent",
      "Majority voting only works for pointwise scores, not pass or fail verdicts",
    ],
    answer: "The samples share the same blind spots, so on the hard traces all 7 votes are wrong together",
    explanation:
      "Voting cancels independent errors. Samples from one model and one prompt mostly make the same mistakes: if the model misreads a kind of trace, every sample misreads it. Those correlated errors set a ceiling that more votes can't break. Higher temperature adds noise, not different knowledge. Use diversity (different models, prompts, roles or criteria) or fix the rubric.",
    lessonAnchor: "why-voting-helps-and-where-it-stops",
  },
  {
    id: "ev-ticj-below-chance",
    lectures: [17],
    tags: ["ensembles", "judge-bias"],
    type: "mcq",
    prompt:
      "Your judge is 88% accurate overall, but on replies that use sarcasm it is right only 45% of the time. A teammate proposes a 9-vote majority of the same judge to fix the sarcasm slice. What happens on that slice, assuming independent votes?",
    options: [
      "Accuracy drops below 45%, because the majority amplifies a judge that is wrong more often than right",
      "Accuracy rises to about 88%, matching the overall rate",
      "Accuracy stays at exactly 45%, since voting can't change a slice",
      "Accuracy rises above 90%, since 9 votes always beat one",
    ],
    answer: "Accuracy drops below 45%, because the majority amplifies a judge that is wrong more often than right",
    explanation:
      "Majority voting pushes accuracy toward 100% only when p is above 0.5. Below 0.5 it pushes toward 0%: the majority of 9 calls that are each 45% right is right only about 38% of the time. The fix is in the rubric (spell out how to read sarcasm, add a boundary example) or a different model, then re-measure on that slice.",
    lessonAnchor: "why-voting-helps-and-where-it-stops",
  },
  {
    id: "ev-ticj-where-to-spend",
    lectures: [17],
    tags: ["cost", "latency", "guardrails"],
    type: "scenario",
    prompt: "Pick the most sensible judge setup for each situation.",
    fields: [
      {
        label: "A content-moderation check that must run on every reply before the user sees it",
        options: SETUP,
        answer: "Distilled small judge",
      },
      {
        label: "Nightly scoring of sampled production traces for whether the agent resolved the customer's issue",
        options: SETUP,
        answer: "Multi-call judge pipeline",
      },
      {
        label: "Every reply must be valid JSON matching the response schema",
        options: SETUP,
        answer: "Code-based check",
      },
    ],
    explanation:
      "A guardrail sits in the request path, so latency matters: Haize Labs distills a strong reasoning judge or pipeline into a 3 to 4B model for this. Async evaluation can wait minutes, so spend compute on accuracy with a multi-call pipeline. Schema validity is deterministic, so no judge at all: a code check is cheaper and exact.",
    lessonAnchor: "cost-and-latency",
  },
  {
    id: "ev-ticj-primitives",
    lectures: [17],
    tags: ["verdict", "scalable-oversight"],
    type: "scenario",
    prompt: "Name the scalable-oversight primitive each judge design uses.",
    fields: [
      {
        label: "Two units argue that a support reply passes and fails; a third reads both arguments and rules",
        options: PRIMITIVES,
        answer: "Debate",
      },
      {
        label: "A judge returns Fail with a rationale; a second call checks whether that rationale actually supports Fail",
        options: PRIMITIVES,
        answer: "Self-verification",
      },
      {
        label: "GPT-4o, Claude and Llama each judge the same trace; the verdict is the majority",
        options: PRIMITIVES,
        answer: "Ensemble / panel",
      },
      {
        label: "One call checks the greeting, one checks the refund policy, one checks escalation; results are combined",
        options: PRIMITIVES,
        answer: "Per-criterion rubric",
      },
    ],
    explanation:
      "Debate makes the final judge's job easier: weighing two arguments instead of the raw output. Self-verification catches verdicts that don't follow from their own reasoning. A panel of different models gives more independent errors than repeated samples of one. Per-criterion units give each call one narrow job, the recipe behind the Vogent result.",
    lessonAnchor: "primitives-from-scalable-oversight",
  },
  {
    id: "ev-ticj-reward",
    lectures: [17],
    tags: ["reasoning-judges", "rl"],
    type: "mcq",
    prompt:
      "You want to RL-tune a small reasoning judge. Your labels are pairwise: for each query, a domain expert picked the better of two responses. Which reward fits the approach in the talk?",
    options: [
      "1 if the response the judge scores higher is the one the expert preferred, else 0",
      "A score from GPT-4o rating how convincing the judge's rationale sounds",
      "The length of the judge's chain of thought, to encourage more reasoning",
      "1 if the judge's rubric matches a rubric the expert wrote for that query",
    ],
    answer: "1 if the response the judge scores higher is the one the expert preferred, else 0",
    explanation:
      "The rewards are rule-based: a simple check against human ground truth. The reasoning itself is never graded, and the rubric isn't compared to an expert's (experts only gave preferences). Longer reasoning emerges because it helps the judge agree with humans; rewarding length directly would invite padding. A model-graded reward reintroduces the judge-reliability problem you are trying to solve.",
    lessonAnchor: "training-with-rl-from-preference-labels",
  },
  {
    id: "ev-ticj-query-rubric",
    lectures: [17],
    tags: ["reasoning-judges", "rubrics"],
    type: "mcq",
    prompt:
      "A J1-style judge is evaluating answers to \"How do I rotate my AWS access keys without breaking production?\" Which is a query-specific rubric of the kind it is trained to write?",
    options: [
      "Creates the new key before deactivating the old one; says to update every service using the key; says to delete the old key only after confirming nothing uses it",
      "The answer is helpful, accurate, concise and well formatted",
      "Rate the answer from 1 to 10 for overall quality",
      "The answer is about AWS and mentions access keys",
    ],
    answer:
      "Creates the new key before deactivating the old one; says to update every service using the key; says to delete the old key only after confirming nothing uses it",
    explanation:
      "A query-specific rubric spells out what a good answer to this exact question must do, so each item can be checked with its own rationale. Generic qualities and a 1 to 10 score are the vague, task-level criteria that make single judges inconsistent. Topic relevance is too weak: a wrong answer can mention access keys.",
    lessonAnchor: "query-specific-rubrics",
  },
  {
    id: "ev-ticj-leaderboard",
    lectures: [17],
    tags: ["reasoning-judges", "tpr-tnr"],
    type: "mcq",
    prompt:
      "A tiny open judge model beats Claude 3 Opus on RewardBench. Your current judge for \"refund policy followed\" has TPR 0.86 and TNR 0.82 on your test set. What should you do before switching?",
    options: [
      "Run the new judge on the same held-out test set and compare its TPR and TNR",
      "Switch now: a better RewardBench score means it will judge refund policy better",
      "Switch, then compare its raw pass rate on production traffic with the old judge's",
      "Ensemble the two judges without measuring either, since two judges beat one",
    ],
    answer: "Run the new judge on the same held-out test set and compare its TPR and TNR",
    explanation:
      "RewardBench measures general preference judgments, not your failure mode. Only your labeled test set tells you how a judge behaves on your criterion. Comparing raw pass rates says nothing about which one is right, and an unmeasured ensemble could be worse than either judge alone.",
    lessonAnchor: "j1-tiny-judges-that-punch-up",
  },
  {
    id: "ev-ticj-recipe-order",
    lectures: [17],
    tags: ["rubrics", "verdict"],
    type: "order",
    prompt: "Put the steps of building a scaled judge for a vague question like \"was this support call successful?\" in order.",
    steps: [
      "Work with subject matter experts to pin down what a good and a bad call look like",
      "Decompose that into narrow criteria, one judge unit per criterion",
      "Score each criterion separately, adding votes or verification where single calls are noisy",
      "Aggregate the criterion results into one verdict",
      "Measure TPR and TNR of the whole pipeline against held-out human labels",
      "Feed the cases where users disagree with the judge back into the rubric",
    ],
    explanation:
      "Tang put 60 to 70% of the work in the rubric, so it comes first. Decomposition and per-criterion scoring are the Vogent recipe. Compute is added only where it helps, then the whole pipeline is validated like any judge, and disagreements keep improving it over time.",
    lessonAnchor: "the-rubric-is-most-of-the-work",
  },
];
