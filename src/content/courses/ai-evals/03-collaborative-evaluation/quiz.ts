import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "ev-collab-single-turn-repro",
    lectures: [3],
    tags: ["multi-turn"],
    type: "scenario",
    prompt:
      "Your shopping assistant gives a 15-day return window for the X1000 on turn 5 of a conversation, after the user named the product on turn 4. The real policy is 30 days. You want a test case you can iterate on quickly.",
    fields: [
      {
        label: "First thing to try",
        options: [
          "Ask in one turn: 'What is the return window for the X1000?'",
          "Build an LLM user simulator that recreates 5-turn conversations",
          "Grade every turn of the original conversation",
          "Increase the context window",
        ],
        answer: "Ask in one turn: 'What is the return window for the X1000?'",
      },
      {
        label: "If the single turn also says 15 days, the likely cause is",
        options: [
          "Retrieval or grounding of the policy",
          "The assistant forgetting earlier turns",
          "The user's phrasing on turn 4",
          "Too many turns in the conversation",
        ],
        answer: "Retrieval or grounding of the policy",
      },
    ],
    explanation:
      "Treat multi-turn failures like bugs and look for the minimal reproduction. If one turn reproduces it, the failure isn't conversational: it's about fetching or using the right policy, and you can test it with cheap single-turn cases.",
    lessonAnchor: "reproduce-a-multi-turn-failure-as-a-single-turn",
  },
  {
    id: "ev-collab-n-minus-one",
    lectures: [3],
    tags: ["multi-turn", "memory"],
    type: "mcq",
    prompt:
      "A movie bot hears 'I love sci-fi' on turn 3, asks about favorite actors, and on turn 6 recommends a romantic comedy. Asking for a sci-fi movie in a single turn works fine. How do you turn this into a reliable test?",
    options: [
      "Keep the first five turns, then sample the bot's next reply many times and count how often it ignores sci-fi",
      "Rerun the full conversation once and check whether it fails again",
      "Add 'remember user preferences' to the prompt and ship",
      "Score each of the six turns on a 1 to 5 coherence scale",
    ],
    answer: "Keep the first five turns, then sample the bot's next reply many times and count how often it ignores sci-fi",
    explanation:
      "This failure is inherently multi-turn (it's about memory), so truncate to the N-1 turns before the bad reply and sample repeatedly. A failure rate across samples is a test you can rerun after every fix; a set of such prefixes becomes a memory regression suite.",
    lessonAnchor: "truncate-to-n-1-turns-for-memory-failures",
  },
  {
    id: "ev-collab-session-level",
    lectures: [3],
    tags: ["multi-turn"],
    type: "scenario",
    prompt:
      "You have 300 logged conversations from a tour-booking assistant, averaging 9 turns each, and two days to find out what's broken.",
    fields: [
      {
        label: "First pass labels",
        options: [
          "Session level: did the user get a tour booked (pass/fail)?",
          "Turn level: grade all ~2,700 replies",
          "A 1 to 5 helpfulness score per conversation",
          "Only the final reply of each conversation",
        ],
        answer: "Session level: did the user get a tour booked (pass/fail)?",
      },
      {
        label: "When to look turn by turn",
        options: [
          "Deep-dive a handful of failing sessions to debug them",
          "On every conversation, after session labels",
          "Never; turn-level review isn't useful",
          "Only on sessions that passed",
        ],
        answer: "Deep-dive a handful of failing sessions to debug them",
      },
    ],
    explanation:
      "Session-level pass/fail is cheap and tells you whether the product works. Turn-level analysis is a debugging tool: use it on representative failing sessions to find where things went wrong, not as a routine on every trace.",
    lessonAnchor: "evaluate-at-the-session-level-first",
  },
  {
    id: "ev-collab-dictator",
    lectures: [3],
    tags: ["benevolent-dictator"],
    type: "mcq",
    prompt:
      "A 25-person startup builds an assistant that drafts therapy session notes. Six people (two engineers, a PM, a designer, the head of sales and the lead clinician) review traces together and spend about 20 minutes debating each one. Labeling has stalled. What's the best move?",
    options: [
      "Make the lead clinician the principal domain expert who decides pass/fail, and give them a review tool that shows tool calls clearly",
      "Have the six people vote on each trace to speed things up",
      "Let the engineers label, since they understand the system best",
      "Switch to a 1 to 5 scale so people can express partial agreement",
    ],
    answer: "Make the lead clinician the principal domain expert who decides pass/fail, and give them a review tool that shows tool calls clearly",
    explanation:
      "A committee stuck on every trace usually has a decision-rights problem. In a small company, appoint one benevolent dictator with the domain expertise (here, the clinician). They don't need to spot engineering bugs themselves if the tooling surfaces them.",
    lessonAnchor: "the-benevolent-dictator",
  },
  {
    id: "ev-collab-workflow-order",
    lectures: [3],
    tags: ["workflow"],
    type: "order",
    prompt: "Put the collaborative annotation workflow in order.",
    steps: [
      "Draft a rubric with binary criteria and a few pass/fail examples",
      "Pick 20 to 50 shared traces, including borderline cases",
      "Each annotator labels every trace independently, without discussion",
      "Compute inter-annotator agreement (Cohen's kappa)",
      "Hold an alignment session on the disagreements",
      "Revise the rubric and repeat on fresh traces until kappa is about 0.6 or higher",
      "Finalize the rubric and a consensus gold set",
    ],
    explanation:
      "Independent labeling comes before measurement, and measurement before discussion, so the numbers reflect what the rubric alone communicates. The loop repeats until agreement is high, and its outputs are the rubric and the gold set.",
    lessonAnchor: "a-collaborative-annotation-workflow",
  },
  {
    id: "ev-collab-kappa-calc",
    lectures: [3],
    tags: ["kappa"],
    type: "scenario",
    prompt:
      "Two reviewers label 20 traces for 'escalated to a human when required'. Reviewer A passes 15, reviewer B passes 12. They both pass 11 and both fail 4.",
    fields: [
      { label: "Observed agreement P_o", options: ["0.75", "0.55", "0.80", "0.60"], answer: "0.75" },
      { label: "Chance agreement P_e", options: ["0.55", "0.45", "0.75", "0.50"], answer: "0.55" },
      { label: "Cohen's kappa", options: ["0.44", "0.20", "0.75", "0.55"], answer: "0.44" },
      { label: "Verdict", options: ["Moderate: refine the rubric and re-label", "Almost perfect: build the judge", "Poor: drop the criterion", "Substantial: good enough"], answer: "Moderate: refine the rubric and re-label" },
    ],
    explanation:
      "P_o = (11 + 4) / 20 = 0.75. A passes 0.75 of items and B 0.60, so P_e = 0.75 × 0.60 + 0.25 × 0.40 = 0.45 + 0.10 = 0.55. κ = (0.75 - 0.55) / (1 - 0.55) = 0.20 / 0.45 ≈ 0.44, in the moderate band, below the 0.6 target. Low agreement means the criterion needs a clearer definition, not that it's unimportant.",
    lessonAnchor: "a-worked-example",
  },
  {
    id: "ev-collab-skewed",
    lectures: [3],
    tags: ["kappa", "percent-agreement"],
    type: "scenario",
    prompt:
      "On 200 traces, two annotators each mark 190 as pass. They agree on 190 traces: 185 passes and 5 fails. Your PM says '95% agreement, the rubric is done.'",
    fields: [
      { label: "Chance agreement P_e", options: ["About 0.91", "About 0.50", "About 0.95", "About 0.10"], answer: "About 0.91" },
      { label: "Cohen's kappa", options: ["About 0.47", "About 0.95", "About 0.91", "About 0.05"], answer: "About 0.47" },
      { label: "What it tells you", options: ["They barely agree on which traces fail", "The rubric is ready for an LLM judge", "One annotator is careless", "Kappa can't be used with skewed labels"], answer: "They barely agree on which traces fail" },
    ],
    explanation:
      "P_e = 0.95 × 0.95 + 0.05 × 0.05 = 0.905. κ = (0.95 - 0.905) / (1 - 0.905) ≈ 0.47. Each flagged 10 fails but only 5 overlap. When most traces pass, percent agreement is inflated by chance; kappa exposes that the fail cases, which matter most, are poorly defined.",
    lessonAnchor: "percent-agreement-and-why-it-misleads",
  },
  {
    id: "ev-collab-groupthink",
    lectures: [3],
    tags: ["pitfalls"],
    type: "scenario",
    prompt:
      "Two support leads spend an afternoon discussing 30 example replies and agreeing on how to judge 'resolved the issue'. They then label 50 new traces and get κ = 0.88. A contractor given only the written rubric labels the same 50 and gets κ = 0.41 against either lead.",
    fields: [
      {
        label: "Pitfall",
        options: [
          "Labels weren't independent: the shared understanding never reached the rubric",
          "The contractor needs more training sessions",
          "Kappa is unreliable on 50 traces",
          "The leads should have used percent agreement",
        ],
        answer: "Labels weren't independent: the shared understanding never reached the rubric",
      },
      {
        label: "Fix",
        options: [
          "Write the decisions from that afternoon into the rubric as rules and examples, then re-test with a fresh annotator",
          "Take a majority vote among the three",
          "Drop the contractor's labels",
          "Lower the target kappa to 0.4",
        ],
        answer: "Write the decisions from that afternoon into the rubric as rules and examples, then re-test with a fresh annotator",
      },
    ],
    explanation:
      "High kappa after long pre-discussion measures groupthink. The test of a rubric is whether someone who only reads it agrees, because that's exactly the position an LLM judge will be in.",
    lessonAnchor: "common-pitfalls",
  },
  {
    id: "ev-collab-alignment",
    lectures: [3],
    tags: ["rubric", "alignment"],
    type: "mcq",
    prompt:
      "In an alignment session on 'helpful', annotators keep splitting on replies that are factually correct but full of jargon a first-time renter wouldn't understand. What should the moderator do?",
    options: [
      "Add a decision rule (correct but unexplained jargon fails) plus a pass and a fail example of exactly this case",
      "Take a majority vote on each disputed trace and move on",
      "Ask each annotator to re-label until they match",
      "Remove these traces from the shared set",
    ],
    answer: "Add a decision rule (correct but unexplained jargon fails) plus a pass and a fail example of exactly this case",
    explanation:
      "Alignment sessions fix the rubric, not past labels. A decision rule and borderline examples make future annotators agree on this case; voting resolves today's labels but leaves the same ambiguity for the next batch.",
    lessonAnchor: "turning-disagreement-into-a-sharper-rubric",
  },
  {
    id: "ev-collab-which-metric",
    lectures: [3],
    tags: ["kappa", "judges"],
    type: "scenario",
    prompt: "Pick the right measure for each situation.",
    fields: [
      {
        label: "Your LLM judge vs. a gold set the domain expert labeled",
        options: ["TPR and TNR", "Cohen's kappa", "Fleiss' kappa", "Percent agreement"],
        answer: "TPR and TNR",
      },
      {
        label: "Three annotators labeling the same traces pass/fail",
        options: ["Fleiss' kappa", "Cohen's kappa", "TPR and TNR", "Percent agreement"],
        answer: "Fleiss' kappa",
      },
      {
        label: "Two peer annotators labeling pass/fail",
        options: ["Cohen's kappa", "Fleiss' kappa", "TPR and TNR", "Krippendorff's alpha"],
        answer: "Cohen's kappa",
      },
    ],
    explanation:
      "Kappa measures agreement between peers. Once human labels are ground truth, the judge is a classifier, so you measure how often it catches fails and passes (TPR, TNR). Cohen's kappa is for two raters; Fleiss' generalizes to three or more.",
    lessonAnchor: "what-kappa-is-not-for",
  },
];
