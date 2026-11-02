import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "lg-obs-enable-tracing",
    lectures: [16],
    tags: ["langsmith", "setup"],
    type: "scenario",
    prompt:
      "Your LangGraph chatbot works. You want every chat turn recorded in LangSmith under a project called support-bot, and you'd rather not touch the graph code. What do you change?",
    fields: [
      {
        label: "Where",
        options: ["The .env file the backend loads", "Each node function", "The StateGraph constructor", "The checkpointer"],
        answer: "The .env file the backend loads",
      },
      {
        label: "Switch that turns tracing on",
        options: ["LANGSMITH_TRACING=true", "LANGGRAPH_DEBUG=true", "OPENAI_LOG=trace", "LANGSMITH_PROJECT=true"],
        answer: "LANGSMITH_TRACING=true",
      },
      {
        label: "How the project gets named",
        options: ["LANGSMITH_PROJECT=support-bot", "run_name=\"support-bot\"", "thread_id=\"support-bot\"", "It's always called default"],
        answer: "LANGSMITH_PROJECT=support-bot",
      },
    ],
    explanation:
      "LangChain and LangGraph read the LANGSMITH_* environment variables at runtime, so tracing needs no code changes, just the tracing flag, an API key and optionally a project name. run_name only renames individual traces, and without a project variable traces go to 'default'.",
    lessonAnchor: "setting-up-langsmith",
  },
  {
    id: "lg-obs-trace-per-turn",
    lectures: [16],
    tags: ["langsmith", "traces"],
    type: "mcq",
    prompt:
      "A user sends three messages in one conversation. The graph has a single chat_node that calls the model once per turn. What do you see in the LangSmith project?",
    options: [
      "Three traces, each with a graph run containing chat_node and a model run",
      "One trace with three model runs, because it's one thread",
      "Three projects, one per message",
      "Nothing until the conversation ends",
    ],
    answer: "Three traces, each with a graph run containing chat_node and a model run",
    explanation:
      "Each top-level invoke or stream call is one trace, and here that's one per turn. Runs for nodes and model calls nest inside it. Grouping turns into a conversation is the Threads view's job, and it needs metadata.",
    lessonAnchor: "how-langsmith-organises-traces",
  },
  {
    id: "lg-obs-threads-missing",
    lectures: [16],
    tags: ["langsmith", "threads"],
    type: "scenario",
    prompt:
      "Your config is {\"configurable\": {\"thread_id\": tid}}. Conversations resume correctly in the app, but LangSmith's Threads tab says \"No threads found\" and the trace list mixes all conversations together.",
    fields: [
      {
        label: "Why",
        options: [
          "LangSmith groups by thread_id/session_id in metadata, which isn't set",
          "The checkpointer is in memory, not SQLite",
          "Tracing is only enabled for the first turn",
          "Threads require a separate LangSmith API key",
        ],
        answer: "LangSmith groups by thread_id/session_id in metadata, which isn't set",
      },
      {
        label: "Fix",
        options: [
          "Add \"metadata\": {\"thread_id\": tid} to the same config",
          "Move thread_id out of configurable into metadata",
          "Set LANGSMITH_PROJECT to the thread id",
          "Create a new project per conversation",
        ],
        answer: "Add \"metadata\": {\"thread_id\": tid} to the same config",
      },
    ],
    explanation:
      "configurable is for LangGraph and metadata is for tracing. Keep thread_id in configurable so the checkpointer keeps working, and add it to metadata so LangSmith can group the traces. Moving it would break persistence, and a project per conversation doesn't scale.",
    lessonAnchor: "grouping-traces-into-threads",
  },
  {
    id: "lg-obs-run-name",
    lectures: [16],
    tags: ["langsmith", "config"],
    type: "mcq",
    prompt:
      "Every trace in your project is called \"LangGraph\", which makes the list hard to scan. Each trace is one chat turn. What's the simplest way to name them \"chat_turn\"?",
    options: [
      "Pass \"run_name\": \"chat_turn\" in the config of each stream/invoke call",
      "Rename the StateGraph class",
      "Set LANGSMITH_PROJECT=chat_turn",
      "Add a node called chat_turn",
    ],
    answer: "Pass \"run_name\": \"chat_turn\" in the config of each stream/invoke call",
    explanation:
      "run_name in the config sets the name of the top-level run, which is the trace's name. Changing the project name moves traces elsewhere instead of renaming them, and adding a node only adds a child run.",
    lessonAnchor: "grouping-traces-into-threads",
  },
  {
    id: "lg-obs-token-growth",
    lectures: [16],
    tags: ["langsmith", "tokens"],
    type: "scenario",
    prompt:
      "In a long thread you notice turn 1 used 40 input tokens, turn 10 used 2,100, and turn 30 used 9,800, even though the user's messages are all short.",
    fields: [
      {
        label: "Cause",
        options: [
          "Each turn sends the whole conversation history loaded from the checkpointer",
          "LangSmith adds its own tokens to every call",
          "The model's output tokens are counted as input",
          "Streaming doubles the token count",
        ],
        answer: "Each turn sends the whole conversation history loaded from the checkpointer",
      },
      {
        label: "Where you spotted it",
        options: ["The model run's input token count in each trace", "The checkpointer's database file size", "The Streamlit session state", "The graph's Mermaid diagram"],
        answer: "The model run's input token count in each trace",
      },
    ],
    explanation:
      "The add_messages state plus a checkpointer means every turn resends all previous messages, so input tokens grow with the conversation. LangSmith shows this per model run, long before it shows up on a bill. Tracing itself adds no tokens.",
    lessonAnchor: "how-langsmith-organises-traces",
  },
  {
    id: "lg-obs-selective-project",
    lectures: [16],
    tags: ["langsmith", "config"],
    type: "mcq",
    prompt:
      "You want a batch of experimental runs in a notebook to go to a project called chatbot-experiments, without changing the .env that production uses. What fits best?",
    options: [
      "Wrap the calls in ls.tracing_context(project_name=\"chatbot-experiments\", enabled=True)",
      "Add tags=[\"chatbot-experiments\"] to the config",
      "Set run_name=\"chatbot-experiments\"",
      "Delete the project after the experiments",
    ],
    answer: "Wrap the calls in ls.tracing_context(project_name=\"chatbot-experiments\", enabled=True)",
    explanation:
      "tracing_context overrides the project (and can toggle tracing) for just that block. Tags and run_name label traces but leave them in the same project.",
    lessonAnchor: "other-useful-config-for-tracing",
  },
];
