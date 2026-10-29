import type { Question } from "@/lib/types";

const BUCKETS = ["Desirability", "Usability", "Feasibility", "Viability", "Ethical"];
const HOW = ["Code-based check", "LLM judge", "Product or QA work, not an LLM eval"];

export const quiz: Question[] = [
  {
    id: "ev-live-buckets",
    lectures: [25],
    tags: ["dimensions", "assumption-tests"],
    type: "scenario",
    prompt: "You're listing dimensions to test an AI meeting note-taker. Put each in the assumption-test bucket it belongs to.",
    fields: [
      { label: "The summary captures every action item with its owner", options: BUCKETS, answer: "Desirability" },
      { label: "A reader can scan the summary in under a minute without hunting", options: BUCKETS, answer: "Usability" },
      { label: "Jargon and product names are transcribed correctly at scale", options: BUCKETS, answer: "Feasibility" },
      { label: "Per-meeting token cost stays below what the plan price supports", options: BUCKETS, answer: "Viability" },
      { label: "Participants know they are being recorded", options: BUCKETS, answer: "Ethical" },
    ],
    explanation:
      "Desirability is whether the output is valuable enough to choose; usability is how easy it is to use; feasibility is whether quality holds reliably at speed and scale; viability is whether it makes business sense; ethics covers consent and harm. Sorting dimensions this way helps you notice whole buckets you forgot to test.",
    lessonAnchor: "start-with-dimensions-not-opinions",
  },
  {
    id: "ev-live-split-vote",
    lectures: [25],
    tags: ["icp", "subjectivity"],
    type: "mcq",
    prompt:
      "Your team compares two summarizers on ten meetings. The vote splits 55/45 and people argue about formatting versus depth. What should you do next?",
    options: [
      "Define the target user and their common follow-up questions, then judge each output against what that user needs",
      "Take the majority: 55% is a clear enough signal",
      "Ask an LLM judge which summary is better overall, to remove human bias",
      "Run the vote again with more people until it stops being close",
    ],
    answer: "Define the target user and their common follow-up questions, then judge each output against what that user needs",
    explanation:
      "A split vote usually means the voters are different users with different needs. Until you fix who the product is for (in the session: a PM or developer returning after sprint planning), \"better\" has no answer. More voters or an overall LLM judge just average over the same disagreement.",
    lessonAnchor: "preferences-split-so-anchor-on-the-user",
  },
  {
    id: "ev-live-bias",
    lectures: [25],
    tags: ["labeling", "bias"],
    type: "mcq",
    prompt:
      "During a live side-by-side test, a respected teammate says \"well, one of them has timestamps\" just before everyone votes. What is the problem, and the fix?",
    options: [
      "Votes are no longer independent; collect votes and reasons privately before any discussion",
      "Nothing: timestamps are an objective feature, so mentioning them is fine",
      "The comparison is invalid; switch to a 1 to 5 scale so opinions average out",
      "Only the teammate's vote is biased; drop it and keep the rest",
    ],
    answer: "Votes are no longer independent; collect votes and reasons privately before any discussion",
    explanation:
      "Hamel did exactly this in the session and Robert called out that he had biased the room. Independent labels first, discussion second, is the same rule used for annotator agreement. A rating scale doesn't undo anchoring, and everyone who heard the comment is affected, not just the speaker.",
    lessonAnchor: "preferences-split-so-anchor-on-the-user",
  },
  {
    id: "ev-live-categories",
    lectures: [25],
    tags: ["failure-categories", "evaluator-choice"],
    type: "scenario",
    prompt: "Observations from testing an AI product. Decide how each should be checked going forward.",
    fields: [
      { label: "The assistant's reply names a competitor", options: HOW, answer: "Code-based check" },
      { label: "Next steps reuse in-meeting slang that an absent reader wouldn't understand", options: HOW, answer: "LLM judge" },
      { label: "A notification's close button doesn't work", options: HOW, answer: "Product or QA work, not an LLM eval" },
      { label: "After a follow-up edit, a generated app no longer lets you add tasks", options: HOW, answer: "Code-based check" },
    ],
    explanation:
      "Competitor names can be matched against a list. Whether wording is understandable out of context needs interpretation, so a judge (aligned with your labels). A broken close button is ordinary UI work. A generated app's core features can be checked with a scripted smoke test after every edit.",
    lessonAnchor: "the-failure-categories",
  },
  {
    id: "ev-live-hypothesis",
    lectures: [25],
    tags: ["hypothesis", "test-case"],
    type: "mcq",
    prompt:
      "While dogfooding, you ask your meeting assistant \"Can I export this to Notion?\" and it replies that the meeting didn't discuss Notion. Which hypothesis is most useful to test?",
    options: [
      "It treats every question as a question about the current transcript, so product questions get misrouted",
      "The model is unreliable and needs to be swapped",
      "The meeting was too long for the context window",
      "Users shouldn't ask product questions in a meeting chat",
    ],
    answer: "It treats every question as a question about the current transcript, so product questions get misrouted",
    explanation:
      "A useful hypothesis names a cause and predicts other failures: any question about the product, however phrased, should be misread too. That tells you what variations to run. \"Unreliable model\" predicts nothing specific, the context window doesn't explain a misread question, and blaming the user skips the test entirely.",
    lessonAnchor: "from-one-observation-to-a-test-case",
  },
  {
    id: "ev-live-competitor-check",
    lectures: [25],
    tags: ["guardrails", "code-evals"],
    type: "mcq",
    prompt:
      "Your support bot sometimes recommends a competitor. You add a code check that fails any reply naming a competitor from a list, unless it is the legal-approved response. Which failure can this check still miss?",
    options: [
      "A reply that tells the user to look at \"other tools that might suit you better\" without naming any",
      "A reply that names a listed competitor in its first sentence",
      "A reply that names a listed competitor in lowercase",
      "The legal-approved response itself",
    ],
    answer: "A reply that tells the user to look at \"other tools that might suit you better\" without naming any",
    explanation:
      "A keyword check only sees names on its list. Steering users away without a name slips through. If that matters, add indirect probes to the test set and, once you've labeled examples, a judge for that specific failure. Lowercasing handles case, and the approved response is meant to pass.",
    lessonAnchor: "worked-example-the-competitor-question",
  },
  {
    id: "ev-live-variations",
    lectures: [25],
    tags: ["multi-turn", "regression"],
    type: "scenario",
    prompt:
      "An app builder produced a working to-do app, then broke it when asked to \"add tags and categories\". Your hypothesis: follow-up edits regress features that already worked. Which inputs test that?",
    fields: [
      { label: "Apply several small feature requests in a row to one generated app", options: ["Tests the hypothesis", "Doesn't test it"], answer: "Tests the hypothesis" },
      { label: "Repeat the same edit on several freshly generated apps", options: ["Tests the hypothesis", "Doesn't test it"], answer: "Tests the hypothesis" },
      { label: "Compare how polished the first version looks", options: ["Tests the hypothesis", "Doesn't test it"], answer: "Doesn't test it" },
      { label: "Rewrite the first prompt with a detailed spec and stop there", options: ["Tests the hypothesis", "Doesn't test it"], answer: "Doesn't test it" },
    ],
    explanation:
      "The failure appeared on the second turn, so the variations must exercise later turns: chains of edits, and the same edit repeated to get a rate rather than a single anecdote. First-turn quality and first-prompt detail don't touch what broke.",
    lessonAnchor: "from-one-observation-to-a-test-case",
  },
  {
    id: "ev-live-probe-order",
    lectures: [25],
    tags: ["method"],
    type: "order",
    prompt: "Put the steps of the session's product-testing method in order.",
    steps: [
      "Give both products the same input, with matching settings",
      "Read the default output before customizing anything",
      "Ask a realistic question your target user would ask",
      "Try off-script probes and a follow-up change",
      "Write a hypothesis for each surprise and turn it into a pass/fail test",
    ],
    explanation:
      "Identical inputs make differences attributable to the product. Defaults come first because most users never change them, then the common query, then the edges where failures hide. Each surprise is only an anecdote until it becomes a hypothesis with variations and a binary check.",
    lessonAnchor: "how-he-probed",
  },
  {
    id: "ev-live-latency",
    lectures: [25],
    tags: ["latency", "ux"],
    type: "mcq",
    prompt:
      "Users say your assistant's answers \"feel rushed and generic\", and a stakeholder asks you to make the model respond faster to improve satisfaction. Based on the session, what's the better first move?",
    options: [
      "Check whether perceived quality is the issue: test showing a thinking state and better answers, not only lower latency",
      "Switch to the fastest available model, since speed always improves satisfaction",
      "Ignore the feedback, since speed is a UX issue and not something evals cover",
      "Add a fixed 10-second delay to every answer",
    ],
    answer: "Check whether perceived quality is the issue: test showing a thinking state and better answers, not only lower latency",
    explanation:
      "In the session, an instant answer felt to Robert like someone who \"listened to talk\". Hamel noted that clients asking for lower latency often only need a visible thinking indicator. Speed is one part of time to value; the number of turns until the user feels understood is the other.",
    lessonAnchor: "preferences-split-so-anchor-on-the-user",
  },
];
