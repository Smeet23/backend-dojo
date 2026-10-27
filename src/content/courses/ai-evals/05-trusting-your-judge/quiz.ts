import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "ev-judge-correct-math",
    lectures: [5],
    tags: ["bias-correction"],
    type: "scenario",
    prompt:
      "Your tone judge has TPR 0.90 and TNR 0.70 on the held-out test set. You run it on 1,000 new support conversations and it passes 820 of them.",
    fields: [
      { label: "Observed pass rate p_obs", options: ["82%", "90%", "70%", "18%"], answer: "82%" },
      { label: "Corrected pass rate θ̂", options: ["About 87%", "82%", "About 77%", "About 91%"], answer: "About 87%" },
      { label: "What the raw number does", options: ["Understates the true pass rate", "Overstates the true pass rate", "Is unbiased", "Cannot be compared"], answer: "Understates the true pass rate" },
    ],
    explanation:
      "p_obs = 820/1000 = 0.82. θ̂ = (0.82 + 0.70 - 1) / (0.90 + 0.70 - 1) = 0.52 / 0.60 ≈ 0.867. The judge fails 10% of good conversations, and since good ones are the large majority, that loss outweighs the 30% of failures it lets through, so the raw 82% is too low.",
    lessonAnchor: "step-3-correct-for-the-judges-bias",
  },
  {
    id: "ev-judge-accuracy-trap",
    lectures: [5],
    tags: ["tpr-tnr"],
    type: "mcq",
    prompt:
      "Your 100 labeled traces are 84 pass and 16 fail. A teammate's judge scores 84% accuracy against them and they want to ship it. What should you check first?",
    options: [
      "TPR and TNR separately: a judge that always says pass scores exactly 84% here with TNR 0%",
      "Whether 84% beats the 80% target, in which case ship it",
      "The F1 score on the training split",
      "Whether a larger judge model reaches 90% accuracy",
    ],
    answer: "TPR and TNR separately: a judge that always says pass scores exactly 84% here with TNR 0%",
    explanation:
      "With imbalanced labels, accuracy rewards the majority answer. LLM judges drift to extremes, and an always-pass judge would match this 84% while catching no failures at all. TPR and TNR expose that immediately.",
    lessonAnchor: "why-track-tpr-and-tnr-not-accuracy",
  },
  {
    id: "ev-judge-low-tpr-loop",
    lectures: [5],
    tags: ["refinement"],
    type: "scenario",
    prompt:
      "Your substantiation judge scores TPR 0.70 and TNR 0.92 on dev. Train scores are near perfect. You have time for one more refinement round.",
    fields: [
      {
        label: "Traces to read",
        options: ["Dev traces you labeled pass that the judge failed", "Dev traces you labeled fail that the judge passed", "The test set disagreements", "Only the training traces"],
        answer: "Dev traces you labeled pass that the judge failed",
      },
      {
        label: "First fix to try",
        options: ["Clarify what does and does not count as an unsupported claim", "Paste the misjudged dev traces into the prompt as examples", "Add ten more few-shot examples", "Lower the temperature"],
        answer: "Clarify what does and does not count as an unsupported claim",
      },
      {
        label: "Likely side effect to watch",
        options: ["TNR may drop as the judge becomes more lenient", "TPR will reach 100%", "Train scores will collapse", "None, the rates are independent"],
        answer: "TNR may drop as the judge becomes more lenient",
      },
    ],
    explanation:
      "Low TPR means the judge is too harsh, so the informative traces are the false fails. A sharper definition (for example, marketing adjectives are not factual claims) generalizes; dev traces must never go into the prompt; and once you have a few good examples, more add little. Loosening the judge often costs some TNR, so re-measure both.",
    lessonAnchor: "the-loop-as-the-exercise-ran-it",
  },
  {
    id: "ev-judge-steps-order",
    lectures: [5],
    tags: ["estimation"],
    type: "order",
    prompt: "Put the procedure for estimating a pipeline's true pass rate with an LLM judge in order.",
    steps: [
      "Freeze the judge prompt after refining it on dev",
      "Run the judge once on the held-out test set and compute TPR and TNR",
      "Run the judge on a large batch of new unlabeled traces and compute p_obs = k / m",
      "Correct p_obs with (p_obs + TNR - 1) / (TPR + TNR - 1) and clip to [0, 1]",
      "Bootstrap the test set to get a 95% confidence interval and report it with the estimate",
    ],
    explanation:
      "The test set is only touched once the prompt is final, so its TPR and TNR are unbiased. Those rates correct the raw rate from unlabeled data, and the bootstrap over the test set says how much to trust the result.",
    lessonAnchor: "estimating-the-true-success-rate",
  },
  {
    id: "ev-judge-bootstrap",
    lectures: [5],
    tags: ["bootstrap"],
    type: "scenario",
    prompt: "You are writing the bootstrap for your corrected pass rate. Fill in each design choice.",
    fields: [
      {
        label: "What to resample",
        options: ["The test set's (human label, judge verdict) pairs, with replacement", "The unlabeled production traces", "The dev set, without replacement", "The few-shot examples in the prompt"],
        answer: "The test set's (human label, judge verdict) pairs, with replacement",
      },
      {
        label: "p_obs in each iteration",
        options: ["The original p_obs from the unlabeled batch", "Recomputed from the resampled test set", "Fixed at 0.5", "The dev-set pass rate"],
        answer: "The original p_obs from the unlabeled batch",
      },
      {
        label: "Interval bounds",
        options: ["2.5th and 97.5th percentiles of the θ* values", "Minimum and maximum θ*", "Mean plus or minus one standard deviation", "5th and 95th percentiles of p_obs"],
        answer: "2.5th and 97.5th percentiles of the θ* values",
      },
    ],
    explanation:
      "The main uncertainty is in TPR and TNR, measured on maybe 100 traces. Each resample recomputes TPR* and TNR*, corrects the same p_obs, and clips. Skip resamples with no passes, no fails, or TPR* + TNR* - 1 ≤ 0. The middle 95% of the θ* values is the interval.",
    lessonAnchor: "step-4-put-a-confidence-interval-around-it",
  },
  {
    id: "ev-judge-which-wider",
    lectures: [5],
    tags: ["confidence-intervals"],
    type: "scenario",
    prompt:
      "The true pass rate is 80% and you have 100 labels. Judge A has TPR 0.60 and TNR 1.00. Judge B has TPR 1.00 and TNR 0.60. You correct both and bootstrap intervals.",
    fields: [
      { label: "Judge A's raw pass rate", options: ["Far below 80%", "Far above 80%", "About 80%", "Exactly 60%"], answer: "Far below 80%" },
      { label: "Judge B's raw pass rate", options: ["Above 80%", "Below 80%", "About 80%", "Exactly 60%"], answer: "Above 80%" },
      { label: "Wider interval after correction", options: ["Judge A (low TPR)", "Judge B (low TNR)", "Both about the same", "Neither has any uncertainty"], answer: "Judge A (low TPR)" },
    ],
    explanation:
      "A drops 40% of good traces: p_obs = 0.6 × 0.8 = 0.48. B passes 40% of failures: p_obs = 0.8 + 0.4 × 0.2 = 0.88. Correction recovers about 80% for both, but θ̂ moves with TPR noise in proportion to θ and with TNR noise in proportion to 1 - θ. At θ = 0.8 the low-TPR judge's interval is roughly three times wider.",
    lessonAnchor: "why-tpr-hurts-more-here",
  },
  {
    id: "ev-judge-near-random",
    lectures: [5],
    tags: ["bias-correction"],
    type: "mcq",
    prompt:
      "A rushed judge measures TPR 0.55 and TNR 0.52 on the test set. A PM asks you to just apply the correction formula and put the corrected pass rate on the dashboard. What do you say?",
    options: [
      "The denominator is 0.07, so the estimate is mostly noise; improve the judge before reporting anything",
      "Fine, correction removes all bias regardless of judge quality",
      "Report the raw pass rate instead, since it has no denominator",
      "Average the raw and corrected rates to be safe",
    ],
    answer: "The denominator is 0.07, so the estimate is mostly noise; improve the judge before reporting anything",
    explanation:
      "TPR + TNR - 1 = 0.07. A 1-point change in p_obs moves θ̂ by about 14 points, and the bootstrap interval will span most of [0, 1]. A judge this close to a coin flip carries almost no information, raw or corrected.",
    lessonAnchor: "step-3-correct-for-the-judges-bias",
  },
  {
    id: "ev-judge-clipped",
    lectures: [5],
    tags: ["bias-correction"],
    type: "scenario",
    prompt:
      "Your judge has TPR 0.85 and TNR 0.90. On 3,000 new traces it passes 2,700.",
    fields: [
      { label: "Corrected θ̂", options: ["100% (raw formula gives about 107%)", "90%", "About 94%", "About 85%"], answer: "100% (raw formula gives about 107%)" },
      {
        label: "Best reading of this",
        options: [
          "p_obs is above TPR, which a perfect pipeline would not even produce; TPR was likely underestimated, so lean on the interval",
          "The pipeline is now flawless",
          "The judge is broken and the result must be discarded",
          "Clipping means the formula does not apply to this judge",
        ],
        answer: "p_obs is above TPR, which a perfect pipeline would not even produce; TPR was likely underestimated, so lean on the interval",
      },
    ],
    explanation:
      "p_obs = 0.90. θ̂ = (0.90 + 0.90 - 1) / (0.85 + 0.90 - 1) = 0.80 / 0.75 ≈ 1.07, clipped to 1. Even if every trace were good, the judge would only pass 85% of them, so 90% implies the measured TPR is a bit low. The bootstrap interval shows the plausible range.",
    lessonAnchor: "step-3-correct-for-the-judges-bias",
  },
  {
    id: "ev-judge-few-shot-plateau",
    lectures: [5],
    tags: ["refinement"],
    type: "mcq",
    prompt:
      "Going from one to five few-shot examples per class improved dev TPR and TNR. Going from five to eight changed nothing. Both rates sit around 78%. What is the best next move?",
    options: [
      "Reread the false passes and false fails and improve the pass/fail definitions in the prompt",
      "Go to fifteen examples per class",
      "Add the misjudged dev traces as examples",
      "Check the test set to see if it is better there",
    ],
    answer: "Reread the false passes and false fails and improve the pass/fail definitions in the prompt",
    explanation:
      "In-context learning saturates after a handful of examples. Once more examples stop helping, the gain is in stating the principle the judge is missing. Dev traces in the prompt leak, and peeking at test spoils your unbiased TPR and TNR. If definitions stall too, upgrade the model or split the criterion.",
    lessonAnchor: "more-examples-stop-helping",
  },
  {
    id: "ev-judge-drift",
    lectures: [5],
    tags: ["pitfalls"],
    type: "scenario",
    prompt:
      "Three months ago your helpfulness judge had TPR 0.88 and TNR 0.86. Last week someone switched it to a newer flagship model without re-measuring. The dashboard now shows 95% pass, but support tickets about the bot doubled.",
    fields: [
      { label: "Main pitfall", options: ["Evaluator drift", "Data leakage", "Overly broad criteria", "Too many few-shot examples"], answer: "Evaluator drift" },
      {
        label: "What to do",
        options: [
          "Label a fresh sample of traces, recompute TPR and TNR, and re-align the judge",
          "Trust the newer model, it is stronger",
          "Roll the pipeline back to last quarter",
          "Raise the pass threshold to 98%",
        ],
        answer: "Label a fresh sample of traces, recompute TPR and TNR, and re-align the judge",
      },
    ],
    explanation:
      "A new judge model shifts TPR and TNR in unknown directions; a jump in pass rate alongside unhappy users suggests TNR fell. A green dashboard that contradicts user experience destroys trust in your evals. Keep labeling a few traces regularly and recheck alignment whenever the judge, the pipeline or your quality definition changes.",
    lessonAnchor: "pitfalls-of-automated-evaluation",
  },
];
