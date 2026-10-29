import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "ev-hw4-metrics-from-ranks",
    lectures: [12],
    tags: ["retrieval-metrics", "homework"],
    type: "scenario",
    prompt:
      "You run BM25 (top 5) on five synthetic recipe queries. Each has exactly one source recipe. The source recipe lands at ranks 1, 3, not in the top 5, 2 and 1.",
    fields: [
      { label: "Recall@1", options: ["0.20", "0.40", "0.60", "0.80"], answer: "0.40" },
      { label: "Recall@3", options: ["0.40", "0.60", "0.80", "1.00"], answer: "0.80" },
      { label: "MRR", options: ["0.47", "0.57", "0.71", "0.80"], answer: "0.57" },
    ],
    explanation:
      "Two of five queries have the target at rank 1 (0.40); four of five have it in the top 3 (0.80). MRR averages 1/rank over all five queries, with 0 for the miss: (1 + 0.33 + 0 + 0.5 + 1) / 5 = 0.57. Dropping the miss from the denominator gives 0.71, which is the most common mistake: misses must count as zero, or a retriever that fails more often can look better.",
    lessonAnchor: "step-4-score-the-retriever",
  },
  {
    id: "ev-hw4-whitespace-tokens",
    lectures: [12],
    tags: ["bm25", "tokenization"],
    type: "scenario",
    prompt:
      "Your BM25 baseline tokenizes with text.lower().split(). Almost every synthetic query ends with a question mark (\"...not dry?\"), and in the traces the last word of the query never appears among the matched terms.",
    fields: [
      {
        label: "Root cause",
        options: [
          "Punctuation stays glued to words, so \"dry?\" never equals \"dry\"",
          "BM25 ignores the last token of a query",
          "The last word is too common to matter",
          "The index is stale and needs rebuilding",
        ],
        answer: "Punctuation stays glued to words, so \"dry?\" never equals \"dry\"",
      },
      {
        label: "First thing to try",
        options: [
          "Strip punctuation in the tokenizer and rerun the same query set",
          "Switch to embeddings",
          "Add an LLM query rewrite step",
          "Regenerate the queries without question marks",
        ],
        answer: "Strip punctuation in the tokenizer and rerun the same query set",
      },
    ],
    explanation:
      "Whitespace splitting keeps \"bread?\" and \"dry?\" as tokens that match nothing. On the homework's reference set, stripping punctuation alone moved MRR from 0.49 to 0.55, and also dropping query stopwords reached 0.73. Cheap preprocessing fixes come before new models or LLM steps. Regenerating the queries would just hide the bug from your eval while real users keep typing question marks.",
    lessonAnchor: "tokenization-fixes",
  },
  {
    id: "ev-hw4-rewrite-hurt",
    lectures: [12],
    tags: ["query-rewrite", "comparison"],
    type: "scenario",
    prompt:
      "On a 199-query synthetic set, plain BM25 scores MRR 0.92. The same retriever behind an LLM query-rewrite step scores 0.85 on the same queries. A teammate says the rewrite \"obviously makes queries cleaner\" and wants to ship it.",
    fields: [
      {
        label: "Decision",
        options: [
          "Don't ship it on this evidence; read the queries the rewrite made worse",
          "Ship it: LLM steps generalize better than keyword search",
          "Average the two runs and ship whichever is closer",
          "Rerun until the rewrite wins",
        ],
        answer: "Don't ship it on this evidence; read the queries the rewrite made worse",
      },
      {
        label: "A plausible reason it lost",
        options: [
          "Synthetic queries already share the recipe's distinctive words, and rewrites paraphrase some of them away",
          "MRR cannot measure rewritten queries",
          "BM25 scores are probabilities, so rewriting changes their scale",
          "The rewrite model was too large",
        ],
        answer: "Synthetic queries already share the recipe's distinctive words, and rewrites paraphrase some of them away",
      },
    ],
    explanation:
      "The eval says the rewrite hurt, so the next step is reading the per-query rows where rank got worse. Queries generated from a recipe tend to reuse its exact words, which is the best case for keyword search; a rewrite can drop or generalize them (\"turkey\" to \"poultry\"). Real user queries may behave differently, so the rewrite is worth re-testing on real traffic, but the synthetic result doesn't justify shipping it.",
    lessonAnchor: "llm-query-rewriting",
  },
  {
    id: "ev-hw4-pipeline-order",
    lectures: [12],
    tags: ["workflow", "homework"],
    type: "order",
    prompt: "Put the homework's retrieval evaluation workflow in order.",
    steps: [
      "Load the recipes and read a sample of them",
      "Generate (query, salient fact, source recipe ID) rows with an LLM",
      "Filter out malformed and unrealistic queries",
      "Build the BM25 index over name, ingredients, steps and tags",
      "Run retrieval per query and compute Recall@1/3/5 and MRR",
      "Read the misses and group them into causes",
      "Try one fix at a time and rerun on the same query set",
    ],
    explanation:
      "Data first: the query set is built from the recipes and should not depend on which retriever you plan to use. Then index, score, and only after reading the misses decide which fix to try. Each fix is a new run on the same queries so the numbers are comparable.",
    lessonAnchor: "what-the-homework-asks",
  },
  {
    id: "ev-hw4-stemming-flat",
    lectures: [12],
    tags: ["analysis", "comparison"],
    type: "scenario",
    prompt:
      "Your favorite failure is \"What's the best way to poach salmon...\": the recipe says \"poached\", never \"poach\". Adding Porter stemming moves it from rank 9 to rank 1. Across all 200 queries, MRR goes from 0.733 to 0.726 and Recall@5 from 85.0% to 85.5%.",
    fields: [
      {
        label: "What the numbers say",
        options: [
          "Stemming is roughly neutral overall; it helps some queries and hurts others",
          "Stemming is a clear win because it fixed the hardest query",
          "Stemming broke the retriever",
          "The eval is wrong because the salmon query improved",
        ],
        answer: "Stemming is roughly neutral overall; it helps some queries and hurts others",
      },
      {
        label: "Next step",
        options: [
          "Diff per-query ranks between the two runs and read the ones that got worse",
          "Ship it and move on",
          "Remove the salmon query from the set",
          "Increase k until both runs reach 100%",
        ],
        answer: "Diff per-query ranks between the two runs and read the ones that got worse",
      },
    ],
    explanation:
      "One rescued example is an anecdote; the aggregate says the change is a wash. Saving per-query rows lets you diff runs and see which queries moved down and why. Removing an inconvenient query or inflating k just games the metric.",
    lessonAnchor: "tokenization-fixes",
  },
  {
    id: "ev-hw4-cross-set",
    lectures: [12],
    tags: ["comparison"],
    type: "mcq",
    prompt:
      "One classmate reports BM25 MRR of 0.49 on the course's reference queries. Another reports 0.92 on queries they generated themselves with similar recipes in the prompt. What can you conclude about their retrievers?",
    options: [
      "Nothing yet: the query sets differ, so the numbers aren't comparable",
      "The second retriever is almost twice as good",
      "The first classmate has a bug, since 0.49 is too low",
      "The second set is better because its MRR is higher",
    ],
    answer: "Nothing yet: the query sets differ, so the numbers aren't comparable",
    explanation:
      "Retrieval metrics are relative to a query set. The reference queries are long and full of generic cooking words; the other set was built to be unique to each recipe and includes distinctive words like \"crab\" and \"lasagna\". Compare retrievers only on the same queries with the same k and MRR cutoff. 0.49 is inside the README's expected 0.4 to 0.7 range for plain BM25.",
    lessonAnchor: "llm-query-rewriting",
  },
  {
    id: "ev-hw4-filters",
    lectures: [12],
    tags: ["synthetic-data", "filtering"],
    type: "scenario",
    prompt:
      "Your query generator returns three rows. Decide which filter, if any, should remove each one.",
    fields: [
      {
        label: "\"lasagna bake\" with salient fact \"it is tasty\"",
        options: ["Code check in the output parser", "LLM realism judge", "Keep it"],
        answer: "Code check in the output parser",
      },
      {
        label: "\"What is the exact sodium in milligrams for step 14 of recipe 65007?\"",
        options: ["Code check in the output parser", "LLM realism judge", "Keep it"],
        answer: "LLM realism judge",
      },
      {
        label: "\"How long should I roast garlic for a white lasagna with crab and veggies?\"",
        options: ["Code check in the output parser", "LLM realism judge", "Keep it"],
        answer: "Keep it",
      },
    ],
    explanation:
      "Mechanical problems (no question mark, too short, a fact with no concrete cooking signal) are cheap to catch with code. A well-formed but implausible question is a judgment call, which is what the realism score is for; it is used once as a filter and never reported. The garlic question is the kind of specific, natural query you want.",
    lessonAnchor: "filter-before-you-trust-it",
  },
  {
    id: "ev-hw4-read-misses",
    lectures: [12],
    tags: ["analysis"],
    type: "scenario",
    prompt:
      "Two misses from your retrieval eval. Miss 1: \"How long should the chicken soak in the citrus mixture before grilling?\"; the recipe says \"marinate\", \"lemon juice\" and \"grill\". Miss 2: \"What oven temperature do I need for this sweet, yeast-based bread?\"; at least four sweet yeast breads are in the corpus.",
    fields: [
      {
        label: "Miss 1 cause",
        options: [
          "Vocabulary mismatch between query and recipe",
          "The query doesn't identify the recipe",
          "Tokenization bug",
          "The recipe is missing from the index",
        ],
        answer: "Vocabulary mismatch between query and recipe",
      },
      {
        label: "Miss 2 cause",
        options: [
          "The query doesn't identify the recipe",
          "Vocabulary mismatch between query and recipe",
          "Tokenization bug",
          "BM25 length penalty",
        ],
        answer: "The query doesn't identify the recipe",
      },
      {
        label: "Fix most likely to help Miss 1",
        options: [
          "Query rewriting or expansion with cooking synonyms",
          "Regenerating the query with the dish name",
          "Raising k from 5 to 50",
          "Stripping punctuation",
        ],
        answer: "Query rewriting or expansion with cooking synonyms",
      },
    ],
    explanation:
      "Miss 1 is the classic case for expansion: \"soak\" and \"citrus\" mean \"marinate\" and \"lemon\", which BM25 can't know. Miss 2 is different: the query genuinely fits several recipes, so no retriever change will reliably pick the source. That may be a query-generation problem (the question should be unique to its recipe) or, with real users, a reason for the bot to ask a follow-up. Grouping misses by cause tells you which fix to try.",
    lessonAnchor: "step-5-read-the-misses",
  },
  {
    id: "ev-hw4-relevance-judge",
    lectures: [12],
    tags: ["llm-judge", "retrieval-metrics"],
    type: "mcq",
    prompt:
      "After computing Recall@k and MRR, you run an LLM document-relevance judge over the top 5 documents of 100 queries (500 judgments). What does it add?",
    options: [
      "Whether the returned documents are on topic, which works even without a known source recipe",
      "A more accurate version of Recall@5",
      "Ground-truth labels you can report without validation",
      "A replacement for reading misses",
    ],
    answer: "Whether the returned documents are on topic, which works even without a known source recipe",
    explanation:
      "Hit metrics only know about one source recipe per query. A relevance judge labels every retrieved document as relevant or unrelated, which gives a precision-style view and can run on production traffic with no ground truth. It is still an LLM judge, so check it against human labels before trusting its numbers.",
    lessonAnchor: "beyond-the-metrics",
  },
];
