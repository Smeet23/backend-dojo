import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "ev-hw5-label-silent-failure",
    lectures: [13],
    tags: ["transition-matrix", "labeling"],
    type: "scenario",
    prompt:
      "A user asks for \"a healthy breakfast using oatmeal\". The trace: ParseRequest extracts {healthy, breakfast, oatmeal}; PlanToolCalls picks recipe search; GenRecipeArgs produces {diet: \"healthy breakfast\"}; GetRecipes returns avocado toast and a yogurt parfait; ComposeResponse recommends both. No step raised an error.",
    fields: [
      { label: "Last success state", options: ["ParseRequest", "PlanToolCalls", "GenRecipeArgs", "GetRecipes"], answer: "PlanToolCalls" },
      { label: "First failure state", options: ["GenRecipeArgs", "GetRecipes", "ComposeResponse", "DeliverResponse"], answer: "GenRecipeArgs" },
    ],
    explanation:
      "The first wrong output is the search arguments: oatmeal was dropped. Recipe search then did exactly what it was asked, and the response faithfully used what search returned, so neither is the root cause. Without an error message, only reading each step's output (or a per-state judge that checks constraints carried into the arguments) finds this.",
    lessonAnchor: "label-each-failing-trace",
  },
  {
    id: "ev-hw5-skipped-step-edge",
    lectures: [13],
    tags: ["transition-matrix", "labeling"],
    type: "mcq",
    prompt:
      "A trace runs ParseRequest, PlanToolCalls, GenCustomerArgs, then GetRecipes, which errors with \"unable to retrieve recipes\". GetCustomerProfile and GenRecipeArgs never ran. Which edge goes in the matrix?",
    options: [
      "GenCustomerArgs → GetRecipes",
      "GenRecipeArgs → GetRecipes",
      "GetCustomerProfile → GetRecipes",
      "PlanToolCalls → GetRecipes",
    ],
    answer: "GenCustomerArgs → GetRecipes",
    explanation:
      "The last success is the state that actually ran just before the failure in this trace, not the previous state in the canonical list. Recording the real predecessor keeps the skip visible: an off-diagonal cell is a clue that recipe arguments were never generated (or never traced).",
    lessonAnchor: "label-each-failing-trace",
  },
  {
    id: "ev-hw5-column-vs-cell",
    lectures: [13],
    tags: ["heatmap", "analysis"],
    type: "scenario",
    prompt:
      "In the homework matrix of 96 traces, the GetRecipes column breaks down by last success as: GetCustomerProfile 9, GenCustomerArgs 8, GenRecipeArgs 7, PlanToolCalls 6, ParseRequest 2. The single hottest cell anywhere is PlanToolCalls → GenRecipeArgs with 10.",
    fields: [
      { label: "GetRecipes column total", options: ["9", "25", "32", "42"], answer: "32" },
      { label: "GetRecipes failures not preceded by GenRecipeArgs", options: ["7", "18", "25", "32"], answer: "25" },
      {
        label: "Best reading",
        options: [
          "Recipe search fails most overall, and most of those traces never generated recipe args: check upstream",
          "PlanToolCalls → GenRecipeArgs is the hottest cell, so GetRecipes can be ignored",
          "The recipe database is broken and should be replaced",
          "Column totals are meaningless when a hotter cell exists",
        ],
        answer: "Recipe search fails most overall, and most of those traces never generated recipe args: check upstream",
      },
    ],
    explanation:
      "9 + 8 + 7 + 6 + 2 = 32, and 32 - 7 = 25 failures came after a state other than GenRecipeArgs. The column total says which state fails most; the cell breakdown says in what context. Here the context suggests search is often called without proper arguments, so the root cause may be in planning or instrumentation, not the search engine. The hottest cell is a separate, equally valid reading list.",
    lessonAnchor: "read-the-heatmap",
  },
  {
    id: "ev-hw5-gen-vs-get",
    lectures: [13],
    tags: ["heatmap", "analysis"],
    type: "scenario",
    prompt:
      "First-failure counts by state: GenCustomerArgs 7, GetCustomerProfile 13, GenRecipeArgs 20, GetRecipes 32, GenWebArgs 8, GetWebInfo 5. A teammate says: \"Execution fails more than argument generation, so the LLM is fine and we should fix the tools.\"",
    fields: [
      { label: "Gen* (argument generation) failures", options: ["27", "35", "41", "50"], answer: "35" },
      { label: "Get* (execution) failures", options: ["35", "45", "50", "55"], answer: "50" },
      {
        label: "Is the teammate's conclusion safe?",
        options: [
          "No: many execution failures follow skipped or bad argument steps, so read those traces first",
          "Yes: execution failures outnumber generation failures",
          "Yes, as long as the gap is over 10 failures",
          "No: you can only compare states with equal row sums",
        ],
        answer: "No: many execution failures follow skipped or bad argument steps, so read those traces first",
      },
    ],
    explanation:
      "7 + 20 + 8 = 35 and 13 + 32 + 5 = 50. But a tool fed missing or bad arguments fails at execution time, and in this data most GetRecipes failures come after a state other than GenRecipeArgs. The split points you at traces to read; it does not assign blame by itself.",
    lessonAnchor: "read-the-heatmap",
  },
  {
    id: "ev-hw5-multiple-judge-failures",
    lectures: [13],
    tags: ["per-state-judges", "labeling"],
    type: "mcq",
    prompt:
      "You run one LLM judge per pipeline state on 100 traces of your own agent. Most failing traces have two or three states marked FAIL (for example GenRecipeArgs, GetRecipes and ComposeResponse). How should those traces enter the transition matrix?",
    options: [
      "One edge per trace: the earliest failing state and the state that ran just before it",
      "One edge per failing state, so nothing is lost",
      "Only the last failing state, since that is what the user saw",
      "Drop traces with more than one failure as ambiguous",
    ],
    answer: "One edge per trace: the earliest failing state and the state that ran just before it",
    explanation:
      "Later failures are usually the cascade from the first one. Counting every flagged state piles blame onto downstream steps that were reacting to bad input. Dropping multi-failure traces would throw away most of your failures.",
    lessonAnchor: "producing-the-labels-on-your-own-agent",
  },
  {
    id: "ev-hw5-trace-level-failure",
    lectures: [13],
    tags: ["per-state-judges", "labeling"],
    type: "mcq",
    prompt:
      "Your final-answer judge says 7 traces ignored the user's nut allergy, but every per-step judge passed on those traces. You have parked them in a DeliverResponse → DeliverResponse cell. What is the most useful next step?",
    options: [
      "Read those 7 traces and add a step-level check for the failure the step judges are missing",
      "Delete the cell, since no step failed",
      "Mark the final-answer judge as unreliable and remove it",
      "Attribute them all to ComposeResponse to keep the diagonal clean",
    ],
    answer: "Read those 7 traces and add a step-level check for the failure the step judges are missing",
    explanation:
      "A trace-level failure with no blamed step means your step evaluators have a blind spot. Keeping the bucket visible is right; guessing an attribution or deleting it hides the gap. Reading the traces tells you which state let the allergy drop (often argument generation) and what check to add there.",
    lessonAnchor: "producing-the-labels-on-your-own-agent",
  },
  {
    id: "ev-hw5-hotspot-fix",
    lectures: [13],
    tags: ["fixes"],
    type: "mcq",
    prompt:
      "The hottest cell is PlanToolCalls → GenRecipeArgs (10 traces). In those traces the plan says only \"search recipes\", and the argument step errors with \"unable to generate search parameters\". Which fix should you try first?",
    options: [
      "Make the plan carry the parsed constraints (diet, servings, ingredients) into argument generation",
      "Swap the recipe search engine for a vector database",
      "Add retries to the recipe search tool",
      "Rewrite the final response prompt to apologize more gracefully",
    ],
    answer: "Make the plan carry the parsed constraints (diet, servings, ingredients) into argument generation",
    explanation:
      "The failure is in building arguments, and the traces show the plan hands over nothing to build them from. Search was never called in these traces, so search engine changes and retries do nothing. A nicer apology hides the failure instead of fixing it. After the fix, rerun, relabel and rebuild the matrix to see the cell empty.",
    lessonAnchor: "from-hotspots-to-fixes",
  },
  {
    id: "ev-hw5-workflow-order",
    lectures: [13],
    tags: ["workflow"],
    type: "order",
    prompt: "Put the steps for building a failure transition heatmap on your own agent in order.",
    steps: [
      "Define the pipeline states and tag each state's span with its name",
      "Run the production agent code on a fixed dataset of queries",
      "Score each state's span (code checks and validated per-state judges)",
      "For each failed trace, keep the earliest failing state and the state just before it",
      "Count the pairs into a matrix and plot an annotated heatmap in pipeline order",
      "Read the traces behind the hottest cells and columns, then fix and rerun",
    ],
    explanation:
      "States and instrumentation come first, because you cannot label a step you did not record. Scoring produces per-step verdicts; reducing them to one first failure per trace avoids counting cascades. The heatmap only tells you which traces to read, and the loop closes by rebuilding the matrix after fixes.",
    lessonAnchor: "producing-the-labels-on-your-own-agent",
  },
];
