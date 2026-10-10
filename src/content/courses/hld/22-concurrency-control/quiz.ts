import type { Question } from "@/lib/types";

const LEVELS = ["Read uncommitted", "Read committed", "Repeatable read", "Serializable"];

export const quiz: Question[] = [
  {
    id: "hld-cc-wallet-race",
    lectures: [22],
    tags: ["concurrency", "lost-update"],
    type: "scenario",
    prompt:
      "A wallet service reads the balance, adds the top-up amount in Python, and writes the new balance back. Support finds users who topped up twice within a second but were credited only once. No errors were logged.\nWhat is this and what's the simplest fix?",
    fields: [
      { label: "Anomaly", options: ["Lost update", "Dirty read", "Phantom read", "Deadlock"], answer: "Lost update" },
      { label: "Fix", options: ["UPDATE wallets SET balance = balance + :amt in one statement", "Raise the isolation level to read committed", "Add an index on wallet id", "Cache the balance in Redis"], answer: "UPDATE wallets SET balance = balance + :amt in one statement" },
    ],
    explanation:
      "Both requests read the same old balance and the second write erased the first. An atomic UPDATE reads and writes under a row lock in one step. Read committed is already the default and doesn't prevent this race.",
    lessonAnchor: "the-lost-update",
  },
  {
    id: "hld-cc-report-drift",
    lectures: [22],
    tags: ["concurrency", "isolation"],
    type: "scenario",
    prompt:
      "A month-end report transaction on Postgres sums revenue per region, then sums the grand total in a second query. Under live traffic the regional sums don't add up to the grand total. The database runs at its default level.\nWhat's happening and which level fixes it with the least cost?",
    fields: [
      { label: "Anomaly", options: ["Non-repeatable reads across statements", "Dirty reads", "Lost updates", "Write skew"], answer: "Non-repeatable reads across statements" },
      { label: "Isolation level", options: LEVELS, answer: "Repeatable read" },
    ],
    explanation:
      "Read committed takes a new snapshot per statement, so the two queries see different moments. Repeatable read (snapshot isolation in Postgres) gives the whole read-only transaction one snapshot, without serializable's abort overhead.",
    lessonAnchor: "isolation-levels",
  },
  {
    id: "hld-cc-on-call",
    lectures: [22],
    tags: ["concurrency", "write-skew"],
    type: "scenario",
    prompt:
      "A shift app enforces 'at least one doctor on call'. Each request checks SELECT COUNT(*) ... WHERE on_call, then updates its own doctor's row, at repeatable read in Postgres. Twice this month, two doctors went off call at the same moment and nobody was left.\nWhat anomaly is it and what fixes it?",
    fields: [
      { label: "Anomaly", options: ["Write skew", "Lost update", "Dirty read", "Non-repeatable read"], answer: "Write skew" },
      { label: "Fix", options: ["Serializable isolation with a retry loop", "Read committed isolation", "A version column on each doctor row", "An index on on_call"], answer: "Serializable isolation with a retry loop" },
    ],
    explanation:
      "Each transaction wrote a different row, so snapshot isolation saw no conflict, yet together they broke the invariant. Serializable (SSI) detects the read-write dependency and aborts one. Per-row version columns don't help because the rows written are different.",
    lessonAnchor: "read-anomalies",
  },
  {
    id: "hld-cc-wiki-edit",
    lectures: [22],
    tags: ["concurrency", "optimistic"],
    type: "scenario",
    prompt:
      "In an internal wiki, editors open a page, edit for several minutes, and click save. Occasionally one editor's save silently wipes another's changes. Conflicts are rare.\nWhich approach fits, and what does the save look like?",
    fields: [
      { label: "Approach", options: ["Optimistic locking", "Pessimistic locking with SELECT FOR UPDATE", "Distributed lock in Redis", "Serializable isolation"], answer: "Optimistic locking" },
      { label: "Save statement", options: ["UPDATE pages SET body = ?, version = version + 1 WHERE id = ? AND version = ?", "SELECT body FROM pages WHERE id = ? FOR UPDATE", "UPDATE pages SET body = ? WHERE id = ?", "DELETE then INSERT the page"], answer: "UPDATE pages SET body = ?, version = version + 1 WHERE id = ? AND version = ?" },
    ],
    explanation:
      "You can't hold a database lock across minutes of user think time. Carrying the version in the form and checking it at save turns the write into a compare-and-set; 0 rows updated means someone saved first.",
    lessonAnchor: "optimistic-locking",
  },
  {
    id: "hld-cc-flash-sale",
    lectures: [22],
    tags: ["concurrency", "optimistic", "pessimistic"],
    type: "mcq",
    prompt:
      "A flash sale sends 5,000 purchase requests per second at the same inventory row. The team uses optimistic locking with a version column and sees p99 latency explode and most requests fail after several retries. What's the best change?",
    options: [
      "Use an atomic conditional UPDATE (stock = stock - 1 WHERE stock > 0) or a row lock, since contention is high",
      "Add more retries with no backoff",
      "Lower the isolation level to read uncommitted",
      "Move the version column into Redis",
    ],
    answer: "Use an atomic conditional UPDATE (stock = stock - 1 WHERE stock > 0) or a row lock, since contention is high",
    explanation:
      "Optimistic locking shines when conflicts are rare; on a hot row nearly every attempt conflicts and redoes work. A single conditional UPDATE queues writers on the row lock and never wastes work.",
    lessonAnchor: "pessimistic-or-optimistic",
  },
  {
    id: "hld-cc-api-etag",
    lectures: [22],
    tags: ["concurrency", "optimistic", "http"],
    type: "mcq",
    prompt:
      "A public REST API needs to stop two mobile clients from overwriting each other's edits to the same settings object. Which design matches optimistic concurrency over HTTP?",
    options: [
      "Return an ETag on GET; require If-Match on PUT and answer 412 if it doesn't match",
      "Return 409 on every PUT",
      "Hold a database lock between the client's GET and PUT",
      "Use Cache-Control: no-store",
    ],
    answer: "Return an ETag on GET; require If-Match on PUT and answer 412 if it doesn't match",
    explanation:
      "The ETag is the version and If-Match makes the PUT conditional, exactly like WHERE version = ?. Holding a DB lock between two HTTP requests would block others for an unbounded time.",
    lessonAnchor: "optimistic-locking",
  },
  {
    id: "hld-cc-mvcc-bloat",
    lectures: [22],
    tags: ["concurrency", "mvcc"],
    type: "scenario",
    prompt:
      "A Postgres orders table keeps growing on disk even though the row count is flat, and queries slow down. You find an analytics session that opened a transaction 9 hours ago and never closed it.\nWhat's the link?",
    fields: [
      { label: "Cause", options: ["The old transaction's snapshot pins old row versions so VACUUM can't remove them", "The transaction holds an exclusive table lock", "MVCC disables indexes during long transactions", "The WAL is full"], answer: "The old transaction's snapshot pins old row versions so VACUUM can't remove them" },
      { label: "Fix", options: ["End the idle transaction and set idle_in_transaction_session_timeout", "Switch to serializable", "Add more indexes", "Disable autovacuum"], answer: "End the idle transaction and set idle_in_transaction_session_timeout" },
    ],
    explanation:
      "MVCC keeps old versions as long as any snapshot might need them. A long-open transaction stops cleanup, so dead versions pile up. It doesn't block writers, which is why nothing visibly hangs.",
    lessonAnchor: "mvcc",
  },
  {
    id: "hld-cc-gc-pause",
    lectures: [22],
    tags: ["concurrency", "distributed-locks"],
    type: "scenario",
    prompt:
      "A payout worker takes a Redis lock with a 30-second TTL, then hits a 45-second GC pause. Another worker takes the lock and pays the vendor. The first worker wakes up and pays the vendor again.\nWhat is the root problem and the robust fix?",
    fields: [
      { label: "Root problem", options: ["The lease expired while the holder still believed it owned the lock", "Redis lost the key on failover", "The TTL was too long", "The lock wasn't released with DEL"], answer: "The lease expired while the holder still believed it owned the lock" },
      { label: "Robust fix", options: ["Fencing tokens checked by the payout store", "A longer TTL", "Retry the lock more often", "A second Redis instance"], answer: "Fencing tokens checked by the payout store" },
    ],
    explanation:
      "Any pause can outlast any TTL, so the holder can never be sure it still holds the lock. A monotonically increasing token that the resource checks rejects the zombie's stale write. A longer TTL only shrinks the window.",
    lessonAnchor: "fencing-tokens",
  },
  {
    id: "hld-cc-release-other",
    lectures: [22],
    tags: ["concurrency", "distributed-locks"],
    type: "mcq",
    prompt:
      "Workers acquire SET lock:job:5 1 NX PX 10000 and release with DEL lock:job:5. Under load, two workers sometimes run job 5 at once. What's the most direct bug?",
    options: [
      "A slow worker's DEL deletes the lock a newer worker now holds; store a unique token and compare-and-delete",
      "NX is not atomic",
      "PX should be EX",
      "Redis is single-threaded",
    ],
    answer: "A slow worker's DEL deletes the lock a newer worker now holds; store a unique token and compare-and-delete",
    explanation:
      "After its lease expired, the slow worker still runs DEL and frees someone else's lock. A per-holder token checked in a Lua script releases only your own lock. SET NX is already atomic.",
    lessonAnchor: "the-pitfalls",
  },
  {
    id: "hld-cc-avoid-lock",
    lectures: [22],
    tags: ["concurrency", "distributed-locks"],
    type: "scenario",
    prompt:
      "Ten worker instances poll a Postgres jobs table. The team plans to add a Redis distributed lock so two workers never claim the same job.\nWhat should you suggest instead, and why?",
    fields: [
      { label: "Alternative", options: ["SELECT ... FOR UPDATE SKIP LOCKED in the claim query", "Raise the isolation level to read uncommitted", "A ZooKeeper lock per worker", "Add a cache in front of the jobs table"], answer: "SELECT ... FOR UPDATE SKIP LOCKED in the claim query" },
      { label: "Reason", options: ["The claim is atomic inside the database that already holds the data, with no lease or failover issues", "Redis can't store job ids", "Distributed locks are always slower than any query", "SKIP LOCKED disables MVCC"], answer: "The claim is atomic inside the database that already holds the data, with no lease or failover issues" },
    ],
    explanation:
      "When the protected data lives in one database, use that database's own locking. SKIP LOCKED lets each worker grab different rows atomically, avoiding the extra moving part and its expiry pitfalls.",
    lessonAnchor: "pessimistic-locking",
  },
  {
    id: "hld-cc-lock-kind",
    lectures: [22],
    tags: ["concurrency", "distributed-locks"],
    type: "scenario",
    prompt:
      "Two uses of a distributed lock:\n1) Avoid two nodes rebuilding the same expensive dashboard cache at the same time.\n2) Ensure a bank transfer job runs exactly once per batch.\nPick the lock setup for each.",
    fields: [
      { label: "Dashboard cache", options: ["Single Redis SET NX with TTL", "etcd lease plus fencing tokens at the ledger", "No lock at all, ever", "Serializable isolation"], answer: "Single Redis SET NX with TTL" },
      { label: "Bank transfer", options: ["etcd lease plus fencing tokens at the ledger", "Single Redis SET NX with TTL", "A longer TTL", "An in-memory mutex"], answer: "etcd lease plus fencing tokens at the ledger" },
    ],
    explanation:
      "An efficiency lock can fail occasionally at the cost of duplicate work, so simple Redis is fine. A correctness lock must survive pauses and failover, so it needs consensus plus fencing or idempotent writes at the resource.",
    lessonAnchor: "efficiency-locks-and-correctness-locks",
  },
];
