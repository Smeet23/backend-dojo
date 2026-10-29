import type { Question } from "@/lib/types";

const PROPERTY = ["Accurate", "Discerning", "Aligned"];
const SIGNAL = ["Core constraint", "Goodness metric"];
const VERDICT = ["Keep it", "Rework or drop it"];

export const quiz: Question[] = [
  {
    id: "ev-vibe-which-property",
    lectures: [19],
    tags: ["maturity", "metrics"],
    type: "scenario",
    prompt: "Each team is checking one property of its metrics. Which property is each check testing?",
    fields: [
      {
        label: "A pre-launch tutoring bot team makes worse copies of good answers and confirms the clarity score drops as the copies get worse.",
        options: PROPERTY,
        answer: "Accurate",
      },
      {
        label: "A team scores outputs from its current model and a cheaper candidate on 300 real queries, to see whether the scores differ at all.",
        options: PROPERTY,
        answer: "Discerning",
      },
      {
        label: "A team splits 5,000 thumbs-rated outputs by rating and checks that each score is higher for thumbs-up outputs than thumbs-down ones.",
        options: PROPERTY,
        answer: "Aligned",
      },
    ],
    explanation:
      "Accurate: the score tells good from bad by your own labels, tested here by deliberate degradation. Discerning: the score reacts when responses change, even before you know which version is better. Aligned: the score predicts what users actually say. The stages stack in that order.",
    lessonAnchor: "four-stages-four-questions",
  },
  {
    id: "ev-vibe-constraints-goodness",
    lectures: [19],
    tags: ["pre-launch", "defining-good"],
    type: "scenario",
    prompt:
      "You are extracting signals from a pre-launch AI wealth manager's system prompts and expert notes. Classify each one.",
    fields: [
      { label: "Never recommend buying or selling a single named security", options: SIGNAL, answer: "Core constraint" },
      { label: "Keep US equities at or below 85% of the suggested allocation", options: SIGNAL, answer: "Core constraint" },
      { label: "Uses professional word choice", options: SIGNAL, answer: "Goodness metric" },
      { label: "Sounds trustworthy and human, not robotic", options: SIGNAL, answer: "Goodness metric" },
    ],
    explanation:
      "Core constraints are guardrail-style rules that must never break: a single violation is a failure. Goodness metrics are qualities that make an answer better and are often scored on a scale or decomposed further. Separating them lets you treat violations as hard failures and still track quality.",
    lessonAnchor: "case-1-an-ai-wealth-manager-before-launch",
  },
  {
    id: "ev-vibe-degradation-order",
    lectures: [19],
    tags: ["pre-launch", "synthetic-data"],
    type: "order",
    prompt: "Put the degradation test for a pre-launch scorer in order.",
    steps: [
      "Collect responses your experts agree are good",
      "Create copies degraded at increasing severity along a known dimension",
      "Score every version with each candidate signal and a broad baseline question",
      "Keep signals whose scores fall as the degradation gets worse",
    ],
    explanation:
      "Without user feedback, accuracy against your own labels is the best available bar. Start from known-good outputs, break them in controlled ways, and see which signals notice. A signal that scores a badly degraded answer as high as the original isn't measuring what you think.",
    lessonAnchor: "the-degradation-test",
  },
  {
    id: "ev-vibe-model-swap",
    lectures: [19],
    tags: ["discerning", "monitoring"],
    type: "mcq",
    prompt:
      "A slide-deck generator switches its underlying model. Negative feedback floods in within days, yet every quality metric on the dashboard stays flat. What does this most directly show?",
    options: [
      "The metrics are not discerning: they don't react to changes users clearly notice",
      "The metrics are inaccurate, so the team should hand-label more examples first",
      "Users dislike any change, so the feedback should be ignored for a few weeks",
      "The new model is better, and users will get used to it",
    ],
    answer: "The metrics are not discerning: they don't react to changes users clearly notice",
    explanation:
      "This is the speakers' story about a model swap. The metrics might be perfectly accurate on what they measure, but they're blind to whatever users care about. Before trusting a metric to guard a model or prompt change, check that its scores move when outputs change.",
    lessonAnchor: "why-discerning-matters-the-model-swap-nobodys-metrics-saw",
  },
  {
    id: "ev-vibe-read-alignment",
    lectures: [19],
    tags: ["alignment", "feedback"],
    type: "scenario",
    prompt:
      "You scored 20,000 user-rated decks on each signal and averaged the score within each user rating. Decide what to do with each signal.",
    fields: [
      { label: "Image appropriateness: bad 0.30, meh 0.38, good 0.47", options: VERDICT, answer: "Keep it" },
      { label: "Layout consistency: bad 0.58, meh 0.69, good 0.64", options: VERDICT, answer: "Rework or drop it" },
      { label: "Tone: bad 0.81, meh 0.81, good 0.82", options: VERDICT, answer: "Rework or drop it" },
    ],
    explanation:
      "What matters is ordering, not level. Image appropriateness is low overall but rises cleanly from bad to meh to good, so it predicts user preference. Layout consistency scores meh above good, the exact anomaly the speakers found. Tone is high everywhere and flat, so it doesn't separate what users liked from what they didn't.",
    lessonAnchor: "check-each-signal-against-user-ratings",
  },
  {
    id: "ev-vibe-calibration-size",
    lectures: [19],
    tags: ["alignment", "weighting"],
    type: "mcq",
    prompt:
      "Your scorer has 12 narrow signals that each track quality well. You want to learn how much each one matters to users' overall verdict. Using the speakers' rule of thumb, roughly how many overall-rated outputs do you need?",
    options: ["About 12", "About 120", "About 1,200", "About 20,000"],
    answer: "About 120",
    explanation:
      "Weighting reliable signals is a small fitting problem, so about 10 rated examples per signal is enough to start: 12 x 10 = 120. The 20,000 ratings in the case study were used to test each signal's alignment, not because weighting needs that many.",
    lessonAnchor: "weighting-the-signals",
  },
  {
    id: "ev-vibe-alignment-ceiling",
    lectures: [19],
    tags: ["alignment"],
    type: "mcq",
    prompt:
      "After calibrating weights, your combined score agrees with users' overall thumbs on 79% of held-out decks. A teammate wants to keep tuning until it reaches 95%. What's the best response?",
    options: [
      "79% is near the practical ceiling, since users disagree about what a good deck is; start using the score",
      "Keep tuning: anything under 95% means the signals are wrong",
      "Replace the narrow signals with one broad \"is this a good deck?\" question",
      "Throw out the user ratings and rely only on internal experts",
    ],
    answer: "79% is near the practical ceiling, since users disagree about what a good deck is; start using the score",
    explanation:
      "Different users want different things from the same output, so agreement with individual users has a ceiling. The speakers put it around 80%, which they reached with this client. Chasing much higher numbers usually means overfitting or leakage. At this level the score is useful for comparing models and picking best-of-n.",
    lessonAnchor: "weighting-the-signals",
  },
  {
    id: "ev-vibe-reward-risk",
    lectures: [19],
    tags: ["feedback-loops", "reward-models"],
    type: "mcq",
    prompt:
      "A chat product plans to train a reward model on users' thumbs up/down and fine-tune against it. Based on the talk's sycophancy example, which safeguard matters most?",
    options: [
      "Keep internal principles and guardrail constraints in the scoring, so the reward can't simply chase what users thumb up",
      "Use thumbs directly as the training signal instead of a reward model",
      "Collect more thumbs, since more feedback removes any bias",
      "Stop collecting feedback once the reward model is trained",
    ],
    answer: "Keep internal principles and guardrail constraints in the scoring, so the reward can't simply chase what users thumb up",
    explanation:
      "Users tend to reward polite, agreeable answers. A reward distilled from their thumbs over-weighted that, and the retrained model flattered everyone. More of the same feedback amplifies the bias rather than removing it, and raw thumbs are noisier still. Aligned with feedback means aligned with what feedback rewards, so keep your own principles in the score.",
    lessonAnchor: "the-cautionary-tale-a-reward-model-that-loved-flattery",
  },
];
