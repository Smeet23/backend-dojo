import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "lg-chat-amnesia-cause",
    lectures: [9],
    tags: ["chatbot", "persistence"],
    type: "scenario",
    prompt:
      "Your terminal chatbot has state messages: Annotated[list[AnyMessage], add_messages]. Inside a while loop you call chatbot.invoke({\"messages\": [HumanMessage(user_text)]}). The user says \"I'm Nitya\", then asks \"What's my name?\" and the bot doesn't know.",
    fields: [
      { label: "Why", options: ["Each invoke is a new run whose state starts empty and is discarded at END", "add_messages overwrites the list on every turn", "The model's context window is too small", "HumanMessage strips names for privacy"], answer: "Each invoke is a new run whose state starts empty and is discarded at END" },
      { label: "Fix", options: ["Compile with a checkpointer and pass a thread_id in config", "Switch the reducer to operator.add", "Use a larger model", "Return the full history from chat_node"], answer: "Compile with a checkpointer and pass a thread_id in config" },
    ],
    explanation:
      "Reducers merge updates within one execution; nothing carries over between executions. A checkpointer saves the state per thread and loads it at the start of the next invoke. operator.add would behave exactly the same here.",
    lessonAnchor: "why-it-forgets",
  },
  {
    id: "lg-chat-reducer-choice",
    lectures: [9],
    tags: ["reducers", "messages"],
    type: "mcq",
    prompt:
      "A teammate declares messages: list[AnyMessage] with no reducer. After one turn the state holds only the AI reply, and the user's question is gone. Which annotation should they use?",
    options: [
      "Annotated[list[AnyMessage], add_messages]",
      "Annotated[AnyMessage, add_messages]",
      "list[Annotated[AnyMessage, operator.add]]",
      "Annotated[list[str], max]",
    ],
    answer: "Annotated[list[AnyMessage], add_messages]",
    explanation:
      "Without a reducer the node's return value replaces the key. add_messages appends new messages, and it also handles ids, dict inputs and deletions. The reducer annotates the list key itself, not the items.",
    lessonAnchor: "why-the-messages-key-needs-a-reducer",
  },
  {
    id: "lg-chat-node-return",
    lectures: [9],
    tags: ["nodes", "messages"],
    type: "scenario",
    prompt:
      "Your chat node is:\n\ndef chat_node(state):\n    response = llm.invoke(state[\"messages\"])\n    return {\"messages\": state[\"messages\"] + [response]}\n\nWith add_messages, the conversation still looks right, but you want the idiomatic version.",
    fields: [
      { label: "The node should return", options: ["{\"messages\": [response]}", "{\"messages\": response.content}", "{\"messages\": state[\"messages\"]}", "response"], answer: "{\"messages\": [response]}" },
      { label: "Why the original doesn't duplicate", options: ["Existing messages keep their ids, so add_messages replaces them in place", "add_messages removes duplicates by content", "LangGraph ignores lists longer than one", "It does duplicate; the history doubles each turn"], answer: "Existing messages keep their ids, so add_messages replaces them in place" },
    ],
    explanation:
      "Nodes should return only what's new and let the reducer merge. The old messages already carry ids from add_messages, so resending them just replaces each one with itself. Messages without ids would be appended as duplicates.",
    lessonAnchor: "the-chat-node",
  },
  {
    id: "lg-chat-thread-config",
    lectures: [9],
    tags: ["persistence", "threads"],
    type: "mcq",
    prompt: "You compiled with checkpointer=InMemorySaver(). Which invoke call correctly continues Arjun's conversation?",
    options: [
      "chatbot.invoke({\"messages\": [msg]}, config={\"configurable\": {\"thread_id\": \"arjun-1\"}})",
      "chatbot.invoke({\"messages\": [msg]}, config={\"thread_id\": \"arjun-1\"})",
      "chatbot.invoke({\"messages\": [msg], \"thread_id\": \"arjun-1\"})",
      "chatbot.invoke({\"messages\": [msg]}, thread=\"arjun-1\")",
    ],
    answer: "chatbot.invoke({\"messages\": [msg]}, config={\"configurable\": {\"thread_id\": \"arjun-1\"}})",
    explanation:
      "thread_id lives inside the configurable dict of the config argument. In the input dict it's treated as state data, and a top-level config key isn't where the checkpointer looks, so both fail with an error that a thread_id is required.",
    lessonAnchor: "threads",
  },
  {
    id: "lg-chat-restart",
    lectures: [9],
    tags: ["persistence", "checkpointers"],
    type: "scenario",
    prompt:
      "Your bot remembers names within a session using InMemorySaver. After you redeploy the server, every user's history is gone. Users want to come back days later and continue.",
    fields: [
      { label: "Cause", options: ["InMemorySaver keeps checkpoints in process RAM", "thread_ids expire after an hour", "add_messages clears state on startup", "The model forgets between deployments"], answer: "InMemorySaver keeps checkpoints in process RAM" },
      { label: "Fix", options: ["Use a database-backed checkpointer such as SqliteSaver or PostgresSaver", "Generate a new thread_id for each message", "Store the history in a global Python list", "Increase the recursion limit"], answer: "Use a database-backed checkpointer such as SqliteSaver or PostgresSaver" },
    ],
    explanation:
      "The in-memory checkpointer dies with the process. A database checkpointer writes each checkpoint to disk or a server, so threads survive restarts. A global list has the same RAM problem.",
    lessonAnchor: "ram-vs-a-database",
  },
  {
    id: "lg-chat-system-prompt",
    lectures: [9],
    tags: ["messages", "prompting"],
    type: "mcq",
    prompt:
      "You want every reply in at most three sentences, and you may tweak that instruction next week without touching saved conversations. Where should the SystemMessage go?",
    options: [
      "Prepend it inside chat_node: llm.invoke([SYSTEM, *state[\"messages\"]])",
      "Put it in the first invoke's input so it's saved in the thread",
      "Append it after the user's message on every turn",
      "Store it as a separate state key with operator.add",
    ],
    answer: "Prepend it inside chat_node: llm.invoke([SYSTEM, *state[\"messages\"]])",
    explanation:
      "Adding it at call time applies it to every turn and keeps it out of the saved history, so changing it in code affects all threads immediately. A saved system message would freeze the old instruction into each thread.",
    lessonAnchor: "adding-a-system-prompt",
  },
  {
    id: "lg-chat-turn-order",
    lectures: [9],
    tags: ["persistence", "execution"],
    type: "order",
    prompt: "With a checkpointer, put turn 2 of a conversation (\"What's my name?\") in order.",
    steps: [
      "invoke is called with the new HumanMessage and the thread's config",
      "LangGraph loads the latest checkpoint for that thread_id",
      "add_messages merges the new HumanMessage into the loaded history",
      "chat_node sends the full history to the model",
      "The AI reply is appended and the new state is checkpointed",
    ],
    explanation:
      "The checkpointer restores the thread's saved state before your input is applied, so the model sees the whole conversation. After the node runs, the updated state is saved under the same thread.",
    lessonAnchor: "what-happens-behind-the-scenes",
  },
  {
    id: "lg-chat-get-state",
    lectures: [9],
    tags: ["persistence", "debugging"],
    type: "mcq",
    prompt:
      "Support asks what a user discussed in thread \"u42-chat\". How do you read the saved conversation?",
    options: [
      "chatbot.get_state({\"configurable\": {\"thread_id\": \"u42-chat\"}}).values[\"messages\"]",
      "chatbot.invoke(None)[\"messages\"]",
      "checkpointer.messages[\"u42-chat\"]",
      "chatbot.get_graph().messages",
    ],
    answer: "chatbot.get_state({\"configurable\": {\"thread_id\": \"u42-chat\"}}).values[\"messages\"]",
    explanation:
      "get_state takes the thread's config and returns a snapshot whose values hold the saved state. invoke would run the graph, and get_graph describes structure, not data.",
    lessonAnchor: "inspecting-a-thread",
  },
];
