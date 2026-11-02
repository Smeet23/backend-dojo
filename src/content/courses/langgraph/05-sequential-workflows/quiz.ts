import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "lg-seq-no-entrypoint",
    lectures: [5],
    tags: ["edges", "compile"],
    type: "scenario",
    prompt:
      "You build a two-node graph:\nbuilder.add_node(\"fetch\", fetch)\nbuilder.add_node(\"summarise\", summarise)\nbuilder.add_edge(\"fetch\", \"summarise\")\nbuilder.add_edge(\"summarise\", END)\ngraph = builder.compile()\nWhat happens, and what's the fix?",
    fields: [
      { label: "What happens", options: ["compile() raises: the graph must have an entrypoint", "It runs fetch automatically because it was added first", "It compiles, but invoke() returns the input unchanged", "summarise runs twice"], answer: "compile() raises: the graph must have an entrypoint" },
      { label: "Fix", options: ["builder.add_edge(START, \"fetch\")", "builder.add_node(START)", "graph.invoke(..., entry=\"fetch\")", "Rename fetch to start"], answer: "builder.add_edge(START, \"fetch\")" },
    ],
    explanation:
      "LangGraph doesn't infer the first node from insertion order. An edge from START declares the entry point, and compile() refuses a graph without one.",
    lessonAnchor: "build-wire-and-compile",
  },
  {
    id: "lg-seq-invoke-builder",
    lectures: [5],
    tags: ["compile", "invoke"],
    type: "mcq",
    prompt:
      "A teammate writes `builder = StateGraph(BMIState)`, adds nodes and edges, then calls `builder.invoke({\"weight_kg\": 70, \"height_m\": 1.8})` and gets an AttributeError. What did they miss?",
    options: [
      "They must call builder.compile() and invoke the returned graph",
      "invoke needs every state key, including bmi",
      "StateGraph needs the state as an instance, not a class",
      "Nodes must be added in alphabetical order",
    ],
    answer: "They must call builder.compile() and invoke the returned graph",
    explanation:
      "The builder is a blueprint. compile() validates it and returns the runnable graph, and that object has invoke and stream. Missing keys like bmi are fine in the input; nodes fill them in.",
    lessonAnchor: "build-wire-and-compile",
  },
  {
    id: "lg-seq-node-return",
    lectures: [5],
    tags: ["nodes", "partial-updates"],
    type: "scenario",
    prompt:
      "You're writing a node that converts a temperature: it reads state[\"celsius\"] and should set fahrenheit. Which return value is the recommended style, and why?",
    fields: [
      { label: "Return", options: ["return {\"fahrenheit\": state[\"celsius\"] * 9 / 5 + 32}", "state[\"fahrenheit\"] = ...; return state", "return state[\"celsius\"] * 9 / 5 + 32", "print the value and return None"], answer: "return {\"fahrenheit\": state[\"celsius\"] * 9 / 5 + 32}" },
      { label: "Why", options: ["Partial updates keep working when nodes later run in parallel", "Returning the whole state is faster", "LangGraph only accepts floats", "It avoids needing an END edge"], answer: "Partial updates keep working when nodes later run in parallel" },
    ],
    explanation:
      "A node returns a dict of only the keys it changed and LangGraph merges it. Mutating and returning the whole state works in a straight line but makes every key look 'written', which fails once branches run concurrently. Returning a bare number isn't a valid update at all.",
    lessonAnchor: "write-the-node",
  },
  {
    id: "lg-seq-label-reads-state",
    lectures: [5],
    tags: ["state"],
    type: "mcq",
    prompt:
      "In the BMI graph, label_bmi reads state[\"bmi\"] but nobody passes bmi into it as an argument. Where does the value come from?",
    options: [
      "calculate_bmi returned {\"bmi\": ...}, which was merged into the shared state before label_bmi ran",
      "LangGraph recomputes bmi from weight and height automatically",
      "The user must include bmi in the initial state",
      "label_bmi calls calculate_bmi internally",
    ],
    answer: "calculate_bmi returned {\"bmi\": ...}, which was merged into the shared state before label_bmi ran",
    explanation:
      "Nodes communicate only through state. The edge calculate_bmi → label_bmi guarantees ordering, and the merged state carries the value.",
    lessonAnchor: "adding-a-second-node",
  },
  {
    id: "lg-seq-stream-debug",
    lectures: [5],
    tags: ["streaming", "debugging"],
    type: "scenario",
    prompt:
      "Your three-step summariser returns a bad final summary and you want to see what each node produced along the way, without editing the nodes.",
    fields: [
      { label: "Call", options: ["graph.stream(inputs, stream_mode=\"updates\")", "graph.invoke(inputs, debug_nodes=True)", "builder.compile(verbose=True)", "graph.get_graph().draw_mermaid()"], answer: "graph.stream(inputs, stream_mode=\"updates\")" },
      { label: "Each item looks like", options: ["{node_name: {keys that node returned}}", "The full final state only", "A list of edges taken", "The raw LLM prompt"], answer: "{node_name: {keys that node returned}}" },
    ],
    explanation:
      "stream_mode=\"updates\" yields one dict per node, keyed by node name, holding that node's partial update. \"values\" would give the whole state after each step. Drawing the graph shows structure, not data.",
    lessonAnchor: "watching-each-node-run",
  },
  {
    id: "lg-seq-llm-node-content",
    lectures: [5],
    tags: ["llm-nodes"],
    type: "mcq",
    prompt:
      "Your Q&A node does `return {\"answer\": model.invoke(prompt)}`. Later, a node that does `state[\"answer\"].upper()` crashes. What's wrong?",
    options: [
      "model.invoke returns an AIMessage; store response.content, the text",
      "LLM answers can't be stored in TypedDict state",
      "The prompt must be a list of messages",
      "upper() isn't allowed inside nodes",
    ],
    answer: "model.invoke returns an AIMessage; store response.content, the text",
    explanation:
      "Chat models return a message object with content and metadata. The state key is declared as str, so take .content before storing it.",
    lessonAnchor: "a-single-llm-call-as-a-node",
  },
  {
    id: "lg-seq-prompt-chain",
    lectures: [5],
    tags: ["prompt-chaining"],
    type: "scenario",
    prompt:
      "You're building a cover-letter writer: first extract the 5 key requirements from a job ad, then write a letter that addresses them. The hiring manager later wants to see the extracted requirements too.",
    fields: [
      { label: "Pattern", options: ["Prompt chaining: two nodes in sequence", "One node with one big prompt", "Parallel nodes writing the same key", "A conditional edge"], answer: "Prompt chaining: two nodes in sequence" },
      { label: "State keys", options: ["job_ad, requirements, letter", "letter only", "messages only", "job_ad, letter"], answer: "job_ad, requirements, letter" },
    ],
    explanation:
      "Two dependent LLM steps form a prompt chain. Keeping requirements as its own key means the second node can read it and it's still in the final state for the manager, which a one-shot prompt or a chain that discards intermediates can't give you.",
    lessonAnchor: "prompt-chaining",
  },
  {
    id: "lg-seq-build-order",
    lectures: [5],
    tags: ["graph-api"],
    type: "order",
    prompt: "Put the steps for building and running a sequential LangGraph workflow in order.",
    steps: [
      "Define the state as a TypedDict",
      "Create the builder with StateGraph(State)",
      "Register each function with add_node",
      "Connect START, the nodes and END with add_edge",
      "Call compile() to get a runnable graph",
      "Call invoke() with the initial state and read the final state",
    ],
    explanation:
      "State first (the builder needs it), then nodes and the edges that connect them by name, then compile, then run. LangGraph only checks that every edge points at a real node when you compile, but adding nodes before wiring them keeps the code readable.",
    lessonAnchor: "the-five-moves",
  },
];
