import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "lg-ui-history-vanishes",
    lectures: [11],
    tags: ["streamlit", "session-state"],
    type: "scenario",
    prompt:
      "Your Streamlit chat page starts with message_history = [], loops over it to draw bubbles, and appends each new turn. After every Enter, only the latest exchange is visible.",
    fields: [
      { label: "Cause", options: ["Streamlit reruns the whole script, so message_history = [] resets the list each time", "st.chat_message only shows one bubble at a time", "The LangGraph checkpointer cleared the messages", "chat_input returns None after the first message"], answer: "Streamlit reruns the whole script, so message_history = [] resets the list each time" },
      { label: "Fix", options: ["Initialise st.session_state[\"message_history\"] only if the key is missing, and use that", "Move message_history = [] below the loop", "Make message_history a global variable", "Call st.rerun() after appending"], answer: "Initialise st.session_state[\"message_history\"] only if the key is missing, and use that" },
    ],
    explanation:
      "Every interaction re-executes the file top to bottom, so ordinary variables are recreated. st.session_state persists across reruns within a browser session; the 'if key not in' guard ensures it's created only once.",
    lessonAnchor: "version-2-keeps-a-plain-list",
  },
  {
    id: "lg-ui-missing-thread-id",
    lectures: [11],
    tags: ["streamlit", "persistence"],
    type: "mcq",
    prompt:
      "You wire Streamlit to your backend with chatbot.invoke({\"messages\": [HumanMessage(content=user_input)]}). The backend was compiled with checkpointer=InMemorySaver(). The first message fails with an error. What's missing?",
    options: [
      "A config with {\"configurable\": {\"thread_id\": ...}}",
      "st.session_state must be passed to invoke",
      "The messages must be dicts with role and content",
      "The graph must be compiled inside the Streamlit file",
    ],
    answer: "A config with {\"configurable\": {\"thread_id\": ...}}",
    explanation:
      "A graph with a checkpointer needs a thread id to know where to save and load state. The UI's dict format is only for drawing; the graph still takes message objects.",
    lessonAnchor: "connecting-the-langgraph-backend",
  },
  {
    id: "lg-ui-shared-thread",
    lectures: [11],
    tags: ["streamlit", "threads"],
    type: "scenario",
    prompt:
      "Two colleagues use your Streamlit chatbot at the same time. Priya's bot greets her as \"Rohan\". The frontend uses CONFIG = {\"configurable\": {\"thread_id\": \"thread-1\"}}, and the graph with its InMemorySaver lives in chat_backend.py.",
    fields: [
      { label: "Why they collide", options: ["The module-level graph is shared by all sessions and both use thread-1", "st.session_state is shared between browsers", "InMemorySaver merges all threads", "Streamlit runs one script for all users"], answer: "The module-level graph is shared by all sessions and both use thread-1" },
      { label: "Fix", options: ["Store a uuid4 thread_id in st.session_state and build CONFIG from it", "Create a new InMemorySaver on every rerun", "Clear session_state after each message", "Use st.cache_data on the chatbot"], answer: "Store a uuid4 thread_id in st.session_state and build CONFIG from it" },
    ],
    explanation:
      "Imported modules load once per server process, so every session talks to the same checkpointer. Session state is per browser session, so a per-session thread id separates conversations. A new saver per rerun would erase memory entirely.",
    lessonAnchor: "the-shared-thread-problem",
  },
  {
    id: "lg-ui-refresh-mismatch",
    lectures: [11],
    tags: ["streamlit", "session-state", "persistence"],
    type: "mcq",
    prompt:
      "After refreshing the browser, the chat page is empty, yet the bot still answers \"Your name is Kabir.\" The thread id is hard-coded. Why?",
    options: [
      "Refreshing clears st.session_state, but the server-side InMemorySaver still holds the thread",
      "Streamlit caches model responses",
      "The browser restored the old messages from local storage",
      "add_messages recovered the deleted messages",
    ],
    answer: "Refreshing clears st.session_state, but the server-side InMemorySaver still holds the thread",
    explanation:
      "The page history and the graph's memory are two different stores with different lifetimes. Rendering from chatbot.get_state(config), or using a per-session thread id, keeps them consistent.",
    lessonAnchor: "two-kinds-of-memory",
  },
  {
    id: "lg-ui-render-order",
    lectures: [11],
    tags: ["streamlit"],
    type: "order",
    prompt: "Put one run of the Streamlit chat script in order, for the run right after the user presses Enter.",
    steps: [
      "Create st.session_state[\"message_history\"] if it doesn't exist",
      "Draw every message already in the history",
      "Read the submitted text from st.chat_input",
      "Append the user message to the history and draw it",
      "Invoke the graph with the HumanMessage and thread config",
      "Append the assistant reply to the history and draw it",
    ],
    explanation:
      "The history is redrawn first because the page is rebuilt from scratch on each run. The new turn is drawn directly as well as stored, because the history loop already ran before chat_input returned the text.",
    lessonAnchor: "version-3-uses-session-state",
  },
  {
    id: "lg-ui-markdown-vs-text",
    lectures: [11],
    tags: ["streamlit"],
    type: "mcq",
    prompt:
      "The bot's answers contain numbered lists and code blocks, but they render as raw asterisks and backticks in a fixed-width font. Inside st.chat_message you call st.text(reply). What should you use?",
    options: ["st.markdown(reply)", "st.code(reply)", "st.write_stream(reply)", "st.caption(reply)"],
    answer: "st.markdown(reply)",
    explanation:
      "Models reply in Markdown, and st.markdown renders it. st.text shows plain fixed-width text, and st.code would show the whole reply as a code block.",
    lessonAnchor: "message-containers",
  },
  {
    id: "lg-ui-separation",
    lectures: [11],
    tags: ["architecture"],
    type: "scenario",
    prompt:
      "Next month you'll add tools and a SQLite checkpointer, and later you may replace Streamlit with a React app. Where should each piece live?",
    fields: [
      { label: "Graph, nodes and checkpointer", options: ["chat_backend.py", "chat_frontend.py", "st.session_state", "A Streamlit callback"], answer: "chat_backend.py" },
      { label: "Drawing bubbles and reading input", options: ["chat_frontend.py", "chat_backend.py", "Inside chat_node", "The checkpointer"], answer: "chat_frontend.py" },
    ],
    explanation:
      "Keeping LangGraph logic in a backend module lets you grow the graph or swap the UI independently. The frontend only imports the compiled chatbot and calls it.",
    lessonAnchor: "split-the-app-into-backend-and-frontend",
  },
  {
    id: "lg-ui-new-chat-button",
    lectures: [11],
    tags: ["streamlit", "threads"],
    type: "scenario",
    prompt:
      "You add a sidebar \"New chat\" button. After clicking it, the page is empty, but the bot still remembers everything from the previous chat.",
    fields: [
      { label: "What the handler forgot", options: ["Replacing st.session_state[\"thread_id\"] with a new uuid4", "Clearing the InMemorySaver", "Calling st.cache_resource.clear()", "Recompiling the graph"], answer: "Replacing st.session_state[\"thread_id\"] with a new uuid4" },
      { label: "Then, to redraw immediately", options: ["st.rerun()", "st.stop()", "st.spinner()", "st.experimental_memo()"], answer: "st.rerun()" },
    ],
    explanation:
      "Clearing the visible history doesn't touch the graph's memory, which is keyed by thread id. A new thread id starts a fresh conversation while keeping the old one in the checkpointer. st.rerun() redraws the page with the new state right away.",
    lessonAnchor: "a-new-chat-button",
  },
];
