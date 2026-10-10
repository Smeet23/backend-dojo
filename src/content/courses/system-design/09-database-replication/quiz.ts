import type { Question } from "@/lib/types";

const MODES = ["Synchronous (all replicas)", "Quorum (majority)", "Semi-synchronous", "Asynchronous"];

export const quiz: Question[] = [
  {
    id: "sd-repl-mode-pick",
    lectures: [9],
    tags: ["sync", "async"],
    type: "scenario",
    prompt: "Pick a replication mode for each system.",
    fields: [
      { label: "Comments on a social app, replicas on three continents", options: MODES, answer: "Asynchronous" },
      { label: "A 5-node ledger that must lose no acknowledged write and keep working with 2 nodes down", options: MODES, answer: "Quorum (majority)" },
      { label: "An order database with one nearby standby; losing an acked order is unacceptable, but cross-region latency on every write is too", options: MODES, answer: "Semi-synchronous" },
    ],
    explanation:
      "Async keeps writes fast for content where losing the last second is tolerable. A majority quorum loses nothing and survives a minority of failures, which waiting for all nodes can't. Semi-sync guarantees a second copy at the cost of one round trip to the nearest replica.",
    lessonAnchor: "sync-async-and-semi-sync",
  },
  {
    id: "sd-repl-write-bottleneck",
    lectures: [9],
    tags: ["scaling"],
    type: "mcq",
    prompt:
      "Your Postgres primary is at 90% CPU from INSERT/UPDATE traffic. Reads are already served by four replicas at 30% CPU. A teammate suggests adding four more replicas. What happens?",
    options: [
      "Write capacity doubles",
      "Nothing useful: every replica still applies every write, and writes still go to one primary; you need sharding or a bigger primary",
      "Replication lag disappears",
      "The primary's CPU drops because replicas share the write load",
    ],
    answer: "Nothing useful: every replica still applies every write, and writes still go to one primary; you need sharding or a bigger primary",
    explanation:
      "Single-leader replication scales reads, not writes. More replicas even add a little work for the primary (more streams to ship). Splitting data across several leaders (sharding) is what scales writes.",
    lessonAnchor: "leader-and-followers",
  },
  {
    id: "sd-repl-lost-writes",
    lectures: [9],
    tags: ["failover", "async"],
    type: "scenario",
    prompt:
      "With async replication, the primary crashed. The most up-to-date replica had applied changes up to 3 seconds before the crash, and it was promoted. Customers report orders confirmed in those 3 seconds are missing.\nExplain, and choose the fix for the future.",
    fields: [
      { label: "Why the orders are missing", options: ["The replica rejected them", "They were acked by the old primary but never shipped before it died", "Split brain deleted them", "The WAL was too small"], answer: "They were acked by the old primary but never shipped before it died" },
      { label: "Fix", options: ["Read orders from the primary", "Use semi-sync or quorum commit for the orders database", "Add more async replicas", "Shorten the failover timeout"], answer: "Use semi-sync or quorum commit for the orders database" },
    ],
    explanation:
      "Async acks before any replica has the write, so a crash can lose it. Waiting for at least one replica (and promoting that one) guarantees acked writes survive. More async replicas don't help: none of them had the writes either.",
    lessonAnchor: "failover",
  },
  {
    id: "sd-repl-split-brain",
    lectures: [9],
    tags: ["failover"],
    type: "mcq",
    prompt:
      "A network partition isolated the primary for 20 seconds. Failover promoted a replica, then the partition healed, and both nodes had accepted writes to the same rows. What should have prevented this?",
    options: [
      "A longer replication lag threshold",
      "Fencing the old primary (revoke its access or reject writes with a stale leader epoch) before promoting",
      "Sticky sessions",
      "Statement-based replication",
    ],
    answer: "Fencing the old primary (revoke its access or reject writes with a stale leader epoch) before promoting",
    explanation:
      "The old primary wasn't dead, just unreachable, so it kept accepting writes: split brain. Fencing guarantees only one node can act as leader. Sticky sessions only affect which replica serves reads.",
    lessonAnchor: "failover",
  },
  {
    id: "sd-repl-anomalies",
    lectures: [9],
    tags: ["lag", "consistency"],
    type: "scenario",
    prompt: "Match each bug report to the technique that fixes it.",
    fields: [
      {
        label: "\"I edited my bio, the page reloaded, and the old bio is back\"",
        options: ["Read your own writes", "Sticky sessions (monotonic reads)", "Lag-aware routing", "Add replicas"],
        answer: "Read your own writes",
      },
      {
        label: "\"The like count shows 140, then 80, then 120 as I refresh\"",
        options: ["Read your own writes", "Sticky sessions (monotonic reads)", "Lag-aware routing", "Add replicas"],
        answer: "Sticky sessions (monotonic reads)",
      },
      {
        label: "\"One replica showed 10k views for an hour while the video had 1M\"",
        options: ["Read your own writes", "Sticky sessions (monotonic reads)", "Lag-aware routing", "Add replicas"],
        answer: "Lag-aware routing",
      },
    ],
    explanation:
      "Your own edit must come from a node that has it (primary or a caught-up replica). Values jumping backwards come from hopping between replicas at different positions, so pin the user to one. A replica far behind should be taken out of rotation by a lag threshold.",
    lessonAnchor: "handling-replication-lag",
  },
  {
    id: "sd-repl-oversell",
    lectures: [9],
    tags: ["consistency"],
    type: "mcq",
    prompt:
      "Your shop uses semi-sync replication. The checkout reads stock from the nearest replica and, if qty > 0, writes the order. During a flash sale, 37 more units sold than existed. What's the fix?",
    options: [
      "Switch to fully synchronous replication",
      "Do the stock check on the primary atomically: UPDATE stock SET qty = qty - 1 WHERE sku = ? AND qty > 0",
      "Use sticky sessions for buyers",
      "Increase the lag threshold",
    ],
    answer: "Do the stock check on the primary atomically: UPDATE stock SET qty = qty - 1 WHERE sku = ? AND qty > 0",
    explanation:
      "Semi-sync improves durability, not read freshness, and even a fresh read followed by a separate write races with other buyers. A conditional decrement on the primary checks and reserves in one atomic step.",
    lessonAnchor: "semi-synchronous",
  },
  {
    id: "sd-repl-lag-cause",
    lectures: [9],
    tags: ["lag"],
    type: "scenario",
    prompt:
      "At 02:00 every night, a job runs one UPDATE touching 40 million rows. Replicas then show 15 minutes of lag, while lag is under 50 ms the rest of the day.\nName the cause and a fix.",
    fields: [
      { label: "Cause", options: ["Network distance", "A single large transaction must be shipped and applied in full", "Too many read queries", "Clock skew"], answer: "A single large transaction must be shipped and applied in full" },
      { label: "Fix", options: ["Run the update in small batches (e.g. 10k rows per transaction)", "Add more replicas", "Switch to statement-based replication", "Disable the WAL during the job"], answer: "Run the update in small batches (e.g. 10k rows per transaction)" },
    ],
    explanation:
      "Nothing after a huge transaction becomes visible on a replica until the whole thing is applied. Batching lets replicas keep pace. More replicas each face the same giant transaction.",
    lessonAnchor: "what-causes-lag",
  },
];
