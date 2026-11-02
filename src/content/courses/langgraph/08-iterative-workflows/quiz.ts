import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "lg-loop-and-vs-or",
    lectures: [8],
    tags: ["loops", "routing"],
    type: "scenario",
    prompt:
      "Your post-refinement graph has max_iterations = 4. In testing, a draft approved on iteration 2 still gets sent to the optimizer, and a draft that is never approved keeps looping until the run crashes. The router is:\n\nif state[\"evaluation\"] == \"approved\" and state[\"iteration\"] >= state[\"max_iterations\"]:\n    return \"done\"\nreturn \"revise\"",
    fields: [
      { label: "Root cause", options: ["The router uses and where it needs or", "The optimizer doesn't increment iteration", "max_iterations is too low", "The evaluator isn't using structured output"], answer: "The router uses and where it needs or" },
      { label: "What eventually stops the never-approved run", options: ["GraphRecursionError from the recursion limit", "The evaluator returns END", "max_iterations", "The checkpointer"], answer: "GraphRecursionError from the recursion limit" },
    ],
    explanation:
      "Either reason (approval or hitting the cap) should end the loop, so the conditions must be joined with or. With and, only the rare case where both happen together exits, so the run keeps going until LangGraph's recursion limit raises GraphRecursionError.",
    lessonAnchor: "the-router-and-the-stop-condition",
  },
  {
    id: "lg-loop-count-calls",
    lectures: [8],
    tags: ["loops", "cost"],
    type: "scenario",
    prompt:
      "With the generate → evaluate → optimize → evaluate loop and max_iterations = 5, the evaluator rejects every draft. The generate node sets iteration = 1 and optimize adds 1. How many times does each node run?",
    fields: [
      { label: "generate", options: ["1", "4", "5", "6"], answer: "1" },
      { label: "evaluate", options: ["4", "5", "6", "10"], answer: "5" },
      { label: "optimize", options: ["3", "4", "5", "6"], answer: "4" },
    ],
    explanation:
      "Draft 1 comes from generate, drafts 2 to 5 from four optimize runs, and each of the 5 drafts is evaluated once. After the fifth evaluation the router sees 5 >= 5 and stops, so there's no fifth rewrite.",
    lessonAnchor: "counting-the-passes",
  },
  {
    id: "lg-loop-structured-verdict",
    lectures: [8],
    tags: ["structured-output", "evaluator"],
    type: "mcq",
    prompt:
      "Your evaluator returns free text like \"Mostly solid! Maybe punch up the opening a bit.\" and your router does `if \"approved\" in text`. Runs are erratic: some weak drafts pass, some good ones loop. What's the best fix?",
    options: [
      "Use with_structured_output with a Pydantic model whose evaluation field is Literal[\"approved\", \"needs_improvement\"]",
      "Lowercase the text before checking for \"approved\"",
      "Raise the evaluator's temperature so it commits to an answer",
      "Add operator.add to the evaluation key",
    ],
    answer: "Use with_structured_output with a Pydantic model whose evaluation field is Literal[\"approved\", \"needs_improvement\"]",
    explanation:
      "The router needs a value it can branch on, not prose to search. Structured output constrains the reply to one of two verdicts plus a feedback field. Lowercasing doesn't help with \"not approved yet\", and a higher temperature makes the judge less consistent.",
    lessonAnchor: "the-evaluator-node-and-structured-output",
  },
  {
    id: "lg-loop-history-reducer",
    lectures: [8],
    tags: ["reducers", "state"],
    type: "scenario",
    prompt:
      "After a 3-round run you want to see every draft, but result[\"post_history\"] holds only the last one. Your state has post_history: list[str], and each drafting node returns {\"post\": draft, \"post_history\": [draft]}.",
    fields: [
      { label: "Change the annotation to", options: ["Annotated[list[str], operator.add]", "Annotated[str, operator.add]", "list[Annotated[str, operator.add]]", "Literal[list[str]]"], answer: "Annotated[list[str], operator.add]" },
      { label: "Each node should return", options: ["[draft] (a one-item list)", "draft (a bare string)", "state[\"post_history\"] + draft", "None"], answer: "[draft] (a one-item list)" },
    ],
    explanation:
      "Without a reducer, each update overwrites the key. With operator.add, LangGraph computes old_list + update, so the update must be a list. A bare string would make it list + str, which raises a TypeError.",
    lessonAnchor: "keeping-a-history-of-drafts",
  },
  {
    id: "lg-loop-recursion-limit-config",
    lectures: [8],
    tags: ["recursion-limit"],
    type: "mcq",
    prompt:
      "You want a hard ceiling of 12 super-steps on a loop as a safety net. Which call is correct?",
    options: [
      "workflow.invoke(inputs, config={\"recursion_limit\": 12})",
      "workflow.invoke(inputs, config={\"configurable\": {\"recursion_limit\": 12}})",
      "StateGraph(PostState, recursion_limit=12)",
      "builder.add_edge(\"optimize\", \"evaluate\", limit=12)",
    ],
    answer: "workflow.invoke(inputs, config={\"recursion_limit\": 12})",
    explanation:
      "recursion_limit is a top-level config key passed per run; it doesn't belong inside configurable. Edges and the StateGraph constructor have no such parameter.",
    lessonAnchor: "the-recursion-limit-as-a-safety-net",
  },
  {
    id: "lg-loop-cap-outcome",
    lectures: [8],
    tags: ["loops", "production"],
    type: "scenario",
    prompt:
      "A nightly job writes posts with max_iterations = 4. One night a post hits the cap without ever being approved. What should the graph do, and what's the safety-net role of the recursion limit here?",
    fields: [
      { label: "When the cap is hit", options: ["End cleanly and mark the draft unapproved for human review", "Publish the last draft as if approved", "Raise an exception so the job retries forever", "Reset iteration to 0 and start again"], answer: "End cleanly and mark the draft unapproved for human review" },
      { label: "recursion_limit should be", options: ["A bit above the worst-case super-steps, as a backstop", "Lower than the worst case so it stops the loop instead of the router", "Removed, since max_iterations is enough", "Set to 1"], answer: "A bit above the worst-case super-steps, as a backstop" },
    ],
    explanation:
      "Hitting the cap means best effort, not success, so surface it rather than publishing silently. The recursion limit throws away the result with an exception, so it should only fire if your own stop logic is broken.",
    lessonAnchor: "the-router-and-the-stop-condition",
  },
  {
    id: "lg-loop-model-roles",
    lectures: [8],
    tags: ["models", "evaluator"],
    type: "scenario",
    prompt:
      "The same draft is approved on one run and rejected on the next, so loop length varies wildly. You're choosing settings for each role.",
    fields: [
      { label: "Evaluator temperature", options: ["0", "0.7", "1.0", "1.5"], answer: "0" },
      { label: "Best extra fix", options: ["Write explicit, checkable criteria in the evaluator prompt", "Use the same prompt for generator and evaluator", "Remove the feedback field", "Let the optimizer also approve drafts"], answer: "Write explicit, checkable criteria in the evaluator prompt" },
    ],
    explanation:
      "A judge should be consistent, so run it deterministically and give it a precise rubric. Vague criteria produce vague, shifting verdicts and feedback the optimizer can't act on.",
    lessonAnchor: "choosing-the-models",
  },
  {
    id: "lg-loop-build-order",
    lectures: [8],
    tags: ["graph-building"],
    type: "order",
    prompt: "Put the steps for wiring the evaluator–optimizer graph in order.",
    steps: [
      "Define PostState with topic, post, evaluation, feedback, iteration and max_iterations",
      "Add the generate, evaluate and optimize nodes",
      "Add edges START → generate and generate → evaluate",
      "Add the conditional edge from evaluate with {\"done\": END, \"revise\": \"optimize\"}",
      "Add the edge optimize → evaluate to close the loop",
      "Compile and invoke with a topic and max_iterations",
    ],
    explanation:
      "State comes first because nodes and the builder depend on it. Then nodes, then the straight edges, then the router, then the backwards edge that creates the loop. Compile last.",
    lessonAnchor: "wiring-the-loop",
  },
  {
    id: "lg-loop-cheap-check",
    lectures: [8],
    tags: ["evaluator", "cost"],
    type: "mcq",
    prompt:
      "Many drafts are rejected only for exceeding 280 characters, and each rejection costs an evaluator call. What's the cheapest reliable improvement?",
    options: [
      "Check len(post) <= 280 in Python before calling the LLM judge",
      "Ask the evaluator to count characters more carefully",
      "Raise max_iterations so long drafts eventually pass",
      "Remove the length rule from the rubric",
    ],
    answer: "Check len(post) <= 280 in Python before calling the LLM judge",
    explanation:
      "A length rule is objective, so code checks it exactly and for free. LLMs are poor at counting characters, and raising the cap only spends more calls on the same mistake.",
    lessonAnchor: "the-evaluator-node-and-structured-output",
  },
  {
    id: "lg-loop-oscillating-feedback",
    lectures: [8],
    tags: ["loops", "debugging"],
    type: "scenario",
    prompt:
      "Reading feedback_history, you see the evaluator alternate: round 1 \"too long\", round 2 \"too thin, add detail\", round 3 \"too long\" again, until the cap. Separately, when one model both writes and judges with similar prompts, almost every draft passes on round 1.",
    fields: [
      { label: "Fix for the oscillation", options: ["Pass a short history of past feedback to the optimizer", "Raise max_iterations to 20", "Remove the length rule", "Make the router use and"], answer: "Pass a short history of past feedback to the optimizer" },
      { label: "Fix for the easy approvals", options: ["Judge with a different model or a sharply different persona at temperature 0", "Raise the evaluator's temperature", "Let the generator approve its own drafts", "Drop structured output"], answer: "Judge with a different model or a sharply different persona at temperature 0" },
    ],
    explanation:
      "An optimizer that sees only the latest note can undo the previous fix; giving it recent feedback stops the back-and-forth. A model grading text in its own style tends to like it, so an independent, deterministic judge keeps the loop honest.",
    lessonAnchor: "how-refinement-loops-go-wrong",
  },
];
