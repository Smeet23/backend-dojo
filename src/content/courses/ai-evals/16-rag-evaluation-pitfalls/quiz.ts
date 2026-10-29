import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "ev-ragpit-coverage-segment",
    lectures: [16],
    tags: ["rag", "corpus-coverage"],
    type: "scenario",
    prompt:
      "Your support bot for a payments SDK gets poor ratings on questions about accounting integrations (QuickBooks, Xero). The team wants to try a bigger embedding model. You run 40 representative integration queries, retrieve 50 candidates each, and have a judge mark relevance: 0 of 40 queries have even one relevant chunk among the 50.",
    fields: [
      {
        label: "Most likely pitfall",
        options: ["Corpus coverage", "Retrieval ranking", "Hallucination", "Query rejection"],
        answer: "Corpus coverage",
      },
      {
        label: "Best next step",
        options: [
          "Confirm the docs are missing, then write them and decline these questions meanwhile",
          "Switch to the bigger embedding model and rerun",
          "Raise k from 10 to 50 in production",
          "Add a reranker on top of the current retriever",
        ],
        answer: "Confirm the docs are missing, then write them and decline these questions meanwhile",
      },
    ],
    explanation:
      "When a whole segment finds no relevant chunk even in a wide top-50 net, ranking isn't the issue: the content likely doesn't exist (as with the Salesforce integration in the talk). No retriever change can surface a document that isn't there. Check by hand that it's missing rather than mangled by extraction, then fix the corpus.",
    lessonAnchor: "pitfall-1-corpus-coverage",
  },
  {
    id: "ev-ragpit-step-chunks",
    lectures: [16],
    tags: ["rag", "chunking"],
    type: "mcq",
    prompt:
      "Setup answers from your help-center bot interleave steps from different guides. The help pages are each under 800 words, and the pipeline (scaffolded by a coding assistant) splits them into 128-token chunks, so each numbered step is its own chunk. What change did the talk recommend in this exact situation?",
    options: [
      "Index each help page whole, without chunking",
      "Halve the chunk size so steps never share a chunk",
      "Add 50% overlap between the 128-token chunks",
      "Tell the generator to only use steps from one document",
    ],
    answer: "Index each help page whole, without chunking",
    explanation:
      "Asking \"why chunk at all?\" revealed the pages were small enough to retrieve whole, which keeps steps together and in order. Smaller chunks make the mixing worse. Overlap helps a little but still splits the sequence. A prompt instruction treats the symptom while retrieval keeps returning fragments.",
    lessonAnchor: "pitfall-3-chunk-quality",
  },
  {
    id: "ev-ragpit-hot-chunk",
    lectures: [16],
    tags: ["rag", "chunking"],
    type: "scenario",
    prompt:
      "You log retrieval frequency over 1,000 eval queries with k=5. One chunk, a glossary of your product's core terms, appears in 790 of the result lists. 140 chunks never appear at all.",
    fields: [
      {
        label: "Share of queries retrieving the glossary",
        options: ["79%", "16%", "7.9%", "100%"],
        answer: "79%",
      },
      {
        label: "Sensible move for the glossary",
        options: [
          "Put it in the system prompt instead of retrieving it",
          "Delete it from the index because it crowds out other chunks",
          "Split it into 790 smaller chunks",
          "Ignore it: frequent retrieval means it is working",
        ],
        answer: "Put it in the system prompt instead of retrieving it",
      },
      {
        label: "What to do about the 140 never-retrieved chunks",
        options: [
          "Read a sample and ask why: irrelevant to users, or broken in extraction?",
          "Delete them all immediately",
          "Boost their scores so they get retrieved",
          "Nothing: unretrieved chunks cost nothing",
        ],
        answer: "Read a sample and ask why: irrelevant to users, or broken in extraction?",
      },
    ],
    explanation:
      "790 of 1,000 is 79%, close to the roughly 80% case Skylar described. Context that helps nearly every query belongs in the prompt, which also frees a retrieval slot. Never-retrieved chunks are a prompt to investigate, not to delete or boost: they may be off-topic, or they may be garbled by extraction and hiding content users need.",
    lessonAnchor: "pitfall-3-chunk-quality",
  },
  {
    id: "ev-ragpit-sufficiency",
    lectures: [16],
    tags: ["rag", "retrieval-sufficiency"],
    type: "scenario",
    prompt:
      "For the query \"What's the monthly request quota on the Starter plan?\", all 5 retrieved chunks are about Starter plan limits (concurrency, file size, seats, support SLA, overage pricing). None states the request quota. The answer gives a confident number.",
    fields: [
      { label: "Precision@5 by topical relevance", options: ["1.0", "0.0", "0.2", "0.5"], answer: "1.0" },
      { label: "Is retrieval sufficient?", options: ["No", "Yes", "Partly, 4 of 5"], answer: "No" },
      {
        label: "Where the confident number comes from",
        options: ["The model filling the gap (hallucination)", "The overage pricing chunk", "A stale index"],
        answer: "The model filling the gap (hallucination)",
      },
    ],
    explanation:
      "Every chunk is on topic, so a relevance-based precision is perfect, yet the question can't be answered from them. That gap is why the talk argues for annotating sufficiency per query (\"could I answer from only this text?\") rather than trusting ranking metrics alone. Without the fact in context, the model invents one.",
    lessonAnchor: "pitfall-5-retrieval-sufficiency",
  },
  {
    id: "ev-ragpit-vague-queries",
    lectures: [16],
    tags: ["rag", "query-rejection"],
    type: "scenario",
    prompt:
      "You add 30 deliberately vague queries (\"thing broken\", \"doesn't work\") and 70 clear ones to the eval set. The new clarification step asks a follow-up on 24 of the vague queries and on 14 of the clear ones.",
    fields: [
      { label: "Elicitation rate on vague queries", options: ["80%", "24%", "63%", "38%"], answer: "80%" },
      { label: "False-alarm rate on clear queries", options: ["20%", "14%", "37%", "47%"], answer: "20%" },
      {
        label: "Verdict",
        options: [
          "Good catch rate, but it pesters too many clear queries; tune before shipping",
          "Ship it: 80% is above target",
          "Remove it: it misses 6 vague queries",
        ],
        answer: "Good catch rate, but it pesters too many clear queries; tune before shipping",
      },
    ],
    explanation:
      "24/30 = 80% of vague queries are caught. 14/70 = 20% of clear queries get an unneeded follow-up. Measuring only the vague side would hide that one in five good users now has to answer an extra question. Track both rates.",
    lessonAnchor: "pitfall-4-query-rejection",
  },
  {
    id: "ev-ragpit-citations",
    lectures: [16],
    tags: ["rag", "hallucination"],
    type: "mcq",
    prompt:
      "Your RAG answers now include in-text citations like [doc-17]. Which pair of checks does the talk recommend running on each citation?",
    options: [
      "The cited ID exists in the retrieved context, and the cited passage supports the sentence it's attached to",
      "The answer has at least one citation, and citations are sorted by rank",
      "The cited document is recent, and it has high NDCG",
      "The citation format matches the regex, and the answer is under 200 words",
    ],
    answer: "The cited ID exists in the retrieved context, and the cited passage supports the sentence it's attached to",
    explanation:
      "Existence is a cheap code check that catches invented citations. Support is semantic and needs an LLM judge or a validator (the talk points to semantic validation in Instructor). Together they turn vague hallucination worries into two rates you can track.",
    lessonAnchor: "pitfall-6-hallucination",
  },
  {
    id: "ev-ragpit-data-drift",
    lectures: [16],
    tags: ["rag", "data-versioning"],
    type: "mcq",
    prompt:
      "Monday's eval scored 91%. Thursday's scored 83% with the same prompt, model and retriever code. Failures cluster on API limits questions, and the docs team says they \"updated some pages this week\". What would have saved the most time?",
    options: [
      "Recording an index version (or at least a last-changed date) with every eval run",
      "Running the eval three times and averaging",
      "Switching the judge to a stronger model",
      "Pinning the LLM's temperature to 0",
    ],
    answer: "Recording an index version (or at least a last-changed date) with every eval run",
    explanation:
      "The retrieval data isn't static. Like the rate limit that moved from 1,000 to 2,500 requests per minute in the talk, a doc change can make outputs and gold answers disagree. Knowing when the index changed lets you see that immediately instead of chasing a ghost in the prompt or model.",
    lessonAnchor: "pitfall-7-changing-data",
  },
  {
    id: "ev-ragpit-where-to-start",
    lectures: [16],
    tags: ["rag", "process"],
    type: "order",
    prompt: "Skylar's advice for building RAG evals without boiling the ocean. Put the steps in order.",
    steps: [
      "Evaluate the core problem end to end",
      "Run error analysis to find the component causing the most failures",
      "Build an eval for that component",
      "Fix it and measure the change",
      "Run error analysis again to find the next worst component",
    ],
    explanation:
      "Starting with seven component evals delays any improvement. Start from the whole system, let error analysis point at the worst stage, eval and fix that, and repeat. Component evals accumulate where they earn their place.",
    lessonAnchor: "where-to-start",
  },
];
