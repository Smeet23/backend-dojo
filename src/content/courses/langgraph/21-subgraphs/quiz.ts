import type { Question } from "@/lib/types";

const WIRING = ["Invoke from inside a node", "Add the subgraph as a node"];

export const quiz: Question[] = [
  {
    id: "lg-subgraph-pick-wiring",
    lectures: [21],
    tags: ["subgraphs", "state"],
    type: "scenario",
    prompt:
      "Pick the wiring for each subgraph:\n• A: a reusable \"summariser\" agent with state {document, summary}, used by three parents whose schemas use names like report_text and contract_body.\n• B: a \"researcher\" agent built for your chat app that reads and appends to the same messages list (add_messages) as the parent.",
    fields: [
      { label: "A", options: WIRING, answer: "Invoke from inside a node" },
      { label: "B", options: WIRING, answer: "Add the subgraph as a node" },
    ],
    explanation:
      "When key names differ across parents, a wrapper node maps parent state into the subgraph and back. When the subgraph is designed around the parent's keys, especially a shared messages list, adding it as a node shares them automatically, using the parent's reducer.",
    lessonAnchor: "choosing-between-them",
  },
  {
    id: "lg-subgraph-silent-drop",
    lectures: [21],
    tags: ["subgraphs", "state"],
    type: "scenario",
    prompt:
      "You add a compiled translator subgraph with builder.add_node(\"translate\", translator). The parent has answer_eng and answer_hin. The subgraph's state is {answer_eng, hindi_text} and it writes hindi_text. The run finishes without errors, but answer_hin is always empty.",
    fields: [
      {
        label: "Why",
        options: [
          "Only keys shared by name flow back; hindi_text isn't a parent key, so it's dropped",
          "Subgraphs can't write strings",
          "The parent needs a reducer on answer_hin",
          "add_node only accepts functions",
        ],
        answer: "Only keys shared by name flow back; hindi_text isn't a parent key, so it's dropped",
      },
      {
        label: "Fix",
        options: [
          "Rename the subgraph key to answer_hin, or call the subgraph from a wrapper node that maps it",
          "Add a checkpointer to the subgraph",
          "Stream with subgraphs=True",
          "Compile the subgraph twice",
        ],
        answer: "Rename the subgraph key to answer_hin, or call the subgraph from a wrapper node that maps it",
      },
    ],
    explanation:
      "With a subgraph as a node, shared key names are the interface, and a mismatch silently loses data. Either align the names or switch to explicit mapping in a wrapper node.",
    lessonAnchor: "adding-a-subgraph-as-a-node",
  },
  {
    id: "lg-subgraph-wrapper-return",
    lectures: [21],
    tags: ["subgraphs"],
    type: "mcq",
    prompt:
      "Inside a parent node you call result = translator.invoke({\"input_text\": state[\"answer_eng\"]}). What is result, and what should the node return?",
    options: [
      "The subgraph's final state; return {\"answer_hin\": result[\"translated_text\"]}",
      "Just the translated string; return it directly",
      "The parent's state; return result unchanged",
      "A Command object; return Command(goto=END)",
    ],
    answer: "The subgraph's final state; return {\"answer_hin\": result[\"translated_text\"]}",
    explanation:
      "invoke returns the subgraph's full final state as a dict. The wrapper picks out what the parent needs and returns it as an update under the parent's own key.",
    lessonAnchor: "invoking-a-subgraph-from-a-node",
  },
  {
    id: "lg-subgraph-benefits",
    lectures: [21],
    tags: ["subgraphs", "architecture"],
    type: "scenario",
    prompt:
      "Your single-graph \"developer agent\" has 40 nodes and one huge state. The testing logic accidentally overwrites the coder's scratch notes, and you can't tell how many tokens the code-review step uses.",
    fields: [
      {
        label: "Restructure as",
        options: [
          "One subgraph per role (planner, coder, tester, reviewer, deployer) under a parent graph",
          "One node per role, sharing the same big state",
          "Separate apps with no parent graph",
          "A longer system prompt",
        ],
        answer: "One subgraph per role (planner, coder, tester, reviewer, deployer) under a parent graph",
      },
      {
        label: "Fixes the overwritten notes",
        options: ["Per-subgraph state schemas", "LangSmith tracing", "A higher recursion limit", "Streaming"],
        answer: "Per-subgraph state schemas",
      },
      {
        label: "Shows the reviewer's token usage",
        options: ["Its nested run in LangSmith traces", "get_state on the parent only", "A bigger checkpointer", "Interrupts"],
        answer: "Its nested run in LangSmith traces",
      },
    ],
    explanation:
      "Subgraphs give each agent private state, so components stop trampling each other, and each appears as its own nested run for observability. Splitting into nodes that share one state keeps the collision problem.",
    lessonAnchor: "langgraph-specific-benefits",
  },
  {
    id: "lg-subgraph-error",
    lectures: [21],
    tags: ["subgraphs", "errors"],
    type: "mcq",
    prompt:
      "The translator subgraph's model call raises a timeout error. Nothing in your code catches it. What happens to the parent run?",
    options: [
      "The exception propagates to the parent and the run fails, unless you catch it (e.g. in a wrapper node)",
      "The parent automatically skips the subgraph and continues",
      "The subgraph retries forever",
      "The parent finishes with answer_hin set to an error message",
    ],
    answer: "The exception propagates to the parent and the run fails, unless you catch it (e.g. in a wrapper node)",
    explanation:
      "A subgraph is a step like any other, so its exceptions bubble up. Subgraphs give you a clean boundary for error handling and retries, but you have to add it yourself.",
    lessonAnchor: "langgraph-specific-benefits",
  },
  {
    id: "lg-subgraph-persistence",
    lectures: [21],
    tags: ["subgraphs", "persistence", "streaming"],
    type: "scenario",
    prompt:
      "Your parent graph has a research subgraph added as a node. You want: chat history saved per thread, the researcher to keep its own notes across turns in the same thread, and the UI to show progress from inside the researcher.",
    fields: [
      {
        label: "Checkpointer for the parent",
        options: ["compile(checkpointer=InMemorySaver()) or a durable saver", "None; the subgraph handles it", "One per node", "Only on the subgraph"],
        answer: "compile(checkpointer=InMemorySaver()) or a durable saver",
      },
      {
        label: "Researcher's own memory across turns",
        options: ["Compile the subgraph with checkpointer=True", "Compile the subgraph with checkpointer=False", "Pass a second InMemorySaver to the subgraph", "Store notes in the system prompt"],
        answer: "Compile the subgraph with checkpointer=True",
      },
      {
        label: "Progress from inside the subgraph",
        options: ["graph.stream(..., subgraphs=True) and read the namespace", "graph.invoke and print the result", "get_state without arguments", "stream_mode=\"values\" on the subgraph only"],
        answer: "graph.stream(..., subgraphs=True) and read the namespace",
      },
    ],
    explanation:
      "The parent's checkpointer propagates to subgraphs. checkpointer=True makes a subgraph's state persist per thread instead of starting fresh on each call. subgraphs=True streaming yields (namespace, chunk) pairs, so you can tell parent updates from subgraph updates.",
    lessonAnchor: "persistence-inspection-and-streaming",
  },
];
