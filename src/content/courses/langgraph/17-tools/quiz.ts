import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "lg-tools-who-runs",
    lectures: [17],
    tags: ["tool-calling"],
    type: "mcq",
    prompt:
      "You call llm_with_tools.invoke(\"What is 654 times 713?\") directly, outside any graph. The response has empty content and one entry in tool_calls. What happened to the calculation?",
    options: [
      "Nothing yet: the model only requested the calculator; your code has to run it",
      "The model ran the calculator internally and hid the result in metadata",
      "LangChain ran the tool automatically and discarded the result",
      "The provider ran the Python function on its servers",
    ],
    answer: "Nothing yet: the model only requested the calculator; your code has to run it",
    explanation:
      "Models only emit text, and a tool call is a structured request for an action. Executing it (here, with ToolNode inside a graph) and returning a ToolMessage is your program's job.",
    lessonAnchor: "how-tool-calling-works",
  },
  {
    id: "lg-tools-docstring",
    lectures: [17],
    tags: ["custom-tools"],
    type: "scenario",
    prompt:
      "You add a custom tool:\n@tool\ndef lookup(x: str) -> str:\n    \"\"\"Lookup.\"\"\"\nIt fetches a customer's order status by order id. The model rarely calls it, and when it does it passes customer names instead of ids.",
    fields: [
      {
        label: "Root cause",
        options: [
          "The name, argument and docstring don't tell the model what it does or expects",
          "Custom tools need to be registered with tools_condition",
          "@tool only works on async functions",
          "The model needs temperature 0 to call tools",
        ],
        answer: "The name, argument and docstring don't tell the model what it does or expects",
      },
      {
        label: "Fix",
        options: [
          "Rename to get_order_status(order_id: str) with a docstring describing input and purpose",
          "Bind the tool twice",
          "Move the tool into ToolNode only, not bind_tools",
          "Return a dict instead of a string",
        ],
        answer: "Rename to get_order_status(order_id: str) with a docstring describing input and purpose",
      },
    ],
    explanation:
      "@tool builds the schema from the function name, type hints and docstring, and the model picks tools and fills arguments from that schema alone. Return type and binding details don't help it understand what the tool is for.",
    lessonAnchor: "prebuilt-and-custom-tools",
  },
  {
    id: "lg-tools-raw-json",
    lectures: [17],
    tags: ["toolnode", "graph"],
    type: "scenario",
    prompt:
      "Your graph: START → chat_node, conditional edge from chat_node with tools_condition, ToolNode registered as \"tools\". Asking \"What's Tesla's price?\" returns a big JSON blob from the stock API as the final message.",
    fields: [
      {
        label: "What's missing",
        options: [
          "An edge from tools back to chat_node",
          "An edge from START to tools",
          "A second ToolNode",
          "A reducer on the messages key",
        ],
        answer: "An edge from tools back to chat_node",
      },
      {
        label: "Where the graph currently goes after tools",
        options: ["END", "chat_node", "START", "It raises an error"],
        answer: "END",
      },
    ],
    explanation:
      "A node with no outgoing edge finishes the run, so tools effectively leads to END and the ToolMessage is the last thing in state. Adding tools → chat_node sends the result back so the model can phrase an answer.",
    lessonAnchor: "why-the-first-version-is-broken",
  },
  {
    id: "lg-tools-multistep",
    lectures: [17],
    tags: ["react", "loop"],
    type: "order",
    prompt:
      "With the loop in place, the user asks: \"What's Apple's price, and what would 15 shares cost?\" Put the execution in order.",
    steps: [
      "chat_node: model requests get_stock_price(symbol='AAPL')",
      "tools_condition routes to tools",
      "tools: ToolNode appends a ToolMessage with the quote",
      "chat_node: model requests calculator(229.10, 15, 'mul')",
      "tools: ToolNode appends the multiplication result",
      "chat_node: model answers in plain text and tools_condition returns END",
    ],
    explanation:
      "Each tool result goes back to chat_node, which decides the next action from the full history. The run ends only when the model replies without tool calls.",
    lessonAnchor: "closing-the-loop",
  },
  {
    id: "lg-tools-node-name",
    lectures: [17],
    tags: ["toolnode", "tools_condition"],
    type: "mcq",
    prompt:
      "You register the executor with builder.add_node(\"run_tools\", ToolNode(tools)) and use builder.add_conditional_edges(\"chat_node\", tools_condition). The first tool call fails to route. Why?",
    options: [
      "tools_condition returns the string \"tools\", and no node has that name",
      "ToolNode can't be added with add_node",
      "tools_condition only works with prebuilt tools",
      "Conditional edges can't start at chat_node",
    ],
    answer: "tools_condition returns the string \"tools\", and no node has that name",
    explanation:
      "tools_condition returns \"tools\" or END. Either name the node \"tools\" or pass a mapping such as {\"tools\": \"run_tools\", END: END} as the third argument.",
    lessonAnchor: "the-graph-with-toolnode-and-tools_condition",
  },
  {
    id: "lg-tools-recursion",
    lectures: [17],
    tags: ["loop", "safety"],
    type: "scenario",
    prompt:
      "A search tool keeps returning irrelevant snippets and the model keeps searching again with slightly different queries. You want the run to fail fast after about 10 steps instead of burning tokens.",
    fields: [
      {
        label: "Mechanism",
        options: ["config={\"recursion_limit\": 10}", "max_tokens=10 on the model", "ToolNode(tools, limit=10)", "A timeout on the checkpointer"],
        answer: "config={\"recursion_limit\": 10}",
      },
      {
        label: "What happens when it's hit",
        options: ["GraphRecursionError is raised", "The last tool result is returned silently", "The graph restarts from START", "The model is forced to answer"],
        answer: "GraphRecursionError is raised",
      },
    ],
    explanation:
      "The recursion limit caps how many steps a run can take and raises GraphRecursionError when exceeded, which you can catch and turn into a friendly message. max_tokens limits one reply, not the number of loop iterations.",
    lessonAnchor: "keeping-the-loop-bounded",
  },
  {
    id: "lg-tools-stream-filter",
    lectures: [17],
    tags: ["streaming", "streamlit"],
    type: "scenario",
    prompt:
      "After adding tools to the Streamlit chatbot (stream_mode=\"messages\"), users briefly see raw JSON in the assistant bubble before the real answer streams in.",
    fields: [
      {
        label: "Where the JSON comes from",
        options: ["ToolMessages in the messages stream", "The checkpointer replaying old turns", "LangSmith tracing output", "The model's system prompt"],
        answer: "ToolMessages in the messages stream",
      },
      {
        label: "Fix in the generator",
        options: [
          "Only yield content from AIMessageChunk instances",
          "Switch to stream_mode=\"values\" and print everything",
          "Remove the ToolNode from the graph",
          "Yield only messages whose content contains '{'",
        ],
        answer: "Only yield content from AIMessageChunk instances",
      },
    ],
    explanation:
      "The messages stream carries every message produced by nodes, including ToolMessages from ToolNode. Filtering to AIMessageChunk with non-empty string content streams just the model's words.",
    lessonAnchor: "stream-only-the-models-words",
  },
  {
    id: "lg-tools-trace-diagnosis",
    lectures: [17],
    tags: ["langsmith", "debugging"],
    type: "scenario",
    prompt:
      "Users ask \"how much is 3 shares of Microsoft?\" and get wrong totals. In LangSmith you see: chat_node called get_stock_price with symbol \"MSFT\" (correct), the tool returned the right price, then chat_node called calculator with second_num=30.",
    fields: [
      {
        label: "Which step is wrong",
        options: ["The model's second decision (calculator arguments)", "Tool selection for the price", "The stock API", "The checkpointer"],
        answer: "The model's second decision (calculator arguments)",
      },
      {
        label: "Most targeted fix",
        options: [
          "Improve the prompt or calculator description so arguments are taken from the question",
          "Replace DuckDuckGo search",
          "Remove the back edge from tools to chat_node",
          "Increase the recursion limit",
        ],
        answer: "Improve the prompt or calculator description so arguments are taken from the question",
      },
    ],
    explanation:
      "The trace isolates the failure: right tool, right data, wrong arguments in the follow-up call. That points to the model's instructions or the tool's description, not to the API or the graph wiring.",
    lessonAnchor: "reading-a-tool-call-in-langsmith",
  },
  {
    id: "lg-tools-status-source",
    lectures: [17],
    tags: ["streamlit", "ux"],
    type: "mcq",
    prompt:
      "You want the UI to show \"Using get_stock_price...\" as soon as the model decides to call the tool, not after the API responds. Which part of the messages stream tells you the tool name earliest?",
    options: [
      "tool_call_chunks on the AIMessageChunk",
      "The ToolMessage's name field",
      "The final AIMessage content",
      "The checkpoint metadata",
    ],
    answer: "tool_call_chunks on the AIMessageChunk",
    explanation:
      "The tool request streams in as AIMessageChunks whose tool_call_chunks carry the tool name in the first piece. The ToolMessage only arrives after the tool has finished.",
    lessonAnchor: "show-which-tool-is-running",
  },
  {
    id: "lg-tools-parallel-calls",
    lectures: [17],
    tags: ["toolnode", "parallel"],
    type: "scenario",
    prompt:
      "A user asks: \"What are Apple's and Tesla's stock prices right now?\" Your graph is the standard loop with ToolNode.",
    fields: [
      {
        label: "Likely model output on the first chat_node step",
        options: [
          "One AIMessage with two get_stock_price tool calls",
          "Two separate AIMessages, one per company",
          "A plain answer from memory",
          "One tool call with symbol=\"AAPL,TSLA\"",
        ],
        answer: "One AIMessage with two get_stock_price tool calls",
      },
      {
        label: "What ToolNode does",
        options: [
          "Runs both calls and appends two ToolMessages, each tied to its tool_call_id",
          "Runs only the first call",
          "Merges both results into one ToolMessage without ids",
          "Sends the second call back to the model",
        ],
        answer: "Runs both calls and appends two ToolMessages, each tied to its tool_call_id",
      },
    ],
    explanation:
      "Independent lookups can share one round: tool_calls is a list, and ToolNode executes every call (concurrently) and returns one ToolMessage per call. Dependent calls, like price-then-multiply, need separate rounds of the loop.",
    lessonAnchor: "parallel-tool-calls",
  },
];
