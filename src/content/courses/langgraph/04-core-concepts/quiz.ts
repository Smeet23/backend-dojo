import type { Question } from "@/lib/types";

const PATTERNS = ["Prompt chaining", "Routing", "Parallelization", "Orchestrator and workers", "Evaluator and optimizer"];
const REDUCERS = ["Default (replace)", "Append (operator.add)", "Dict merge", "Keep the maximum"];

export const quiz: Question[] = [
  {
    id: "lg-core-pattern-match",
    lectures: [4],
    tags: ["workflow-patterns"],
    type: "scenario",
    prompt:
      "Your team is scoping three features. Pick the workflow pattern that fits each.\n• A: An inbound email is classified as billing, bug or sales, then handled by a prompt specialised for that category.\n• B: A product description must pass a brand-tone check, a legal-claims check and a length check before publishing. The checks don't depend on each other.\n• C: Given any research question, an LLM decides which sources to search (papers, news, patents, forums) and spins up a searcher for each.",
    fields: [
      { label: "Feature A", options: PATTERNS, answer: "Routing" },
      { label: "Feature B", options: PATTERNS, answer: "Parallelization" },
      { label: "Feature C", options: PATTERNS, answer: "Orchestrator and workers" },
    ],
    explanation:
      "A classifies then dispatches to one handler: routing. B runs fixed, independent checks at once and aggregates: parallelization. C also runs work in parallel, but the subtasks are invented at run time by an LLM, which is what makes it orchestrator-workers rather than plain parallelization.",
    lessonAnchor: "five-common-workflow-patterns",
  },
  {
    id: "lg-core-cold-email-loop",
    lectures: [4],
    tags: ["workflow-patterns", "loops"],
    type: "mcq",
    prompt:
      "Your cold-email generator's first drafts are usually mediocre. A senior marketer could tell you what's wrong with each draft against a checklist. Which pattern turns that into a workflow, and what graph feature does it need that a plain chain lacks?",
    options: [
      "Prompt chaining; it needs parallel edges",
      "Evaluator and optimizer; it needs a loop back to the generator",
      "Routing; it needs a conditional entry point",
      "Parallelization; it needs a reducer",
    ],
    answer: "Evaluator and optimizer; it needs a loop back to the generator",
    explanation:
      "An evaluator with explicit criteria accepts or rejects with feedback, and the generator retries using that feedback until acceptance. Repeating a step is a loop, which graphs can express and linear chains can't.",
    lessonAnchor: "evaluator-and-optimizer",
  },
  {
    id: "lg-core-chat-overwrite",
    lectures: [4],
    tags: ["reducers", "state"],
    type: "scenario",
    prompt:
      "Your support chatbot's state is `class ChatState(TypedDict): message: str`. A user says \"I'm Arjun, order #4411 is late\", gets a reply, then asks \"Which order was I asking about?\" The bot has no idea.",
    fields: [
      { label: "Root cause", options: ["The model has no memory of its own", "Each write to message replaces the previous one", "The graph didn't compile", "Nodes can't read keys written by other nodes"], answer: "Each write to message replaces the previous one" },
      { label: "Fix", options: ["Store messages in a list with an append reducer", "Call the model twice per turn", "Add a second key called message2", "Use a Pydantic model instead of TypedDict"], answer: "Store messages in a list with an append reducer" },
    ],
    explanation:
      "Without a reducer a key is overwritten on every update, so by the third turn only the latest message exists. Making it a list with an append reducer keeps the whole conversation. Switching TypedDict for Pydantic changes validation, not update semantics.",
    lessonAnchor: "reducers",
  },
  {
    id: "lg-core-pick-reducers",
    lectures: [4],
    tags: ["reducers"],
    type: "scenario",
    prompt:
      "You're designing state for the essay-practice site. Choose a reducer for each key.\n• total_score: recalculated by aggregate on every attempt.\n• drafts: every essay the student has submitted, so they can see their progress.\n• best_score: the highest total across all attempts.",
    fields: [
      { label: "total_score", options: REDUCERS, answer: "Default (replace)" },
      { label: "drafts", options: REDUCERS, answer: "Append (operator.add)" },
      { label: "best_score", options: REDUCERS, answer: "Keep the maximum" },
    ],
    explanation:
      "The current total should simply replace the old one. Drafts must accumulate, so append. A running best needs a custom reducer like max(old, new); replacing would lose a better earlier score.",
    lessonAnchor: "reducers",
  },
  {
    id: "lg-core-node-is",
    lectures: [4],
    tags: ["nodes", "state"],
    type: "mcq",
    prompt: "A teammate asks what they have to write to add a new \"fact_check\" step to an existing LangGraph workflow. What's the accurate answer?",
    options: [
      "A subclass of LangGraph's Node class with a run() method",
      "A Python function that takes the current state and returns a dict of the keys it changes",
      "A LangChain chain object; plain functions aren't allowed",
      "A new graph, because each step needs its own StateGraph",
    ],
    answer: "A Python function that takes the current state and returns a dict of the keys it changes",
    explanation:
      "Nodes are plain functions: they receive the whole state and return a partial update. Registering it with add_node and wiring edges is all that's needed; no special class or separate graph.",
    lessonAnchor: "nodes-are-python-functions",
  },
  {
    id: "lg-core-superstep-count",
    lectures: [4],
    tags: ["execution-model", "supersteps"],
    type: "scenario",
    prompt:
      "A graph runs START → collect_essay → {evaluate_clarity, evaluate_depth, evaluate_language} (all three in parallel) → aggregate → END. Count the super-steps and say when aggregate sees the scores.",
    fields: [
      { label: "Number of super-steps", options: ["3", "5", "6", "1"], answer: "3" },
      { label: "When aggregate runs", options: ["After all three evaluators' updates are applied", "As soon as the fastest evaluator finishes", "Three times, once per evaluator", "In the same super-step as the evaluators"], answer: "After all three evaluators' updates are applied" },
    ],
    explanation:
      "collect_essay is one super-step, the three evaluators share the second, aggregate is the third. A super-step's updates are all applied before the next round starts, so aggregate runs once and sees every score.",
    lessonAnchor: "super-steps",
  },
  {
    id: "lg-core-execution-order",
    lectures: [4],
    tags: ["execution-model"],
    type: "order",
    prompt: "Put the life of a LangGraph run in order.",
    steps: [
      "Declare the state schema, nodes and edges",
      "Call compile() to check the structure and get a runnable graph",
      "invoke() with an initial state; the edge from START activates the first node",
      "Active nodes run and return partial updates",
      "Updates are applied through each key's reducer and passed along edges",
      "No nodes are active and no messages are in transit, so the final state is returned",
    ],
    explanation:
      "Definition, then compilation, then execution. During execution, nodes run in super-steps, their updates are merged via reducers and passed on (message passing), and the run halts when nothing is active.",
    lessonAnchor: "the-execution-model",
  },
  {
    id: "lg-core-compile-catches",
    lectures: [4],
    tags: ["compile"],
    type: "mcq",
    prompt:
      "You add a node called \"translate\" but forget to connect any edge to or from it. Everything else is wired correctly. What happens?",
    options: [
      "compile() raises an error about an orphaned node",
      "The graph compiles and runs; translate simply never executes",
      "invoke() runs translate first because it has no inputs",
      "LangGraph connects it to END automatically",
    ],
    answer: "The graph compiles and runs; translate simply never executes",
    explanation:
      "Compilation checks things like a missing entry point or edges to unknown nodes, but an unreachable node isn't an error. It just never gets activated, which is why you should look at the drawn graph rather than trust compile() alone.",
    lessonAnchor: "compilation",
  },
  {
    id: "lg-core-state-design",
    lectures: [4],
    tags: ["state"],
    type: "mcq",
    prompt:
      "You're designing state for a moderation workflow: transcribe a video, run three checks in parallel, then an aggregator decides publish or flag. What's the best way to decide which keys the state needs?",
    options: [
      "One key per node, named after the node",
      "List what each node reads and what it produces; the union is the state",
      "Only the final output; intermediate values should stay inside nodes",
      "Copy the LLM's raw response object into a single key",
    ],
    answer: "List what each node reads and what it produces; the union is the state",
    explanation:
      "State is the data the workflow needs across steps. Here that's the transcript, the three check results and the decision. Hiding intermediate values inside nodes means the aggregator can't see them.",
    lessonAnchor: "state",
  },
];
