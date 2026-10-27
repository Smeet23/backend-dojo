import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "ev-err-synthetic-approach",
    lectures: [2],
    tags: ["synthetic-data"],
    type: "scenario",
    prompt:
      "Your leasing assistant launches next month and has no real traffic. A teammate prompts an LLM: \"Write 100 questions a renter might ask an apartment assistant.\" The output is 100 polite, well-formed questions, about a third of them some variant of \"What amenities do you offer?\"",
    fields: [
      {
        label: "Main problem with this dataset",
        options: [
          "Generic and repetitive, so it won't stress the parts of the system likely to fail",
          "100 queries is too many for a first pass",
          "Synthetic data can never be used for error analysis",
          "The questions should have been written in JSON",
        ],
        answer: "Generic and repetitive, so it won't stress the parts of the system likely to fail",
      },
      {
        label: "Better first step",
        options: [
          "Define 3+ dimensions (intent, caller status, scenario) based on where you expect failures, then sample tuples",
          "Ask the LLM again with temperature 1.5",
          "Wait until launch and only use production data",
          "Pick the 20 most common questions and stop there",
        ],
        answer: "Define 3+ dimensions (intent, caller status, scenario) based on where you expect failures, then sample tuples",
      },
    ],
    explanation:
      "One-shot generation gives bland, near-duplicate queries that rarely trip the system. Structured generation starts from dimensions chosen with product thinking (ideally after using the product yourself), so the dataset covers the space and targets your hypotheses about where it breaks.",
    lessonAnchor: "synthetic-queries-sample-along-dimensions",
  },
  {
    id: "ev-err-tuple-math",
    lectures: [2],
    tags: ["synthetic-data", "tuples"],
    type: "scenario",
    prompt:
      "You define 5 intents, 3 caller personas and 4 scenario types. In review you drop 12 implausible combinations (for example, a prospect asking for their rent balance). You want about 100 queries.",
    fields: [
      { label: "Tuples in the full cross product", options: ["12", "48", "60", "120"], answer: "60" },
      { label: "Tuples kept after review", options: ["36", "48", "60", "72"], answer: "48" },
      { label: "Queries per kept tuple to reach about 100", options: ["1", "2 or 3", "5", "10"], answer: "2 or 3" },
    ],
    explanation:
      "5 x 3 x 4 = 60 tuples; dropping 12 leaves 48. Two phrasings per tuple gives 96, three gives 144, so 2 or 3 queries per tuple lands near 100, and each one still gets a human read before you run the bot.",
    lessonAnchor: "from-tuples-to-natural-queries",
  },
  {
    id: "ev-err-pipeline-order",
    lectures: [2],
    tags: ["synthetic-data"],
    type: "order",
    prompt: "Put the structured synthetic-query pipeline in order.",
    steps: [
      "Use the product yourself and form hypotheses about where it fails",
      "Choose dimensions and values that target those hypotheses",
      "Generate tuples (cross product or LLM)",
      "Review tuples: remove duplicates and implausible combinations",
      "Prompt an LLM to write a natural query for each tuple",
      "Review queries: discard awkward or unrealistic ones",
      "Run the bot on every query and save full traces",
    ],
    explanation:
      "Hypotheses shape the dimensions; tuples guarantee coverage; a separate tuple-to-query step gives varied phrasing; and a human review sits after each LLM step because everything downstream inherits the realism of this set.",
    lessonAnchor: "from-tuples-to-natural-queries",
  },
  {
    id: "ev-err-first-upstream",
    lectures: [2],
    tags: ["open-coding"],
    type: "mcq",
    prompt:
      "A 14-turn trace: in turn 2 the assistant decides a current resident reporting a broken heater is a prospect. It then pitches move-in specials, offers a tour, asks for their budget, and never files the maintenance request. It's your first round of error analysis. What do you write?",
    options: [
      "One note on the first failure: treated a current resident reporting a maintenance issue as a prospect",
      "Five separate notes, one per bad turn",
      "A root-cause analysis of which prompt section caused the misidentification",
      "Nothing; the conversation is too long to code",
    ],
    answer: "One note on the first failure: treated a current resident reporting a maintenance issue as a prospect",
    explanation:
      "Everything after turn 2 cascades from the misidentification, and fixing it would likely fix the rest. Beginners note the most upstream failure and move on. Root-causing belongs in the Improve phase; labeling every independent failure comes later, once you're experienced or need exhaustive counts for one mode.",
    lessonAnchor: "note-the-first-upstream-failure",
  },
  {
    id: "ev-err-good-codes",
    lectures: [2],
    tags: ["open-coding"],
    type: "scenario",
    prompt: "A new annotator wrote these notes. Decide whether each one belongs in your open codes.",
    fields: [
      {
        label: "\"User's message had lots of typos\"",
        options: ["Keep as an open code", "Drop: describes the input, not an assistant failure", "Rewrite as a 1 to 5 score"],
        answer: "Drop: describes the input, not an assistant failure",
      },
      {
        label: "\"Said unit A11 is available; A11 is in no tool output\"",
        options: ["Keep as an open code", "Drop: describes the input, not an assistant failure", "Rewrite as a 1 to 5 score"],
        answer: "Keep as an open code",
      },
      {
        label: "\"Helpfulness: 3/5\"",
        options: ["Keep as an open code", "Drop: describes the input, not an assistant failure", "Rewrite as a specific observation of what went wrong"],
        answer: "Rewrite as a specific observation of what went wrong",
      },
    ],
    explanation:
      "Open codes record what the assistant did wrong, concretely. Typos are a property of the input (handling them badly would be a failure, but the typos themselves are not). A vague Likert score says nothing about what to fix and is noisy between annotators.",
    lessonAnchor: "what-a-good-open-code-looks-like",
  },
  {
    id: "ev-err-llm-judge-trace",
    lectures: [2],
    tags: ["open-coding", "llm-assist"],
    type: "mcq",
    prompt:
      "To save time, an engineer asks a frontier model to read each raw trace and say whether the assistant succeeded. On a trace where the text-confirmation tool failed and the assistant claimed twice that it had sent a confirmation, the model answers: \"Minor redundancy, but the user's request was fulfilled.\" What's the lesson?",
    options: [
      "Generic LLMs lack your product context, so humans should read and open code traces in this phase",
      "Use a bigger model for the review",
      "The trace was fine; the model is right",
      "Run the model three times and take the majority vote",
    ],
    answer: "Generic LLMs lack your product context, so humans should read and open code traces in this phase",
    explanation:
      "A user who never gets the confirmation won't believe the tour is booked, and the assistant misreported a tool failure. Spotting that takes product knowledge and taste. LLMs help generate queries and draft clusters, but the reading is yours.",
    lessonAnchor: "dont-hand-this-step-to-an-llm",
  },
  {
    id: "ev-err-axial-split",
    lectures: [2],
    tags: ["axial-coding"],
    type: "scenario",
    prompt:
      "Your draft taxonomy has a bucket called \"Hallucination\" holding two kinds of notes: (a) \"said the gym is open 24/7, it closes at 10pm\" and (b) \"booked a tour the caller never asked for\".",
    fields: [
      {
        label: "What to do with the bucket",
        options: [
          "Split it: invented property facts vs invented user actions",
          "Keep it; both are hallucinations",
          "Replace it with a 1 to 5 hallucination score",
          "Delete it; hallucination is too generic",
        ],
        answer: "Split it: invented property facts vs invented user actions",
      },
      {
        label: "Property each final failure mode should have",
        options: [
          "Binary, clearly defined with examples, and non-overlapping",
          "Scored on a 1 to 10 scale",
          "Taken from a vendor's standard metric list",
          "As broad as possible to keep the list short",
        ],
        answer: "Binary, clearly defined with examples, and non-overlapping",
      },
    ],
    explanation:
      "One misleads about external facts, the other fabricates what the user wanted; they have different causes and fixes. Axial coding aims for a small set of binary, well-defined, non-overlapping modes that annotators (and later a judge) can apply consistently.",
    lessonAnchor: "axial-coding-build-a-failure-taxonomy",
  },
  {
    id: "ev-err-llm-cluster",
    lectures: [2],
    tags: ["axial-coding", "llm-assist"],
    type: "mcq",
    prompt:
      "You have 100 open codes in a CSV. You paste them into an LLM and it returns 9 categories with names and definitions. What next?",
    options: [
      "Review every cluster yourself: check for missed notes, merge, split and rewrite definitions before labeling",
      "Adopt the 9 categories as-is and start building judges",
      "Discard them; LLMs should never touch the taxonomy",
      "Ask the LLM to rate each trace 1 to 5 on each category",
    ],
    answer: "Review every cluster yourself: check for missed notes, merge, split and rewrite definitions before labeling",
    explanation:
      "Clustering is where an LLM is genuinely useful, but its output is a first draft. It can skip notes or blur distinctions that matter to your product. The human owns the final taxonomy.",
    lessonAnchor: "using-an-llm-to-help-cluster",
  },
  {
    id: "ev-err-count-priority",
    lectures: [2],
    tags: ["labeling", "prioritization"],
    type: "scenario",
    prompt:
      "After labeling 120 traces with 1/0 per failure mode, the column sums are: scheduling 18, handoff 9, invented facts 6, channel formatting 15.",
    fields: [
      { label: "Scheduling failure rate", options: ["6%", "12%", "15%", "18%"], answer: "15%" },
      { label: "Most frequent failure mode", options: ["Scheduling", "Channel formatting", "Handoff", "Invented facts"], answer: "Scheduling" },
      {
        label: "Should frequency alone decide what to fix first?",
        options: [
          "No: weigh it against impact, since 6 invented lease terms might hurt more than 15 clumsy SMS replies",
          "Yes: always fix the highest count first",
          "No: always fix the rarest mode first",
        ],
        answer: "No: weigh it against impact, since 6 invented lease terms might hurt more than 15 clumsy SMS replies",
      },
    ],
    explanation:
      "18 / 120 = 15%. Counting turns qualitative notes into data you can prioritize with, but severity matters too: frequency tells you how often, not how bad.",
    lessonAnchor: "label-every-trace-and-count",
  },
  {
    id: "ev-err-saturation",
    lectures: [2],
    tags: ["iteration", "pitfalls"],
    type: "mcq",
    prompt:
      "After open coding 25 traces, a PM says \"I'm not seeing anything new, let's freeze the taxonomy and build judges.\" Which response best fits the lesson?",
    options: [
      "Keep going toward about 100 traces and plan another round: early on it's easy to mistake fatigue for saturation, and criteria drift as you see more",
      "Agree; 25 traces is always enough",
      "Switch to Likert scores so you can finish faster",
      "Replace the taxonomy with a standard list of LLM failure types",
    ],
    answer: "Keep going toward about 100 traces and plan another round: early on it's easy to mistake fatigue for saturation, and criteria drift as you see more",
    explanation:
      "Theoretical saturation means new traces stop revealing new kinds of failure. The 100-trace rule of thumb guards against stopping because you're tired. Taxonomies usually change substantially over two or three rounds, and freezing early locks your evals around an incomplete picture.",
    lessonAnchor: "iterate-until-saturation",
  },
];
