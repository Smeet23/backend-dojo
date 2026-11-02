import type { Course, Lecture } from "@/lib/types";

export const course: Course = {
  id: "langgraph",
  title: "Agentic AI with LangGraph",
  summary: "From LLM calls to real agents: graphs, state, workflows, persistence, tools, MCP, RAG, human-in-the-loop, memory and production patterns.",
  author: "CampusX",
  playlistUrl: "https://www.youtube.com/playlist?list=PLKnIA16_RmvYsvB8qkUQuJmJNuiCUJFPL",
};

const yt = (id: string) => `https://www.youtube.com/watch?v=${id}`;

export const lectures: Lecture[] = [
  { id: 1, slug: "generative-ai-vs-agentic-ai", title: "Generative AI vs Agentic AI", summary: "What changes when an LLM stops answering and starts acting: goals, planning, tools and autonomy.", videoUrl: yt("xdA0pGDiUPE"), minutes: 80, available: true },
  { id: 2, slug: "what-is-agentic-ai", title: "What is agentic AI?", summary: "The parts of an agent: perception, reasoning, planning, tools, memory and the feedback loop.", videoUrl: yt("GWnSsjT4V68"), minutes: 60, available: true },
  { id: 3, slug: "langchain-vs-langgraph", title: "LangChain vs LangGraph", summary: "Why chains struggle with loops, branching and state, and how a graph-based framework fixes that.", videoUrl: yt("31qyMKNB2RA"), minutes: 87, available: true },
  { id: 4, slug: "core-concepts", title: "LangGraph core concepts", summary: "Graphs, nodes, edges, state, reducers and how a run executes step by step.", videoUrl: yt("D5KhiCDM9XQ"), minutes: 52, available: true },
  { id: 5, slug: "sequential-workflows", title: "Sequential workflows", summary: "Your first graphs: typed state, nodes that update it, and a straight line from START to END.", videoUrl: yt("bAWujyAl1Kk"), minutes: 49, available: true },
  { id: 6, slug: "parallel-workflows", title: "Parallel workflows", summary: "Fan-out and fan-in: branches that run at the same time and reducers that merge their results.", videoUrl: yt("O6ryuSpqdOw"), minutes: 59, available: true },
  { id: 7, slug: "conditional-workflows", title: "Conditional workflows", summary: "Routing with conditional edges: let the state or an LLM decide which node runs next.", videoUrl: yt("I-dvZqTz-Wc"), minutes: 48, available: true },
  { id: 8, slug: "iterative-workflows", title: "Iterative workflows", summary: "Loops: generate, evaluate, improve, and stop conditions that keep them from running forever.", videoUrl: yt("7CbSqrovcsE"), minutes: 37, available: true },
  { id: 9, slug: "chatbot", title: "Building a chatbot", summary: "A chat graph with message state, the add_messages reducer and a model node.", videoUrl: yt("51Ve2tE3Zns"), minutes: 37, available: true },
  { id: 10, slug: "persistence", title: "Persistence and time travel", summary: "Checkpointers and threads: remembering conversations, resuming after failures and replaying past states.", videoUrl: yt("_IPP7_Bi8uA"), minutes: 58, available: true },
  { id: 11, slug: "chatbot-ui", title: "A chatbot UI with Streamlit", summary: "Putting a front end on the chat graph: session state, threads and rendering the conversation.", videoUrl: yt("voZAgDmO-rk"), minutes: 32, available: true },
  { id: 12, slug: "streaming", title: "Streaming", summary: "Sending tokens and updates as they're produced: stream modes and wiring them to a UI.", videoUrl: yt("D1PcZaeQ2eg"), minutes: 25, available: true },
  { id: 13, slug: "resume-chat", title: "Multiple conversations, like ChatGPT", summary: "A sidebar of past chats: one thread per conversation, switching threads and restoring history.", videoUrl: yt("N2nVG2MGWJ8"), minutes: 40, available: true },
  { id: 14, slug: "sqlite-persistence", title: "Persistence with SQLite", summary: "Moving checkpoints from memory to a database so conversations survive restarts.", videoUrl: yt("c6a47iX5JkU"), minutes: 29, available: true },
  { id: 15, slug: "langsmith", title: "LangSmith crash course", summary: "Tracing, debugging and evaluating LLM apps: runs, traces, datasets, evaluators and monitoring.", videoUrl: yt("4FFspU4riHk"), minutes: 128, available: true },
  { id: 16, slug: "observability", title: "Observability for LangGraph", summary: "Tracing a graph in LangSmith: seeing each node, its inputs, outputs, latency and cost.", videoUrl: yt("ikzN6byFNWw"), minutes: 22, available: true },
  { id: 17, slug: "tools", title: "Tools", summary: "Giving the model tools: binding them, the tool-calling loop, ToolNode and tools_condition.", videoUrl: yt("_UuUigoM9MA"), minutes: 34, available: true },
  { id: 18, slug: "mcp-client", title: "An MCP client in LangGraph", summary: "Using tools from MCP servers: the protocol, transports and loading MCP tools into an agent.", videoUrl: yt("yZGjVA4uDc4"), minutes: 44, available: true },
  { id: 19, slug: "rag", title: "RAG with LangGraph", summary: "Retrieval as a tool: chunking, embeddings, a vector store and an agent that decides when to search.", videoUrl: yt("E1qP9Xsnmik"), minutes: 37, available: true },
  { id: 20, slug: "human-in-the-loop", title: "Human in the loop", summary: "Pausing a graph for approval or input with interrupts, then resuming it with the human's answer.", videoUrl: yt("xxqZzVZ4gE0"), minutes: 40, available: true },
  { id: 21, slug: "subgraphs", title: "Subgraphs", summary: "Graphs inside graphs: shared vs separate state, and when to split an agent into parts.", videoUrl: yt("wcHcocpAoX4"), minutes: 23, available: true },
  { id: 22, slug: "llm-memory", title: "How LLMs remember", summary: "LLMs are stateless: context windows, short-term vs long-term memory and the trade-offs of each.", videoUrl: yt("DcPKJrOF9Wo"), minutes: 58, available: true },
  { id: 23, slug: "short-term-memory", title: "Short-term memory", summary: "Keeping conversations inside the context window: trimming, deleting and summarising messages.", videoUrl: yt("FSBkTI1QuvY"), minutes: 53, available: true },
  { id: 24, slug: "long-term-memory", title: "Long-term memory", summary: "Remembering users across conversations: stores, namespaces, extracting and retrieving memories.", videoUrl: yt("KrXBcokM3Tc"), minutes: 66, available: true },
  { id: 25, slug: "blog-writing-agent", title: "Project: a blog-writing agent", summary: "An agent that plans, researches and writes: orchestrator and workers, research tools and assembly.", videoUrl: yt("Ou_v9lk0rxg"), minutes: 80, available: true },
  { id: 26, slug: "corrective-rag", title: "Corrective RAG (CRAG)", summary: "Grading retrieved documents and falling back to web search when retrieval isn't good enough.", videoUrl: yt("41XDn81nR5c"), minutes: 75, available: true },
  { id: 27, slug: "self-rag", title: "Self-RAG", summary: "An agent that decides when to retrieve, checks its own answer for support and usefulness, and retries.", videoUrl: yt("BbO_XaEjzaA"), minutes: 69, available: true },
];
