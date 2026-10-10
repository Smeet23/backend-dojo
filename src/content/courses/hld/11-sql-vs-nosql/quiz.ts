import type { Question } from "@/lib/types";

const FAMILIES = ["Relational (SQL)", "Key-value", "Document", "Wide-column", "Graph"];

export const quiz: Question[] = [
  {
    id: "hld-sqlnosql-match",
    lectures: [11],
    tags: ["data-models", "choosing"],
    type: "scenario",
    prompt: "A startup is splitting its data across stores. Pick the best-fitting family for each workload.",
    fields: [
      { label: "Wallet balances and transfers between users", options: FAMILIES, answer: "Relational (SQL)" },
      { label: "Login sessions with a 30-minute TTL, read on every request", options: FAMILIES, answer: "Key-value" },
      { label: "Fleet GPS pings: 400K writes/s, read as 'truck X, last 2 hours'", options: FAMILIES, answer: "Wide-column" },
      { label: "\"Is this new account linked to a known fraudster within 4 hops via devices or cards?\"", options: FAMILIES, answer: "Graph" },
    ],
    explanation:
      "Transfers need multi-row ACID transactions. Sessions are pure key lookups with expiry. GPS pings are write-heavy, append-only and read by partition (truck) plus time range. Multi-hop relationship traversal is what graph databases are built for.",
    lessonAnchor: "how-to-choose",
  },
  {
    id: "hld-sqlnosql-catalogue",
    lectures: [11],
    tags: ["document"],
    type: "mcq",
    prompt:
      "A marketplace sells shoes (size, drop, waterproof), laptops (CPU, RAM, ports) and books (ISBN, author, pages). Product pages load one product with all its attributes. A relational schema has grown to 300 mostly-NULL columns. What fits better?",
    options: [
      "A document store (or a JSONB column) holding each product as one nested document",
      "A graph database with one node per attribute",
      "A wide-column store with one table per attribute",
      "Keep adding columns; NULLs are free",
    ],
    answer: "A document store (or a JSONB column) holding each product as one nested document",
    explanation:
      "Heterogeneous attributes read as a whole are the document model's sweet spot, and Postgres JSONB gives the same shape inside a relational database. A graph adds traversal machinery nobody needs here.",
    lessonAnchor: "document-stores",
  },
  {
    id: "hld-sqlnosql-cassandra-query",
    lectures: [11],
    tags: ["wide-column", "data-modeling"],
    type: "scenario",
    prompt:
      "Your Cassandra table messages_by_chat has PRIMARY KEY ((chat_id), sent_at). Product now wants \"all messages sent by user U across every chat, newest first\". The query by sender_id is rejected or scans the cluster.\nWhat's the idiomatic fix?",
    fields: [
      {
        label: "Fix",
        options: [
          "Write each message to a second table partitioned by sender_id, clustered by sent_at",
          "Add a JOIN between messages_by_chat and users",
          "Run the query with ALLOW FILTERING in production",
          "Change the replication factor",
        ],
        answer: "Write each message to a second table partitioned by sender_id, clustered by sent_at",
      },
    ],
    explanation:
      "Wide-column stores are modelled one table per query; denormalizing into a second table is the intended pattern. There are no joins, and ALLOW FILTERING scans every partition, which collapses at scale.",
    lessonAnchor: "wide-column-stores",
  },
  {
    id: "hld-sqlnosql-seat-booking",
    lectures: [11],
    tags: ["acid", "transactions"],
    type: "scenario",
    prompt:
      "A concert-ticketing system must never sell the same seat twice, and must reserve the seat, create the order and record the payment intent together, or not at all.\nWhich property and store do you lean on?",
    fields: [
      { label: "Property", options: ["Atomicity + isolation (ACID transaction)", "Eventual consistency", "Schema on read", "Horizontal write scaling"], answer: "Atomicity + isolation (ACID transaction)" },
      { label: "Store", options: ["Relational database (or distributed SQL)", "Memcached", "Graph database", "An eventually consistent KV store with W=1"], answer: "Relational database (or distributed SQL)" },
    ],
    explanation:
      "All-or-nothing across several rows is atomicity; two buyers not both winning is isolation. A relational transaction with a uniqueness constraint on the seat gives both directly. An eventually consistent W=1 store can accept both sales on different replicas.",
    lessonAnchor: "transactions-and-acid",
  },
  {
    id: "hld-sqlnosql-base-like",
    lectures: [11],
    tags: ["base", "consistency"],
    type: "mcq",
    prompt:
      "A video platform's like counter sometimes shows 10,482 to one user and 10,479 to another for a few seconds. Which description fits, and is it acceptable?",
    options: [
      "BASE / eventual consistency; acceptable because like counts tolerate brief staleness",
      "An ACID violation that must be fixed with serializable transactions",
      "A schema-on-read bug",
      "A sign that a graph database is needed",
    ],
    answer: "BASE / eventual consistency; acceptable because like counts tolerate brief staleness",
    explanation:
      "Replicas converge shortly; nobody is harmed by a briefly different count. Paying for serializable transactions on every like would cost throughput for no business benefit.",
    lessonAnchor: "acid-vs-base",
  },
  {
    id: "hld-sqlnosql-hot-partition",
    lectures: [11],
    tags: ["scaling", "partition-key"],
    type: "scenario",
    prompt:
      "An events table in DynamoDB uses the partition key event_date (e.g. 2026-10-10). Writes are throttled every day even though the table's total capacity is far above the load.\nDiagnose and fix.",
    fields: [
      { label: "Diagnosis", options: ["Hot partition: all of today's writes hit one key", "Not enough replicas", "The schema is too flexible", "Missing secondary index"], answer: "Hot partition: all of today's writes hit one key" },
      { label: "Fix", options: ["Partition by a high-cardinality key such as device_id (date as sort key), or add a random suffix to the date", "Add more capacity to the table", "Move to a graph database", "Disable replication"], answer: "Partition by a high-cardinality key such as device_id (date as sort key), or add a random suffix to the date" },
    ],
    explanation:
      "Horizontal scaling only helps when load spreads across many partition keys. A date key funnels every write to one partition. A high-cardinality key or write sharding with suffixes spreads it; extra total capacity doesn't reach the hot partition.",
    lessonAnchor: "scaling",
  },
  {
    id: "hld-sqlnosql-scale-myth",
    lectures: [11],
    tags: ["scaling", "choosing"],
    type: "mcq",
    prompt:
      "An internal B2B app has 3,000 customers, 40 GB of data growing 5 GB a year, complex reporting needs, and invoicing. A developer proposes MongoDB \"because SQL doesn't scale\". Best response?",
    options: [
      "A single Postgres primary with a replica fits this comfortably for years, and gives joins and transactions for reporting and invoicing",
      "Agree; relational databases fail above 10 GB",
      "Use Cassandra for future-proofing",
      "Use Redis as the primary store for speed",
    ],
    answer: "A single Postgres primary with a replica fits this comfortably for years, and gives joins and transactions for reporting and invoicing",
    explanation:
      "Run the estimate: 40 GB is tiny for one relational node. The workload needs ad hoc reporting and transactional invoicing, which are relational strengths. Choosing for scale you'll never reach costs features you need now.",
    lessonAnchor: "scaling",
  },
  {
    id: "hld-sqlnosql-schema-read",
    lectures: [11],
    tags: ["schema"],
    type: "mcq",
    prompt:
      "A team using a document store renamed the field `phone` to `phoneNumber` in new code six months ago. Now an SMS job crashes on some users. Why?",
    options: [
      "Schema on read: old documents still have `phone`, and the code only handles the new shape",
      "The document store silently dropped the old field",
      "Indexes on `phone` were deleted",
      "The database enforced the new schema and rejected old documents",
    ],
    answer: "Schema on read: old documents still have `phone`, and the code only handles the new shape",
    explanation:
      "A flexible schema means no migration ran; old documents keep their old shape forever unless backfilled. The application must handle every version, or the team must migrate the data explicitly.",
    lessonAnchor: "schema-on-write-vs-schema-on-read",
  },
  {
    id: "hld-sqlnosql-polyglot",
    lectures: [11],
    tags: ["polyglot"],
    type: "scenario",
    prompt:
      "An e-commerce site keeps orders in Postgres. Search must support typo-tolerant full-text queries over the catalogue, and the catalogue changes a few thousand times a day.\nWhat do you add, and how is it kept in sync?",
    fields: [
      { label: "Add", options: ["A search engine (e.g. Elasticsearch/OpenSearch)", "A graph database", "A second Postgres primary", "Memcached"], answer: "A search engine (e.g. Elasticsearch/OpenSearch)" },
      { label: "Sync", options: ["Change-data-capture or events from the source of truth into the index", "Dual-write from the browser", "Nightly full copy by hand", "Make the search engine the source of truth for orders"], answer: "Change-data-capture or events from the source of truth into the index" },
    ],
    explanation:
      "Polyglot persistence adds a store for a workload the primary can't serve well. The source of truth stays in Postgres; CDC or events stream changes into the derived index so it stays reasonably fresh.",
    lessonAnchor: "polyglot-persistence",
  },
];
