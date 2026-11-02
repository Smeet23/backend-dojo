import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "lg-resume-wrong-thread-name",
    lectures: [13],
    tags: ["threads", "streamlit"],
    type: "scenario",
    prompt:
      "In your multi-chat app, Asha's chat and Rahul's chat both work. A tester opens Asha's chat from the sidebar, sees her full history on screen, asks \"What's my name?\" and the bot answers \"Rahul\". The sidebar click handler only does: st.session_state[\"message_history\"] = to_ui_messages(load_conversation(thread_id)).",
    fields: [
      {
        label: "What's going wrong",
        options: [
          "The message went to the previously active thread",
          "get_state returned the wrong thread's messages",
          "The add_messages reducer merged both threads",
          "Streamlit cached the old model reply",
        ],
        answer: "The message went to the previously active thread",
      },
      {
        label: "Fix",
        options: [
          "Set st.session_state[\"thread_id\"] = thread_id in the click handler",
          "Call reset_chat() before loading the conversation",
          "Clear the checkpointer before switching",
          "Pass the whole message_history in every invoke",
        ],
        answer: "Set st.session_state[\"thread_id\"] = thread_id in the click handler",
      },
    ],
    explanation:
      "The screen was refreshed, but the config still used the old thread id, so the question was appended to Rahul's thread. Switching must update the current thread id; resending history manually would duplicate messages that the checkpointer already has.",
    lessonAnchor: "wiring-the-click",
  },
  {
    id: "lg-resume-new-thread-every-rerun",
    lectures: [13],
    tags: ["streamlit", "session-state"],
    type: "mcq",
    prompt:
      "A teammate writes st.session_state[\"thread_id\"] = generate_thread_id() at the top of app.py, with no guard. What does the user experience?",
    options: [
      "The bot forgets everything after every reply, because each rerun starts a new thread",
      "Only the first message is remembered",
      "It works, since session_state persists across reruns",
      "Streamlit raises an error for reassigning a session key",
    ],
    answer: "The bot forgets everything after every reply, because each rerun starts a new thread",
    explanation:
      "Streamlit re-runs the script on every interaction, so the unguarded line mints a fresh id each time. Session state does persist, but this line overwrites it on every run; wrap it in if \"thread_id\" not in st.session_state.",
    lessonAnchor: "step-2-generating-thread-ids",
  },
  {
    id: "lg-resume-new-chat-steps",
    lectures: [13],
    tags: ["threads", "streamlit"],
    type: "order",
    prompt: "Put the work done by reset_chat() (the New chat button) in a sensible order.",
    steps: [
      "Generate a new thread id with uuid4",
      "Store it as st.session_state[\"thread_id\"]",
      "Append it to st.session_state[\"chat_threads\"] via add_thread",
      "Reset st.session_state[\"message_history\"] to an empty list",
    ],
    explanation:
      "You need the id before you can store it or list it, and clearing the history makes the main pane blank for the new conversation. Nothing is deleted from the checkpointer; the old thread simply stops being current.",
    lessonAnchor: "step-4-remembering-every-thread",
  },
  {
    id: "lg-resume-old-chat-vanishes",
    lectures: [13],
    tags: ["threads", "session-state"],
    type: "scenario",
    prompt:
      "After adding the New chat button, users report: \"I clicked New chat and my idli conversation is gone from the sidebar.\" The sidebar shows only st.session_state[\"thread_id\"].",
    fields: [
      {
        label: "Is the idli conversation still in the checkpointer?",
        options: ["Yes, under its old thread id", "No, reset_chat deleted it", "No, InMemorySaver keeps only one thread", "Only the last message survives"],
        answer: "Yes, under its old thread id",
      },
      {
        label: "What to add",
        options: [
          "A chat_threads list in session state that every new id is appended to",
          "A second checkpointer per conversation",
          "A call to chatbot.get_state with no config",
          "A global variable holding the last thread id",
        ],
        answer: "A chat_threads list in session state that every new id is appended to",
      },
    ],
    explanation:
      "The checkpointer keeps every thread; the UI just lost the id needed to reach it. Keeping all ids in session state lets the sidebar list them. A global variable would only remember one id and would be shared across browser sessions.",
    lessonAnchor: "the-disappearing-thread-bug",
  },
  {
    id: "lg-resume-empty-thread-crash",
    lectures: [13],
    tags: ["get-state", "checkpointer"],
    type: "mcq",
    prompt:
      "Clicking a chat that was created with New chat but never used crashes with KeyError: 'messages' inside load_conversation, which does chatbot.get_state(config).values[\"messages\"]. Why, and what is the fix?",
    options: [
      "The thread has no checkpoint yet, so values is empty; use values.get(\"messages\", [])",
      "get_state needs a checkpoint_id; pass the latest one",
      "The thread id must be a UUID object, not a string",
      "values only exists after the graph is recompiled",
    ],
    answer: "The thread has no checkpoint yet, so values is empty; use values.get(\"messages\", [])",
    explanation:
      "A thread only gets checkpoints once the graph runs on it. get_state on an unused thread returns a snapshot whose values dict is empty. get_state works without a checkpoint_id and returns the latest snapshot.",
    lessonAnchor: "reading-a-threads-messages",
  },
  {
    id: "lg-resume-convert-messages",
    lectures: [13],
    tags: ["messages", "streamlit"],
    type: "scenario",
    prompt:
      "Your chatbot now uses tools. When you load an old thread, the transcript shows blank assistant bubbles and raw tool output. The converter does: role = \"user\" if isinstance(msg, HumanMessage) else \"assistant\".",
    fields: [
      {
        label: "Which messages should become assistant bubbles?",
        options: [
          "AIMessages that have text content",
          "Every non-human message",
          "Only ToolMessages",
          "Only the last message in the thread",
        ],
        answer: "AIMessages that have text content",
      },
      {
        label: "What to do with ToolMessages",
        options: ["Skip them in the UI", "Show them as user messages", "Delete them from the checkpointer", "Merge them into the next human message"],
        answer: "Skip them in the UI",
      },
    ],
    explanation:
      "The else branch treats tool results and tool-call-only AI messages as chat bubbles. Check for HumanMessage and AIMessage explicitly and skip the plumbing. Deleting tool messages from the checkpointer would break the model's own history.",
    lessonAnchor: "converting-messages-for-the-ui",
  },
  {
    id: "lg-resume-one-click-late",
    lectures: [13],
    tags: ["streamlit"],
    type: "mcq",
    prompt:
      "You moved the loop that draws message_history above the sidebar code. Now clicking a chat in the sidebar shows the previous chat, and the right one appears only after the next interaction. Why?",
    options: [
      "The main pane is drawn before the button handler updates message_history in that rerun",
      "get_state is asynchronous and returns late",
      "Streamlit buttons fire on the rerun after the click",
      "reversed() changes the order of the threads",
    ],
    answer: "The main pane is drawn before the button handler updates message_history in that rerun",
    explanation:
      "The click triggers a rerun in which st.button returns True, but by then the history was already drawn from the old value. Handle state changes first, then draw. Buttons return True on the very rerun the click triggers, not a later one.",
    lessonAnchor: "how-streamlit-reruns-shape-this-code",
  },
  {
    id: "lg-resume-backend-changes",
    lectures: [13],
    tags: ["threads", "checkpointer"],
    type: "mcq",
    prompt: "To add ChatGPT-style multiple conversations to the existing LangGraph chatbot, what has to change in the backend graph?",
    options: [
      "Nothing; the checkpointer already separates conversations by thread_id",
      "Add a thread_id field to ChatState",
      "Compile one graph per conversation",
      "Add a node that loads previous messages",
    ],
    answer: "Nothing; the checkpointer already separates conversations by thread_id",
    explanation:
      "The checkpointer files every snapshot under the thread_id from the config, so per-conversation memory comes for free. The front end only decides which thread id to send and fetches history with get_state.",
    lessonAnchor: "threads-are-the-whole-trick",
  },
  {
    id: "lg-resume-refresh-loss",
    lectures: [13],
    tags: ["persistence", "checkpointer"],
    type: "scenario",
    prompt: "After shipping, a user restarts the Streamlit server and every past conversation is gone from the sidebar and can't be loaded.",
    fields: [
      {
        label: "Why the sidebar is empty",
        options: [
          "chat_threads lived in session state, which starts empty in a new session",
          "uuid4 produced the same ids again",
          "The sidebar was reversed",
          "The add_thread helper removed duplicates",
        ],
        answer: "chat_threads lived in session state, which starts empty in a new session",
      },
      {
        label: "Why the messages can't be loaded",
        options: [
          "InMemorySaver kept checkpoints in the process's RAM",
          "get_state only works in the session that wrote the thread",
          "add_messages clears state on restart",
          "Thread ids expire after one hour",
        ],
        answer: "InMemorySaver kept checkpoints in the process's RAM",
      },
    ],
    explanation:
      "Both the thread list and the checkpoints were in memory. The fix is a database-backed checkpointer, with the thread list rebuilt from the database at startup.",
    lessonAnchor: "what-is-still-missing",
  },
];
