import type { Question } from "@/lib/types";

const NOTE = ["Good open code", "Too vague to use", "Not an assistant failure"];
const TUPLE = ["Keep", "Drop or fix"];

export const quiz: Question[] = [
  {
    id: "ev-hw12-order",
    lectures: [10],
    tags: ["workflow"],
    type: "order",
    prompt: "Put the HW1 and HW2 steps for the Recipe Bot in order.",
    steps: [
      "Replace the starter system prompt with explicit rules and an output format",
      "Add 10+ diverse queries and run the bulk test",
      "Choose dimensions, sample tuples and review them",
      "Turn each kept tuple into natural queries and review those",
      "Run the bot on all queries and save full traces with metadata",
      "Open code each trace with specific notes",
      "Cluster notes into failure modes, label every trace 0 or 1, and count",
    ],
    explanation:
      "The prompt comes first so that error analysis finds real generalization failures. Synthetic data is reviewed twice (tuples, then queries) before any traces exist. Open coding precedes clustering, and the counts at the end decide which evaluators HW3 builds first.",
    lessonAnchor: "what-the-two-homeworks-ask",
  },
  {
    id: "ev-hw12-open-codes",
    lectures: [10],
    tags: ["open-coding"],
    type: "scenario",
    prompt: "You are open coding Recipe Bot traces. Classify each note.",
    fields: [
      { label: "\"wrong\"", options: NOTE, answer: "Too vague to use" },
      {
        label: "\"Asked for under 30 min; recipe includes a 20 minute marinade plus 15 minutes of baking.\"",
        options: NOTE,
        answer: "Good open code",
      },
      { label: "\"User's query was full of emoji and typos.\"", options: NOTE, answer: "Not an assistant failure" },
      {
        label: "\"Pescatarian request; suggests store-bought pesto with no warning that some contain animal rennet.\"",
        options: NOTE,
        answer: "Good open code",
      },
    ],
    explanation:
      "A good open code names the evidence in the trace and implies what should have happened. A verdict like \"wrong\" can't be clustered or turned into a judge definition. Messy input describes the user, not something the bot did wrong.",
    lessonAnchor: "homework-2-part-2-open-coding",
  },
  {
    id: "ev-hw12-tuple-review",
    lectures: [10],
    tags: ["synthetic-data", "tuples"],
    type: "scenario",
    prompt:
      "Dimensions: dietary restriction, meal purpose, time available, skill level. You sampled these tuples from the cross product. Review them.",
    fields: [
      { label: "(gluten-free, family meal, under 30 min, beginner)", options: TUPLE, answer: "Keep" },
      { label: "(keto, quick lunch, all day, intermediate)", options: TUPLE, answer: "Drop or fix" },
      { label: "(vegan, dinner party, 1 hour, advanced)", options: TUPLE, answer: "Keep" },
      { label: "(low carb, quick lunch, under 15 min, advanced)", options: TUPLE, answer: "Keep" },
    ],
    explanation:
      "A quick lunch that takes all day contradicts itself, so no real user sends it. The others are plausible, including an advanced cook who wants a fast lunch. Review drops contradictions, not combinations that merely look unusual.",
    lessonAnchor: "homework-2-part-1-dimensions-and-tuples",
  },
  {
    id: "ev-hw12-stiff-queries",
    lectures: [10],
    tags: ["synthetic-data"],
    type: "mcq",
    prompt:
      "Your tuple-to-query prompt produces messages like \"I am an intermediate cook seeking a keto potluck dish that takes one hour.\" What is the best fix?",
    options: [
      "Rewrite the prompt to ask for several varied, informal messages that imply the attributes without listing them, then review again",
      "Keep them: they match the tuples exactly, which is what matters for coverage",
      "Skip tuples and ask an LLM for 100 recipe queries in one call",
      "Lowercase the generated queries in code so they look more casual",
    ],
    answer:
      "Rewrite the prompt to ask for several varied, informal messages that imply the attributes without listing them, then review again",
    explanation:
      "Queries that recite the tuple don't look like real users (\"quick egg spinach cheese recipe pls\"), so the bot is tested on easier, cleaner input than it will see. Fix the generation prompt and review. One big prompt loses coverage, and cosmetic lowercasing doesn't change the phrasing.",
    lessonAnchor: "homework-2-part-1-tuples-into-queries",
  },
  {
    id: "ev-hw12-self-score",
    lectures: [10],
    tags: ["prompting", "judges"],
    type: "mcq",
    prompt:
      "While iterating on the HW1 prompt, a platform's AI assistant writes a \"recipe quality\" scorer and then optimizes your prompt against it. The average score goes from 70% to 99%. What can you conclude?",
    options: [
      "The prompt now satisfies that scorer; whether outputs are actually better is unknown until you read them and check the scorer against your own labels",
      "The prompt is production-ready, since 99% is above any reasonable threshold",
      "Nothing, because scorers written by an AI are always wrong",
      "The scorer is validated, because the scores improved after optimization",
    ],
    answer:
      "The prompt now satisfies that scorer; whether outputs are actually better is unknown until you read them and check the scorer against your own labels",
    explanation:
      "An unvalidated scorer is fine as an iteration aid, but optimizing against it teaches the prompt to please it. Rising scores say nothing about the scorer's accuracy. Read outputs, and validate any judge against human labels before trusting its numbers.",
    lessonAnchor: "iterate-against-outputs-not-intuition",
  },
  {
    id: "ev-hw12-llm-clusters",
    lectures: [10],
    tags: ["axial-coding"],
    type: "scenario",
    prompt:
      "You give an LLM 18 open codes and ask for the top three failure modes. It returns missing_tips_section, no_adjectives_in_title and includes_store_bought_dough_option. Reading your notes, the issue you wrote most often was the bot asking follow-up questions when you wanted several recipes. Decide each action.",
    fields: [
      {
        label: "Publish the LLM's three modes as the taxonomy",
        options: ["Do it", "Don't"],
        answer: "Don't",
      },
      {
        label: "Map every note to a mode, add the follow-up-question mode, and count",
        options: ["Do it", "Don't"],
        answer: "Do it",
      },
      {
        label: "Use the LLM's draft names as a starting point for definitions",
        options: ["Do it", "Don't"],
        answer: "Do it",
      },
    ],
    explanation:
      "LLMs are good first drafters of clusters but don't reliably rank by frequency or capture your priorities. Keep useful names, map every note back, and let counts, not the draft, decide what matters.",
    lessonAnchor: "axial-coding-with-an-llm-as-first-drafter",
  },
  {
    id: "ev-hw12-trace-fields",
    lectures: [10],
    tags: ["traces"],
    type: "mcq",
    prompt:
      "After open coding, you notice most dietary failures came from synthetic queries and want to confirm it, and to check whether prompt v3 fixed them. Your saved records hold only query and response. Which fields should you have logged?",
    options: [
      "Source (hand_coded or synthetic), the tuple, the prompt version and the full message list",
      "Latency and token counts",
      "Only the response, but longer",
      "The model's temperature setting only",
    ],
    answer: "Source (hand_coded or synthetic), the tuple, the prompt version and the full message list",
    explanation:
      "Slicing failures by source or tuple needs those fields on every record, and comparing prompts needs the version. Latency and tokens are useful for cost, not for this question.",
    lessonAnchor: "run-the-bot-and-save-full-traces",
  },
  {
    id: "ev-hw12-rate",
    lectures: [10],
    tags: ["taxonomy", "counting"],
    type: "mcq",
    prompt:
      "An expert reviewed 50 traces and commented on 20. Of those 20, 8 had a dietary-restriction failure and 5 a time-estimate failure. What is the dietary failure rate you report?",
    options: ["16%", "40%", "8%", "62%"],
    answer: "16%",
    explanation:
      "Rates are over all reviewed traces, not only the commented ones: 8 / 50 = 16%. A trace with no note is a trace with no failure. Dividing by 20 (40%) overstates the problem.",
    lessonAnchor: "a-finished-taxonomy-with-counts",
  },
  {
    id: "ev-hw12-golden",
    lectures: [10],
    tags: ["platforms", "axial-coding"],
    type: "mcq",
    prompt:
      "Which approach from the walkthroughs gives you reusable ground-truth failure labels for building judges in HW3?",
    options: [
      "Have an LLM predict failure modes for every trace, then have an expert correct each row in a review view",
      "Ask an LLM to summarize all notes into the top three failure modes",
      "Use the platform's AI-generated relevance score as the label",
      "Generate more synthetic queries until the failure rate stabilizes",
    ],
    answer: "Have an LLM predict failure modes for every trace, then have an expert correct each row in a review view",
    explanation:
      "Per-trace predictions corrected by a human produce a golden dataset: every trace has an expert-confirmed label per mode. A summary of top modes has no per-trace labels, and an unvalidated score is not ground truth.",
    lessonAnchor: "axial-coding-with-an-llm-as-first-drafter",
  },
];
