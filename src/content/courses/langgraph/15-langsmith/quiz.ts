import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "lg-langsmith-hierarchy-count",
    lectures: [15],
    tags: ["langsmith", "tracing"],
    type: "scenario",
    prompt:
      "Your support app is the chain prompt | model | parser, traced into the project support-bot. Yesterday 200 users each asked one question.",
    fields: [
      { label: "Projects involved", options: ["1", "3", "200", "600"], answer: "1" },
      { label: "Traces created", options: ["1", "3", "200", "600"], answer: "200" },
      { label: "Child runs per trace (prompt, model, parser)", options: ["1", "3", "200", "600"], answer: "3" },
    ],
    explanation:
      "A project is the app's bucket, a trace is one execution (one question), and each component that executes inside it is a run. Projects don't multiply per request.",
    lessonAnchor: "projects-traces-and-runs",
  },
  {
    id: "lg-langsmith-rag-which-half",
    lectures: [15],
    tags: ["langsmith", "rag"],
    type: "scenario",
    prompt:
      "Two bad answers from the HR bot. In trace 1, the retriever run's output is a single chunk about company history; the question was about notice periods. In trace 2, the retriever returned the correct leave-policy chunk, but the system prompt says \"use the context if it seems helpful\" and the model invented an answer.",
    fields: [
      { label: "Trace 1 failure", options: ["Retriever error", "Generator error", "Parser error", "Network error"], answer: "Retriever error" },
      { label: "Trace 1 fix", options: ["Raise k or improve chunking/embeddings", "Make the prompt stricter", "Switch to a bigger model", "Add an output parser"], answer: "Raise k or improve chunking/embeddings" },
      { label: "Trace 2 fix", options: ["Raise k or improve chunking/embeddings", "Make the prompt stricter", "Rebuild the FAISS index", "Disable tracing for the retriever"], answer: "Make the prompt stricter" },
    ],
    explanation:
      "The trace shows what the model was given. Wrong context means the retriever failed and no prompt can fix it. Right context plus an invented answer means the generator failed, and the lenient instruction is the lever.",
    lessonAnchor: "retriever-errors-and-generator-errors",
  },
  {
    id: "lg-langsmith-untraced-setup",
    lectures: [15],
    tags: ["langsmith", "traceable"],
    type: "mcq",
    prompt:
      "Your RAG script loads a PDF, splits it and builds a FAISS index at module level, then calls chain.invoke(question). The trace shows only the chain; the 3-minute setup is invisible. What's the right fix?",
    options: [
      "Move setup into functions decorated with @traceable",
      "Set LANGSMITH_TRACING=true a second time before loading the PDF",
      "Pass tags=[\"setup\"] in the chain's config",
      "Use a different project name for setup code",
    ],
    answer: "Move setup into functions decorated with @traceable",
    explanation:
      "Automatic tracing covers runnables invoked inside a traced call. Plain Python run before the call isn't recorded. @traceable turns any function into a run. Tags only label runs that already exist.",
    lessonAnchor: "problem-one-untraced-setup",
  },
  {
    id: "lg-langsmith-two-traces",
    lectures: [15],
    tags: ["langsmith", "traceable"],
    type: "mcq",
    prompt:
      "After decorating setup_pipeline with @traceable, every question produces two separate traces in the project: setup_pipeline and the query chain. How do you get one trace per question with both inside it?",
    options: [
      "Call both from one @traceable function, such as answer_question, so they nest under it",
      "Give both the same run_name",
      "Add the same tag to both",
      "Set LANGSMITH_PROJECT to the same value in both places",
    ],
    answer: "Call both from one @traceable function, such as answer_question, so they nest under it",
    explanation:
      "Runs nest under whatever traced function is active when they start. With no common parent, each top-level call starts its own trace. Matching names or tags only label them; they stay separate traces.",
    lessonAnchor: "problem-two-one-app-split-into-two-traces",
  },
  {
    id: "lg-langsmith-index-rebuild",
    lectures: [15],
    tags: ["rag", "latency"],
    type: "scenario",
    prompt:
      "Traces show every question spending about 200 s in build_vectorstore, while the query part takes 2 s. You add on-disk caching of the FAISS index.",
    fields: [
      {
        label: "Which change should NOT trigger a rebuild?",
        options: ["Asking a new question", "Changing chunk_size", "Switching the embedding model", "Replacing the PDF"],
        answer: "Asking a new question",
      },
      {
        label: "How to detect a stale index",
        options: [
          "Fingerprint the PDF, chunk settings and embedding model, and store the index under it",
          "Rebuild whenever latency exceeds 5 s",
          "Rebuild once a day by cron",
          "Compare the index file's size with the PDF's",
        ],
        answer: "Fingerprint the PDF, chunk settings and embedding model, and store the index under it",
      },
    ],
    explanation:
      "The vectors depend on the document, the chunking and the embedding model, not on the question. A fingerprint of exactly those inputs rebuilds when needed and reuses the index otherwise.",
    lessonAnchor: "problem-three-rebuilding-the-index-every-time",
  },
  {
    id: "lg-langsmith-project-midway",
    lectures: [15],
    tags: ["langsmith", "config"],
    type: "mcq",
    prompt:
      "In a long-running server, a handler sets os.environ[\"LANGSMITH_PROJECT\"] = \"batch-jobs\" just before running a nightly job, hoping its traces go to a separate project. They keep landing in the original project. What should you use instead?",
    options: [
      "with langsmith.tracing_context(project_name=\"batch-jobs\"): around the job",
      "os.environ[\"LANGCHAIN_PROJECT\"] = \"batch-jobs\"",
      "A tag named batch-jobs",
      "Restart tracing with LANGSMITH_TRACING=false then true",
    ],
    answer: "with langsmith.tracing_context(project_name=\"batch-jobs\"): around the job",
    explanation:
      "The SDK reads the project name once and caches it, so changing the environment variable mid-process has no effect. tracing_context redirects only the code inside it. The legacy variable name is read through the same cache.",
    lessonAnchor: "one-project-per-app",
  },
  {
    id: "lg-langsmith-find-traces",
    lectures: [15],
    tags: ["langsmith", "metadata"],
    type: "scenario",
    prompt:
      "Release 2.3.0 switched the writer model. A week later, quality complaints rise and you want to compare every trace from 2.2.x with every trace from 2.3.0 among 80,000 traces.",
    fields: [
      {
        label: "What should each invoke carry?",
        options: [
          "metadata={\"app_version\": \"2.3.0\", \"writer_model\": ...}",
          "A unique run_name per request",
          "A separate LangSmith project per user",
          "Nothing; LangSmith infers versions",
        ],
        answer: "metadata={\"app_version\": \"2.3.0\", \"writer_model\": ...}",
      },
      {
        label: "Then in the UI you",
        options: ["Filter traces by that metadata", "Open traces one by one", "Create a new API key", "Delete old traces"],
        answer: "Filter traces by that metadata",
      },
    ],
    explanation:
      "Metadata and tags are attached to traces and are searchable, so version and model filters split traffic instantly. A run_name labels a trace but isn't a good grouping key, and per-user projects fragment the data.",
    lessonAnchor: "tags-metadata-and-run-names-per-call",
  },
  {
    id: "lg-langsmith-agent-loop-cost",
    lectures: [15],
    tags: ["agents", "cost"],
    type: "mcq",
    prompt:
      "Some research-agent traces cost 4× the usual. Opening one, you see search → write → critique repeated three times, each critique saying \"not excellent yet\". What does that point to?",
    options: [
      "A prompt or stop condition that makes the agent loop for some inputs",
      "The model provider raised prices",
      "The tracing itself adds token cost",
      "A slow search tool",
    ],
    answer: "A prompt or stop condition that makes the agent loop for some inputs",
    explanation:
      "Repeated cycles with rising token counts mean the agent's own decision to continue is driving cost, typically an instruction like \"keep improving until excellent\". A price change would raise every trace, not only some; tracing doesn't consume model tokens.",
    lessonAnchor: "tracing-an-agent",
  },
  {
    id: "lg-langsmith-graph-mapping",
    lectures: [15],
    tags: ["langgraph", "tracing"],
    type: "scenario",
    prompt:
      "You trace the essay grader: START fans out to evaluate_language, evaluate_analysis and evaluate_clarity, which all feed final_evaluation. You call graph.invoke once.",
    fields: [
      { label: "Traces created", options: ["1", "3", "4", "5"], answer: "1" },
      { label: "Node runs inside it", options: ["1", "3", "4", "5"], answer: "4" },
      {
        label: "How the three evaluate runs appear",
        options: ["Overlapping in time, as parallel siblings", "One after another, in alphabetical order", "As three separate traces", "Merged into one run"],
        answer: "Overlapping in time, as parallel siblings",
      },
    ],
    explanation:
      "One graph execution is one trace and each node execution is a run. Parallel branches run in the same superstep, so their runs overlap. The final node runs once, after all three finish.",
    lessonAnchor: "langgraph-and-langsmith",
  },
  {
    id: "lg-langsmith-observe-vs-monitor",
    lectures: [15],
    tags: ["monitoring"],
    type: "scenario",
    prompt:
      "Match each need to the LangSmith feature:\n• A: \"Why did this customer get a wrong refund amount at 10:42?\"\n• B: \"Tell the on-call engineer if the error rate goes above 5% for 15 minutes.\"\n• C: \"Has median latency crept up since Monday?\"",
    fields: [
      { label: "A", options: ["Open the single trace", "Monitoring charts", "An alert rule", "A dataset"], answer: "Open the single trace" },
      { label: "B", options: ["Open the single trace", "Monitoring charts", "An alert rule", "A dataset"], answer: "An alert rule" },
      { label: "C", options: ["Open the single trace", "Monitoring charts", "An alert rule", "A dataset"], answer: "Monitoring charts" },
    ],
    explanation:
      "Observability inspects one execution in depth. Monitoring aggregates many traces to show trends. Alerts watch those metrics and notify you when they cross a threshold.",
    lessonAnchor: "monitoring-and-alerts",
  },
  {
    id: "lg-langsmith-eval-order",
    lectures: [15],
    tags: ["evaluation"],
    type: "order",
    prompt: "You want to know whether a stricter RAG prompt beats the current one before shipping. Put the steps in order.",
    steps: [
      "Create a dataset of questions with reference answers",
      "Write a target function that runs the app on an example's inputs",
      "Write evaluators (code checks and an LLM-as-judge)",
      "Run client.evaluate for the current prompt",
      "Run client.evaluate again with the stricter prompt",
      "Compare the two experiments example by example",
    ],
    explanation:
      "Evaluation needs fixed inputs and references, the thing under test and scoring functions. Then you run one experiment per variant on the same dataset and compare. Comparing variants on different data would prove nothing.",
    lessonAnchor: "running-an-offline-evaluation-in-code",
  },
  {
    id: "lg-langsmith-feedback-link",
    lectures: [15],
    tags: ["feedback"],
    type: "mcq",
    prompt:
      "Your Streamlit chatbot shows thumbs up/down under each answer. You want each click attached to the exact trace that produced that answer. What do you do?",
    options: [
      "Generate a run_id, pass it in the invoke config, then call client.create_feedback(run_id=run_id, key=..., score=...)",
      "Log the click with print() so it appears in the trace",
      "Create a new dataset row for every click",
      "Add a tag named thumbs-up to the next invoke",
    ],
    answer: "Generate a run_id, pass it in the invoke config, then call client.create_feedback(run_id=run_id, key=..., score=...)",
    explanation:
      "Feedback is stored against a run id, so you need the id of the answer's root run. Choosing it up front makes that easy. A tag on the next invoke would label the wrong trace.",
    lessonAnchor: "user-feedback",
  },
];
