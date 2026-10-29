import type { Question } from "@/lib/types";

const LABEL = ["PASS", "FAIL"];

export const quiz: Question[] = [
  {
    id: "ev-hw3-label-rules",
    lectures: [11],
    tags: ["labeling", "dietary-adherence"],
    type: "scenario",
    prompt:
      "You are labeling Recipe Bot traces for dietary adherence, using the rule that offering a non-compliant option counts as a violation. Label each trace.",
    fields: [
      {
        label: "Dairy-free request: coconut curry with \"optional cheese topping\"",
        options: LABEL,
        answer: "FAIL",
      },
      {
        label: "Vegan pasta request: pasta with nutritional yeast instead of parmesan",
        options: LABEL,
        answer: "PASS",
      },
      {
        label: "Sugar-free candy request: bliss balls sweetened with \"honey or stevia syrup\"",
        options: LABEL,
        answer: "FAIL",
      },
      {
        label: "Gluten-free request: rice pasta with tomatoes and dried oregano",
        options: LABEL,
        answer: "PASS",
      },
    ],
    explanation:
      "Optional cheese and an optional honey sweetener are offered to the user, so under the rule they fail even with a compliant alternative next to them. Nutritional yeast is the standard vegan swap. Dried oregano is not a gluten source; failing it would be the speculative harshness the Arize walkthrough's first judge showed. Whatever rule you choose, write it down and put it in the judge prompt.",
    lessonAnchor: "step-1-label-your-data",
  },
  {
    id: "ev-hw3-split-problems",
    lectures: [11],
    tags: ["splits", "leakage"],
    type: "mcq",
    prompt:
      "You shuffle the 101 labeled traces and cut them 15/40/46. Dev gets 33 PASS and 7 FAIL. You also notice the 101 traces come from only 47 distinct queries. What is the best change before writing the judge?",
    options: [
      "Split by query_id and stratify by label, so each split gets its share of failures and no query spans two splits",
      "Move most traces into train, since more few-shot candidates make a better judge",
      "Keep the split; 40 dev traces is already the recommended size",
      "Drop duplicate queries so every trace is unique, then reshuffle",
    ],
    answer: "Split by query_id and stratify by label, so each split gets its share of failures and no query spans two splits",
    explanation:
      "With 7 dev failures, each misjudged one moves TNR by about 14 points, so you can't see whether an edit helped. Traces that answer the same query are near-duplicates; if one sits in train and becomes a few-shot example, the judge has seen a near-copy of a dev case. Grouping by query and stratifying fixes both. Dropping duplicates throws away labels, and a bigger train set doesn't help because few-shot gains plateau.",
    lessonAnchor: "step-2-split-train-dev-and-test",
  },
  {
    id: "ev-hw3-diagnose",
    lectures: [11],
    tags: ["iteration", "tpr", "tnr"],
    type: "scenario",
    prompt: "Two judge drafts, two dev-set error patterns. Diagnose each and pick the first fix.",
    fields: [
      {
        label: "Draft A never fails a good recipe, but passes regular soy sauce for gluten-free and quinoa for low-carb. Which rate is low?",
        options: ["TPR", "TNR", "Both"],
        answer: "TNR",
      },
      {
        label: "Draft B fails a correct gluten-free recipe because \"dried oregano could contain gluten\". Which rate is low?",
        options: ["TPR", "TNR", "Both"],
        answer: "TPR",
      },
      {
        label: "Best first fix for Draft B",
        options: [
          "State that only listed ingredients that are known violations count, not speculative cross-contamination",
          "Add the dev trace with oregano to the prompt as a PASS example",
          "Switch the output to a 1 to 10 adherence score",
        ],
        answer: "State that only listed ingredients that are known violations count, not speculative cross-contamination",
      },
    ],
    explanation:
      "PASS is the positive class. Passing real failures is a false pass, which lowers TNR (the Braintrust draft's pattern). Failing a good recipe is a false fail, which lowers TPR. The oregano case is a definition gap, so fix the definition. Pasting a dev trace into the prompt leaks it, and a 1 to 10 scale makes validation harder, not easier.",
    lessonAnchor: "step-4-measure-on-dev-and-iterate",
  },
  {
    id: "ev-hw3-accuracy-trap",
    lectures: [11],
    tags: ["metrics"],
    type: "mcq",
    prompt:
      "On 12 dev traces (8 PASS, 4 FAIL by your labels), your judge agrees with you on 10. A teammate says 83% agreement is good enough to ship. The two disagreements are both real failures the judge passed. What do you say?",
    options: [
      "TNR is only 50%: the judge misses half the dietary violations, which is the error that matters most here",
      "Agreed, anything above 80% agreement is the usual target",
      "TPR is 50%, so the judge is too harsh on good recipes",
      "Accuracy is fine, but run it on the test set a few more times to be sure",
    ],
    answer: "TNR is only 50%: the judge misses half the dietary violations, which is the error that matters most here",
    explanation:
      "TP = 8 and FN = 0, so TPR is 100%. TN = 2 and FP = 2, so TNR is 2/4 = 50%. Agreement hides this because passes dominate. For allergies and strict diets, a missed violation is the costly error. Repeated test-set runs during development would also turn test into a second dev set.",
    lessonAnchor: "step-4-measure-on-dev-and-iterate",
  },
  {
    id: "ev-hw3-order",
    lectures: [11],
    tags: ["workflow"],
    type: "order",
    prompt: "Put the homework's steps in order.",
    steps: [
      "Label 100 to 200 traces PASS or FAIL for dietary adherence",
      "Split into train, dev and test",
      "Write the judge prompt with few-shot examples from train",
      "Iterate on the prompt using dev-set TPR and TNR",
      "Run the frozen judge once on the test set",
      "Judge 500 to 1,000 unlabeled traces",
      "Correct the pass rate and compute a 95% interval with judgy",
    ],
    explanation:
      "Labels come first because they define the criterion. Few-shot examples come only from train, tuning only uses dev, and the test set is run once after the prompt is frozen. Its TPR and TNR are then the inputs that correct the raw pass rate on unlabeled traces.",
    lessonAnchor: "what-the-homework-asks",
  },
  {
    id: "ev-hw3-judgy-inputs",
    lectures: [11],
    tags: ["judgy", "bias-correction"],
    type: "scenario",
    prompt:
      "You call estimate_success_rate(test_labels, test_preds, unlabeled_preds). Choose what goes into each argument.",
    fields: [
      {
        label: "test_labels",
        options: ["Human labels on the test set", "Judge verdicts on the test set", "Judge verdicts on the 500 new traces", "Human labels on the dev set"],
        answer: "Human labels on the test set",
      },
      {
        label: "test_preds",
        options: ["Human labels on the test set", "Judge verdicts on the test set", "Judge verdicts on the 500 new traces", "Judge verdicts on the dev set"],
        answer: "Judge verdicts on the test set",
      },
      {
        label: "unlabeled_preds",
        options: ["Human labels on the test set", "Judge verdicts on the test set", "Judge verdicts on the 500 new traces", "Judge verdicts on the train set"],
        answer: "Judge verdicts on the 500 new traces",
      },
    ],
    explanation:
      "The test pairs (human label, judge verdict) measure the judge's TPR and TNR without the optimism of dev, where you tuned. The verdicts on new traces give the raw pass rate. judgy combines them into a corrected rate and bootstraps the interval by resampling the test pairs.",
    lessonAnchor: "step-6-run-on-new-traces-and-correct-the-rate",
  },
  {
    id: "ev-hw3-interpret",
    lectures: [11],
    tags: ["interpretation", "confidence-interval"],
    type: "scenario",
    prompt:
      "Your judge passes 85.7% of 500 new traces. judgy returns a corrected rate of 92.6% with a 95% interval of [0.817, 1.000]. The test set had 15 failures.",
    fields: [
      {
        label: "What does the upward correction say about the judge?",
        options: [
          "It is harsh: it fails more good recipes than the bad ones it lets through",
          "It is lenient: it passes too many violations",
          "Nothing; corrections always go up",
        ],
        answer: "It is harsh: it fails more good recipes than the bad ones it lets through",
      },
      {
        label: "Best next step to narrow the interval",
        options: [
          "Label more failing traces for the test set",
          "Judge 5,000 unlabeled traces instead of 500",
          "Report 92.6% and drop the interval",
        ],
        answer: "Label more failing traces for the test set",
      },
    ],
    explanation:
      "If the corrected rate is above the raw rate, the judge's false fails outweigh its false passes. The interval is wide mainly because TPR and TNR were measured on few traces, especially only 15 failures. More unlabeled traces shrink only the smaller noise in the raw rate, and hiding the interval hides exactly the uncertainty a reader needs.",
    lessonAnchor: "writing-the-interpretation",
  },
  {
    id: "ev-hw3-pass-through",
    lectures: [11],
    tags: ["platforms"],
    type: "mcq",
    prompt:
      "You upload labeled traces to an eval platform whose experiments always run a \"task\" and then score its output. Your bot responses are already stored in the dataset. How do you score them with your judge?",
    options: [
      "Use a pass-through task that returns the stored response unchanged, so the judge scores it as the output",
      "Re-run the Recipe Bot on every query so the platform has fresh outputs to score",
      "Put the stored responses into the judge prompt as few-shot examples",
      "Skip the platform and label every trace by hand instead",
    ],
    answer: "Use a pass-through task that returns the stored response unchanged, so the judge scores it as the output",
    explanation:
      "The Braintrust walkthrough did exactly this: the task echoes the stored response, and the judge is the only real model call. Re-running the bot would produce different responses than the ones you labeled, so your labels would no longer apply. Few-shot stuffing leaks the data you are trying to measure.",
    lessonAnchor: "what-each-platform-made-easier",
  },
];
