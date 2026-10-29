import type { Question } from "@/lib/types";

const WHO = ["Engineers can learn to judge it", "Needs domain-expert reviewers"];
const VIEW = ["Trace viewer in an observability tool", "Review view inside the product", "Custom review dashboard"];
const CAPTURE = ["Correct or incorrect verdict", "Failure-mode tag", "Free-text failure note", "Domain knowledge snippet"];
const MODE = ["Under-inferring", "Retrospective reasoning", "Over-inferring"];
const DATA = [
  "Delete it and rebuild from recent production",
  "Keep data separated per customer",
  "Write evaluation use into the contract as QA",
  "Keep it as a permanent golden set",
];

export const quiz: Question[] = [
  {
    id: "ev-vert-two-month-test",
    lectures: [21],
    tags: ["domain-experts"],
    type: "scenario",
    prompt: "Apply the talk's two-month test. Who should be reviewing outputs for each product?",
    fields: [
      { label: "An app that summarizes internal team meetings", options: WHO, answer: "Engineers can learn to judge it" },
      { label: "An assistant that checks medical records against insurer guidelines for prior authorization", options: WHO, answer: "Needs domain-expert reviewers" },
      { label: "A tool that flags unusual indemnity clauses in acquisition contracts", options: WHO, answer: "Needs domain-expert reviewers" },
      { label: "A bot that rewrites support emails for a friendlier tone", options: WHO, answer: "Engineers can learn to judge it" },
    ],
    explanation:
      "The question is whether a layperson could build top-tier judgment after a couple of months full-time. Meeting summaries and email tone: yes, taste develops with exposure. Clinical reasoning and contract risk rest on years of training, so a non-expert's pass/fail labels can't be trusted.",
    lessonAnchor: "when-is-a-domain-specialized",
  },
  {
    id: "ev-vert-nonexpert-labels",
    lectures: [21],
    tags: ["correctness", "llm-judge"],
    type: "mcq",
    prompt:
      "A clinical QA assistant's engineers labeled 200 traces themselves, then built an LLM judge that agrees with their labels 95% of the time. A physician reviewing a few traces finds an answer the labels marked correct: it called a prior MRI \"suspicious\" for a disease the patient is already confirmed to have. What is the real problem?",
    options: [
      "The labels are wrong, so the judge is well aligned to the wrong standard. Experts need to relabel.",
      "The judge needs more few-shot examples to push agreement above 95%.",
      "Agreement is high, so this one case is noise and can be ignored.",
      "The judge should switch from pass/fail to a 1 to 10 scale to capture nuance.",
    ],
    answer: "The labels are wrong, so the judge is well aligned to the wrong standard. Experts need to relabel.",
    explanation:
      "Judge alignment only measures agreement with whoever labeled. In a specialized domain, correctness can hinge on meanings a non-expert can't see (a confirmed diagnosis is not \"suspicious\"). High agreement with non-expert labels is false comfort. Fix the ground truth first.",
    lessonAnchor: "what-gets-harder",
  },
  {
    id: "ev-vert-which-view",
    lectures: [21],
    tags: ["review-interfaces"],
    type: "scenario",
    prompt: "Pick the most sensible way to put traces in front of domain experts in each situation.",
    fields: [
      {
        label: "Week two of a prototype. A clinician advisor will glance at a handful of traces once a week.",
        options: VIEW,
        answer: "Trace viewer in an observability tool",
      },
      {
        label: "A patient-facing chat app. Reviewers must judge each reply in exactly the context the patient saw, and little else is needed.",
        options: VIEW,
        answer: "Review view inside the product",
      },
      {
        label: "Expert review drives the product's quality. Each case needs a long record, guidelines and several AI answers checked side by side.",
        options: VIEW,
        answer: "Custom review dashboard",
      },
    ],
    explanation:
      "Trace viewers cost nothing but are built for engineers. An in-product view shows the user's context but is hard to tailor. When expert review is central and the context is heavy, a custom dashboard (vibe-coded first) lets you design the flow for speed and accuracy.",
    lessonAnchor: "empower-experts-to-look-at-the-data",
  },
  {
    id: "ev-vert-review-flow",
    lectures: [21],
    tags: ["review-interfaces"],
    type: "order",
    prompt: "Put the review sequence Anterior settled on after shadowing nurses in order.",
    steps: [
      "Read the case summary: the patient and the requested procedure",
      "See the current decision point: the question the AI is answering",
      "Step through the relevant evidence in the medical record",
      "Judge the AI's output and record the verdict",
    ],
    explanation:
      "High-level context first, then the specific question, then the evidence that bears on it, and only then a verdict. Nurses' own habits varied a lot. The team kept what effective reviews shared and enforced that order, which made reviews both faster and less likely to miss context.",
    lessonAnchor: "designing-the-review-dashboard",
  },
  {
    id: "ev-vert-review-fields",
    lectures: [21],
    tags: ["review-data"],
    type: "scenario",
    prompt: "Each need below is met by one part of a review record. Which part?",
    fields: [
      { label: "Leadership asks how accurate the AI is on this month's knee-surgery requests", options: CAPTURE, answer: "Correct or incorrect verdict" },
      { label: "Engineering wants to know which kind of mistake causes most errors", options: CAPTURE, answer: "Failure-mode tag" },
      { label: "A reviewer keeps seeing an error that fits none of the taxonomy's categories", options: CAPTURE, answer: "Free-text failure note" },
      {
        label: "A nurse notices the AI doesn't know that a guideline's \"conservative therapy\" means a minimum trial period",
        options: CAPTURE,
        answer: "Domain knowledge snippet",
      },
    ],
    explanation:
      "The verdict gives the performance metric, sliceable by procedure. Tags give the failure distribution. Free text keeps the taxonomy alive. Someone reviews it and adds categories. A domain knowledge snippet stored as a string can become a fix that goes straight back into the pipeline.",
    lessonAnchor: "what-each-review-should-capture",
  },
  {
    id: "ev-vert-auto-fix-gate",
    lectures: [21],
    tags: ["review-data", "regression"],
    type: "mcq",
    prompt:
      "A reviewer's domain knowledge snippet is tested automatically. On its failure-mode dataset (50 recent production failures) the score rises from 0% to 80%. On the regression suite it drops from 94% to 91%; the performance suite is unchanged. What should the pipeline do?",
    options: [
      "Hold it back: it fixed one failure mode but broke cases elsewhere",
      "Ship it: an 80-point gain outweighs a 3-point loss",
      "Ship it, since the performance suite didn't move",
      "Discard the failure-mode dataset because it is all failures",
    ],
    answer: "Hold it back: it fixed one failure mode but broke cases elsewhere",
    explanation:
      "The auto-ship rule is: it must fix the targeted failure mode and cause no other problems. A regression drop means previously correct cases now fail, so a human should look at it. The failure-mode dataset starting at 0% is by design: it is made only of failures.",
    lessonAnchor: "using-the-review-data",
  },
  {
    id: "ev-vert-risk-order",
    lectures: [21],
    tags: ["risk", "prioritization"],
    type: "scenario",
    prompt:
      "A week of reviews found: under-inferring 20 errors (pushes toward \"not met\"), retrospective reasoning 6 errors (pushes toward \"met\"), over-inferring 9 errors (pushes toward \"met\"). The AI approves or escalates to a nurse. The team rates a wrong \"not met\" at severity 1 and a wrong \"met\" at 4. Score risk as errors x severity.",
    fields: [
      { label: "Top priority by frequency alone", options: MODE, answer: "Under-inferring" },
      { label: "Top priority by risk in the approve-or-escalate design", options: MODE, answer: "Over-inferring" },
      { label: "Top priority by risk if the AI could deny, making a wrong \"not met\" severity 5", options: MODE, answer: "Under-inferring" },
    ],
    explanation:
      "Frequency: 20 beats 9 and 6. With escalation, risk is 20 x 1 = 20, 6 x 4 = 24 and 9 x 4 = 36, so over-inferring (unchecked approvals) comes first. Let the AI deny and under-inferring becomes 20 x 5 = 100. The deployment design, not the error count, decides which errors are expensive.",
    lessonAnchor: "frequency-is-not-the-whole-risk",
  },
  {
    id: "ev-vert-data-terms",
    lectures: [21],
    tags: ["privacy", "compliance"],
    type: "scenario",
    prompt: "A healthcare AI vendor faces these data questions. What is the right move for each?",
    fields: [
      {
        label: "The contract allows keeping data for three months. A failure-mode dataset was built four months ago.",
        options: DATA,
        answer: "Delete it and rebuild from recent production",
      },
      {
        label: "Customer B's cases would make a great addition to customer A's regression suite.",
        options: DATA,
        answer: "Keep data separated per customer",
      },
      {
        label: "A new customer has never worked with an LLM vendor and doesn't know what data terms to ask for.",
        options: DATA,
        answer: "Write evaluation use into the contract as QA",
      },
    ],
    explanation:
      "Retention windows mean eval sets expire, so continuous production review has to keep regenerating them (which also keeps them representative). Data never crosses customers. And new customers need steering early, while the contract is negotiated, with review framed as quality assurance and improvement.",
    lessonAnchor: "data-privacy-and-retention",
  },
  {
    id: "ev-vert-principal-expert",
    lectures: [21],
    tags: ["domain-experts", "hiring"],
    type: "mcq",
    prompt: "A legal-AI startup is about to hire its first domain expert. Which plan follows the talk's advice?",
    options: [
      "Hire an experienced lawyer now as the accountable owner of what \"correct\" means, involve them in sampling, product and customer work, and pair them with a data scientist",
      "Wait until the product is built, then contract several lawyers to label traces part-time",
      "Form a panel of five lawyers who decide each disputed label by majority vote",
      "Hire a statistician first, since the evaluation is mostly sampling and metrics",
    ],
    answer:
      "Hire an experienced lawyer now as the accountable owner of what \"correct\" means, involve them in sampling, product and customer work, and pair them with a data scientist",
    explanation:
      "Hire the principal domain expert early and give them ownership, not just a labeling queue. They decide when correctness is uncertain (no committee), and their role grows to hiring reviewers, sampling, reviewer alignment, product steering and customers. Nobody has every skill, so pair them with complementary people.",
    lessonAnchor: "hiring-the-principal-domain-expert",
  },
];
