import type { Question } from "@/lib/types";

const TRANSPORTS = ["stdio", "streamable_http", "websocket", "sse_polling"];

export const quiz: Question[] = [
  {
    id: "lg-mcp-why",
    lectures: [18],
    tags: ["mcp", "architecture"],
    type: "scenario",
    prompt:
      "Your company runs four internal assistants. Each has its own copy of eight hand-written Jira tools that call Jira's REST API. Jira renames a field in a new API version and all four assistants start failing on ticket questions.",
    fields: [
      {
        label: "Underlying problem",
        options: [
          "Integration code lives in every client, coupled to an API you don't control",
          "The assistants use too many tokens",
          "The tools are missing docstrings",
          "LangGraph can't handle more than eight tools",
        ],
        answer: "Integration code lives in every client, coupled to an API you don't control",
      },
      {
        label: "MCP-style fix",
        options: [
          "One Jira MCP server owns the tools; each assistant only holds connection config",
          "Copy the patched tools into all four assistants",
          "Merge the four assistants into one graph",
          "Cache Jira responses in the checkpointer",
        ],
        answer: "One Jira MCP server owns the tools; each assistant only holds connection config",
      },
    ],
    explanation:
      "With MCP the server owns tool code and schemas, so an upstream change is fixed once on the server and clients discover tools at runtime. Patching every copy keeps the M × N maintenance problem.",
    lessonAnchor: "what-mcp-changes",
  },
  {
    id: "lg-mcp-server-role",
    lectures: [18],
    tags: ["mcp"],
    type: "mcq",
    prompt: "A teammate asks you to \"build the MCP server in LangGraph\" so other apps can use your calculator tools. What's the accurate response?",
    options: [
      "Servers are built with an MCP server library such as FastMCP; LangGraph apps act as clients",
      "Add the tools to a ToolNode and LangGraph exposes them over MCP automatically",
      "Compile the graph with mcp=True",
      "MCP servers can only be written in TypeScript",
    ],
    answer: "Servers are built with an MCP server library such as FastMCP; LangGraph apps act as clients",
    explanation:
      "The two halves are separate. A server is a standalone program written with a server SDK, and the LangGraph app connects to it as a client via langchain-mcp-adapters.",
    lessonAnchor: "client-not-server",
  },
  {
    id: "lg-mcp-async-convert",
    lectures: [18],
    tags: ["async"],
    type: "scenario",
    prompt:
      "You're converting the sync tool chatbot so it can use MCP tools. It has a custom chat_node, a ToolNode and a main block calling chatbot.invoke(...).",
    fields: [
      {
        label: "chat_node becomes",
        options: [
          "async def, awaiting llm_with_tools.ainvoke(...)",
          "unchanged; LangGraph wraps it automatically",
          "a ToolNode",
          "a thread started with threading.Thread",
        ],
        answer: "async def, awaiting llm_with_tools.ainvoke(...)",
      },
      {
        label: "ToolNode",
        options: ["Stays as it is; it supports async tools", "Must be replaced by an async subclass", "Must be removed", "Needs async=True"],
        answer: "Stays as it is; it supports async tools",
      },
      {
        label: "Entry point",
        options: [
          "asyncio.run(main()) with await chatbot.ainvoke(...) inside",
          "chatbot.invoke(...) as before",
          "await chatbot.invoke(...) at module level",
          "chatbot.ainvoke(...) without await",
        ],
        answer: "asyncio.run(main()) with await chatbot.ainvoke(...) inside",
      },
    ],
    explanation:
      "Only your own nodes need async def and await. ToolNode already handles async execution. The graph must then run via await ainvoke/astream inside an event loop; calling ainvoke without await just returns a coroutine.",
    lessonAnchor: "converting-the-graph",
  },
  {
    id: "lg-mcp-why-async-benefit",
    lectures: [18],
    tags: ["async"],
    type: "mcq",
    prompt:
      "The model requests two tools in one turn: get_weather (1.5 s) and get_live_score (2 s). Both are network calls. Roughly how long does the tools step take when the graph runs async?",
    options: ["About 2 s", "About 3.5 s", "About 0.5 s", "It depends on the checkpointer"],
    answer: "About 2 s",
    explanation:
      "Async lets ToolNode await both calls concurrently, so the step takes about as long as the slower call. Running them one after the other would take the sum.",
    lessonAnchor: "why-async-at-all",
  },
  {
    id: "lg-mcp-transport-pick",
    lectures: [18],
    tags: ["mcp", "transports"],
    type: "scenario",
    prompt:
      "You connect the chatbot to two MCP servers: (A) a Python script on the same machine that does file operations, and (B) a company expense service deployed at https://expenses.internal/mcp behind a bearer token.",
    fields: [
      { label: "Transport for A", options: TRANSPORTS, answer: "stdio" },
      { label: "Transport for B", options: TRANSPORTS, answer: "streamable_http" },
      {
        label: "Where B's token goes",
        options: ["In a headers entry of B's config", "In the tool docstrings", "In the model's system prompt", "In args next to the script path"],
        answer: "In a headers entry of B's config",
      },
    ],
    explanation:
      "Local programs are launched as subprocesses and spoken to over stdio (command + args). Deployed servers use streamable HTTP with a url, plus headers for auth. Credentials never belong in prompts.",
    lessonAnchor: "adding-a-remote-server-over-http",
  },
  {
    id: "lg-mcp-get-tools-flow",
    lectures: [18],
    tags: ["mcp", "langgraph"],
    type: "order",
    prompt: "Put the startup of an MCP-powered LangGraph chatbot in order.",
    steps: [
      "Create MultiServerMCPClient with each server's transport config",
      "await client.get_tools() to discover tools from every server",
      "Bind the returned tools to the chat model",
      "Build the graph with ToolNode(tools) and compile it",
      "await graph.ainvoke(...) with the user's message",
    ],
    explanation:
      "Tools come from an async call, so the graph can only be built after get_tools() resolves. That's why graph construction moves into a function called after discovery.",
    lessonAnchor: "connecting-to-a-local-server-over-stdio",
  },
  {
    id: "lg-mcp-stdio-slow",
    lectures: [18],
    tags: ["mcp", "sessions"],
    type: "scenario",
    prompt:
      "Your stdio MCP server loads a large index at startup (about 3 s). Every single tool call through MultiServerMCPClient takes over 3 s, and server-side caches never seem to help.",
    fields: [
      {
        label: "Why",
        options: [
          "The client is stateless by default, so each call starts a new session and respawns the process",
          "stdio is always slower than HTTP by 3 s",
          "ToolNode serialises calls",
          "The model is re-reading the tool schemas",
        ],
        answer: "The client is stateless by default, so each call starts a new session and respawns the process",
      },
      {
        label: "Fix",
        options: [
          "Open async with client.session(\"name\") and load tools with load_mcp_tools(session)",
          "Call get_tools() before every message",
          "Switch the graph back to sync invoke",
          "Add the index to the graph state",
        ],
        answer: "Open async with client.session(\"name\") and load tools with load_mcp_tools(session)",
      },
    ],
    explanation:
      "Without an explicit session, each tool call opens and closes its own MCP session; for stdio that means a fresh subprocess. An explicit session keeps one connection (and one process) alive for its duration.",
    lessonAnchor: "sessions-and-the-cost-of-stdio",
  },
  {
    id: "lg-mcp-mix",
    lectures: [18],
    tags: ["mcp", "tools"],
    type: "mcq",
    prompt:
      "You already have a tiny local @tool for formatting currency, and you're adding an MCP server for expenses. How do you give both to the agent?",
    options: [
      "tools = [format_currency, *await client.get_tools()] and use that list for bind_tools and ToolNode",
      "Two separate graphs, one per tool source",
      "Wrap format_currency in its own MCP server first; mixing isn't allowed",
      "Bind MCP tools to the model and give local tools only to ToolNode",
    ],
    answer: "tools = [format_currency, *await client.get_tools()] and use that list for bind_tools and ToolNode",
    explanation:
      "Loaded MCP tools are ordinary LangChain tools, so they combine with @tool functions in one list. The model and ToolNode must both get the full list, or the model will request tools the executor doesn't have.",
    lessonAnchor: "mixing-local-tools-and-mcp-tools",
  },
  {
    id: "lg-mcp-streamlit",
    lectures: [18],
    tags: ["async", "streamlit", "persistence"],
    type: "scenario",
    prompt:
      "You add MCP to the Streamlit chatbot that uses SqliteSaver. The graph now has to run async, but Streamlit reruns the script synchronously.",
    fields: [
      {
        label: "Checkpointer",
        options: ["AsyncSqliteSaver (aiosqlite)", "Keep SqliteSaver", "InMemorySaver only", "No checkpointer"],
        answer: "AsyncSqliteSaver (aiosqlite)",
      },
      {
        label: "Running the graph from Streamlit",
        options: [
          "Submit coroutines to a long-lived event loop in a background thread",
          "Call asyncio.run inside every node",
          "Use chatbot.invoke and ignore async",
          "Make Streamlit's script an async def",
        ],
        answer: "Submit coroutines to a long-lived event loop in a background thread",
      },
      {
        label: "Better production setup",
        options: [
          "An async API server (e.g. FastAPI) running the graph, with a separate frontend",
          "More Streamlit workers",
          "A second checkpointer",
          "Removing streaming",
        ],
        answer: "An async API server (e.g. FastAPI) running the graph, with a separate frontend",
      },
    ],
    explanation:
      "An async graph needs an async checkpointer, and Streamlit doesn't own an event loop, so the workaround is a background loop plus glue code. An async web server running the agent avoids that friction entirely.",
    lessonAnchor: "the-chatbot-with-mcp",
  },
];
