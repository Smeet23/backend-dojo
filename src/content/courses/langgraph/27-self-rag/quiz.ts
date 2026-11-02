import type { Question } from "@/lib/types";

const ISSUP = ["fully_supported", "partially_supported", "no_support"];

export const quiz: Question[] = [
  {
    id: "lg-selfrag-reflection-map",
    lectures: [27],
    tags: ["self-rag", "reflection"],
    type: "scenario",
    prompt: "Match each production incident to the Self-RAG reflection that would have caught it.",
    fields: [
      {
        label: "\"What's 2 + 2?\" triggered a vector search and a hedged answer",
        options: ["Retrieve?", "IsRel", "IsSup", "IsUse"],
        answer: "Retrieve?",
      },
      {
        label: "A chunk about diabetes symptoms was used to answer \"what causes diabetes?\"",
        options: ["Retrieve?", "IsRel", "IsSup", "IsUse"],
        answer: "IsRel",
      },
      {
        label: "The answer added \"headaches\" to side effects the context never listed",
        options: ["Retrieve?", "IsRel", "IsSup", "IsUse"],
        answer: "IsSup",
      },
      {
        label: "\"Why does ice float?\" got \"ice is solid water\", which is true and grounded",
        options: ["Retrieve?", "IsRel", "IsSup", "IsUse"],
        answer: "IsUse",
      },
    ],
    explanation:
      "Retrieve? stops indiscriminate retrieval, IsRel separates same-topic from answers-the-question, IsSup catches claims not in the context, and IsUse catches grounded answers that miss the point.",
    lessonAnchor: "four-reflection-questions",
  },
  {
    id: "lg-selfrag-issup-levels",
    lectures: [27],
    tags: ["issup"],
    type: "scenario",
    prompt:
      "Context: \"24 paid leaves per year.\" \"Leave types include sick and casual leave.\" \"Leave is managed in the HR portal.\"\nGrade each answer.",
    fields: [
      { label: "\"Employees get 24 paid leaves per year.\"", options: ISSUP, answer: "fully_supported" },
      { label: "\"The 24 leaves include sick and casual leave.\"", options: ISSUP, answer: "partially_supported" },
      { label: "\"Employees get 30 leaves with carry-forward.\"", options: ISSUP, answer: "no_support" },
    ],
    explanation:
      "The middle answer uses two real facts but invents the relationship between them, which is the typical partial-support hallucination. The last one contradicts the context and adds an unmentioned benefit.",
    lessonAnchor: "checking-support",
  },
  {
    id: "lg-selfrag-grader-knowledge",
    lectures: [27],
    tags: ["issup", "failure-modes"],
    type: "mcq",
    prompt:
      "The context lists pricing plans but never mentions a trial. The answer says \"plans include a 14-day free trial\" and your support grader returns fully_supported. What's the most likely cause?",
    options: [
      "The grader judged plausibility from its own knowledge instead of grounding in the context",
      "The retriever returned too few chunks",
      "MAX_RETRIES is too low",
      "The decider skipped retrieval",
    ],
    answer: "The grader judged plausibility from its own knowledge instead of grounding in the context",
    explanation:
      "A 14-day trial is typical, so an LLM grader that consults its own knowledge agrees with it. Tell the grader to judge only against the context, and test it on deliberately salted answers.",
    lessonAnchor: "step-four-the-support-check",
  },
  {
    id: "lg-selfrag-revise-loop",
    lectures: [27],
    tags: ["loops", "routing"],
    type: "scenario",
    prompt:
      "is_sup returns partially_supported. retries is 3 and MAX_RETRIES is 3.\nWhere does the graph go, and why?",
    fields: [
      { label: "Next node", options: ["no_answer_found", "revise_answer", "is_use", "rewrite_question"], answer: "no_answer_found" },
      {
        label: "Reason",
        options: [
          "The revise budget is spent and the answer is still not grounded",
          "Partial support counts as good enough",
          "Usefulness is checked before support",
          "The recursion limit was hit",
        ],
        answer: "The revise budget is spent and the answer is still not grounded",
      },
    ],
    explanation:
      "The router checks fully_supported first, then whether retries remain. With the budget spent, shipping the last (still unsupported) answer would defeat the check, so it ends honestly. The recursion limit is only a backstop.",
    lessonAnchor: "step-five-revising-unsupported-answers",
  },
  {
    id: "lg-selfrag-reset-retries",
    lectures: [27],
    tags: ["loops", "state"],
    type: "mcq",
    prompt:
      "After a rewrite, the second retrieval round finds better chunks, but its first answer is partially supported and the graph immediately ends with \"no answer found\" without revising. What's the bug?",
    options: [
      "rewrite_question didn't reset retries to 0, so the revise budget was already spent",
      "rewrite_question changed the user's question",
      "is_relevant ran before retrieve",
      "MAX_REWRITES is too high",
    ],
    answer: "rewrite_question didn't reset retries to 0, so the revise budget was already spent",
    explanation:
      "Each new set of evidence produces a new answer that deserves its own revision budget. Carrying the counter over silently disables the revise loop in later rounds.",
    lessonAnchor: "step-seven-rewriting-the-query-and-retrying",
  },
  {
    id: "lg-selfrag-question-vs-query",
    lectures: [27],
    tags: ["state", "rewrite"],
    type: "scenario",
    prompt:
      "Your rewrite node turns \"how long is the free trial?\" into \"NexaAI trial evaluation period pricing plans\".\nWhich text should each node read?",
    fields: [
      { label: "retrieve", options: ["retrieval_query", "question"], answer: "retrieval_query" },
      { label: "is_relevant", options: ["retrieval_query", "question"], answer: "question" },
      { label: "is_use", options: ["retrieval_query", "question"], answer: "question" },
    ],
    explanation:
      "The rewrite changes where you look, never what you're judged against. Retrieval uses the optimised query; every grader judges against the user's original question.",
    lessonAnchor: "step-seven-rewriting-the-query-and-retrying",
  },
  {
    id: "lg-selfrag-off-by-one",
    lectures: [27],
    tags: ["routing", "failure-modes"],
    type: "mcq",
    prompt:
      "\"Who is the CEO?\" always ends in \"no answer found\", even though is_relevant keeps exactly one chunk naming the CEO. The router is: return \"generate_from_context\" if len(state[\"relevant_docs\"]) > 1 else \"no_answer_found\". What's wrong?",
    options: [
      "It requires two relevant docs; it should check for at least one",
      "is_relevant should keep all retrieved docs",
      "The retriever's k is too small",
      "The router should return END",
    ],
    answer: "It requires two relevant docs; it should check for at least one",
    explanation: "One relevant chunk is enough to answer. Route on a non-empty list (len > 0, or just truthiness).",
    lessonAnchor: "step-three-answering-from-context-or-giving-up",
  },
  {
    id: "lg-selfrag-decider-bias",
    lectures: [27],
    tags: ["retrieve-decision"],
    type: "mcq",
    prompt:
      "Your decide_retrieval prompt says \"if unsure, choose false\". What's the risk?",
    options: [
      "Company questions get answered from general knowledge on a path with no graders",
      "Every question triggers retrieval and costs more",
      "The revise loop runs forever",
      "Relevant documents get filtered out",
    ],
    answer: "Company questions get answered from general knowledge on a path with no graders",
    explanation:
      "The direct path skips IsRel, IsSup and IsUse entirely. Wrongly skipping retrieval produces unchecked, confident answers about your company, while wrongly retrieving only costs a little. Bias toward true.",
    lessonAnchor: "step-one-decide-whether-to-retrieve",
  },
  {
    id: "lg-selfrag-grounded-not-useful",
    lectures: [27],
    tags: ["isuse", "loops"],
    type: "scenario",
    prompt:
      "After revision, the answer is \"The documents describe pricing plans but don't mention a free trial.\" is_sup says fully_supported. rewrite_tries is 0 and MAX_REWRITES is 2.",
    fields: [
      { label: "is_use verdict", options: ["useful", "not_useful"], answer: "not_useful" },
      { label: "Next node", options: ["rewrite_question", "END", "revise_answer", "generate_direct"], answer: "rewrite_question" },
    ],
    explanation:
      "Strict revision makes answers safe but can leave them empty. The answer is grounded but doesn't say how long the trial is, so the graph rewrites the retrieval query and tries different evidence while the rewrite budget lasts.",
    lessonAnchor: "step-six-the-usefulness-check",
  },
  {
    id: "lg-selfrag-run-order",
    lectures: [27],
    tags: ["self-rag"],
    type: "order",
    prompt: "Put a Self-RAG run for \"Describe the company culture\" in order. The first answer embellishes; one revision fixes it.",
    steps: [
      "decide_retrieval says retrieval is needed",
      "retrieve fetches four chunks",
      "is_relevant keeps two of them",
      "generate_from_context writes an answer",
      "is_sup returns partially_supported",
      "revise_answer strips the unsupported claims",
      "is_sup returns fully_supported",
      "is_use returns useful and the run ends",
    ],
    explanation: "Decide, retrieve, filter, generate, then check support (looping through revise), then check usefulness.",
    lessonAnchor: "the-architecture",
  },
  {
    id: "lg-selfrag-vs-crag",
    lectures: [27, 26],
    tags: ["self-rag", "crag"],
    type: "scenario",
    prompt:
      "Pick the design for each requirement.",
    fields: [
      { label: "Strict latency budget; must never loop", options: ["CRAG", "Self-RAG"], answer: "CRAG" },
      { label: "Must catch answers that add claims not in the documents", options: ["CRAG", "Self-RAG"], answer: "Self-RAG" },
      { label: "Many simple questions that need no documents at all", options: ["CRAG", "Self-RAG"], answer: "Self-RAG" },
    ],
    explanation:
      "CRAG makes one corrective decision with no loops, so cost is predictable. Self-RAG adds the retrieve decision (skipping needless retrieval) and the IsSup check on the answer, at the price of variable latency.",
    lessonAnchor: "self-rag-versus-crag",
  },
  {
    id: "lg-selfrag-recursion-limit",
    lectures: [27],
    tags: ["loops", "recursion"],
    type: "mcq",
    prompt: "What role should recursion_limit play in a Self-RAG graph?",
    options: [
      "A backstop that raises GraphRecursionError only if your own loop counters have a bug",
      "The main way to stop the revise loop",
      "A setting inside configurable that limits retries per node",
      "It should be set to 1 so each node runs once",
    ],
    answer: "A backstop that raises GraphRecursionError only if your own loop counters have a bug",
    explanation:
      "Your counters route to a sensible ending (no_answer_found). The recursion limit is a top-level config key and just crashes the run when exceeded, so size it above your worst case.",
    lessonAnchor: "the-complete-graph",
  },
];
