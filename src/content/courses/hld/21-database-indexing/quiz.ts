import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-index-slow-growth",
    lectures: [21],
    tags: ["indexing", "scans"],
    type: "scenario",
    prompt:
      "A login endpoint runs SELECT * FROM users WHERE email = ?. It took 3 ms at launch with 20,000 users. A year later, with 40 million users, it takes 4 seconds and other queries slow down whenever logins spike.\nWhat is happening and what's the fix?",
    fields: [
      { label: "Cause", options: ["Full table scan that grows with the table", "Lock contention on the users table", "Network latency to the database", "Too many indexes on users"], answer: "Full table scan that grows with the table" },
      { label: "Why other queries slow down too", options: ["The scans evict hot pages from the buffer cache", "The scans take exclusive table locks", "The connection pool is too small", "The planner cache is invalidated"], answer: "The scans evict hot pages from the buffer cache" },
      { label: "Fix", options: ["Unique B+ tree index on email", "Hash the email in the application", "Add a read replica", "Increase the database's CPU"], answer: "Unique B+ tree index on email" },
    ],
    explanation:
      "Without an index every login reads all 40 million rows, and those reads push useful pages out of memory for everyone else. A unique index turns the lookup into 3 or 4 page reads. A replica just spreads the same O(n) scan around.",
    lessonAnchor: "why-full-scans-are-slow",
  },
  {
    id: "hld-index-bplus-depth",
    lectures: [21],
    tags: ["indexing", "b-tree"],
    type: "mcq",
    prompt:
      "An interviewer asks why a point lookup in a 2-billion-row table indexed with a B+ tree usually costs only one or two disk reads. What's the best answer?",
    options: [
      "Each node is a page holding hundreds of keys, so the tree is 3 to 4 levels deep and the upper levels stay cached in memory",
      "B+ trees hash the key directly to the leaf page",
      "The leaves are linked, so the database can jump to any leaf",
      "The database keeps the whole table in memory once indexed",
    ],
    answer: "Each node is a page holding hundreds of keys, so the tree is 3 to 4 levels deep and the upper levels stay cached in memory",
    explanation:
      "High fan-out keeps the tree shallow, and the root and internal levels are small enough to live in the buffer cache. Linked leaves help range scans, not point lookups.",
    lessonAnchor: "why-so-shallow",
  },
  {
    id: "hld-index-leftmost-prefix",
    lectures: [21],
    tags: ["indexing", "composite"],
    type: "scenario",
    prompt:
      "orders has an index on (user_id, status, created_at). A new admin dashboard runs SELECT COUNT(*) FROM orders WHERE status = 'pending' AND created_at > now() - interval '1 day', and EXPLAIN shows a Seq Scan.\nWhy, and what do you add?",
    fields: [
      { label: "Why the index is ignored", options: ["status is not a leftmost prefix of the index", "COUNT(*) can never use an index", "Statistics are stale", "created_at is a timestamp"], answer: "status is not a leftmost prefix of the index" },
      { label: "Index to add", options: ["(status, created_at)", "(created_at, user_id)", "(user_id)", "A hash index on status"], answer: "(status, created_at)" },
    ],
    explanation:
      "The existing index is sorted by user_id first, so pending rows are scattered across every user. An index starting with the equality column status, then the range column created_at, lets the database seek straight to the slice.",
    lessonAnchor: "the-leftmost-prefix-rule",
  },
  {
    id: "hld-index-equality-before-range",
    lectures: [21],
    tags: ["indexing", "composite"],
    type: "mcq",
    prompt:
      "A query filters WHERE tenant_id = ? AND created_at > ? AND type = ?. Which composite index lets the database seek most tightly?",
    options: ["(tenant_id, type, created_at)", "(tenant_id, created_at, type)", "(created_at, tenant_id, type)", "(type, created_at)"],
    answer: "(tenant_id, type, created_at)",
    explanation:
      "Put equality columns first and the range column last. With created_at in the middle, the range breaks the ordering and type must be checked entry by entry inside the whole date range.",
    lessonAnchor: "choosing-column-order",
  },
  {
    id: "hld-index-covering-feed",
    lectures: [21],
    tags: ["indexing", "covering"],
    type: "scenario",
    prompt:
      "A profile page runs SELECT created_at, total FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20. With an index on (user_id) alone, EXPLAIN shows an Index Scan, then a Sort, and power users with 50,000 orders take 300 ms.\nWhat index makes this fastest?",
    fields: [
      { label: "Index", options: ["(user_id, created_at DESC) INCLUDE (total)", "(created_at, user_id)", "(total, user_id)", "A hash index on user_id"], answer: "(user_id, created_at DESC) INCLUDE (total)" },
      { label: "Resulting plan", options: ["Index Only Scan that stops after 20 entries", "Bitmap Heap Scan", "Seq Scan with a Sort", "Index Scan plus a Sort"], answer: "Index Only Scan that stops after 20 entries" },
    ],
    explanation:
      "Seeking on user_id with entries already ordered by created_at removes the sort, so the scan stops at 20, and including total means the table is never touched. A hash index can't provide ordering.",
    lessonAnchor: "covering-indexes",
  },
  {
    id: "hld-index-function",
    lectures: [21],
    tags: ["indexing", "planner"],
    type: "scenario",
    prompt:
      "events has an index on created_at. The query WHERE DATE(created_at) = '2026-03-01' does a Seq Scan over 200 million rows.\nWhat's wrong and what's the cheapest fix?",
    fields: [
      { label: "Cause", options: ["A function wraps the indexed column", "Low selectivity", "Stale statistics", "The table is too small"], answer: "A function wraps the indexed column" },
      { label: "Fix", options: ["Rewrite as created_at >= '2026-03-01' AND created_at < '2026-03-02'", "Add a hash index on created_at", "Run VACUUM FULL", "Add LIMIT 1000"], answer: "Rewrite as created_at >= '2026-03-01' AND created_at < '2026-03-02'" },
    ],
    explanation:
      "The index is sorted by created_at, not by DATE(created_at), so the planner can't seek. A half-open range on the raw column uses the existing index; an expression index would also work but costs an extra index.",
    lessonAnchor: "when-the-planner-ignores-an-index",
  },
  {
    id: "hld-index-low-selectivity",
    lectures: [21],
    tags: ["indexing", "planner"],
    type: "mcq",
    prompt:
      "users has an index on is_active. 92% of users are active. SELECT * FROM users WHERE is_active = true still does a Seq Scan. What's the right reaction?",
    options: [
      "Accept it: fetching 92% of rows through random index jumps would be slower than one sequential read",
      "Force the index with a hint",
      "Run ANALYZE until it uses the index",
      "Convert the index to a hash index",
    ],
    answer: "Accept it: fetching 92% of rows through random index jumps would be slower than one sequential read",
    explanation:
      "Indexes pay off when they're selective. For the rare value (inactive users) a partial index WHERE is_active = false would be useful; for the common value a scan is cheapest.",
    lessonAnchor: "when-the-planner-ignores-an-index",
  },
  {
    id: "hld-index-write-heavy",
    lectures: [21],
    tags: ["indexing", "write-cost"],
    type: "scenario",
    prompt:
      "An event ingestion table takes 40,000 inserts per second. Over time engineers added 11 indexes for ad-hoc reports, and insert latency has tripled. pg_stat_user_indexes shows 6 of them have 0 scans in a month.\nWhat do you do?",
    fields: [
      { label: "First step", options: ["Drop the unused indexes", "Add a covering index for the reports", "Switch the primary key to UUIDv4", "Increase shared_buffers"], answer: "Drop the unused indexes" },
      { label: "Where the reports should run", options: ["A replica or analytics store with its own indexes", "The same primary with more indexes", "In the application by loading the whole table", "Nowhere; reports must be removed"], answer: "A replica or analytics store with its own indexes" },
    ],
    explanation:
      "Every insert writes one entry into every index, so unused ones are pure cost. Move reporting to a store tuned for reads so the hot ingestion table keeps only the indexes its own queries need.",
    lessonAnchor: "the-write-cost-of-indexes",
  },
  {
    id: "hld-index-type-pick",
    lectures: [21],
    tags: ["indexing", "index-types"],
    type: "scenario",
    prompt:
      "Pick the index type for each need:\n1) Product search for 'running shoe' inside descriptions.\n2) A warehouse fact table filtered by many low-cardinality columns (country, channel, device) combined with AND and OR.",
    fields: [
      { label: "Need 1", options: ["Inverted index", "B+ tree", "Hash index", "Bitmap index"], answer: "Inverted index" },
      { label: "Need 2", options: ["Bitmap index", "Inverted index", "Hash index", "Clustered index"], answer: "Bitmap index" },
    ],
    explanation:
      "Inverted indexes map terms to documents, which is what full-text search needs; a B+ tree can't serve a word in the middle of text. Bitmaps make AND/OR over low-cardinality columns cheap bit operations, which suits read-mostly analytics.",
    lessonAnchor: "other-index-types",
  },
  {
    id: "hld-index-innodb-pk",
    lectures: [21],
    tags: ["indexing", "clustered"],
    type: "mcq",
    prompt:
      "A MySQL InnoDB table uses a 36-character string UUID as its primary key and has five secondary indexes. Why are those secondary indexes so large?",
    options: [
      "Each secondary index entry stores the primary key to find the row, so the wide key is repeated in every index",
      "InnoDB stores secondary indexes as hash tables",
      "Secondary indexes store the full row",
      "UUIDs disable index compression",
    ],
    answer: "Each secondary index entry stores the primary key to find the row, so the wide key is repeated in every index",
    explanation:
      "InnoDB clusters rows by primary key, and secondary indexes point back via the PK. A wide PK inflates every index; random UUIDs also cause page splits across the clustered tree.",
    lessonAnchor: "secondary-indexes",
  },
  {
    id: "hld-index-explain-steps",
    lectures: [21],
    tags: ["indexing", "explain"],
    type: "order",
    prompt: "Order the steps for fixing a slow query in production.",
    steps: [
      "Find the slowest queries in pg_stat_statements or the slow query log",
      "Run EXPLAIN ANALYZE and compare rows examined with rows returned",
      "Design an index: equality columns, then range or sort column, then included columns",
      "Create it with CREATE INDEX CONCURRENTLY",
      "Re-check the plan and watch write latency and index size",
    ],
    explanation:
      "Measure first, read the real plan, design for the query's shape, build without blocking writes, then confirm the read win didn't cost too much on writes.",
    lessonAnchor: "a-practical-workflow",
  },
];
