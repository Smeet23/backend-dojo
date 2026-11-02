import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "lg-stm-no-checkpointer",
    lectures: [23],
    tags: ["checkpointer", "short-term-memory"],
    type: "scenario",
    prompt:
      "Your graph uses MessagesState and you call graph.invoke() once per user message. The bot never remembers the previous turn, even though add_messages is supposed to append.",
    fields: [
      { label: "Why", options: ["add_messages overwrites instead of appending", "Without a checkpointer, every invoke starts from empty state", "MessagesState can only hold one message", "The model's context window is too small"], answer: "Without a checkpointer, every invoke starts from empty state" },
      { label: "Fix", options: ["compile(checkpointer=InMemorySaver()) and pass a thread_id in config", "Switch to a custom TypedDict state", "Use operator.add instead of add_messages", "Call graph.get_state() before each invoke"], answer: "compile(checkpointer=InMemorySaver()) and pass a thread_id in config" },
    ],
    explanation:
      "The reducer only appends within one run. Memory across runs needs a checkpointer to save state and a thread_id to say which saved conversation to load.",
    lessonAnchor: "adding-an-in-memory-checkpointer",
  },
  {
    id: "lg-stm-shared-thread-id",
    lectures: [23],
    tags: ["threads", "short-term-memory"],
    type: "mcq",
    prompt:
      "In production, two different users see fragments of each other's conversations. Your API handler builds config = {\"configurable\": {\"thread_id\": \"main\"}} for every request. What's wrong?",
    options: [
      "Every request shares one thread, so all users append to the same history; generate a thread ID per conversation",
      "InMemorySaver can't handle more than one user",
      "thread_id must be an integer",
      "The checkpointer must be recreated on every request",
    ],
    answer: "Every request shares one thread, so all users append to the same history; generate a thread ID per conversation",
    explanation:
      "Short-term memory is thread-scoped: one thread ID means one conversation. Each conversation (and so each user) needs its own thread ID, typically stored by your app alongside the chat.",
    lessonAnchor: "checkpointers-and-threads",
  },
  {
    id: "lg-stm-postgres-restart",
    lectures: [23],
    tags: ["persistence", "postgres"],
    type: "scenario",
    prompt:
      "Your chatbot uses InMemorySaver. Every redeploy wipes all conversations. You're moving to Postgres running in Docker.",
    fields: [
      { label: "Checkpointer", options: ["InMemorySaver", "PostgresSaver", "InMemoryStore", "PostgresStore"], answer: "PostgresSaver" },
      { label: "One-time call before first use", options: ["checkpointer.setup()", "checkpointer.connect()", "graph.migrate()", "checkpointer.create_tables(thread_id)"], answer: "checkpointer.setup()" },
      { label: "Where to compile and run the graph", options: ["Inside the with PostgresSaver.from_conn_string(...) block", "After the with block closes", "In a separate process", "Anywhere; the connection stays open forever"], answer: "Inside the with PostgresSaver.from_conn_string(...) block" },
    ],
    explanation:
      "PostgresSaver stores checkpoints durably. from_conn_string is a context manager that closes the connection when the block exits, so use the graph inside it, and call setup() once to create the tables. The Store classes are for long-term memory, not thread history.",
    lessonAnchor: "using-postgressaver",
  },
  {
    id: "lg-stm-trim-keeps-state",
    lectures: [23],
    tags: ["trimming"],
    type: "mcq",
    prompt:
      "You add trim_messages(state[\"messages\"], max_tokens=500, ...) before the model call. A week later the Postgres checkpoint table for long threads is still growing fast. Why?",
    options: [
      "trim_messages only shapes the list passed to the model; the state, and so the checkpoints, still hold every message",
      "trim_messages is broken when used with PostgresSaver",
      "max_tokens limits the reply length, not the input",
      "Trimming only runs when the context window is exceeded",
    ],
    answer: "trim_messages only shapes the list passed to the model; the state, and so the checkpoints, still hold every message",
    explanation:
      "Trimming returns a new list for one call and never touches state. To shrink what's stored you must delete messages with RemoveMessage (often as part of summarization).",
    lessonAnchor: "trimming-does-not-delete",
  },
  {
    id: "lg-stm-trim-start-on",
    lectures: [23],
    tags: ["trimming", "tools"],
    type: "scenario",
    prompt:
      "Your tool-using agent trims history with strategy=\"last\" and max_tokens=1000. Occasionally the provider rejects the request because the trimmed history begins with a tool result whose tool call was cut off. You also notice your system prompt sometimes disappears.",
    fields: [
      { label: "Fix for the orphaned tool result", options: ["start_on=\"human\"", "strategy=\"first\"", "allow_partial=True", "Raise max_tokens to 10000"], answer: "start_on=\"human\"" },
      { label: "Fix for the vanishing system prompt", options: ["include_system=True", "end_on=\"system\"", "strategy=\"first\"", "Put the system prompt last"], answer: "include_system=True" },
    ],
    explanation:
      "start_on=\"human\" drops leading messages until the window starts with a user message, which keeps tool calls and results paired. include_system=True keeps a leading system message even when older messages are cut.",
    lessonAnchor: "trimming-options",
  },
  {
    id: "lg-stm-trim-forgets-name",
    lectures: [23],
    tags: ["trimming", "summarization"],
    type: "mcq",
    prompt:
      "With a 150-token trim budget, a user introduces themselves, asks for a long explanation, then asks \"What's my name?\". The bot doesn't know. What happened?",
    options: [
      "The long reply used up the budget, so trimming kept only the newest messages and dropped the introduction for this call",
      "The checkpointer deleted the first message",
      "RemoveMessage was called automatically",
      "The thread ID changed between turns",
    ],
    answer: "The long reply used up the budget, so trimming kept only the newest messages and dropped the introduction for this call",
    explanation:
      "trim_messages walks back from the newest message and keeps what fits. Early facts fall outside the window even though they're still in state; this is trimming's built-in weakness.",
    lessonAnchor: "watching-trimming-happen",
  },
  {
    id: "lg-stm-remove-message",
    lectures: [23],
    tags: ["deletion", "reducers"],
    type: "scenario",
    prompt:
      "You want a node that permanently deletes all but the last 4 messages from a MessagesState thread once it has more than 10.",
    fields: [
      { label: "What the node returns", options: ["{\"messages\": [RemoveMessage(id=m.id) for m in messages[:-4]]}", "{\"messages\": messages[-4:]}", "{\"messages\": []}", "del state[\"messages\"][:-4]"], answer: "{\"messages\": [RemoveMessage(id=m.id) for m in messages[:-4]]}" },
      { label: "Who actually removes them", options: ["The add_messages reducer", "The checkpointer's cleanup job", "trim_messages", "The model provider"], answer: "The add_messages reducer" },
    ],
    explanation:
      "add_messages appends whatever a node returns, so returning messages[-4:] would just append duplicates. RemoveMessage tells the reducer to delete the message with that ID, and the change is saved in the next checkpoint. Mutating state in place does nothing.",
    lessonAnchor: "deleting-messages",
  },
  {
    id: "lg-stm-summary-state",
    lectures: [23],
    tags: ["summarization", "state"],
    type: "scenario",
    prompt:
      "You're adding summarization to a chat graph that currently uses MessagesState: summarize when the thread exceeds 6 messages, keep the last 2.",
    fields: [
      { label: "State", options: ["Subclass MessagesState and add summary: str", "Keep MessagesState and append the summary as a HumanMessage", "Store the summary in the thread_id", "Use a global variable for the summary"], answer: "Subclass MessagesState and add summary: str" },
      { label: "How chat uses the summary", options: ["Prepend it as a SystemMessage for the model call only", "Append it permanently to state messages on every turn", "Ignore it until the next summarization", "Put it in config"], answer: "Prepend it as a SystemMessage for the model call only" },
      { label: "Routing", options: ["Conditional edge from chat: summarize if more than 6 messages, else END", "Always go chat → summarize", "Summarize before chat on every turn", "An interrupt before summarize"], answer: "Conditional edge from chat: summarize if more than 6 messages, else END" },
    ],
    explanation:
      "The summary needs its own key that's overwritten each time. It's injected per call, not stored as a message, and a conditional edge avoids a summarizer call on every turn.",
    lessonAnchor: "summarizing-messages",
  },
  {
    id: "lg-stm-summary-no-delete",
    lectures: [23],
    tags: ["summarization", "deletion"],
    type: "mcq",
    prompt:
      "Your summarize node writes a good summary but returns only {\"summary\": response.content}. What goes wrong over time?",
    options: [
      "The old messages stay in state, so the thread keeps growing and the model sees both the messages and their summary",
      "The summary is discarded because summary has no reducer",
      "The checkpointer refuses to save non-message keys",
      "Nothing; summarization automatically removes the summarized messages",
    ],
    answer: "The old messages stay in state, so the thread keeps growing and the model sees both the messages and their summary",
    explanation:
      "Summarizing doesn't delete anything by itself. The node must also return RemoveMessage for each summarized message, otherwise you get duplication and no size reduction.",
    lessonAnchor: "the-summarize-node",
  },
  {
    id: "lg-stm-rolling-summary",
    lectures: [23],
    tags: ["summarization"],
    type: "mcq",
    prompt:
      "On the second summarization of a thread, your node asks the model to \"summarize the conversation above\" using only the current old messages, and overwrites summary. What's lost?",
    options: [
      "Everything from the first summary, because it wasn't included and was overwritten",
      "Nothing; the model remembers the earlier summary",
      "Only the last 2 messages",
      "The thread ID",
    ],
    answer: "Everything from the first summary, because it wasn't included and was overwritten",
    explanation:
      "The earlier messages were deleted after the first summary, so the existing summary is the only record of them. The extend case must pass the existing summary and ask the model to extend it.",
    lessonAnchor: "the-summarize-node",
  },
  {
    id: "lg-stm-choose-strategy",
    lectures: [23],
    tags: ["trimming", "summarization", "deletion"],
    type: "scenario",
    prompt: "Pick the best primary technique for each app.",
    fields: [
      { label: "A coding agent whose old tool outputs are huge and rarely needed again", options: ["Trimming", "Deleting", "Summarizing", "No change"], answer: "Trimming" },
      { label: "A tutoring chat where facts from the first minutes matter an hour later", options: ["Trimming", "Deleting", "Summarizing", "No change"], answer: "Summarizing" },
      { label: "A \"Start over\" button that clears the current thread's history", options: ["Trimming", "Deleting", "Summarizing", "No change"], answer: "Deleting" },
    ],
    explanation:
      "Trimming is free and fine when old turns rarely matter. Summarizing preserves early facts at the cost of extra model calls. A reset is a delete, for example RemoveMessage(id=REMOVE_ALL_MESSAGES).",
    lessonAnchor: "choosing-a-strategy",
  },
];
