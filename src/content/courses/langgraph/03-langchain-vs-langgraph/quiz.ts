import type { Question } from "@/lib/types";

const FRAMEWORK = ["LangChain chain", "LangGraph graph"];

export const quiz: Question[] = [
  {
    id: "lg-chain-or-graph-projects",
    lectures: [3],
    tags: ["langchain", "langgraph", "design"],
    type: "scenario",
    prompt: "Your team has four projects on the roadmap. Pick the orchestration approach for each.",
    fields: [
      { label: "Translate product descriptions into French, one call each", options: FRAMEWORK, answer: "LangChain chain" },
      { label: "Answer HR questions from the policy PDFs (basic RAG)", options: FRAMEWORK, answer: "LangChain chain" },
      { label: "Draft a contract, route it to legal, wait for their edits, redraft until approved", options: FRAMEWORK, answer: "LangGraph graph" },
      { label: "A researcher agent and a writer agent that hand work back and forth", options: FRAMEWORK, answer: "LangGraph graph" },
    ],
    explanation:
      "Translation and basic RAG are short and linear, which chains handle well. The contract flow loops and waits on humans for days; the two-agent system needs coordination between sub-workflows. Both need a graph with state and checkpoints.",
    lessonAnchor: "when-to-use-which",
  },
  {
    id: "lg-workflow-vs-agent",
    lectures: [3],
    tags: ["workflows", "agents"],
    type: "scenario",
    prompt: "Classify each system using the workflow/agent distinction.",
    fields: [
      { label: "Every invoice goes: extract fields → validate → if total > $10k ask a manager → post to ledger", options: ["Workflow", "Agent"], answer: "Workflow" },
      { label: "Given a bug report, the LLM decides which files to read, which tests to run and when it's done", options: ["Workflow", "Agent"], answer: "Agent" },
    ],
    explanation:
      "The invoice flow has a developer-defined path; the branch depends on data, but the paths are fixed in advance. The bug fixer lets the LLM direct its own process and tool use, so it's an agent. Note that having a branch doesn't make something an agent.",
    lessonAnchor: "workflows-and-agents",
  },
  {
    id: "lg-glue-code-problem",
    lectures: [3],
    tags: ["control-flow", "langchain"],
    type: "mcq",
    prompt:
      "Your chain-based app has grown to 400 lines of while loops, flags and if/else around a dozen LCEL chains. New teammates struggle to follow it and traces show disconnected model calls. What's the underlying problem?",
    options: [
      "Non-linear control flow lives in glue code the framework can't see or structure",
      "LCEL chains are too slow for production",
      "The prompts are too long",
      "LangChain can't call more than one model",
    ],
    answer: "Non-linear control flow lives in glue code the framework can't see or structure",
    explanation:
      "Chains handle the linear pieces; the loops and branches had to be hand-written around them. That glue is hard to maintain and invisible to tracing. Expressing it as nodes and edges in a graph removes it.",
    lessonAnchor: "challenge-1-control-flow",
  },
  {
    id: "lg-loop-as-edge",
    lectures: [3],
    tags: ["control-flow", "conditional-edges"],
    type: "scenario",
    prompt:
      "In LangGraph you want: after review_jd, go to post_jd if approved, otherwise back to create_jd. How do you express it?",
    fields: [
      { label: "Construct", options: ["add_conditional_edges with a router function", "A while loop inside review_jd", "Two add_edge calls from review_jd", "RunnableBranch"], answer: "add_conditional_edges with a router function" },
      { label: "The router decides by reading", options: ["The graph state (e.g. approved)", "A global variable", "The LLM's last token", "The checkpoint ID"], answer: "The graph state (e.g. approved)" },
    ],
    explanation:
      "A loop is just an edge back to an earlier node, chosen by a router that reads the state. Two plain add_edge calls from one node would fan out to both nodes rather than choose one, and a while loop inside a node hides control flow from the graph.",
    lessonAnchor: "the-graph-version",
  },
  {
    id: "lg-partial-state-update",
    lectures: [3],
    tags: ["state"],
    type: "mcq",
    prompt:
      "Your HiringState has request, jd, approved, posted and applications. The count_applications node only learns the new count. What should it return?",
    options: [
      "{\"applications\": n}: only the key it changed",
      "The full state dict with applications replaced",
      "Nothing: it should mutate the state argument in place",
      "A string, which LangGraph passes to the next node",
    ],
    answer: "{\"applications\": n}: only the key it changed",
    explanation:
      "Nodes return partial updates and LangGraph merges them into the state. Returning the whole dict works but invites stale overwrites; mutating the input isn't how updates are recorded.",
    lessonAnchor: "state-in-a-graph",
  },
  {
    id: "lg-week-long-wait",
    lectures: [3],
    tags: ["event-driven", "checkpointer", "interrupt"],
    type: "scenario",
    prompt:
      "After posting a job, the workflow must wait 7 days and then count applications. A colleague's prototype calls time.sleep(7 * 86400) inside a node. Redesign it.",
    fields: [
      { label: "Inside the wait node", options: ["Call interrupt() to pause the run", "Keep time.sleep but in a thread", "Raise an exception and retry", "Return END"], answer: "Call interrupt() to pause the run" },
      { label: "What makes the pause survivable", options: ["A checkpointer storing state per thread_id", "A larger server", "LangSmith tracing", "An output parser"], answer: "A checkpointer storing state per thread_id" },
      { label: "In 7 days, a scheduled job calls", options: ["graph.invoke(Command(resume=count), config)", "graph.invoke({\"request\": ...}) with a new thread", "builder.compile() again", "graph.get_state(config) only"], answer: "graph.invoke(Command(resume=count), config)" },
    ],
    explanation:
      "Sleeping holds a process for a week and dies with any restart. interrupt() saves state through the checkpointer and returns; resuming the same thread with Command(resume=...) continues from the wait node, with the count as interrupt()'s return value.",
    lessonAnchor: "challenge-3-event-driven-execution",
  },
  {
    id: "lg-fault-sizes",
    lectures: [3],
    tags: ["fault-tolerance"],
    type: "scenario",
    prompt: "Match each failure in the hiring graph to the LangGraph mechanism that handles it.",
    fields: [
      { label: "The job-board API returns a 503 once, then works", options: ["RetryPolicy on the node", "Resume from the last checkpoint", "Restart the whole run"], answer: "RetryPolicy on the node" },
      { label: "The container is replaced while the graph is at shortlist", options: ["RetryPolicy on the node", "Resume from the last checkpoint", "Restart the whole run"], answer: "Resume from the last checkpoint" },
    ],
    explanation:
      "Transient step failures are retried in place. A dead process loses nothing that was checkpointed: with a durable saver, graph.invoke(None, config) on the same thread continues from the last completed node.",
    lessonAnchor: "challenge-4-fault-tolerance",
  },
  {
    id: "lg-inmemory-crash",
    lectures: [3],
    tags: ["fault-tolerance", "checkpointer"],
    type: "mcq",
    prompt:
      "You compiled with InMemorySaver. The server restarts while a JD awaits approval, and graph.invoke(None, config) starts nothing. Why?",
    options: [
      "InMemorySaver lived in the dead process's memory; use a database-backed saver like SqliteSaver",
      "The thread_id must change after a restart",
      "interrupt() can't be combined with a checkpointer",
      "You must recompile with recursion_limit set",
    ],
    answer: "InMemorySaver lived in the dead process's memory; use a database-backed saver like SqliteSaver",
    explanation:
      "An in-memory checkpointer survives pauses within one process, not crashes. Recovery needs checkpoints on durable storage, such as SQLite or Postgres. The thread_id must stay the same to find them.",
    lessonAnchor: "challenge-4-fault-tolerance",
  },
  {
    id: "lg-duplicate-post-after-crash",
    lectures: [3],
    tags: ["fault-tolerance", "idempotency"],
    type: "mcq",
    prompt:
      "The server crashed while post_jd was running, after the API call succeeded but before the node returned. After resuming, the job appears twice on the board. What's the right fix?",
    options: [
      "Make post_jd idempotent: check for an existing posting or send an idempotency key",
      "Disable the checkpointer for post_jd",
      "Move post_jd before create_jd",
      "Add a second RetryPolicy",
    ],
    answer: "Make post_jd idempotent: check for an existing posting or send an idempotency key",
    explanation:
      "Checkpoints are written between nodes, so an interrupted node reruns on resume. Side-effecting nodes must be safe to repeat; extra retries would make duplicates more likely, not less.",
    lessonAnchor: "challenge-4-fault-tolerance",
  },
  {
    id: "lg-hitl-flow-order",
    lectures: [3],
    tags: ["human-in-the-loop", "interrupt"],
    type: "order",
    prompt: "Order what happens when the hiring graph asks a manager to approve the JD, and she replies the next morning.",
    steps: [
      "create_jd writes the JD into the state",
      "review_jd calls interrupt() and the checkpointer saves the state",
      "invoke returns with __interrupt__ containing the JD and question",
      "The manager clicks Approve in the UI the next day",
      "The app calls graph.invoke(Command(resume={\"approved\": True}), config)",
      "review_jd re-runs from its start; interrupt() returns the decision",
      "The conditional edge routes to post_jd",
    ],
    explanation:
      "interrupt() pauses after saving state and hands the payload back to the caller. Resuming the same thread re-runs the paused node from the top, with interrupt() now returning the resume value, and normal routing continues.",
    lessonAnchor: "challenge-5-human-in-the-loop",
  },
  {
    id: "lg-subgraph-reuse",
    lectures: [3],
    tags: ["subgraphs"],
    type: "scenario",
    prompt:
      "Your hiring graph needs the same approve/reject/feedback logic before posting, before scheduling and before offers. Today it's copy-pasted three times.",
    fields: [
      { label: "Refactor to", options: ["One approval graph, compiled and added as a node where needed", "A longer system prompt", "Three separate threads", "A RunnableBranch"], answer: "One approval graph, compiled and added as a node where needed" },
      { label: "Design question to settle", options: ["How parent and subgraph state keys map to each other", "Which LLM vendor to use", "How many tokens the JD has", "Whether to disable tracing"], answer: "How parent and subgraph state keys map to each other" },
    ],
    explanation:
      "A compiled graph can be used as a node, which gives you reusable sub-workflows. The thing to design is the state interface: shared keys pass straight through, and different schemas need translating.",
    lessonAnchor: "nested-workflows",
  },
  {
    id: "lg-observability-glue",
    lectures: [3],
    tags: ["observability", "langsmith"],
    type: "mcq",
    prompt:
      "Your chain-plus-glue app has LangSmith tracing on. An auditor asks why the JD was regenerated three times last Tuesday. The traces show three model calls but not why. What's the best explanation?",
    options: [
      "The retry loop and approval checks live in your own Python, so the trace doesn't capture that logic unless you instrument it",
      "LangSmith can't trace OpenAI models",
      "Tracing only records the first call of a session",
      "The model regenerated the JD on its own",
    ],
    answer: "The retry loop and approval checks live in your own Python, so the trace doesn't capture that logic unless you instrument it",
    explanation:
      "LangSmith traces LangChain calls automatically; glue logic is invisible unless you add @traceable yourself. In a LangGraph run the loop is part of the graph, so each node, its state and the edge taken appear in the trace.",
    lessonAnchor: "challenge-6-observability",
  },
  {
    id: "lg-dont-drop-langchain",
    lectures: [3],
    tags: ["langchain", "langgraph"],
    type: "mcq",
    prompt: "After this lesson, a teammate proposes removing LangChain from the project and using only LangGraph. What's wrong with that?",
    options: [
      "LangGraph orchestrates; the nodes still use LangChain models, prompts, retrievers and tools",
      "Nothing: LangGraph replaces LangChain entirely",
      "LangGraph can only run LangChain chains, not Python functions",
      "LangChain is required for LangSmith tracing to work at all",
    ],
    answer: "LangGraph orchestrates; the nodes still use LangChain models, prompts, retrievers and tools",
    explanation:
      "They solve different problems. Nodes are plain Python functions that typically call LangChain components; LangGraph decides how those nodes connect and keeps state across steps, waits and failures.",
    lessonAnchor: "langgraph-builds-on-langchain",
  },
];
