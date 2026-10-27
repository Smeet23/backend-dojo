import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "ev-rag-recall-precision-rr",
    lectures: [6],
    tags: ["retrieval-metrics"],
    type: "scenario",
    prompt:
      "A tenant asks \"What's the late fee if rent is 3 days late?\" Your gold set says two chunks answer it: the rent policy and the fee schedule. The retriever returns 5 chunks: [parking FAQ, fee schedule, move-in checklist, pet policy, laundry rules]. The rent policy chunk is not in the list.",
    fields: [
      { label: "Recall@5", options: ["0.20", "0.40", "0.50", "1.00"], answer: "0.50" },
      { label: "Precision@5", options: ["0.20", "0.40", "0.50", "1.00"], answer: "0.20" },
      { label: "Reciprocal rank", options: ["1.00", "0.50", "0.33", "0"], answer: "0.50" },
    ],
    explanation:
      "Recall@5 is relevant found over all relevant: 1 of 2 = 0.50. Precision@5 is relevant found over k: 1 of 5 = 0.20. The first relevant chunk (fee schedule) is at rank 2, so reciprocal rank is 1/2. The missing rent policy chunk is the real problem: low recall means the LLM can't answer fully no matter how good the prompt is.",
    lessonAnchor: "worked-example",
  },
  {
    id: "ev-rag-ndcg-math",
    lectures: [6],
    tags: ["ndcg"],
    type: "scenario",
    prompt:
      "A reranker returns 3 chunks with graded relevance (0 to 3) in this order: [2, 0, 3]. Use DCG@k = Σ rel_i / log2(i + 1) and take the ideal as the same three chunks sorted best-first. (log2(3) ≈ 1.585)",
    fields: [
      { label: "DCG@3", options: ["3.50", "4.26", "5.00", "2.89"], answer: "3.50" },
      { label: "IDCG@3", options: ["3.50", "4.26", "5.00", "5.50"], answer: "4.26" },
      { label: "NDCG@3", options: ["0.82", "0.70", "1.00", "0.58"], answer: "0.82" },
    ],
    explanation:
      "DCG = 2/1 + 0/1.585 + 3/2 = 3.50. The ideal order is [3, 2, 0]: 3/1 + 2/1.585 + 0 = 4.26. NDCG = 3.50 / 4.26 ≈ 0.82. The best chunk sitting at rank 3 is what costs the score; swap it to rank 1 and NDCG becomes 1.0.",
    lessonAnchor: "ndcgk",
  },
  {
    id: "ev-rag-which-metric",
    lectures: [6],
    tags: ["retrieval-metrics"],
    type: "mcq",
    prompt:
      "Your RAG pipeline has a fast first-stage retriever that pulls 50 candidates, then an LLM reads them and answers. You can only track one metric for the first stage this quarter. Which one?",
    options: ["Recall@50", "Precision@50", "MRR", "BLEU against reference answers"],
    answer: "Recall@50",
    explanation:
      "When an LLM consumes the chunks, recall comes first: a chunk that never reaches the context can't be recovered, while the LLM (or a reranker) can usually ignore noise. Precision and ordering metrics like MRR or NDCG matter more for the reranking stage, or when humans see the results directly. BLEU measures text overlap, not retrieval.",
    lessonAnchor: "recallk-and-precisionk",
  },
  {
    id: "ev-rag-synthetic-pipeline",
    lectures: [6],
    tags: ["synthetic-data"],
    type: "order",
    prompt: "Put the steps for building a synthetic retrieval eval set in order.",
    steps: [
      "Chunk the corpus along natural boundaries and sample chunks",
      "Have an LLM extract a salient fact from each sampled chunk",
      "Have an LLM write a realistic user question answered by that fact, seeded with real query examples",
      "Store (question, fact, source chunk ID) tuples",
      "Rate realism 1 to 5 with an LLM and drop the 1s and 2s",
      "Run the retriever on each question and compute Recall@k against the stored chunk IDs",
    ],
    explanation:
      "The process runs in reverse from documents to questions. The chunk ID is what makes it a retrieval dataset at all. The realism filter comes before measurement so nonsense questions don't distort the numbers, and the retriever only enters at the end because the dataset should be independent of the retrieval method.",
    lessonAnchor: "build-a-retrieval-eval-dataset",
  },
  {
    id: "ev-rag-filter-scores",
    lectures: [6],
    tags: ["synthetic-data", "filtering"],
    type: "scenario",
    prompt:
      "You generated 500 synthetic queries for the leasing assistant and an LLM rated each for realism on a 1 to 5 scale. One query reads \"What is the paint color code in apartment 305's second bathroom?\"",
    fields: [
      {
        label: "What to do with that query",
        options: [
          "Drop it: it is the kind of query that rates 1 or 2",
          "Keep it: it tests a hard fact",
          "Rewrite it by hand into a pool question",
          "Keep it but give it half weight",
        ],
        answer: "Drop it: it is the kind of query that rates 1 or 2",
      },
      {
        label: "How to use the 3, 4 and 5 scores afterward",
        options: [
          "Not at all: they only decided what to keep",
          "Weight each query's recall by its score",
          "Report average realism as a dataset quality KPI",
          "Use them as ground truth for an LLM judge",
        ],
        answer: "Not at all: they only decided what to keep",
      },
    ],
    explanation:
      "The paint-code question came from an unlucky fact pick; no renter asks it. The Likert rating is acceptable here precisely because it is a throwaway filter: drop the 1s and 2s and never use the scores again. A few bad queries slipping through only cost some reading time, unlike a misaligned judge making business decisions.",
    lessonAnchor: "filter-unrealistic-queries",
  },
  {
    id: "ev-rag-faithful-not-relevant",
    lectures: [6],
    tags: ["generation", "ares"],
    type: "scenario",
    prompt:
      "A user asks \"Are cats allowed at Maple Court?\" The retriever returns pet policies for both Maple Court and Birch Point. The answer accurately quotes Birch Point's policy (\"no cats\"), word for word, with no invented details. Maple Court actually allows cats.",
    fields: [
      { label: "Retrieval", options: ["Fine: the right chunk was in context", "Failed: wrong chunks", "Can't tell without NDCG"], answer: "Fine: the right chunk was in context" },
      { label: "Faithfulness to context", options: ["High: nothing was invented", "Low: it hallucinated"], answer: "High: nothing was invented" },
      { label: "Answer relevance", options: ["Low: it answered for the wrong property", "High: it quoted policy correctly"], answer: "Low: it answered for the wrong property" },
    ],
    explanation:
      "This is the faithful-but-irrelevant pattern: the generator grounded itself in real context, just the wrong part of it. The fix is on the generation side (making the model match the property named in the query), not the retriever. When you see this in open coding, note the specific pattern (mixing up properties) and build a judge for that, rather than reaching for a generic hallucination score.",
    lessonAnchor: "evaluating-generation-quality",
  },
  {
    id: "ev-rag-tool-stages",
    lectures: [6],
    tags: ["tool-calling"],
    type: "scenario",
    prompt: "While reading leasing-assistant traces you note these problems. Which stage of the tool call does each belong to?",
    fields: [
      {
        label: "check_calendar(date=\"May 10th\") when the tool expects YYYY-MM-DD",
        options: ["Tool selection", "Argument generation", "Execution", "Handling the output"],
        answer: "Argument generation",
      },
      {
        label: "query_listings(property_id=\"98765\") returns 0 rows for a nonexistent ID; the bot says nothing is available",
        options: ["Tool selection", "Argument generation", "Execution", "Handling the output"],
        answer: "Execution",
      },
      {
        label: "check_calendar returns [Sat 2pm, Sun 4pm] and the bot replies \"When are you free?\"",
        options: ["Tool selection", "Argument generation", "Execution", "Handling the output"],
        answer: "Handling the output",
      },
      {
        label: "User asks about weekend showings; the bot calls send_email",
        options: ["Tool selection", "Argument generation", "Execution", "Handling the output"],
        answer: "Tool selection",
      },
    ],
    explanation:
      "Wrong date format is a semantically wrong argument even if the type is a valid string. The empty result is a silent execution failure: no error, but no real answer either, and the model treats it as fact. Asking \"when are you free\" after receiving slots means the output wasn't used. Calling send_email for a calendar question is a selection error, often caused by vague tool descriptions.",
    lessonAnchor: "evaluate-each-step-of-a-tool-call",
  },
  {
    id: "ev-rag-first-failure",
    lectures: [6],
    tags: ["agents", "failure-funnel"],
    type: "scenario",
    prompt:
      "You label 40 failed agent traces. A teammate counts every step that looks wrong in each trace and concludes \"Reply\" is the worst step (40 traces). Counting only the first failing step gives: Generate args 15, Execute tool 11, Use result 8, Pick tool 6, Reply 0.",
    fields: [
      {
        label: "Why do the two counts disagree?",
        options: [
          "Errors cascade, so later steps look broken even when the root cause is upstream",
          "The teammate's sample was too small",
          "Reply failures are hidden by the judge",
          "First-failure counting ignores silent failures",
        ],
        answer: "Errors cascade, so later steps look broken even when the root cause is upstream",
      },
      {
        label: "Where to start debugging",
        options: ["The 15 traces that first fail at Generate args", "Rewrite the Reply prompt", "All 40 traces at once", "The 6 Pick tool traces, since selection comes first"],
        answer: "The 15 traces that first fail at Generate args",
      },
    ],
    explanation:
      "Every failed trace ends in a bad reply, so counting all broken-looking steps blames the last step for everything. Attributing each trace to its first failure shows where problems actually start. Start with the biggest hotspot, do error analysis on those traces, fix, and recount: fixing one hotspot often reveals the next failure in the same traces.",
    lessonAnchor: "find-the-first-failure",
  },
  {
    id: "ev-rag-transition-matrix",
    lectures: [6],
    tags: ["agents", "transition-matrix"],
    type: "mcq",
    prompt:
      "In your transition failure matrix, the ExecSQL column sums to 14: 12 traces from GenSQL (the LLM wrote the query) and 2 from UserFilter (the user picked filters in the UI). What does the split tell you?",
    options: [
      "ExecSQL mostly fails after LLM-written SQL, so inspect those 12 traces; the cause may be in GenSQL or in the prompt (e.g. wrong SQL dialect)",
      "The database is unreliable and should be replaced",
      "UserFilter is the main problem because it is upstream",
      "Nothing: only column sums matter",
    ],
    answer: "ExecSQL mostly fails after LLM-written SQL, so inspect those 12 traces; the cause may be in GenSQL or in the prompt (e.g. wrong SQL dialect)",
    explanation:
      "Column sums show which state fails most, but the row (last successful state) shows the context. ExecSQL works when users supply filters and breaks after the LLM writes SQL, so pull those 12 traces and read them. The hotspot says where to look, not automatically which state is to blame.",
    lessonAnchor: "transition-failure-matrix",
  },
  {
    id: "ev-rag-long-docs",
    lectures: [6],
    tags: ["long-documents", "modalities"],
    type: "scenario",
    prompt:
      "Two features over 300-page commercial leases: (A) \"Find the early termination clause\" and (B) \"List every clause that creates a fee for the tenant.\" Both documents fit in the model's context window.",
    fields: [
      {
        label: "Task type of B",
        options: ["Variable-size output", "Constant output (needle in a haystack)", "Image understanding"],
        answer: "Variable-size output",
      },
      {
        label: "Best approach for B",
        options: [
          "Chunk the lease, extract per chunk, merge; tune chunk size against a whole-document baseline",
          "Send the whole lease in one call since it fits",
          "Use a bigger context model and a longer prompt",
          "Judge it by feeding the full lease to an LLM judge",
        ],
        answer: "Chunk the lease, extract per chunk, merge; tune chunk size against a whole-document baseline",
      },
      {
        label: "Main thing to test for A",
        options: ["Whether accuracy drops when the clause sits in the middle", "Whether merged lists have duplicates", "Spatial reasoning", "OCR quality only"],
        answer: "Whether accuracy drops when the clause sits in the middle",
      },
    ],
    explanation:
      "B's output grows with the document, and models do poorly when they must attend to everything at once, so chunk it and evaluate per chunk plus the merged result. Fitting in the window isn't the limit; reasoning load is. A is a constant-output needle task, where the classic failure is losing information in the middle of a long context. Judges should get snippets or chunk-level inputs, not whole leases.",
    lessonAnchor: "long-documents",
  },
];
