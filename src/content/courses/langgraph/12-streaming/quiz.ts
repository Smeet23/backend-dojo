import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "lg-stream-mode-typewriter",
    lectures: [12],
    tags: ["streaming", "stream-modes"],
    type: "scenario",
    prompt:
      "Your chatbot UI waits 8 seconds and then shows the whole answer. You switch from invoke to chatbot.stream(...) with stream_mode=\"updates\", and it still appears all at once.",
    fields: [
      { label: "Why", options: ["updates yields each node's output only when the node finishes", "stream() needs a checkpointer to stream", "The model doesn't support streaming", "updates only works with multiple nodes"], answer: "updates yields each node's output only when the node finishes" },
      { label: "Mode to use", options: ["\"messages\"", "\"values\"", "\"custom\"", "\"debug\""], answer: "\"messages\"" },
    ],
    explanation:
      "updates and values stream state, step by step; a one-node chatbot has a single step, so you get the full reply in one chunk. messages mode forwards LLM tokens as they're generated.",
    lessonAnchor: "the-stream-modes",
  },
  {
    id: "lg-stream-filter-node",
    lectures: [12],
    tags: ["streaming", "metadata"],
    type: "scenario",
    prompt:
      "Your graph has rewrite_query (an LLM rewrites the question) followed by answer (an LLM answers). In messages mode the chat bubble starts with \"dark mode release date\" before the real answer.",
    fields: [
      { label: "Fix", options: ["Only yield chunks where metadata[\"langgraph_node\"] == \"answer\"", "Switch to stream_mode=\"values\"", "Remove the rewrite step", "Use invoke for the first node"], answer: "Only yield chunks where metadata[\"langgraph_node\"] == \"answer\"" },
      { label: "Alternative", options: ["Tag the rewrite model with nostream", "Set end=\"\" in print", "Add a reducer to messages", "Increase the recursion limit"], answer: "Tag the rewrite model with nostream" },
    ],
    explanation:
      "Messages mode streams tokens from every node that calls a model; the metadata says which node each token came from. Tagging an internal model nostream keeps its tokens out of the stream while it still runs.",
    lessonAnchor: "filtering-by-node",
  },
  {
    id: "lg-stream-write-stream-save",
    lectures: [12],
    tags: ["streamlit", "streaming"],
    type: "mcq",
    prompt:
      "Streaming works in your Streamlit app, but after the user sends the next message the previous assistant reply disappears from the page. What's missing?",
    options: [
      "Storing the return value of st.write_stream in st.session_state history",
      "Calling st.write_stream outside the chat_message block",
      "Passing stream_mode=\"values\" as well",
      "Using invoke after streaming to fetch the reply again",
    ],
    answer: "Storing the return value of st.write_stream in st.session_state history",
    explanation:
      "The next interaction reruns the script and redraws only what's in session state. st.write_stream returns the full text, so append it to the history. Calling invoke again would make a second model call.",
    lessonAnchor: "streaming-in-the-streamlit-ui",
  },
  {
    id: "lg-stream-hardcoded-input",
    lectures: [12],
    tags: ["streamlit", "debugging"],
    type: "mcq",
    prompt:
      "Whatever the user types, your streaming bot answers with a pasta recipe. Your generator calls chatbot.stream({\"messages\": [HumanMessage(content=\"What is the recipe to make pasta?\")]}, ...). What's the fix?",
    options: [
      "Build the HumanMessage from the user_input returned by st.chat_input",
      "Clear the checkpointer before each message",
      "Switch to stream_mode=\"custom\"",
      "Move the generator into the backend file",
    ],
    answer: "Build the HumanMessage from the user_input returned by st.chat_input",
    explanation:
      "A test prompt left in the stream call means every turn sends the same question. The input has to come from what the user just typed.",
    lessonAnchor: "streaming-in-the-streamlit-ui",
  },
  {
    id: "lg-stream-benefits",
    lectures: [12],
    tags: ["streaming"],
    type: "mcq",
    prompt:
      "A product manager asks whether streaming will make the model finish its 600-word answers faster. What's the accurate answer?",
    options: [
      "No; total time is about the same, but time to first token drops, so it feels much faster",
      "Yes; streaming roughly halves generation time",
      "No; streaming makes responses slower and only helps voice apps",
      "Yes, but only with a checkpointer",
    ],
    answer: "No; total time is about the same, but time to first token drops, so it feels much faster",
    explanation:
      "The model does the same work either way. Streaming changes when the user starts seeing output, which is what perceived speed depends on. It also lets users stop a bad answer early and save tokens.",
    lessonAnchor: "what-streaming-is",
  },
  {
    id: "lg-stream-multi-mode",
    lectures: [12],
    tags: ["streaming", "stream-modes"],
    type: "scenario",
    prompt:
      "Your agent should show a status line (\"Searching the changelog…\") and also type out the final answer. Nodes emit status with get_stream_writer().",
    fields: [
      { label: "stream_mode", options: ["[\"custom\", \"messages\"]", "\"custom\"", "\"messages\"", "[\"values\", \"updates\"]"], answer: "[\"custom\", \"messages\"]" },
      { label: "Each item in the loop is", options: ["A (mode, chunk) pair", "A (chunk, metadata) pair", "The full state", "A plain string"], answer: "A (mode, chunk) pair" },
    ],
    explanation:
      "Custom mode carries your writer events and messages mode carries tokens. With a list of modes, each item is tagged with the mode it came from, so one loop can route status and tokens to different places.",
    lessonAnchor: "several-modes-at-once",
  },
];
