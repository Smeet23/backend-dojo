import type { Question } from "@/lib/types";

const VERDICTS = ["Correct", "Incorrect", "Ambiguous"];

export const quiz: Question[] = [
  {
    id: "lg-crag-verdicts",
    lectures: [26],
    tags: ["crag", "evaluator"],
    type: "scenario",
    prompt:
      "Your CRAG evaluator uses UPPER = 0.7 and LOWER = 0.3. Classify each retrieval by its per-document scores.",
    fields: [
      { label: "Scores 0.82, 0.25, 0.10", options: VERDICTS, answer: "Correct" },
      { label: "Scores 0.28, 0.20, 0.05", options: VERDICTS, answer: "Incorrect" },
      { label: "Scores 0.65, 0.40, 0.31", options: VERDICTS, answer: "Ambiguous" },
    ],
    explanation:
      "Correct needs at least one document above UPPER. Incorrect means none is above LOWER. Everything else, like a best score of 0.65 with others above 0.3, is Ambiguous.",
    lessonAnchor: "turning-scores-into-a-verdict",
  },
  {
    id: "lg-crag-surviving-docs",
    lectures: [26],
    tags: ["crag", "evaluator"],
    type: "mcq",
    prompt:
      "Scores are D1 = 0.85, D2 = 0.45, D3 = 0.15 with UPPER 0.7 and LOWER 0.3. The verdict is Correct. Which documents go into knowledge refinement?",
    options: ["D1 and D2", "D1 only", "D1, D2 and D3", "None; Correct skips refinement"],
    answer: "D1 and D2",
    explanation:
      "The verdict is decided by the best document, but every document above LOWER survives. D3 is dropped. Refinement still runs on the Correct path to strip noise from the survivors.",
    lessonAnchor: "which-documents-survive",
  },
  {
    id: "lg-crag-blind-trust",
    lectures: [26],
    tags: ["rag", "failure-modes"],
    type: "scenario",
    prompt:
      "Your HR bot indexes the company handbook. An employee asks about sabbatical leave, which the handbook never mentions. The bot answers confidently with a 6-month policy.\nWhat went wrong?",
    fields: [
      {
        label: "Retrieval step",
        options: ["Returned the top-k nearest chunks even though none was about sabbaticals", "Returned nothing", "Crashed and fell back to search", "Returned the exact policy"],
        answer: "Returned the top-k nearest chunks even though none was about sabbaticals",
      },
      {
        label: "Generation step",
        options: ["Trusted the context and filled gaps from parametric knowledge", "Refused to answer", "Asked a clarifying question", "Quoted the handbook verbatim"],
        answer: "Trusted the context and filled gaps from parametric knowledge",
      },
    ],
    explanation:
      "Vector search always returns something, and plain RAG never checks whether it's relevant. The model then answers anyway. CRAG's evaluator would score these chunks low and refuse to treat them as evidence.",
    lessonAnchor: "blind-trust-in-retrieval",
  },
  {
    id: "lg-crag-refinement-order",
    lectures: [26],
    tags: ["crag", "refinement"],
    type: "order",
    prompt: "Put knowledge refinement on the Correct path in order.",
    steps: [
      "Join the good documents into one text",
      "Split the text into sentence strips",
      "Ask the filter whether each strip helps answer the question",
      "Keep only the strips marked keep",
      "Join the kept strips into refined_context",
      "Generate the answer from refined_context",
    ],
    explanation: "Decompose, filter, recompose, then generate. The generator never sees the raw chunks.",
    lessonAnchor: "decompose-filter-recompose",
  },
  {
    id: "lg-crag-overfilter",
    lectures: [26],
    tags: ["refinement", "failure-modes"],
    type: "mcq",
    prompt:
      "After adding refinement, answers to \"what is gradient descent?\" no longer explain how it works. kept_strips shows the sentence \"It iteratively updates parameters along the negative gradient\" was dropped. What's the best fix?",
    options: [
      "Use two-sentence strips or a filter prompt that keeps sentences relying on their neighbour for a subject",
      "Remove refinement entirely",
      "Raise the UPPER threshold",
      "Retrieve 20 chunks instead of 4",
    ],
    answer: "Use two-sentence strips or a filter prompt that keeps sentences relying on their neighbour for a subject",
    explanation:
      "Sentence-level filtering judges each strip out of context, so pronoun-led sentences get dropped. Bigger strips or a more lenient filter keep them. Thresholds and k affect retrieval, not this step.",
    lessonAnchor: "decompose-filter-recompose",
  },
  {
    id: "lg-crag-grade-separately",
    lectures: [26],
    tags: ["evaluator"],
    type: "mcq",
    prompt:
      "To save calls, a teammate sends all four retrieved chunks to the grader in one prompt and asks for one relevance score. What breaks?",
    options: [
      "You lose per-document scores, so you can't decide the verdict properly or which chunks survive",
      "Nothing; it's equivalent",
      "The grader can't use structured output with multiple chunks",
      "The vector store returns different chunks",
    ],
    answer: "You lose per-document scores, so you can't decide the verdict properly or which chunks survive",
    explanation:
      "CRAG's rules are per document: any above UPPER, none above LOWER, and keep those above LOWER. To cut latency, use batch() to grade chunks concurrently instead of merging them.",
    lessonAnchor: "scoring-each-document",
  },
  {
    id: "lg-crag-web-path",
    lectures: [26],
    tags: ["crag", "web-search"],
    type: "scenario",
    prompt:
      "The verdict is Incorrect for \"recent AI news\". Design the rest of the path.",
    fields: [
      { label: "First node after evaluate", options: ["rewrite_query", "web_search", "generate", "refine"], answer: "rewrite_query" },
      { label: "Search uses", options: ["The rewritten web_query", "The original question", "The retrieved chunks", "The grader's reasons"], answer: "The rewritten web_query" },
      { label: "Before generate, web docs go through", options: ["refine", "evaluate again", "retrieve", "Nothing"], answer: "refine" },
    ],
    explanation:
      "CRAG rewrites the question into a keyword-rich query (adding recency if implied), searches, and refines the web results just like internal documents before generating.",
    lessonAnchor: "iteration-four-query-rewriting",
  },
  {
    id: "lg-crag-ambiguous-merge",
    lectures: [26],
    tags: ["crag", "state", "routing"],
    type: "scenario",
    prompt:
      "You want the Ambiguous case without duplicating the rewrite, search and refine nodes.\nHow do you do it?",
    fields: [
      {
        label: "Routing after evaluate",
        options: ["Correct → refine; anything else → rewrite_query", "Three separate branches with copied nodes", "Ambiguous → END", "Always rewrite_query"],
        answer: "Correct → refine; anything else → rewrite_query",
      },
      {
        label: "In refine, for Ambiguous use",
        options: ["good_docs + web_docs", "web_docs only", "good_docs only", "All retrieved docs + web_docs"],
        answer: "good_docs + web_docs",
      },
    ],
    explanation:
      "The verdict and good_docs stay in state while the web search runs, so one refine node can choose its source. Ambiguous uses the surviving internal docs plus web results; it still excludes docs below LOWER.",
    lessonAnchor: "merging-two-branches-with-state",
  },
  {
    id: "lg-crag-generous-grader",
    lectures: [26],
    tags: ["evaluator", "tuning"],
    type: "mcq",
    prompt:
      "In logs, 95% of questions get a Correct verdict, including ones your documents obviously don't cover. The grader's reasons say things like \"related to machine learning\". What should you try first?",
    options: [
      "Make the grader conservative (prompt, low-score examples) and tune UPPER on labelled questions",
      "Lower the UPPER threshold",
      "Increase k in the retriever",
      "Remove the LOWER threshold",
    ],
    answer: "Make the grader conservative (prompt, low-score examples) and tune UPPER on labelled questions",
    explanation:
      "General chat models are generous graders. Lowering UPPER would make even more things Correct. Calibrate the grader, then pick thresholds from a small labelled test set.",
    lessonAnchor: "failure-modes-and-tuning",
  },
  {
    id: "lg-crag-privacy",
    lectures: [26],
    tags: ["web-search", "security"],
    type: "mcq",
    prompt:
      "You're deploying CRAG for an internal legal team. Which concern is specific to the web-search fallback?",
    options: [
      "Confidential questions are sent to a third-party search API",
      "The vector store becomes stale",
      "The grader needs a GPU",
      "Refinement removes citations",
    ],
    answer: "Confidential questions are sent to a third-party search API",
    explanation:
      "Every Incorrect or Ambiguous verdict ships the (rewritten) question outside your network. Disable the fallback, sanitise in the rewrite step, or use another internal source instead of the web.",
    lessonAnchor: "iteration-three-web-search-for-incorrect-retrieval",
  },
  {
    id: "lg-crag-paper-evaluator",
    lectures: [26],
    tags: ["crag"],
    type: "mcq",
    prompt:
      "Why did the CRAG authors use a fine-tuned T5-large as the retrieval evaluator instead of a large chat model?",
    options: [
      "It was much cheaper and judged relevance better for this specific task",
      "Chat models can't output numbers",
      "T5 can search the web",
      "LangGraph requires a local model",
    ],
    answer: "It was much cheaper and judged relevance better for this specific task",
    explanation:
      "A small model trained for one narrow job can beat a general model at that job while costing far less per call. Prompting a chat model is a reasonable stand-in when you don't have a trained grader.",
    lessonAnchor: "what-the-paper-used",
  },
];
