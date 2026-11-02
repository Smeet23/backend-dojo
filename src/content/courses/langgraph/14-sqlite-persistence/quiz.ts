import type { Question } from "@/lib/types";

const SAVERS = ["InMemorySaver", "SqliteSaver", "PostgresSaver"];

export const quiz: Question[] = [
  {
    id: "lg-sqlite-pick-saver",
    lectures: [14],
    tags: ["checkpointer", "persistence"],
    type: "scenario",
    prompt:
      "Pick a checkpointer for each situation:\n• A: unit tests for a graph's routing logic, run hundreds of times in CI.\n• B: a personal research assistant running on your laptop that should remember chats across restarts.\n• C: a customer-support bot behind a load balancer with four app servers.",
    fields: [
      { label: "A (tests)", options: SAVERS, answer: "InMemorySaver" },
      { label: "B (laptop app)", options: SAVERS, answer: "SqliteSaver" },
      { label: "C (four servers)", options: SAVERS, answer: "PostgresSaver" },
    ],
    explanation:
      "Tests want speed and no leftover files, so memory is ideal. A single-machine app needs durability without a server, which a SQLite file gives. Four servers need one shared database that handles concurrent writers, which SQLite on one disk can't provide.",
    lessonAnchor: "checkpointer-options",
  },
  {
    id: "lg-sqlite-same-thread-error",
    lectures: [14],
    tags: ["sqlite", "streamlit"],
    type: "scenario",
    prompt:
      "You swap in SqliteSaver(sqlite3.connect(\"chatbot.db\")). The test script works, but in Streamlit the first message raises sqlite3.ProgrammingError: SQLite objects created in a thread can only be used in that same thread.",
    fields: [
      {
        label: "Cause",
        options: [
          "The connection was created on one thread and used from Streamlit's worker threads",
          "The database file is locked by the test script",
          "SqliteSaver needs setup() called first",
          "The thread_id is not a valid SQLite key",
        ],
        answer: "The connection was created on one thread and used from Streamlit's worker threads",
      },
      {
        label: "Fix",
        options: [
          "sqlite3.connect(\"chatbot.db\", check_same_thread=False)",
          "Open a new SqliteSaver inside every node",
          "Switch to AsyncSqliteSaver without other changes",
          "Delete chatbot.db before starting the app",
        ],
        answer: "sqlite3.connect(\"chatbot.db\", check_same_thread=False)",
      },
    ],
    explanation:
      "sqlite3 forbids using a connection on a different thread by default. The backend module is imported once and its connection is shared, so you disable the check; SqliteSaver locks its own access. A saver per node would lose the shared checkpoint chain and waste connections.",
    lessonAnchor: "why-the-same-thread-check-is-off",
  },
  {
    id: "lg-sqlite-row-count",
    lectures: [14],
    tags: ["checkpointer", "sqlite"],
    type: "mcq",
    prompt:
      "Your graph is START → chat_node → END with SqliteSaver. You send 3 messages on thread-a and 2 on thread-b, then count rows in the checkpoints table. How many are there?",
    options: ["15", "5", "10", "2"],
    answer: "15",
    explanation:
      "Each invoke writes three checkpoints (input, after applying the input, after chat_node), so 5 invokes give 15 rows. 2 is the number of distinct thread ids, which is what the sidebar needs.",
    lessonAnchor: "why-three-checkpoints-per-message",
  },
  {
    id: "lg-sqlite-sidebar-empty-after-restart",
    lectures: [14],
    tags: ["persistence", "streamlit"],
    type: "mcq",
    prompt:
      "After switching to SqliteSaver, clicking an old thread id that you pasted manually loads its history fine. But after a restart the sidebar is empty. What's the missing piece?",
    options: [
      "Initialise chat_threads from the database (retrieve_all_threads) instead of []",
      "Call checkpointer.setup() on every rerun",
      "Store message_history in the database as well",
      "Use a fixed thread_id so the sidebar always has one entry",
    ],
    answer: "Initialise chat_threads from the database (retrieve_all_threads) instead of []",
    explanation:
      "The checkpoints survived, but the front end still starts with an empty thread list. Rebuilding it from checkpointer.list at startup fixes it. message_history is derived from get_state, so storing it separately would just duplicate data.",
    lessonAnchor: "wiring-the-front-end",
  },
  {
    id: "lg-sqlite-dedupe-order",
    lectures: [14],
    tags: ["checkpointer", "threads"],
    type: "scenario",
    prompt:
      "retrieve_all_threads() collects cp.config[\"configurable\"][\"thread_id\"] for cp in checkpointer.list(None). Users complain that the same chat appears many times in the sidebar, and after a first fix the order of chats looks random.",
    fields: [
      {
        label: "Why duplicates appear",
        options: [
          "list yields one entry per checkpoint, and each thread has many",
          "list yields one entry per message",
          "Each restart copies the threads",
          "add_messages duplicates thread ids",
        ],
        answer: "list yields one entry per checkpoint, and each thread has many",
      },
      {
        label: "Best way to deduplicate",
        options: [
          "dict.fromkeys(...), which keeps first-seen (newest) order",
          "set(...), then use it directly",
          "sorted(set(...)) by thread id",
          "Keep only the first checkpoint returned",
        ],
        answer: "dict.fromkeys(...), which keeps first-seen (newest) order",
      },
    ],
    explanation:
      "Every checkpoint carries its thread id, so ids repeat. A set removes duplicates but loses order; sorting UUIDs gives a meaningless order. Since the SQLite saver lists newest first, dict.fromkeys preserves recency.",
    lessonAnchor: "listing-every-thread",
  },
  {
    id: "lg-sqlite-multi-user-leak",
    lectures: [14],
    tags: ["persistence", "security"],
    type: "mcq",
    prompt:
      "You deploy the SQLite chatbot for your team of 20. On day one, someone sees a colleague's salary-negotiation chat in their sidebar. What is the right fix?",
    options: [
      "Store a user_id per thread and list and load only the logged-in user's threads",
      "Use longer, random thread ids",
      "Switch from SQLite to Postgres",
      "Clear the sidebar on every refresh",
    ],
    answer: "Store a user_id per thread and list and load only the logged-in user's threads",
    explanation:
      "retrieve_all_threads returns everyone's threads; nothing ties a thread to a person. Random ids don't help when you list them all, and Postgres changes storage, not ownership.",
    lessonAnchor: "what-persistence-does-not-solve",
  },
  {
    id: "lg-sqlite-delete-chat",
    lectures: [14],
    tags: ["checkpointer"],
    type: "mcq",
    prompt: "You add a \"Delete chat\" button. What should its handler call so the conversation's history is really gone from chatbot.db?",
    options: [
      "checkpointer.delete_thread(thread_id)",
      "Remove the id from st.session_state[\"chat_threads\"]",
      "chatbot.invoke with an empty messages list",
      "chatbot.get_state(config).values.clear()",
    ],
    answer: "checkpointer.delete_thread(thread_id)",
    explanation:
      "delete_thread removes the thread's checkpoints and writes. Removing it from session state only hides it until the next restart rebuilds the list, and an empty invoke just adds more checkpoints, because add_messages appends.",
    lessonAnchor: "what-persistence-does-not-solve",
  },
  {
    id: "lg-sqlite-script-vs-server",
    lectures: [14],
    tags: ["sqlite"],
    type: "scenario",
    prompt:
      "Two pieces of code need a SQLite checkpointer:\n• A nightly batch script that replays 50 saved conversations, then exits.\n• The Streamlit chat server that runs for weeks.",
    fields: [
      {
        label: "Batch script",
        options: [
          "with SqliteSaver.from_conn_string(\"chatbot.db\") as checkpointer:",
          "SqliteSaver(sqlite3.connect(\"chatbot.db\", check_same_thread=False)) at import time",
          "InMemorySaver()",
        ],
        answer: "with SqliteSaver.from_conn_string(\"chatbot.db\") as checkpointer:",
      },
      {
        label: "Streamlit server",
        options: [
          "with SqliteSaver.from_conn_string(\"chatbot.db\") as checkpointer:",
          "SqliteSaver(sqlite3.connect(\"chatbot.db\", check_same_thread=False)) at import time",
          "InMemorySaver()",
        ],
        answer: "SqliteSaver(sqlite3.connect(\"chatbot.db\", check_same_thread=False)) at import time",
      },
    ],
    explanation:
      "The context manager opens and closes the connection around a bounded piece of work, which suits a script. A long-lived server wants one connection for the life of the process, shared across worker threads.",
    lessonAnchor: "using-a-context-manager-instead",
  },
];
