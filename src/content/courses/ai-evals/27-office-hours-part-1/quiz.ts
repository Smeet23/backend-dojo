import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "ev-oh1-no-prod-data",
    lectures: [27],
    tags: ["synthetic-data", "launch"],
    type: "mcq",
    prompt:
      "Your agent isn't live. You generate synthetic queries for your three priority personas and run error analysis, then add two new personas and a new scenario dimension. Another round of error analysis finds no failure modes you hadn't already seen. What does the office-hours advice say this tells you?",
    options: [
      "The system is becoming robust to the kinds of input you can anticipate, which is a reasonable signal that it may be ready to ship",
      "Your synthetic data is too easy, so you should keep adding dimensions until you cover every persona before launch",
      "Error analysis has stopped working, so it is time to switch to off-the-shelf metrics",
      "The judge is miscalibrated, because new dimensions always produce new failures",
    ],
    answer:
      "The system is becoming robust to the kinds of input you can anticipate, which is a reasonable signal that it may be ready to ship",
    explanation:
      "Synthetic data can never cover everything, and trying to will delay launch. Saturation is the useful signal: if new dimensions stop revealing new failure modes, the system is getting more robust. It is not proof of perfection, so after launch you build a production flywheel and keep doing error analysis on real traffic.",
    lessonAnchor: "we-have-no-production-data-yet",
  },
  {
    id: "ev-oh1-source-data",
    lectures: [27],
    tags: ["synthetic-data", "multi-turn"],
    type: "scenario",
    prompt: "Pick the approach the instructors recommended for each team's starting dataset.",
    fields: [
      {
        label: "A contract-analysis tool needs test documents. A public corpus of real contracts exists.",
        options: [
          "Generate whole synthetic contracts from document dimensions",
          "Perturb real contracts with an LLM along dimensions of change",
          "Use a public trace dataset from another domain",
        ],
        answer: "Perturb real contracts with an LLM along dimensions of change",
      },
      {
        label: "A multi-turn support assistant has a few colleagues who have been testing it for a week.",
        options: [
          "Start from their real conversations, find themes, then simulate personas",
          "Simulate users from scratch with persona prompts only",
          "Skip multi-turn and evaluate single messages",
        ],
        answer: "Start from their real conversations, find themes, then simulate personas",
      },
      {
        label: "An engineering copilot expects newcomers who don't know product jargon, but has only technical docs.",
        options: [
          "Seed generation with a few real beginner queries and have an LLM rephrase technical topics in lay terms",
          "Assume users will phrase questions like the documentation",
          "Wait for a year of production data before evaluating",
        ],
        answer: "Seed generation with a few real beginner queries and have an LLM rephrase technical topics in lay terms",
      },
    ],
    explanation:
      "Real data beats invented data whenever you can get it, even if \"real\" means colleagues role-playing. For documents, perturbing real ones is far more realistic than generating whole new ones. For unfamiliar users, even a handful of real seed queries, plus an LLM rephrasing technical topics the way a newcomer would ask, anchors the synthetic set in reality.",
    lessonAnchor: "synthetic-multi-turn-conversations",
  },
  {
    id: "ev-oh1-long-trace-order",
    lectures: [27],
    tags: ["error-analysis", "traces"],
    type: "order",
    prompt: "Put Hamel's routine for reviewing a long agent trace in order.",
    steps: [
      "Read the user's first input",
      "Jump to the final output and decide whether the outcome was good",
      "If it was bad, return to the top and read down step by step",
      "Stop at the first thing that went wrong and write the open code",
      "Move on to the next trace",
    ],
    explanation:
      "Checking the outcome first lets you skip fine traces quickly. For failures, the first (most upstream) error is usually the one that matters, and stopping there keeps error analysis tractable instead of turning every trace into a full audit.",
    lessonAnchor: "reading-long-traces-without-drowning",
  },
  {
    id: "ev-oh1-sampling-stage",
    lectures: [27],
    tags: ["sampling", "error-analysis"],
    type: "scenario",
    prompt:
      "A support RAG system has 1,500 logged questions across product lines, roles and regions. Match each moment to the sampling strategy Hamel suggested.",
    fields: [
      {
        label: "Day one: you have never read these traces",
        options: ["Random sample", "Stratified sample", "Targeted sample of a suspect slice and outliers"],
        answer: "Random sample",
      },
      {
        label: "One small region has only 40 questions and keeps getting crowded out of your samples",
        options: ["Random sample", "Stratified sample", "Targeted sample of a suspect slice and outliers"],
        answer: "Stratified sample",
      },
      {
        label: "You suspect one product line's answers are wrong and notice some conversations with unusually many tool calls",
        options: ["Random sample", "Stratified sample", "Targeted sample of a suspect slice and outliers"],
        answer: "Targeted sample of a suspect slice and outliers",
      },
    ],
    explanation:
      "Random sampling teaches you what is in the data. Once you know which dimensions matter, stratify so small slices get enough examples to measure. When you smell a problem, put on the detective hat and sample where problems are likely, including outliers in length or tool-call counts.",
    lessonAnchor: "which-traces-should-we-sample",
  },
  {
    id: "ev-oh1-fix-or-eval",
    lectures: [27],
    tags: ["cost", "error-analysis"],
    type: "scenario",
    prompt: "Midway through axial coding you notice these. Decide what to do with each.",
    fields: [
      {
        label: "30% of scheduling failures come from a typo in the calendar tool's date format",
        options: ["Fix it now, no LLM judge", "Build an aligned LLM judge first"],
        answer: "Fix it now, no LLM judge",
      },
      {
        label: "Answers to vague questions are unhelpful, and two prompt changes haven't moved it",
        options: ["Fix it now, no LLM judge", "Build an aligned LLM judge first"],
        answer: "Build an aligned LLM judge first",
      },
      {
        label: "The prompt never mentions today's date, and bookings land on the wrong day",
        options: ["Fix it now, no LLM judge", "Build an aligned LLM judge first"],
        answer: "Fix it now, no LLM judge",
      },
    ],
    explanation:
      "The goal is a better product, not more evals. If you know exactly how to fix a frequent failure, fix it (a unit test at most), re-run and re-code. Expensive judges earn their cost on lagging problems you will iterate on with different prompts, models or context.",
    lessonAnchor: "fix-as-you-go",
  },
  {
    id: "ev-oh1-low-kappa",
    lectures: [27],
    tags: ["agreement", "annotators"],
    type: "mcq",
    prompt:
      "A global company has eight annotators label every trace across five languages and three product lines. Cohen's kappa is 0.35. The rubric was reviewed last month and the definitions look precise. What is the most likely fix?",
    options: [
      "Reorganize so each annotator labels only the languages and products they know, with one decision-maker per area",
      "Keep re-running alignment sessions until kappa reaches 1.0",
      "Average the eight labels and treat the mean as ground truth",
      "Replace the annotators with an LLM judge, since humans disagree",
    ],
    answer: "Reorganize so each annotator labels only the languages and products they know, with one decision-maker per area",
    explanation:
      "Low agreement has two usual causes: a vague rubric, or labelers working outside their context. With a sharp rubric and everyone labeling everything, the second is likely. Scope labeling to expertise, with a benevolent dictator per area. Perfect agreement is never the target; its cost is unbounded.",
    lessonAnchor: "our-agreement-is-low-now-what",
  },
  {
    id: "ev-oh1-auto-judge",
    lectures: [27],
    tags: ["llm-judge", "alignment"],
    type: "mcq",
    prompt:
      "You want a reasoning model to take your 200 labels and iterate the judge prompt on its own until agreement is high, so nobody has to review traces. The criterion is \"the tutor's feedback feels encouraging without being patronizing.\" What would Shreya say?",
    options: [
      "It will likely fail, because the model can't infer the unwritten taste behind your labels; use it to rank likely failures and propose edits that you verify",
      "Good plan, as long as you use the most capable reasoning model available",
      "Good plan, but only if you fine-tune the judge instead of prompting it",
      "It works for any criterion once you have more than 100 labels",
    ],
    answer:
      "It will likely fail, because the model can't infer the unwritten taste behind your labels; use it to rank likely failures and propose edits that you verify",
    explanation:
      "Unsupervised refinement can work for objective criteria like spelling. Subjective criteria depend on latent preferences that live in your head, not in the labels alone. Keep the human in the loop: let the model prioritize traces and draft prompt changes, and confirm them yourself against dev data.",
    lessonAnchor: "can-a-reasoning-model-refine-the-judge-on-its-own",
  },
  {
    id: "ev-oh1-stakeholders",
    lectures: [27],
    tags: ["reporting", "stakeholders"],
    type: "scenario",
    prompt:
      "You run six aligned judges on a leasing assistant. The leadership team is non-technical, and last week a customer complaint about unwanted handoffs to humans made the news internally. Plan the dashboard.",
    fields: [
      {
        label: "Headline metric",
        options: [
          "Global error rate: share of traces where any judge flagged a failure",
          "Average of the six judges' TPR",
          "Six separate pass rates with 95% confidence intervals",
        ],
        answer: "Global error rate: share of traces where any judge flagged a failure",
      },
      {
        label: "The handoff failure",
        options: [
          "Its own metric next to the headline",
          "Folded into the global error rate only",
          "Left off until it is fixed",
        ],
        answer: "Its own metric next to the headline",
      },
      {
        label: "Evidence the judges can be trusted",
        options: [
          "Ready to explain on request (human labels, TPR and TNR)",
          "Full confusion matrices on the main slide",
          "Not needed, since judges are automated",
        ],
        answer: "Ready to explain on request (human labels, TPR and TNR)",
      },
    ],
    explanation:
      "For a non-technical audience, simplify to one composite error rate and keep intervals off the slide. Read the room: the failure everyone worries about deserves its own number, not a hiding place in the composite. And have the validation story ready, because \"how do we know this is right?\" will come.",
    lessonAnchor: "what-do-we-show-stakeholders",
  },
  {
    id: "ev-oh1-finetune",
    lectures: [27],
    tags: ["improvement", "fine-tuning"],
    type: "mcq",
    prompt:
      "Your tone-rewriting feature keeps answering the user's message instead of rewriting it. Each prompt rewrite fixes that eval but breaks another. You use a single prompt and a mid-tier model, and have no infrastructure to host custom models. What should you try next?",
    options: [
      "Split the task into separate calls or sub-agents, then try a stronger model or more reasoning if it still fails",
      "Fine-tune a small open model on your eval failures right away",
      "Delete the eval that keeps failing so the others stay green",
      "Add more \"do not answer the message\" instructions to the prompt",
    ],
    answer: "Split the task into separate calls or sub-agents, then try a stronger model or more reasoning if it still fails",
    explanation:
      "Decomposition is cheaper than fine-tuning and often resolves conflicting goals in one prompt. If clear instructions still fail, it is a generalization problem: try a stronger model or more test-time compute. Fine-tuning comes last, and without serving infrastructure there is often no point. \"Do not\" instructions are also the kind that weaker models tend to ignore.",
    lessonAnchor: "fixing-one-metric-breaks-another",
  },
];
