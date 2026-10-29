import type { Question } from "@/lib/types";

const ROLE = ["Threshold it (an SLO or hard filter)", "Optimize it, within the thresholds"];
const USE = [
  "Hard filter on every candidate",
  "Rank the candidates that survive",
  "Ground truth for validating the automated checks",
];

export const quiz: Question[] = [
  {
    id: "ev-qr-optimize-vs-threshold",
    lectures: [15],
    tags: ["metrics", "slo"],
    type: "scenario",
    prompt:
      "You are building an artistic QR code generator and have two goals that pull against each other. Following the guest speaker's rule, assign each a role.",
    fields: [
      { label: "The code scans with a phone", options: ROLE, answer: "Threshold it (an SLO or hard filter)" },
      { label: "The image looks good", options: ROLE, answer: "Optimize it, within the thresholds" },
    ],
    explanation:
      "Pick one metric to push as high as possible and put thresholds on the others. Scanning is nearly binary and non-negotiable (a code that doesn't scan is just an ugly picture), so it gets a 95% SLO. Aesthetics is what you improve inside that constraint.",
    lessonAnchor: "pick-one-metric-to-optimize-one-to-threshold",
  },
  {
    id: "ev-qr-best-of-n-math",
    lectures: [15],
    tags: ["inference-time-scaling", "best-of-n"],
    type: "mcq",
    prompt:
      "After a parameter change, each generated code scans independently with probability 0.25. Your SLO is that at least 95% of requests return a code that scans. What is the smallest number of candidates per request that meets it?",
    options: ["4", "8", "11", "20"],
    answer: "11",
    explanation:
      "P(none scan) = 0.75^n. 0.75^10 ≈ 0.056 (94.4% success, just short) and 0.75^11 ≈ 0.042 (95.8%). Equivalently n = ln(0.05) / ln(0.75) ≈ 10.4, rounded up to 11. Eight would give only about 90%.",
    lessonAnchor: "inference-time-scaling-best-of-n",
  },
  {
    id: "ev-qr-hard-prompts",
    lectures: [15],
    tags: ["inference-time-scaling", "slicing"],
    type: "mcq",
    prompt:
      "Averaged over all prompts, candidates scan a third of the time, so you ship n = 8 and report 96% success. Users of one prompt style (dense, detailed scenes) complain. On those prompts candidates scan only 5% of the time. Roughly what success rate do those users see at n = 8?",
    options: ["About 96%, the same as everyone", "About 66%", "About 34%", "About 5%"],
    answer: "About 34%",
    explanation:
      "1 − 0.95^8 ≈ 1 − 0.66 = 0.34. The best-of-n formula assumes one p for every request; an average hides the hard slice. Measure scan rate per prompt type, and consider a larger n (59 would be needed at p = 0.05) or a different fix for those prompts.",
    lessonAnchor: "inference-time-scaling-best-of-n",
  },
  {
    id: "ev-qr-empty-column",
    lectures: [15],
    tags: ["validation", "confusion-matrix"],
    type: "mcq",
    prompt:
      "You compare your automated scan checker with 1,800 human labels. The human labels say most images do not scan, but the checker predicted \"scans\" for every single image. What is the most likely explanation?",
    options: [
      "A bug in the eval code, such as treating an empty or None decode result as a success",
      "The checker is more sensitive than a phone camera, so it is fine to ship",
      "The human labelers were too strict; relabel with a looser rubric",
      "The dataset is too small to estimate the checker's error rates",
    ],
    answer: "A bug in the eval code, such as treating an empty or None decode result as a success",
    explanation:
      "An evaluator that never outputs one of the classes on a varied dataset is almost always broken. That is exactly what happened in the talk: a mishandled None counted as a scan. Such bugs are silent; nothing crashes. A healthy matrix has a strong diagonal and small non-zero counts in every cell.",
    lessonAnchor: "the-confusion-matrix-that-caught-a-bug",
  },
  {
    id: "ev-qr-signal-roles",
    lectures: [15],
    tags: ["evaluators", "trust"],
    type: "scenario",
    prompt: "Your v3 pipeline has three quality signals. Match each to how it is used.",
    fields: [
      { label: "QReader decodes the image to the expected URL", options: USE, answer: "Hard filter on every candidate" },
      { label: "CLIP-based aesthetic predictor score", options: USE, answer: "Rank the candidates that survive" },
      { label: "A person's scan attempt and 'looks good' vote on 1,800 sweep images", options: USE, answer: "Ground truth for validating the automated checks" },
    ],
    explanation:
      "The scan check is fast, near-objective and validated against humans, so it can gate outputs. The aesthetic predictor is a learned proxy for taste: good for ranking and confirming direction, not something to optimize hard. Human labels are too slow for production but are what you validate both automated signals against.",
    lessonAnchor: "optimize-aesthetics-but-gently",
  },
  {
    id: "ev-qr-process-order",
    lectures: [15],
    tags: ["process"],
    type: "order",
    prompt: "Put the steps of the v3 rebuild in order.",
    steps: [
      "Define each goal with a slow human procedure (people rate it, a phone scans it)",
      "Pick automated evaluators that predict those human judgments",
      "Play with the system to learn which parameters matter",
      "Sweep the parameters that matter",
      "Hand-label the sweep's images",
      "Check the automated evaluators against the labels and fix what disagrees",
      "Ship best-of-n with the scan check as a filter and aesthetics as the ranking",
    ],
    explanation:
      "Operationalize first, then automate. Exploration comes before the sweep so the sweep covers the right knobs. The sweep's outputs become the labeled data, which validates the evaluators (and caught a bug). Only a trusted evaluator goes into the production path.",
    lessonAnchor: "operationalize-in-two-steps",
  },
  {
    id: "ev-qr-labeling-tool",
    lectures: [15],
    tags: ["labeling"],
    type: "mcq",
    prompt:
      "You need yes/no labels for 1,800 sweep images. A teammate proposes spending two weeks on a polished labeling web app with double annotation and adjudication before anyone labels anything. What would the speaker most likely advise?",
    options: [
      "Start today with a bare notebook and arrow-key shortcuts; don't chase 1% label noise",
      "Build the app first, since label quality determines everything downstream",
      "Skip labeling and trust the off-the-shelf evaluators' published accuracy",
      "Label only 50 images so the job takes an hour",
    ],
    answer: "Start today with a bare notebook and arrow-key shortcuts; don't chase 1% label noise",
    explanation:
      "The talk's labeling was a day's work in a minimal notebook. If your conclusions hinge on a 1% margin of label error, you are probably solving the wrong problem. Off-the-shelf evaluators still need checking on your data (the scan checker had a bug), and 50 images would be too few to fill a confusion matrix across a whole sweep.",
    lessonAnchor: "label-the-sweep-by-hand",
  },
  {
    id: "ev-qr-when-evals",
    lectures: [15],
    tags: ["timing"],
    type: "mcq",
    prompt:
      "You hacked together an image feature over a weekend and it works okay. Three months later you come back to upgrade it to a new model. When does the speaker's experience say to build evals?",
    options: [
      "Now, on the return visit, before tuning the new version",
      "It should have been done during the weekend hack, so it's too late to bother",
      "Only once users complain about quality",
      "Only once you are ready to fine-tune a model",
    ],
    answer: "Now, on the return visit, before tuning the new version",
    explanation:
      "Frye thought skipping evals in v1 was right, since they would have distracted from shipping. His regret was not building them when he came back for v2. Coming back for another round is the time to formalize: tests, docs and evals.",
    lessonAnchor: "when-to-invest-in-evals",
  },
  {
    id: "ev-qr-sql-transfer",
    lectures: [15],
    tags: ["transfer", "best-of-n"],
    type: "mcq",
    prompt:
      "A text-to-SQL feature produces a query that runs without error and returns rows 60% of the time. You can afford 3 parallel generations and run each query against a read replica, keeping the first that works. Assuming independent attempts, what fraction of requests get a working query?",
    options: ["60%", "84%", "93.6%", "98.4%"],
    answer: "93.6%",
    explanation:
      "1 − 0.4^3 = 1 − 0.064 = 0.936. It is the same best-of-n pattern as the QR codes: a cheap, trusted check filters candidates. Note what it does not buy you: a query that runs can still answer the wrong question, so you still need evals for correctness.",
    lessonAnchor: "what-carries-over-to-llm-apps",
  },
];
