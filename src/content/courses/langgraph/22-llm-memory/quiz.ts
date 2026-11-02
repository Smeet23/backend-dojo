import type { Question } from "@/lib/types";

const MEMORY_TYPES = ["Semantic", "Episodic", "Procedural", "Not worth storing"];

export const quiz: Question[] = [
  {
    id: "lg-memory-forgets-name",
    lectures: [22],
    tags: ["memory", "stateless"],
    type: "scenario",
    prompt:
      "Your first chatbot calls llm.invoke(user_text) for each message. A user says \"I'm Ravi\", then asks \"What's my name?\" and the bot says it doesn't know. A teammate suggests fine-tuning the model on chat logs so it \"remembers\".",
    fields: [
      { label: "Root cause", options: ["The model's weights are too small to hold the name", "Each call is stateless: the second input never contained the first message", "The context window was exceeded", "The temperature is too high"], answer: "Each call is stateless: the second input never contained the first message" },
      { label: "Right fix", options: ["Fine-tune the model on chat logs", "Keep a messages list and send the whole history on every call", "Raise max_tokens", "Switch to a model with a 1M-token window"], answer: "Keep a messages list and send the whole history on every call" },
    ],
    explanation:
      "At inference the weights are frozen and each call depends only on its input, so the fix is to put the earlier messages back into the input (a conversation buffer). Fine-tuning changes θ offline; it can't capture a fact the user said thirty seconds ago.",
    lessonAnchor: "short-term-memory-as-a-conversation-buffer",
  },
  {
    id: "lg-memory-in-context-learning",
    lectures: [22],
    tags: ["memory", "context-window"],
    type: "mcq",
    prompt:
      "You paste a 30-page private runbook into the prompt and ask a question about step 14. The model answers correctly although it never saw the runbook in training. Which two properties make this, and the conversation buffer, work?",
    options: [
      "A large context window and in-context learning",
      "Fine-tuning and a large parameter count",
      "Statelessness and a low temperature",
      "Parametric knowledge and tool calling",
    ],
    answer: "A large context window and in-context learning",
    explanation:
      "The context window lets the runbook fit into the input, and in-context learning lets the model use information in the prompt rather than only its parametric knowledge. Short-term memory relies on exactly the same pair.",
    lessonAnchor: "two-ideas-that-make-memory-possible",
  },
  {
    id: "lg-memory-restart-loses-chat",
    lectures: [22],
    tags: ["memory", "persistence"],
    type: "scenario",
    prompt:
      "Your chat API keeps each conversation's messages in a Python dict in memory. After every deploy, users complain that the bot \"forgot\" what they were discussing, and switching back to an older chat shows an empty conversation.",
    fields: [
      { label: "Problem", options: ["Context window overflow", "Short-term memory is fragile: it lives in process memory", "Long-term memory extraction is failing", "The model is hallucinating"], answer: "Short-term memory is fragile: it lives in process memory" },
      { label: "Fix", options: ["Summarize every conversation", "Persist each thread's messages in a database keyed by thread ID", "Store all chats in one shared buffer", "Use a bigger model"], answer: "Persist each thread's messages in a database keyed by thread ID" },
    ],
    explanation:
      "A buffer in a variable dies with the process. Saving messages per thread ID in a durable store (in LangGraph, a database-backed checkpointer) lets you reload a thread after a restart or when the user returns to it.",
    lessonAnchor: "it-is-fragile",
  },
  {
    id: "lg-memory-one-giant-buffer",
    lectures: [22],
    tags: ["memory", "threads"],
    type: "mcq",
    prompt:
      "To \"remember everything\", a teammate proposes a single message buffer per user that holds all of their conversations, resent on every call. What's the best objection?",
    options: [
      "It will soon exceed the context window and mixes unrelated topics, confusing the model",
      "LLMs can't read messages from more than one conversation",
      "Buffers can only hold user messages, not model replies",
      "Thread IDs are required by every LLM API",
    ],
    answer: "It will soon exceed the context window and mixes unrelated topics, confusing the model",
    explanation:
      "Short-term memory is thread-scoped for good reasons: size and coherence. Cross-conversation knowledge belongs in long-term memory, extracted selectively, not in one ever-growing buffer.",
    lessonAnchor: "threads-and-conversation-scope",
  },
  {
    id: "lg-memory-trim-vs-summary",
    lectures: [22],
    tags: ["memory", "context-window"],
    type: "scenario",
    prompt:
      "A support chat runs for hours. Requests start failing with a context-length error. You add \"keep only the last 40 messages\" and the errors stop, but now the bot forgets the order number the customer gave at the start.",
    fields: [
      { label: "What you added", options: ["Trimming", "Summarization", "Long-term memory", "Persistence"], answer: "Trimming" },
      { label: "Better approach", options: ["Trim harder, to 10 messages", "Summarize older messages and send the summary plus recent ones", "Switch threads every 40 messages", "Turn off the conversation buffer"], answer: "Summarize older messages and send the summary plus recent ones" },
    ],
    explanation:
      "Trimming keeps the input within budget but silently drops early facts. Summarization compresses the old messages so the gist (like the order number) survives while the input stays small.",
    lessonAnchor: "it-overflows-the-context-window",
  },
  {
    id: "lg-memory-stranger-again",
    lectures: [22],
    tags: ["memory", "long-term"],
    type: "mcq",
    prompt:
      "Your assistant has a persisted, summarized conversation buffer per thread. Users still complain: \"Every new chat, I have to tell it I use TypeScript again.\" What's missing?",
    options: [
      "Long-term memory that stores user facts outside any single thread",
      "A larger context window",
      "A Postgres checkpointer instead of an in-memory one",
      "More aggressive trimming",
    ],
    answer: "Long-term memory that stores user facts outside any single thread",
    explanation:
      "All short-term memory, persisted or not, is thread-scoped, so a new thread starts empty. Preferences that should follow the user across conversations need long-term memory. A Postgres checkpointer only makes each thread durable.",
    lessonAnchor: "it-is-locked-inside-one-thread",
  },
  {
    id: "lg-memory-classify-types",
    lectures: [22],
    tags: ["memory", "long-term"],
    type: "scenario",
    prompt: "Your extractor proposes three memories for a coding assistant. Classify each one.",
    fields: [
      { label: "\"User's team deploys on Kubernetes\"", options: MEMORY_TYPES, answer: "Semantic" },
      { label: "\"Last week the user rejected the Celery-based design\"", options: MEMORY_TYPES, answer: "Episodic" },
      { label: "\"When this user asks for tests, write pytest fixtures first\"", options: MEMORY_TYPES, answer: "Procedural" },
    ],
    explanation:
      "Semantic memory holds facts (what is true), episodic memory holds past events and outcomes (what happened), and procedural memory holds rules and strategies (how to do things).",
    lessonAnchor: "three-kinds-of-long-term-memory",
  },
  {
    id: "lg-memory-loop-order",
    lectures: [22],
    tags: ["memory", "long-term"],
    type: "order",
    prompt: "Put the long-term memory loop in order, from a user mentioning a preference to that preference shaping a reply in a later chat.",
    steps: [
      "Extract a candidate fact from the conversation and filter out noise",
      "Decide whether to create, update or ignore it",
      "Save it in a durable store with the user ID as metadata",
      "In a new chat, search the store for memories relevant to the message",
      "Inject the retrieved memories into the prompt for this call",
    ],
    explanation:
      "Creation (extract, filter, decide) comes first, then storage, then selective retrieval in a later conversation, and finally injection. The model only ever sees memories as input tokens.",
    lessonAnchor: "how-long-term-memory-works",
  },
  {
    id: "lg-memory-load-everything",
    lectures: [22],
    tags: ["memory", "retrieval"],
    type: "scenario",
    prompt:
      "After six months, each user has about 300 stored memories. You inject all of them into every system prompt. Answers get slower, pricier and oddly off-topic (it mentions the user's dog while debugging SQL).",
    fields: [
      { label: "Principle violated", options: ["Retrieval should be selective, not exhaustive", "Memories must be stored in a vector DB", "Short-term memory must be persisted", "Memories should be injected as user messages"], answer: "Retrieval should be selective, not exhaustive" },
      { label: "Fix", options: ["Delete memories older than a week", "Search for the few memories relevant to the current message and inject only those", "Move all memories into the checkpointer", "Fine-tune on the memories"], answer: "Search for the few memories relevant to the current message and inject only those" },
    ],
    explanation:
      "Long-term memory is searched, not replayed. Injecting a small relevant subset keeps the context focused and cheap; dumping everything wastes tokens and distracts the model.",
    lessonAnchor: "retrieval",
  },
  {
    id: "lg-memory-model-reads-store",
    lectures: [22],
    tags: ["memory", "injection"],
    type: "mcq",
    prompt: "How does a retrieved long-term memory actually influence the model's answer?",
    options: [
      "Your code adds it to the input, for example in the system prompt, so it becomes part of the tokens for that call",
      "The model queries the memory store directly during generation",
      "The memory updates the model's weights for that user",
      "The checkpointer streams it to the model in the background",
    ],
    answer: "Your code adds it to the input, for example in the system prompt, so it becomes part of the tokens for that call",
    explanation:
      "The model is stateless and can't reach a database. Long-term memories reach it through short-term memory: they're injected into the context window as ordinary input tokens.",
    lessonAnchor: "injection",
  },
];
