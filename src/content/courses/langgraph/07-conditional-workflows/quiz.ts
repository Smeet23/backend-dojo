import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "lg-cond-vs-parallel",
    lectures: [7],
    tags: ["conditional-edges", "parallel"],
    type: "scenario",
    prompt:
      "Two features for a loan app:\n• A: every application gets a credit check, a fraud check and an income check before a decision.\n• B: applications under ₹50,000 go to auto_approve; larger ones go to manual_review.\nHow do you wire the edges out of the intake node for each?",
    fields: [
      { label: "Feature A", options: ["Three add_edge calls (fan-out)", "add_conditional_edges with a router", "One add_edge to a combined node", "A loop back to intake"], answer: "Three add_edge calls (fan-out)" },
      { label: "Feature B", options: ["add_conditional_edges with a router", "Two add_edge calls (fan-out)", "A reducer on amount", "add_edge to END"], answer: "add_conditional_edges with a router" },
    ],
    explanation:
      "A needs all three checks, so it's parallel fan-out with plain edges. B needs exactly one path chosen from the state, which is a conditional edge. Fanning out in B would run both approval paths.",
    lessonAnchor: "branches-where-only-one-runs",
  },
  {
    id: "lg-cond-router-returns",
    lectures: [7],
    tags: ["router"],
    type: "mcq",
    prompt:
      "You're writing the router for the loan app's conditional edge. What must the function return?",
    options: [
      "The name of the next node, e.g. \"auto_approve\"",
      "A dict of state updates, e.g. {\"route\": \"auto_approve\"}",
      "The next node's function object",
      "True or False",
    ],
    answer: "The name of the next node, e.g. \"auto_approve\"",
    explanation:
      "A router returns the destination's name (or a key in the path map). It doesn't update state; its return value is never merged. Booleans work only if you supply a path map like {True: ..., False: ...}.",
    lessonAnchor: "the-router-function",
  },
  {
    id: "lg-cond-silent-typo",
    lectures: [7],
    tags: ["router", "debugging"],
    type: "scenario",
    prompt:
      "In production, some support tickets come back with no `reply` key at all and no exception was logged. The router is:\ndef route(state):\n    return \"billing_reply\" if state[\"category\"] == \"billing\" else \"tech_replies\"\nThe node is actually called \"tech_reply\".",
    fields: [
      { label: "What happened", options: ["The unknown destination was ignored with a warning, so no branch ran", "LangGraph picked the closest node name", "The graph looped until the recursion limit", "compile() should have caught it"], answer: "The unknown destination was ignored with a warning, so no branch ran" },
      { label: "Prevention", options: ["Annotate the router with Literal[\"billing_reply\", \"tech_reply\"] or pass a path map", "Add a reducer to reply", "Wrap invoke in try/except", "Add a plain edge to tech_reply too"], answer: "Annotate the router with Literal[\"billing_reply\", \"tech_reply\"] or pass a path map" },
    ],
    explanation:
      "Without declared destinations, an unknown name is only a warning and the run ends with no reply. With a Literal return type or a path map, the same typo raises a KeyError immediately. A plain edge would make tech_reply run on every ticket.",
    lessonAnchor: "why-declaring-destinations-matters",
  },
  {
    id: "lg-cond-path-map",
    lectures: [7],
    tags: ["path-map"],
    type: "scenario",
    prompt:
      "Your router returns short labels: \"low\", \"medium\" or \"high\" risk. The nodes are named auto_approve, request_documents and escalate_to_officer. Complete the call.\nbuilder.add_conditional_edges(\"score_risk\", risk_level, ___)",
    fields: [
      {
        label: "Third argument",
        options: [
          "{\"low\": \"auto_approve\", \"medium\": \"request_documents\", \"high\": \"escalate_to_officer\"}",
          "[\"low\", \"medium\", \"high\"]",
          "{\"auto_approve\": \"low\", \"request_documents\": \"medium\", \"escalate_to_officer\": \"high\"}",
          "END",
        ],
        answer: "{\"low\": \"auto_approve\", \"medium\": \"request_documents\", \"high\": \"escalate_to_officer\"}",
      },
    ],
    explanation:
      "The path map's keys are what the router returns and its values are node names. A list only works when the router already returns node names, and the reversed dict maps in the wrong direction.",
    lessonAnchor: "the-path-map",
  },
  {
    id: "lg-cond-same-key-no-reducer",
    lectures: [7],
    tags: ["reducers", "conditional-edges"],
    type: "mcq",
    prompt:
      "In the quadratic solver, real_roots, repeated_root and no_real_roots all write `result`, which has no reducer. Why is there no InvalidUpdateError?",
    options: [
      "Only one branch runs per invocation, so result gets at most one write per super-step",
      "Conditional edges add an append reducer automatically",
      "Strings can be written by several nodes at once",
      "END merges the three values",
    ],
    answer: "Only one branch runs per invocation, so result gets at most one write per super-step",
    explanation:
      "The concurrent-write error needs two writes to the same key in the same super-step. Mutually exclusive branches never produce that, so a shared output key is fine.",
    lessonAnchor: "the-three-branch-nodes",
  },
  {
    id: "lg-cond-llm-in-router",
    lectures: [7],
    tags: ["router", "design", "structured-output"],
    type: "scenario",
    prompt:
      "A teammate proposes calling the LLM sentiment classifier directly inside the router function instead of in a find_sentiment node. Your analytics team also wants to chart sentiment per day.",
    fields: [
      { label: "Better design", options: ["Classify in a node, store sentiment in state, route on it", "Classify inside the router", "Classify in both places", "Skip classification and always run diagnosis"], answer: "Classify in a node, store sentiment in state, route on it" },
      { label: "Main reason", options: ["Router output isn't saved to state, so the sentiment would be lost", "Routers can't call functions", "Nodes run faster than routers", "LLMs can't return Literal values in routers"], answer: "Router output isn't saved to state, so the sentiment would be lost" },
    ],
    explanation:
      "Anything the router computes disappears once the route is taken. Putting the LLM call in a node records the sentiment for analytics and debugging, and keeps the router a cheap, testable function of state.",
    lessonAnchor: "router-and-edges",
  },
  {
    id: "lg-cond-literal-schema",
    lectures: [7],
    tags: ["structured-output", "routing"],
    type: "mcq",
    prompt:
      "Your intent classifier sometimes replies \"mostly a refund question, partly technical\", and the router's if/else falls through to the wrong branch. What's the most robust fix?",
    options: [
      "Use structured output with intent: Literal[\"refund\", \"technical\", \"sales\"] in the schema",
      "Lowercase the reply before comparing",
      "Add \"answer in one word\" to the prompt",
      "Route on whether the reply contains the word \"refund\"",
    ],
    answer: "Use structured output with intent: Literal[\"refund\", \"technical\", \"sales\"] in the schema",
    explanation:
      "A Literal field constrains the model to exactly one valid label, which the router can match safely. Prompt tweaks and substring checks reduce failures but don't guarantee a valid value.",
    lessonAnchor: "schemas",
  },
  {
    id: "lg-cond-mixed-edges",
    lectures: [7],
    tags: ["conditional-edges", "debugging"],
    type: "scenario",
    prompt:
      "After classify, you added `add_conditional_edges(\"classify\", route)` (to refund_reply or tech_reply) and, earlier in the file, a leftover `add_edge(\"classify\", \"tech_reply\")`. Refund tickets now crash with InvalidUpdateError on `reply`.",
    fields: [
      { label: "Why", options: ["The plain edge always fires too, so tech_reply and refund_reply both write reply in one super-step", "Conditional edges can't follow a classify node", "reply needs to be a list", "route returned an unknown name"], answer: "The plain edge always fires too, so tech_reply and refund_reply both write reply in one super-step" },
      { label: "Fix", options: ["Delete the leftover add_edge", "Add operator.add to reply", "Swap the order of the two calls", "Add a path map"], answer: "Delete the leftover add_edge" },
    ],
    explanation:
      "Edges out of a node are cumulative: the static edge runs in addition to whatever the router picks. For refunds that means two writers to reply at once. Use one routing mechanism per node.",
    lessonAnchor: "more-things-a-router-can-return",
  },
  {
    id: "lg-cond-model-dump",
    lectures: [7],
    tags: ["structured-output", "state"],
    type: "mcq",
    prompt:
      "run_diagnosis gets a DiagnosisSchema object back from the structured model, and the state declares `diagnosis: dict`. What should the node return?",
    options: [
      "{\"diagnosis\": result.model_dump()}",
      "{\"diagnosis\": result}",
      "{\"diagnosis\": str(result)}",
      "result",
    ],
    answer: "{\"diagnosis\": result.model_dump()}",
    explanation:
      "model_dump() converts the Pydantic object to a plain dict, matching the declared type and serialising cleanly once you add persistence. str() loses structure, and returning the object itself isn't a valid update dict.",
    lessonAnchor: "state",
  },
  {
    id: "lg-cond-build-order",
    lectures: [7],
    tags: ["conditional-edges"],
    type: "order",
    prompt: "Put the steps for adding a conditional branch to a working sequential graph in order.",
    steps: [
      "Run the straight part and confirm the value you'll route on is correct",
      "Write a node for each branch",
      "Write a router that reads state and returns a node name, annotated with Literal",
      "Call add_conditional_edges(source, router)",
      "Connect each branch's last node onward, e.g. to END",
      "Invoke with inputs that exercise every branch",
    ],
    explanation:
      "Verify the decision input first, then build the branches, the router and the conditional edge, close off each branch, and finally test every path, since an untested branch is where bugs hide.",
    lessonAnchor: "state-and-the-straight-part",
  },
];
