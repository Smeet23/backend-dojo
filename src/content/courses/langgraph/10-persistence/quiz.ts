import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "lg-persist-resume-after-crash",
    lectures: [10],
    tags: ["persistence", "fault-tolerance"],
    type: "scenario",
    prompt:
      "A 6-step research pipeline compiled with a SqliteSaver crashes in step 4 when an API times out. Steps 1 to 3 made expensive LLM calls. You've fixed the API key and want to continue thread \"report-17\".",
    fields: [
      { label: "Call", options: ["graph.invoke(None, {\"configurable\": {\"thread_id\": \"report-17\"}})", "graph.invoke(original_input, {\"configurable\": {\"thread_id\": \"report-17\"}})", "graph.invoke(original_input)", "graph.get_state_history(config)"], answer: "graph.invoke(None, {\"configurable\": {\"thread_id\": \"report-17\"}})" },
      { label: "Which steps run", options: ["Step 4 onwards", "Steps 1 to 6 again", "Only step 4", "Step 5 onwards"], answer: "Step 4 onwards" },
    ],
    explanation:
      "None as input means continue from the thread's latest checkpoint, whose next is step 4. The failed node reruns from its start and the rest follow. Passing the original input would start a new run from START and repay for steps 1 to 3.",
    lessonAnchor: "fault-tolerance",
  },
  {
    id: "lg-persist-inmemory-real-crash",
    lectures: [10],
    tags: ["checkpointers", "fault-tolerance"],
    type: "mcq",
    prompt:
      "In your notebook, interrupting a long-running node and calling invoke(None, config) resumed perfectly with InMemorySaver. In production, the pod was OOM-killed mid-run and resume found nothing. Why?",
    options: [
      "InMemorySaver keeps checkpoints in process RAM, which died with the pod; the notebook process had stayed alive",
      "Resume only works in notebooks",
      "The thread_id changes when a pod restarts",
      "OOM errors delete checkpoints on purpose",
    ],
    answer: "InMemorySaver keeps checkpoints in process RAM, which died with the pod; the notebook process had stayed alive",
    explanation:
      "Interrupting a cell doesn't kill the Python process, so the in-memory dict survived. A real crash takes RAM with it, so production fault tolerance needs a database checkpointer such as SqliteSaver or PostgresSaver.",
    lessonAnchor: "what-survives-which-crash",
  },
  {
    id: "lg-persist-checkpoint-count",
    lectures: [10],
    tags: ["checkpoints", "super-steps"],
    type: "scenario",
    prompt:
      "Graph: START → plan → (search_web, search_docs, search_code in parallel) → END. You run it once with a checkpointer and list get_state_history.",
    fields: [
      { label: "Number of checkpoints", options: ["3", "4", "5", "6"], answer: "4" },
      { label: "next on the newest checkpoint", options: ["()", "('plan',)", "('search_web', 'search_docs', 'search_code')", "('__start__',)"], answer: "()" },
    ],
    explanation:
      "Checkpoints come at super-step boundaries: the raw input, input applied (next plan), after plan (next the three searches), and after the parallel super-step. The three searches share one checkpoint. The newest checkpoint has nothing left to run, so next is empty.",
    lessonAnchor: "checkpointers-and-checkpoints",
  },
  {
    id: "lg-persist-fork-wrong-config",
    lectures: [10],
    tags: ["time-travel"],
    type: "scenario",
    prompt:
      "You call graph.update_state(before_joke.config, {\"topic\": \"samosa\"}), then graph.invoke(None, before_joke.config). The new joke is still about pizza.",
    fields: [
      { label: "Mistake", options: ["You replayed the original checkpoint instead of the one update_state created", "update_state needs as_node to work at all", "The topic key needs a reducer", "Replay is cached, so the topic can't change"], answer: "You replayed the original checkpoint instead of the one update_state created" },
      { label: "Fix", options: ["fork_cfg = graph.update_state(...); graph.invoke(None, fork_cfg)", "Call update_state twice", "Pass {\"topic\": \"samosa\"} as the invoke input", "Delete the old checkpoint first"], answer: "fork_cfg = graph.update_state(...); graph.invoke(None, fork_cfg)" },
    ],
    explanation:
      "update_state never edits an existing checkpoint; it creates a new one on a branch and returns its config. Invoking from the old config replays the untouched pizza state. Passing a fresh input would start a new run from START rather than fork.",
    lessonAnchor: "fork-by-updating-state",
  },
  {
    id: "lg-persist-replay-side-effects",
    lectures: [10],
    tags: ["time-travel", "side-effects"],
    type: "mcq",
    prompt:
      "To debug a bad summary, you replay a thread from the checkpoint before summarize. The nodes after it are summarize and send_email. What happens?",
    options: [
      "summarize calls the model again and send_email sends another email",
      "Both nodes return their cached outputs, so nothing external happens",
      "Only summarize reruns; send_email is skipped because it ran before",
      "The replay fails because the checkpoint is in the past",
    ],
    answer: "summarize calls the model again and send_email sends another email",
    explanation:
      "Replay re-executes every node after the chosen checkpoint, including LLM calls and side effects. Only nodes before the checkpoint are skipped. Guard side-effecting nodes before replaying in real environments.",
    lessonAnchor: "replay",
  },
  {
    id: "lg-persist-threads-separate",
    lectures: [10],
    tags: ["threads"],
    type: "scenario",
    prompt:
      "You ran the joke graph with topic \"pizza\" on thread \"1\" and \"pasta\" on thread \"2\", same compiled graph and checkpointer. Now you call graph.get_state({\"configurable\": {\"thread_id\": \"1\"}}).",
    fields: [
      { label: "values[\"topic\"]", options: ["pizza", "pasta", "Both, as a list", "Empty: the second run overwrote it"], answer: "pizza" },
      { label: "What separates the two runs in storage", options: ["thread_id", "checkpoint_ns", "The order of invocation", "A separate checkpointer per run"], answer: "thread_id" },
    ],
    explanation:
      "Checkpoints are stored per thread_id, so each thread keeps its own timeline in the same checkpointer. get_state returns the latest checkpoint of the named thread only.",
    lessonAnchor: "threads",
  },
  {
    id: "lg-persist-hitl-needs-checkpointer",
    lectures: [10],
    tags: ["human-in-the-loop", "persistence"],
    type: "mcq",
    prompt:
      "Your graph calls interrupt() to ask a manager to approve a refund. Managers sometimes reply the next day. Why must the graph be compiled with a checkpointer?",
    options: [
      "The paused state must be saved so a later Command(resume=...) can continue from that exact point",
      "interrupt() sends the email to the manager through the checkpointer",
      "Checkpointers speed up LLM calls while waiting",
      "It doesn't need one; interrupt keeps the process waiting",
    ],
    answer: "The paused state must be saved so a later Command(resume=...) can continue from that exact point",
    explanation:
      "An interrupt is a deliberate stop. LangGraph saves the state and returns, and resuming loads that checkpoint, possibly in another process. Keeping a process blocked for a day is exactly what interrupts avoid.",
    lessonAnchor: "human-in-the-loop",
  },
  {
    id: "lg-persist-idempotent-node",
    lectures: [10],
    tags: ["fault-tolerance", "side-effects"],
    type: "scenario",
    prompt:
      "A node charges the customer's card, then calls a slow invoicing API that times out. You resume with invoke(None, config) and the customer is charged twice.",
    fields: [
      { label: "Why", options: ["The failed node reruns from its beginning, repeating the charge", "invoke(None) reruns the whole graph", "The checkpointer replays every past node", "Pending writes duplicated the charge"], answer: "The failed node reruns from its beginning, repeating the charge" },
      { label: "Best fix", options: ["Put the charge in its own node (with an idempotency key) before the invoicing node", "Switch to InMemorySaver", "Use durability=\"exit\"", "Never resume failed runs"], answer: "Put the charge in its own node (with an idempotency key) before the invoicing node" },
    ],
    explanation:
      "Checkpoints sit between super-steps, so a node's partial work isn't saved. Isolating the side effect in its own node means a later failure resumes after it, and an idempotency key protects against the charge node itself being retried.",
    lessonAnchor: "details-that-matter-in-real-systems",
  },
  {
    id: "lg-persist-durability-mode",
    lectures: [10],
    tags: ["durability"],
    type: "mcq",
    prompt:
      "A batch workflow runs for an hour. You need to resume after a crash at any step, and you can accept slightly slower steps. Which durability mode fits?",
    options: ["\"sync\"", "\"exit\"", "\"async\"", "\"none\""],
    answer: "\"sync\"",
    explanation:
      "sync writes each checkpoint before the next step starts, so every step is recoverable. async is faster but can miss the latest checkpoint on a crash, and exit only saves at the end, so a mid-run crash can't be resumed.",
    lessonAnchor: "details-that-matter-in-real-systems",
  },
  {
    id: "lg-persist-time-travel-order",
    lectures: [10],
    tags: ["time-travel"],
    type: "order",
    prompt: "Put the steps to rerun a finished thread from just before generate_joke with a new topic in order.",
    steps: [
      "List checkpoints with graph.get_state_history(config)",
      "Pick the snapshot whose next is ('generate_joke',)",
      "Call graph.update_state(snapshot.config, {\"topic\": \"samosa\"})",
      "Keep the config that update_state returns",
      "Call graph.invoke(None, returned_config)",
    ],
    explanation:
      "Find the point in history, branch from it with update_state, then run forward from the new branch's config. Invoking with None means no new input, just continue from that checkpoint.",
    lessonAnchor: "time-travel",
  },
  {
    id: "lg-persist-checkpointer-vs-store",
    lectures: [10],
    tags: ["persistence", "memory"],
    type: "mcq",
    prompt:
      "Your bot uses PostgresSaver. A user mentioned being vegetarian in Monday's chat, but in a brand-new chat on Tuesday the bot suggests a chicken recipe. Why?",
    options: [
      "A checkpointer saves state per thread; facts across threads need a store (long-term memory)",
      "PostgresSaver loses data after 24 hours",
      "The Monday thread must be replayed with time travel first",
      "add_messages drops messages older than a day",
    ],
    answer: "A checkpointer saves state per thread; facts across threads need a store (long-term memory)",
    explanation:
      "A new chat is a new thread, and a new thread starts empty. Remembering user facts across conversations is the job of a store passed with compile(store=...), not the checkpointer.",
    lessonAnchor: "persistence-is-not-long-term-memory",
  },
];
