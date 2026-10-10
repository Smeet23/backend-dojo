import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "search-ilike-slow",
    lectures: [15],
    tags: ["ilike", "indexes"],
    type: "mcq",
    prompt:
      "Your shop's search runs WHERE name ILIKE '%laptop%' on 5 million products and takes 8 seconds. A teammate adds a regular B-tree index on name. What happens?",
    options: [
      "Search becomes fast, because the column is now indexed",
      "Almost nothing; a leading % means the sorted index can't be used, so it still scans",
      "Search returns fewer results",
      "The query fails because ILIKE can't use indexes",
    ],
    answer: "Almost nothing; a leading % means the sorted index can't be used, so it still scans",
    explanation:
      "A B-tree is sorted by the start of the string, so it helps equality and prefix searches like 'lap%'. A pattern that can match anywhere forces a full scan. The query doesn't fail; it just stays slow.",
    lessonAnchor: "why-ilike-breaks-down",
  },
  {
    id: "search-relevance-order",
    lectures: [15],
    tags: ["relevance", "bm25", "boosting"],
    type: "scenario",
    prompt:
      "Shoppers searching \"laptop\" see a USB charger (whose long description mentions laptops) above an actual laptop. You're tuning the Elasticsearch query.",
    fields: [
      { label: "Change to make", options: ["Boost the title field, e.g. title^3", "Switch title to a keyword field", "Sort results by product id", "Add a wildcard *laptop*"], answer: "Boost the title field, e.g. title^3" },
      {
        label: "Why a short title match already helps",
        options: ["BM25 normalizes by field length", "Short fields are cached", "Elasticsearch always ranks title first", "Keyword fields score higher"],
        answer: "BM25 normalizes by field length",
      },
    ],
    explanation:
      "BM25 rewards matches in short fields, and a field boost tells the engine that title matches matter more. There's no automatic title-first rule; you set the weights. A keyword title would only match the exact full title.",
    lessonAnchor: "relevance-scoring",
  },
  {
    id: "search-mapping-types",
    lectures: [15],
    tags: ["mappings", "text-vs-keyword"],
    type: "scenario",
    prompt: "You're writing the Elasticsearch mapping for a product reviews index. Pick a field type for each.",
    fields: [
      { label: "review (the review body)", options: ["text", "keyword"], answer: "text" },
      { label: "sentiment (positive or negative, used as a filter)", options: ["text", "keyword"], answer: "keyword" },
      { label: "sku (exact lookups like AB-123)", options: ["text", "keyword"], answer: "keyword" },
      { label: "title (searched by shoppers)", options: ["text", "keyword"], answer: "text" },
    ],
    explanation:
      "text fields are analyzed into terms for full-text search. keyword fields keep the exact value for filters, sorting and aggregations. A text SKU would be split into ab and 123, so exact lookups would behave oddly.",
    lessonAnchor: "text-vs-keyword-mappings",
  },
  {
    id: "search-analyzer-stemming",
    lectures: [15],
    tags: ["analysis", "stemming"],
    type: "mcq",
    prompt:
      "A product is titled \"Running shoes\". A user searches \"run shoe\" and gets nothing, while \"Running shoes\" works. Which part of the setup is most likely missing?",
    options: [
      "A stemming step in the analyzer",
      "A keyword mapping on the title",
      "A higher title boost",
      "More shards",
    ],
    answer: "A stemming step in the analyzer",
    explanation:
      "Stemming reduces running and shoes to run and shoe at index time and query time, so both forms meet. Boosting only reorders matches that already exist; here there are none.",
    lessonAnchor: "analysis-turns-text-into-terms",
  },
  {
    id: "search-typo",
    lectures: [15],
    tags: ["fuzzy", "typos"],
    type: "scenario",
    prompt:
      "During a sale, many searches are \"laptpo\" and \"hedphones\" and return zero results. Product also wants suggestions to appear as people type.",
    fields: [
      { label: "Fix for typos", options: ["Fuzzy matching by edit distance", "A higher title boost", "Stop-word removal", "Switching to keyword fields"], answer: "Fuzzy matching by edit distance" },
      { label: "Fix for suggestions while typing", options: ["Edge n-grams or a completion suggester", "Exponential backoff", "A B-tree index", "Increase the refresh interval"], answer: "Edge n-grams or a completion suggester" },
    ],
    explanation:
      "laptpo is one swap away from laptop, which fuzzy matching tolerates. Type-ahead needs prefixes to be indexed terms, which edge n-grams or a completion suggester provide.",
    lessonAnchor: "typos-and-search-as-you-type",
  },
  {
    id: "search-postgres-or-es",
    lectures: [15],
    tags: ["postgres-fts", "elasticsearch"],
    type: "scenario",
    prompt:
      "A small notes app on Postgres (300k notes) needs a search box over note titles and bodies. There's one backend engineer and no search infrastructure.",
    fields: [
      { label: "Best choice", options: ["Postgres full-text search", "A new Elasticsearch cluster", "ILIKE with %term%", "Load all notes into memory and filter"], answer: "Postgres full-text search" },
      { label: "Index to create", options: ["GIN on a tsvector column", "B-tree on the body column", "Hash index on title", "No index needed"], answer: "GIN on a tsvector column" },
    ],
    explanation:
      "Postgres FTS gives an inverted index (GIN over tsvector), ranking and weights without new infrastructure or a sync pipeline. Elasticsearch becomes worth it when relevance, typo tolerance or scale outgrow Postgres, or you already run it.",
    lessonAnchor: "postgres-search-or-elasticsearch",
  },
  {
    id: "search-stale-index",
    lectures: [15],
    tags: ["sync", "elasticsearch"],
    type: "mcq",
    prompt:
      "Production incident: products deleted in the admin panel still appear in search results for hours. The shop uses Postgres as the main database and Elasticsearch for search. What's the underlying issue?",
    options: [
      "Elasticsearch is a separate copy, and deletes aren't being propagated to it",
      "BM25 gives deleted products a high score",
      "The title field needs a keyword mapping",
      "Postgres caches deleted rows",
    ],
    answer: "Elasticsearch is a separate copy, and deletes aren't being propagated to it",
    explanation:
      "The search index is secondary; every create, update and delete must reach it, usually via a background job or change-data-capture. Scoring and mappings can't remove documents that were never deleted from the index.",
    lessonAnchor: "postgres-search-or-elasticsearch",
  },
  {
    id: "search-index-build-order",
    lectures: [15],
    tags: ["inverted-index", "analysis"],
    type: "order",
    prompt: "Put the life of a search for \"Lightweight Laptops\" in order, from indexing to results.",
    steps: [
      "When a product is saved, the analyzer tokenizes, lowercases and stems its text",
      "Each resulting term is added to the inverted index with the product's id",
      "The same analyzer turns the query into the terms lightweight and laptop",
      "Each query term is looked up in the index to get its posting list",
      "Matching documents are scored with BM25 and field boosts",
      "Results are returned sorted by score",
    ],
    explanation:
      "The expensive work happens at write time: analyze and index. At query time the same analyzer normalizes the query, lookups fetch posting lists, and scoring orders the merged matches.",
    lessonAnchor: "the-inverted-index",
  },
];
