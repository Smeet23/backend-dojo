import type { Question } from "@/lib/types";

const KIND = ["Code check", "LLM judge"];
const CAUSE = ["Real failure", "Helper function bug", "The eval is wrong", "My label is wrong"];

export const quiz: Question[] = [
  {
    id: "ev-pm-code-or-judge",
    lectures: [23],
    tags: ["code-evals", "llm-judge", "domain-expertise"],
    type: "scenario",
    prompt:
      "A PM is automating failures found in a customer-interview coach, which suggests better questions to the interviewer. Pick the cheapest evaluator that would work for each.",
    fields: [
      {
        label: "The coach suggests a question about typical behavior (\"How do you usually plan your week?\") instead of a specific past instance",
        options: KIND,
        answer: "Code check",
      },
      {
        label: "The coach suggests a question that implies its own answer (\"Wasn't that frustrating?\")",
        options: KIND,
        answer: "LLM judge",
      },
      {
        label: "The coach's JSON response is missing the score for one of the four dimensions",
        options: KIND,
        answer: "Code check",
      },
    ],
    explanation:
      "Teresa found that a short list of red-flag words (usually, typically and so on) reliably signals a general question, and that keyword check became her best-aligned eval. Leading questions take interpretation, so they got a judge. A missing field is a schema check. Seeing that the general-question case doesn't need a judge took domain expertise, which is why PMs should help design evals.",
    lessonAnchor: "step-2-the-first-two-evals",
  },
  {
    id: "ev-pm-helper-cache",
    lectures: [23],
    tags: ["helper-functions", "cost"],
    type: "mcq",
    prompt:
      "Three of your judges only care about the questions the coach suggested, but each currently receives the full transcript plus the full coach output. You iterate on these judges several times a day. What change gives the biggest win?",
    options: [
      "Extract the suggested questions once per transcript with a helper, cache the result, and feed only those to the judges",
      "Merge the three judges into one prompt so the transcript is only sent once",
      "Switch the judges to a larger model so the long context is handled better",
      "Run the judges only on a random 10% of the dev set while iterating",
    ],
    answer: "Extract the suggested questions once per transcript with a helper, cache the result, and feed only those to the judges",
    explanation:
      "Caching the expensive extraction means editing a judge only reruns the small judge calls, and a judge that sees only what it needs is less easily confused. Merging judges loses the one-failure-per-judge design, a bigger model costs more without narrowing the context, and shrinking the dev set weakens the measurement.",
    lessonAnchor: "step-3-helper-functions-extract-once-and-judge-many-times",
  },
  {
    id: "ev-pm-triage-disagreements",
    lectures: [23],
    tags: ["alignment", "debugging-evals"],
    type: "scenario",
    prompt: "On the first run of five evals over your labeled traces, some results surprise you. Name the most likely cause of each.",
    fields: [
      {
        label: "One eval fails 95% of traces. The coach outputs look fine, but the cached list of extracted questions is mostly empty.",
        options: CAUSE,
        answer: "Helper function bug",
      },
      {
        label: "An eval flags traces you labeled Pass. Rereading them, the failure it describes is really there; your rubric never defined it that precisely.",
        options: CAUSE,
        answer: "My label is wrong",
      },
      {
        label: "The keyword check flags \"Was anything unusual that morning?\" because it contains \"usual\".",
        options: CAUSE,
        answer: "The eval is wrong",
      },
    ],
    explanation:
      "When an eval and your label disagree, there are four suspects, and the product is only one of them. Teresa hit the first two on her very first run: a broken helper made one eval fail nearly everywhere, and an eval written against a sharp definition beat her own looser labels, so she changed her rubric. The third is a substring match that needs word boundaries.",
    lessonAnchor: "step-4-run-everything-and-read-the-table",
  },
  {
    id: "ev-pm-mixed-ab",
    lectures: [23],
    tags: ["ab-testing", "decisions"],
    type: "mcq",
    prompt:
      "You A/B a prompt change on your dev set. Leading-question failures drop from 22% to 12%, two minor failure modes improve slightly, and the greedy-dimension failure rises from 6% to 9%. What is the right way to decide?",
    options: [
      "Make a judgment call weighing how much each failure hurts users; the evals make the trade-off visible, not the decision",
      "Ship only if every eval improves, otherwise revert",
      "Average all the failure rates and ship if the average went down",
      "Ignore the regression, because a 3-point rise is within noise for any dataset",
    ],
    answer: "Make a judgment call weighing how much each failure hurts users; the evals make the trade-off visible, not the decision",
    explanation:
      "Teresa's experience: results are never totally better or totally worse. Requiring every eval to improve would block almost every change, and a plain average treats a catastrophic failure like a cosmetic one. Whether a rise is noise depends on the dev set size, which you should check rather than assume. Weighing failures against each other is a product decision.",
    lessonAnchor: "the-feedback-loop-she-was-missing",
  },
  {
    id: "ev-pm-repeated-excerpts",
    lectures: [23],
    tags: ["measure-first", "workflow"],
    type: "order",
    prompt: "Put Teresa's handling of the repeated-excerpt failure in the order that made the 81% to 3% result trustworthy.",
    steps: [
      "Notice the same excerpt praised in one dimension and criticized in another while reading new traces",
      "Write an eval that detects reworded duplicate excerpts and measure its prevalence",
      "Try a fix (pass later calls the excerpts already used) as a workflow change",
      "A/B the workflow change against production on the dev set with the same eval",
    ],
    explanation:
      "The failure was found by reading traces, then measured before any fix (81%), then fixed with a structural change, then re-measured with the same eval (3%). Without the before number, the after number means nothing. Her first fix, a question classifier, was a dead end she abandoned after a day and a half.",
    lessonAnchor: "case-study-repeated-excerpts-81-to-3",
  },
  {
    id: "ev-pm-whole-trace",
    lectures: [23],
    tags: ["error-analysis", "pipelines"],
    type: "mcq",
    prompt:
      "Your coach is now four LLM calls, one per rubric dimension. Annotating each dimension's output separately is turning up many errors, most of them minor, and you feel you'll be annotating forever. What did Teresa settle on?",
    options: [
      "Do error analysis on the whole response the customer receives, and annotate one dimension only while building an eval for it",
      "Keep annotating each call separately but only sample 5 traces per dimension",
      "Stop annotating and let an LLM judge find failures in each dimension's output",
      "Go back to a single prompt so there is only one output to annotate",
    ],
    answer: "Do error analysis on the whole response the customer receives, and annotate one dimension only while building an eval for it",
    explanation:
      "Reviewing the whole trace still surfaces dimension-specific failures, but ranks them against everything else the customer sees, so you prioritize the critical ones. Undoing the split would bring back the cross-dimension confusion that motivated it, and handing discovery to a judge skips the reading that error analysis is for.",
    lessonAnchor: "whole-trace-or-one-dimension",
  },
  {
    id: "ev-pm-first-week",
    lectures: [23],
    tags: ["process"],
    type: "order",
    prompt: "Order the steps of Teresa's first week, from no evals to a scored first run.",
    steps: [
      "Store about 35 real transcripts and coach outputs in Airtable",
      "Annotate traces in an Airtable interface and name failure modes",
      "Write evals for the two failures that are catastrophic for a teacher",
      "Run every eval over every trace in a notebook and read the table",
      "Compare each eval's verdicts to her own labels",
    ],
    explanation:
      "Data in a familiar tool, then error analysis, then evals only for chosen failures, then a full run, then alignment against human labels. Each step depends on the one before: you can't pick failures you haven't seen, and you can't score a judge without labels.",
    lessonAnchor: "step-1-look-at-traces-in-a-tool-you-already-know",
  },
  {
    id: "ev-pm-collaboration",
    lectures: [23],
    tags: ["collaboration", "product-management"],
    type: "scenario",
    prompt:
      "You lead a team of instructors who want their own AI teaching tools. You can't iterate on every tool yourself. Decide each setup question the way Teresa's experience suggests.",
    fields: [
      {
        label: "Where should the eval code live?",
        options: ["In the product repo, imported by an analysis notebook", "Copied into each instructor's notebook"],
        answer: "In the product repo, imported by an analysis notebook",
      },
      {
        label: "Who decides what each eval should check for?",
        options: ["The instructor with the domain expertise, together with whoever codes it", "The engineer, since evals are code"],
        answer: "The instructor with the domain expertise, together with whoever codes it",
      },
      {
        label: "How should annotation tools be built?",
        options: ["Quickly generated per task and checked on inputs and outputs", "One carefully engineered tool everyone must share"],
        answer: "Quickly generated per task and checked on inputs and outputs",
      },
    ],
    explanation:
      "Separating eval code from analysis lets domain experts run evals and inspect failures without reading the code, and keeps one source of truth that production uses too. Domain experts spot evals an engineer would overbuild. Annotation tools are cheap and disposable, so Teresa vibe coded about half a dozen of them, while she pair programmed the eval and product code.",
    lessonAnchor: "advice-for-pms-and-working-with-engineers",
  },
];
