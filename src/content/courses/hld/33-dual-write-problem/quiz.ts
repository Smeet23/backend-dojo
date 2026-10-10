import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-dualwrite-missing-events",
    lectures: [33],
    tags: ["dual-write", "outbox"],
    type: "scenario",
    prompt:
      "Your order service does INSERT INTO orders, then producer.send(\"orders\", event). A weekly reconciliation finds about 40 orders a week with no shipment. They line up with deploy times.\nWhat's happening, and what do you change?",
    fields: [
      { label: "Root cause", options: ["Kafka lost acknowledged messages", "Pods killed between the DB commit and the publish", "The shipment service is too slow", "Postgres rolled back the inserts"], answer: "Pods killed between the DB commit and the publish" },
      { label: "Fix", options: ["Publish before inserting", "Wrap the send inside the DB transaction", "Write an outbox row in the same transaction and relay it", "Increase the Kafka producer timeout"], answer: "Write an outbox row in the same transaction and relay it" },
    ],
    explanation:
      "Deploys kill pods in the gap between two independent writes. Reordering only moves the gap, and a DB transaction can't include a Kafka send. The outbox makes the event part of the same local commit, so a relay can always finish the job.",
    lessonAnchor: "the-transactional-outbox",
  },
  {
    id: "hld-dualwrite-tx-wrap",
    lectures: [33],
    tags: ["dual-write"],
    type: "mcq",
    prompt:
      "A teammate proposes: \"Just call kafka.send inside db.transaction(...). If the send throws, the transaction rolls back.\" What's the remaining problem?",
    options: [
      "Nothing: this makes the two writes atomic",
      "If the send succeeds and the commit then fails, the event is already out and can't be recalled",
      "Kafka sends can't be called from inside a transaction callback",
      "It only works with MySQL, not Postgres",
    ],
    answer: "If the send succeeds and the commit then fails, the event is already out and can't be recalled",
    explanation:
      "The broker isn't a participant in the database transaction. The send-then-commit-fails path still publishes a phantom event, and holding the transaction open across a network call also lengthens lock time.",
    lessonAnchor: "wrapping-both-in-a-database-transaction-doesnt-help-either",
  },
  {
    id: "hld-dualwrite-outbox-duplicate",
    lectures: [33],
    tags: ["outbox", "idempotency"],
    type: "scenario",
    prompt:
      "Your outbox relay publishes a row, Kafka acks it, and the relay crashes before setting published_at. It restarts.\nWhat happens, and what makes it safe?",
    fields: [
      { label: "Result", options: ["The event is lost", "The event is published again", "The relay skips the row automatically", "The order row is rolled back"], answer: "The event is published again" },
      { label: "Delivery guarantee", options: ["At-most-once", "At-least-once", "Exactly-once", "Best effort"], answer: "At-least-once" },
      { label: "What consumers need", options: ["Larger batch sizes", "Idempotency by event id", "A shorter polling interval", "Two-phase commit"], answer: "Idempotency by event id" },
    ],
    explanation:
      "The row is still unpublished from the relay's point of view, so it is sent again. The outbox trades loss for duplicates, which idempotent consumers absorb.",
    lessonAnchor: "what-the-outbox-guarantees",
  },
  {
    id: "hld-dualwrite-search-index",
    lectures: [33],
    tags: ["cdc"],
    type: "scenario",
    prompt:
      "A legacy monolith writes to a MySQL products table from 30 different code paths, including admin scripts. You need Elasticsearch to reflect every change within seconds without touching the monolith's code.",
    fields: [
      { label: "Approach", options: ["Add an outbox insert to all 30 code paths", "CDC on the products table from the binlog", "Listen-to-yourself", "A nightly full reindex"], answer: "CDC on the products table from the binlog" },
      { label: "Tool", options: ["Debezium on Kafka Connect", "Redis keyspace notifications", "A cron job with SELECT *", "XA transactions"], answer: "Debezium on Kafka Connect" },
    ],
    explanation:
      "CDC reads committed changes from the binlog regardless of which code path made them, with no app changes. An outbox would need edits in 30 places and would still miss raw admin scripts.",
    lessonAnchor: "cdc-on-raw-tables-vs-outbox-plus-cdc",
  },
  {
    id: "hld-dualwrite-public-contract",
    lectures: [33],
    tags: ["cdc", "outbox"],
    type: "mcq",
    prompt:
      "Five teams consume Debezium events from your orders table directly. You want to rename status to state and split it into two columns. Every consumer will break. What setup would have avoided this?",
    options: [
      "Polling the orders table instead of reading the WAL",
      "Outbox table plus Debezium's outbox event router, publishing explicit domain events",
      "Using MongoDB change streams",
      "Turning off the initial snapshot",
    ],
    answer: "Outbox table plus Debezium's outbox event router, publishing explicit domain events",
    explanation:
      "Raw-table CDC makes your internal schema a public contract. With an outbox, you choose the event shape and version it independently of the table layout, while still getting log-based delivery.",
    lessonAnchor: "cdc-on-raw-tables-vs-outbox-plus-cdc",
  },
  {
    id: "hld-dualwrite-wal-disk",
    lectures: [33],
    tags: ["cdc", "operations"],
    type: "mcq",
    prompt:
      "Kafka Connect was down over a long weekend. On Monday, the primary Postgres alerts that its disk is 95% full, though table sizes haven't changed. Most likely cause?",
    options: [
      "The outbox table has grown",
      "Debezium's replication slot is holding WAL that hasn't been consumed",
      "Autovacuum is disabled",
      "Kafka wrote its log segments to the Postgres disk",
    ],
    answer: "Debezium's replication slot is holding WAL that hasn't been consumed",
    explanation:
      "A logical replication slot retains WAL until its consumer confirms it. With the consumer down, WAL accumulates. Monitor slot lag and cap retained WAL.",
    lessonAnchor: "debezium",
  },
  {
    id: "hld-dualwrite-listen-yourself",
    lectures: [33],
    tags: ["listen-to-yourself"],
    type: "scenario",
    prompt:
      "A service switches to listen-to-yourself: POST /orders publishes OrderPlaced and returns, and the service's own consumer inserts the row. QA reports that the page shown right after checkout sometimes says \"order not found\".",
    fields: [
      { label: "What property was lost", options: ["Durability", "Read-your-writes", "Partition tolerance", "Message ordering"], answer: "Read-your-writes" },
      { label: "Reasonable fix", options: ["Return 202 with a status URL and let the UI poll", "Switch Kafka to synchronous replication", "Publish the event twice", "Add a bigger consumer thread pool"], answer: "Return 202 with a status URL and let the UI poll" },
    ],
    explanation:
      "The response goes back before the consumer has written the row, so an immediate read can miss it. Making the asynchrony explicit with 202 plus polling (or a pending-writes cache) is the usual fix.",
    lessonAnchor: "listen-to-yourself",
  },
  {
    id: "hld-dualwrite-dedup-store",
    lectures: [33],
    tags: ["idempotency"],
    type: "scenario",
    prompt:
      "An inventory consumer records processed event ids in Redis and updates stock in Postgres. After a crash, some events are processed twice anyway.",
    fields: [
      { label: "Why", options: ["Redis is too slow", "The dedup record and the stock update aren't committed atomically", "Event ids aren't unique", "Kafka reorders partitions"], answer: "The dedup record and the stock update aren't committed atomically" },
      { label: "Fix", options: ["Store processed ids in a Postgres table in the same transaction", "Use a longer Redis TTL", "Disable consumer retries", "Commit the Kafka offset before processing"], answer: "Store processed ids in a Postgres table in the same transaction" },
    ],
    explanation:
      "Splitting dedup and effect across Redis and Postgres is itself a dual write. Commit both in one database transaction. Committing the offset first would just turn duplicates into losses.",
    lessonAnchor: "idempotent-consumers",
  },
  {
    id: "hld-dualwrite-out-of-order",
    lectures: [33],
    tags: ["idempotency", "ordering"],
    type: "mcq",
    prompt:
      "A price consumer dedups by event id, but occasionally a product shows an older price: the 'price=10' event arrives after 'price=12'. What fixes this?",
    options: [
      "Dedup by product id instead of event id",
      "Carry a version in each event and only apply it if it's newer than the stored version",
      "Use balance-style increments instead of absolute values",
      "Retry failed events faster",
    ],
    answer: "Carry a version in each event and only apply it if it's newer than the stored version",
    explanation:
      "Event-id dedup only catches exact duplicates, not reordering. A version or log-position check (UPDATE ... WHERE version less than the new one) drops stale events.",
    lessonAnchor: "techniques",
  },
  {
    id: "hld-dualwrite-outbox-order",
    lectures: [33],
    tags: ["outbox"],
    type: "order",
    prompt: "Put the transactional outbox flow in order.",
    steps: [
      "BEGIN a database transaction",
      "Insert the order row and the outbox row",
      "COMMIT the transaction",
      "Relay selects unpublished outbox rows",
      "Relay publishes the event and waits for the broker ack",
      "Relay marks the outbox row as published",
    ],
    explanation:
      "The business change and the event commit together, then a relay publishes and only marks rows as sent after the ack, which is why a crash leads to a resend, not a loss.",
    lessonAnchor: "the-transactional-outbox",
  },
];
