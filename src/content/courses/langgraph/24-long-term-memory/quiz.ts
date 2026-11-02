import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "lg-ltm-store-vs-checkpointer",
    lectures: [24],
    tags: ["store", "checkpointer"],
    type: "scenario",
    prompt:
      "Your assistant should (a) keep each chat coherent and (b) remember that a user prefers metric units in every future chat. Which LangGraph feature handles each?",
    fields: [
      { label: "(a) Coherent single chat", options: ["Checkpointer with a thread_id", "Store with a user namespace", "A larger context window", "trim_messages"], answer: "Checkpointer with a thread_id" },
      { label: "(b) Preference across all chats", options: ["Checkpointer with a thread_id", "Store with a user namespace", "A summary key in state", "RemoveMessage"], answer: "Store with a user namespace" },
    ],
    explanation:
      "Checkpointers are thread-scoped short-term memory; a new thread starts empty. Facts that should follow the user across threads go in a store, organised by namespaces derived from the user ID.",
    lessonAnchor: "stores-in-langgraph",
  },
  {
    id: "lg-ltm-namespace-design",
    lectures: [24],
    tags: ["store", "namespaces"],
    type: "mcq",
    prompt:
      "A multi-tenant SaaS assistant stores memories with namespace = (\"memories\",) and key = user_id + \"-\" + uuid. Support finds that store.search((\"memories\",)) for one user returns other users' facts. What's the best fix?",
    options: [
      "Put the user in the namespace, e.g. (\"users\", user_id, \"memories\"), and always search that full namespace",
      "Filter results by checking whether the key starts with the user ID",
      "Use a separate InMemoryStore per user",
      "Lower the search limit to 1",
    ],
    answer: "Put the user in the namespace, e.g. (\"users\", user_id, \"memories\"), and always search that full namespace",
    explanation:
      "Namespaces are the unit of organisation and isolation. Encoding the user in the key means every search on the shared prefix sees everyone's data; a per-user namespace scopes reads correctly.",
    lessonAnchor: "namespaces",
  },
  {
    id: "lg-ltm-get-vs-search",
    lectures: [24],
    tags: ["store", "retrieval"],
    type: "scenario",
    prompt: "Choose the store call for each need.",
    fields: [
      { label: "Load the user's profile, always saved under key \"profile\"", options: ["store.get(ns, \"profile\")", "store.search(ns)", "store.search(ns, query=..., limit=5)", "store.put(ns, \"profile\", {})"], answer: "store.get(ns, \"profile\")" },
      { label: "Show a settings page listing all of a user's 6 memories", options: ["store.get(ns, \"profile\")", "store.search(ns)", "store.search(ns, query=..., limit=5)", "store.delete(ns, \"*\")"], answer: "store.search(ns)" },
      { label: "Find the memories most relevant to the user's latest question", options: ["store.get(ns, \"profile\")", "store.search(ns)", "store.search(ns, query=..., limit=5)", "store.list_namespaces()"], answer: "store.search(ns, query=..., limit=5)" },
    ],
    explanation:
      "get needs an exact key and returns one item. search without a query lists a namespace. search with a query and an embedding index ranks memories by meaning, which is what retrieval for a prompt needs.",
    lessonAnchor: "semantic-search",
  },
  {
    id: "lg-ltm-default-limit",
    lectures: [24],
    tags: ["store", "bugs"],
    type: "mcq",
    prompt:
      "Your chat node loads memories with items = runtime.store.search(namespace). Users with long histories complain the bot ignores some things they told it, but only once they have more than about ten memories. Why?",
    options: [
      "search returns at most 10 items by default; pass a larger limit or use a query to pick the relevant ones",
      "InMemoryStore evicts old items after 10 writes",
      "Namespaces can only hold 10 keys",
      "The checkpointer trims memories to fit the context window",
    ],
    answer: "search returns at most 10 items by default; pass a larger limit or use a query to pick the relevant ones",
    explanation:
      "BaseStore.search has limit=10 by default. Nothing is deleted; the extra memories simply aren't returned unless you raise the limit, page with offset, or search semantically for what's relevant.",
    lessonAnchor: "listing-memories-with-search",
  },
  {
    id: "lg-ltm-update-memory",
    lectures: [24],
    tags: ["store"],
    type: "mcq",
    prompt:
      "A user's city is stored as store.put(ns, \"city\", {\"data\": \"Lives in Pune\"}). They tell you they've moved to Bengaluru. What's the simplest correct update?",
    options: [
      "store.put(ns, \"city\", {\"data\": \"Lives in Bengaluru\"})",
      "store.put(ns, str(uuid4()), {\"data\": \"Lives in Bengaluru\"})",
      "store.update(ns, \"city\", \"Lives in Bengaluru\")",
      "Delete the namespace and recreate it",
    ],
    answer: "store.put(ns, \"city\", {\"data\": \"Lives in Bengaluru\"})",
    explanation:
      "put with an existing key overwrites it; there is no separate update method. Writing under a new UUID would leave both cities stored, a contradiction the model would have to resolve.",
    lessonAnchor: "updating-and-deleting",
  },
  {
    id: "lg-ltm-semantic-setup",
    lectures: [24],
    tags: ["store", "embeddings"],
    type: "scenario",
    prompt:
      "You call store.search(ns, query=\"what is the user studying?\", limit=3) on a plain InMemoryStore() and get results in insertion order, not by relevance.",
    fields: [
      { label: "What's missing", options: ["An index with an embedding model on the store", "A checkpointer", "A filter argument", "A thread_id"], answer: "An index with an embedding model on the store" },
      { label: "Fix", options: ["InMemoryStore(index={\"embed\": embeddings, \"dims\": 1536})", "InMemoryStore(semantic=True)", "store.search(ns, query=..., semantic=True)", "Sort the results by key"], answer: "InMemoryStore(index={\"embed\": embeddings, \"dims\": 1536})" },
    ],
    explanation:
      "Semantic search needs an embedding model so memories are embedded on put and queries are embedded on search. Without an index, a query can't rank anything by meaning.",
    lessonAnchor: "enabling-an-index",
  },
  {
    id: "lg-ltm-runtime-context",
    lectures: [24],
    tags: ["runtime", "store"],
    type: "scenario",
    prompt:
      "You're writing a node that reads the current user's memories in LangGraph 1.x.",
    fields: [
      { label: "Node signature", options: ["def chat(state: MessagesState, runtime: Runtime[Context])", "def chat(state: MessagesState, store=InMemoryStore())", "def chat(state: MessagesState, user_id: str)", "def chat(runtime)"], answer: "def chat(state: MessagesState, runtime: Runtime[Context])" },
      { label: "Where the user ID comes from", options: ["runtime.context.user_id, passed as graph.invoke(..., context=Context(user_id=...))", "state[\"messages\"][-1].content", "The thread_id", "The model's reply"], answer: "runtime.context.user_id, passed as graph.invoke(..., context=Context(user_id=...))" },
      { label: "How the store reaches the node", options: ["builder.compile(store=store), then runtime.store", "A global variable", "state[\"store\"]", "config[\"store\"]"], answer: "builder.compile(store=store), then runtime.store" },
    ],
    explanation:
      "Declare context_schema=Context on the StateGraph, pass context= when invoking, and compile with store=. LangGraph then provides runtime.context and runtime.store to any node that accepts a runtime argument.",
    lessonAnchor: "passing-the-user-id",
  },
  {
    id: "lg-ltm-inject-memories",
    lectures: [24],
    tags: ["injection", "prompting"],
    type: "mcq",
    prompt:
      "Your chat node appends a SystemMessage with the user's memories to state[\"messages\"] and returns it with the reply. After a few turns, threads contain many stale copies of the memory block. What should it do instead?",
    options: [
      "Build the SystemMessage per call and pass [system] + state[\"messages\"] to the model, returning only the reply",
      "Store memories in the thread and skip the store",
      "Delete the system messages with RemoveMessage at the end of each turn",
      "Put the memories in the thread_id",
    ],
    answer: "Build the SystemMessage per call and pass [system] + state[\"messages\"] to the model, returning only the reply",
    explanation:
      "Injection is per call: the memory block is built fresh from the store and prepended only for the model invocation. Returning it would make add_messages append another copy to the thread every turn.",
    lessonAnchor: "the-chat-node",
  },
  {
    id: "lg-ltm-duplicates",
    lectures: [24],
    tags: ["extraction", "dedup"],
    type: "scenario",
    prompt:
      "Your remember node calls the extractor with only the latest user message and writes each extracted fact under a new uuid4 key. After a month, one user has \"Prefers Python\" stored 14 times in different wordings.",
    fields: [
      { label: "Cause", options: ["The extractor can't see what's already stored, and new keys never overwrite", "uuid4 generates duplicate keys", "InMemoryStore doesn't support deletes", "The chat node writes memories too"], answer: "The extractor can't see what's already stored, and new keys never overwrite" },
      { label: "Fix", options: ["Pass existing memories to the extractor and write only items marked is_new", "Use the message text as the key", "Lower the temperature to 0", "Run the remember node after chat"], answer: "Pass existing memories to the extractor and write only items marked is_new" },
    ],
    explanation:
      "Deduplication needs context: give the extractor the stored facts and a structured is_new flag per item. Using the raw text as a key fails on rephrasings, and temperature doesn't add the missing information.",
    lessonAnchor: "deduplicating-with-existing-memories",
  },
  {
    id: "lg-ltm-extract-policy",
    lectures: [24],
    tags: ["extraction"],
    type: "mcq",
    prompt:
      "Which message should a good extraction prompt turn into a long-term memory?",
    options: [
      "\"I'm a nurse and I work night shifts, so keep explanations short.\"",
      "\"Can you fix the grammar in this paragraph?\"",
      "\"I'm tired today.\"",
      "\"Thanks, that worked!\"",
    ],
    answer: "\"I'm a nurse and I work night shifts, so keep explanations short.\"",
    explanation:
      "It holds stable, user-specific facts and a lasting preference. The others are one-off requests, transient states or small talk, which would only add noise to the store.",
    lessonAnchor: "the-remember-node",
  },
  {
    id: "lg-ltm-full-graph-order",
    lectures: [24],
    tags: ["graph", "store"],
    type: "order",
    prompt:
      "Order what happens in a remember → chat graph when a user in a brand-new thread says \"I'm Asha, explain decorators.\"",
    steps: [
      "The checkpointer loads the thread (empty) and adds the new user message",
      "remember reads existing memories and asks the extractor for new facts",
      "remember writes \"User's name is Asha\" to the user's namespace",
      "chat searches the namespace and builds a system prompt with the memories",
      "The model replies, addressing Asha by name, and the reply is checkpointed",
    ],
    explanation:
      "Running remember before chat means a fact stated in this very message is already in the store when the reply is written. The checkpointer handles the thread; the store handles the cross-thread facts.",
    lessonAnchor: "a-complete-memory-chatbot",
  },
  {
    id: "lg-ltm-postgres-store",
    lectures: [24],
    tags: ["persistence", "postgres"],
    type: "scenario",
    prompt:
      "Your memory chatbot works, but every restart wipes everything users taught it. You want durable memories with semantic search in Postgres.",
    fields: [
      { label: "Store class", options: ["PostgresStore", "PostgresSaver", "InMemoryStore", "SqliteSaver"], answer: "PostgresStore" },
      { label: "Database requirement for semantic search", options: ["The pgvector extension", "A Redis sidecar", "A separate table per user", "Nothing extra"], answer: "The pgvector extension" },
      { label: "Code changes in your nodes", options: ["None; only what you pass to compile(store=...) changes", "Rewrite every store.search call in SQL", "Replace runtime.store with a database cursor", "Add a thread_id to every put"], answer: "None; only what you pass to compile(store=...) changes" },
    ],
    explanation:
      "PostgresStore implements the same BaseStore interface, so nodes don't change. Open it with from_conn_string, call setup() once, and use a pgvector-enabled Postgres when you configure an embedding index. PostgresSaver is the checkpointer, not the store.",
    lessonAnchor: "persisting-the-store-in-postgres",
  },
];
