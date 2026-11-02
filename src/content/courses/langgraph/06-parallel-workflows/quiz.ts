import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "lg-parallel-whole-state-error",
    lectures: [6],
    tags: ["parallel", "partial-updates"],
    type: "scenario",
    prompt:
      "Your nutrition app fans out from START to three nodes: calories, protein and fibre. Each does `state[\"calories\"] = ...; return state`. invoke() fails with:\nInvalidUpdateError: At key 'meal': Can receive only one value per step.\nNo node changes meal.",
    fields: [
      { label: "Cause", options: ["Each node returned the whole state, so all three appear to write meal", "meal needs to be an int", "Three nodes can't read the same key at once", "The graph is missing an END edge"], answer: "Each node returned the whole state, so all three appear to write meal" },
      { label: "Fix", options: ["Return only the computed key, e.g. {\"calories\": ...}", "Add operator.add to meal", "Run the nodes sequentially", "Rename meal to meal_text"], answer: "Return only the computed key, e.g. {\"calories\": ...}" },
    ],
    explanation:
      "LangGraph sees only what nodes return, not what they read. Returning the whole state counts as writing every key, and three writes to a reducer-less key in one super-step is an error. Partial updates fix it; a reducer on meal would just hide the design mistake.",
    lessonAnchor: "the-mistake-everyone-makes-first",
  },
  {
    id: "lg-parallel-reducer-collect",
    lectures: [6],
    tags: ["reducers", "parallel"],
    type: "scenario",
    prompt:
      "Four parallel nodes each look up one supplier's price for a part and should all add it to `quotes`, which a `pick_cheapest` node reads afterwards. How should quotes be declared, and what should each node return?",
    fields: [
      { label: "Declaration", options: ["quotes: Annotated[list[float], operator.add]", "quotes: list[float]", "quotes: float", "quotes: Annotated[float, operator.add]"], answer: "quotes: Annotated[list[float], operator.add]" },
      { label: "Each node returns", options: ["{\"quotes\": [price]}", "{\"quotes\": price}", "{\"quotes\": state[\"quotes\"] + [price]}", "the whole state"], answer: "{\"quotes\": [price]}" },
    ],
    explanation:
      "Several writers to one key in one super-step need a reducer, and operator.add concatenates lists. Each node returns a one-item list. A bare float can't be added to a list, and returning the old list plus the new price would duplicate earlier quotes.",
    lessonAnchor: "a-reducer-for-the-scores",
  },
  {
    id: "lg-parallel-no-reducer-outcome",
    lectures: [6],
    tags: ["reducers"],
    type: "mcq",
    prompt:
      "Three evaluators run in parallel and each returns {\"individual_scores\": [n]}, but the key is declared as a plain `list[int]` with no reducer. What happens?",
    options: [
      "InvalidUpdateError: the key can receive only one value per step",
      "The last evaluator to finish wins and the others are lost",
      "LangGraph appends all three automatically",
      "The first evaluator's value is kept",
    ],
    answer: "InvalidUpdateError: the key can receive only one value per step",
    explanation:
      "For simultaneous writes, LangGraph refuses to pick a winner and raises. Silent loss happens in the sequential case, where each later write simply replaces the earlier one.",
    lessonAnchor: "a-reducer-for-the-scores",
  },
  {
    id: "lg-parallel-duplicate-scores",
    lectures: [6],
    tags: ["reducers", "debugging"],
    type: "scenario",
    prompt:
      "A sequential review pipeline uses `notes: Annotated[list[str], operator.add]`. Each of three nodes does `return {\"notes\": state[\"notes\"] + [new_note]}`. The final list has 6 items instead of 3.",
    fields: [
      { label: "Cause", options: ["Each node re-sends the old notes and the reducer appends them again", "operator.add multiplies lists", "LangGraph runs each node twice", "TypedDict lists are copied on read"], answer: "Each node re-sends the old notes and the reducer appends them again" },
      { label: "Fix", options: ["return {\"notes\": [new_note]}", "Remove the reducer and keep the code", "Use operator.mul", "Sort the list in the last node"], answer: "return {\"notes\": [new_note]}" },
    ],
    explanation:
      "The reducer computes old + returned. Returning old + new makes it old + old + new. With an append reducer, return only the new items. Dropping the reducer would work in this sequential graph, but it fails as soon as the nodes run in parallel.",
    lessonAnchor: "a-reducer-for-the-scores",
  },
  {
    id: "lg-parallel-uneven-join",
    lectures: [6],
    tags: ["fan-in", "supersteps"],
    type: "scenario",
    prompt:
      "Branch A is fetch_orders → enrich_orders, branch B is fetch_customer, and both have plain edges into build_report. build_report runs twice, and the first run has no enriched orders.",
    fields: [
      { label: "Why", options: ["fetch_customer finishes a super-step earlier, so build_report is triggered before enrich_orders is done", "Plain edges always run the target once per edge", "build_report has no reducer", "LangGraph retries failed nodes"], answer: "fetch_customer finishes a super-step earlier, so build_report is triggered before enrich_orders is done" },
      { label: "Fix", options: ["builder.add_edge([\"enrich_orders\", \"fetch_customer\"], \"build_report\")", "Add a reducer to every key", "Remove the edge from fetch_customer", "Call invoke twice"], answer: "builder.add_edge([\"enrich_orders\", \"fetch_customer\"], \"build_report\")" },
    ],
    explanation:
      "With equal-length branches, every edge into the join fires in the same super-step, so it runs once. Unequal branches trigger it in different super-steps. An edge from a list of sources (or add_node(..., defer=True)) makes it wait for all of them.",
    lessonAnchor: "how-fan-in-waits",
  },
  {
    id: "lg-parallel-structured-why",
    lectures: [6],
    tags: ["structured-output"],
    type: "mcq",
    prompt:
      "Your grader prompt says \"reply with feedback and a score out of 10\". Most runs work, but sometimes averaging crashes on a score of \"seven\". What's the robust fix?",
    options: [
      "Define a Pydantic schema with feedback: str and score: int (0–10) and use model.with_structured_output(schema)",
      "Add \"PLEASE use digits\" to the prompt in capitals",
      "Wrap int() in try/except and use 0 on failure",
      "Lower the temperature to 0",
    ],
    answer: "Define a Pydantic schema with feedback: str and score: int (0–10) and use model.with_structured_output(schema)",
    explanation:
      "Structured output makes the model fill a typed schema and returns a validated object with .score and .feedback. Prompt pleading and temperature reduce failures but don't guarantee the shape, and defaulting to 0 silently corrupts the average.",
    lessonAnchor: "structured-output",
  },
  {
    id: "lg-parallel-wrong-model",
    lectures: [6],
    tags: ["structured-output", "debugging"],
    type: "mcq",
    prompt:
      "You created `evaluator_model = model.with_structured_output(Evaluation)`, but evaluate_clarity crashes with \"AIMessage object has no attribute 'score'\". What's the likely bug?",
    options: [
      "The node calls model.invoke instead of evaluator_model.invoke",
      "Evaluation needs a third field",
      "with_structured_output only works in parallel nodes",
      "The score must be a float",
    ],
    answer: "The node calls model.invoke instead of evaluator_model.invoke",
    explanation:
      "with_structured_output returns a new runnable; the original model is unchanged and still returns an AIMessage. Use the structured one where you need fields and the plain one for free text.",
    lessonAnchor: "structured-output",
  },
  {
    id: "lg-parallel-labelled-scores",
    lectures: [6],
    tags: ["reducers", "custom-reducer"],
    type: "scenario",
    prompt:
      "The results page must show \"Language 7 · Analysis 8 · Clarity 6\". With `individual_scores: Annotated[list[int], operator.add]`, you've been assuming index 0 is language. A teammate notices the order doesn't match the order of the edges.",
    fields: [
      { label: "Is the list order safe to rely on?", options: ["No; it's deterministic but not tied to edge order or aspect", "Yes; it always follows the order nodes were added", "Yes; it follows finish order", "Only with three or fewer branches"], answer: "No; it's deterministic but not tied to edge order or aspect" },
      { label: "Better design", options: ["A dict key with a merge reducer; each node returns {\"scores\": {\"language\": 7}}", "Sort the list", "Sleep in each node so they finish in order", "Run the evaluators sequentially"], answer: "A dict key with a merge reducer; each node returns {\"scores\": {\"language\": 7}}" },
    ],
    explanation:
      "Combined order is an implementation detail. Labelling each contribution with a merge reducer makes the meaning explicit and keeps the branches parallel. Sorting loses the labels and sleeping is fragile.",
    lessonAnchor: "keeping-scores-labelled",
  },
  {
    id: "lg-parallel-final-node",
    lectures: [6],
    tags: ["llm-nodes", "design"],
    type: "scenario",
    prompt:
      "final_evaluation must (1) merge three feedback texts into one summary and (2) compute the average of individual_scores. Which tool for each job?",
    fields: [
      { label: "Merged summary", options: ["Plain chat model, use .content", "Structured model with the Evaluation schema", "Python string join only", "A fourth parallel branch"], answer: "Plain chat model, use .content" },
      { label: "Average score", options: ["sum(scores) / len(scores) in Python", "Ask the LLM to average them", "operator.add reducer", "Structured output with an average field"], answer: "sum(scores) / len(scores) in Python" },
    ],
    explanation:
      "Free-form prose is a job for the plain model; the structured Evaluation schema would push it to invent another score. Arithmetic belongs in Python, which is exact and free.",
    lessonAnchor: "building-the-grader",
  },
];
