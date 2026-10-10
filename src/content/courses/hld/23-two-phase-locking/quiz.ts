import type { Question } from "@/lib/types";

const VARIANTS = ["Basic 2PL", "Strict 2PL", "Rigorous 2PL", "Conservative 2PL"];

export const quiz: Question[] = [
  {
    id: "hld-2pl-violation",
    lectures: [23],
    tags: ["2pl", "serializability"],
    type: "mcq",
    prompt:
      "A transaction's lock log reads: lock(A), unlock(A), lock(B), unlock(B). Every read and write happened while holding the right lock. Does it follow two-phase locking?",
    options: [
      "No: it acquired B after releasing A, so it re-entered a growing phase",
      "Yes: every access was protected by a lock",
      "Yes, as long as A and B are different tables",
      "No: it should have used shared locks",
    ],
    answer: "No: it acquired B after releasing A, so it re-entered a growing phase",
    explanation:
      "2PL is about when you unlock, not just whether you lock. Once any lock is released, no new lock may be taken; otherwise another transaction can slip between and create a cycle.",
    lessonAnchor: "the-two-phases",
  },
  {
    id: "hld-2pl-compat",
    lectures: [23],
    tags: ["2pl", "locks"],
    type: "scenario",
    prompt:
      "Row 42 is currently held in shared mode by T1 and T2. Decide what happens to each new request.",
    fields: [
      { label: "T3 requests S on row 42", options: ["Granted", "Waits", "Aborts immediately", "Upgrades T1's lock"], answer: "Granted" },
      { label: "T4 requests X on row 42", options: ["Waits", "Granted", "Granted after T1 releases only", "Converted to S"], answer: "Waits" },
    ],
    explanation:
      "Shared locks are compatible with each other, so readers pile in. An exclusive lock conflicts with any shared holder, so T4 waits until every S holder (T1, T2 and now T3) has released.",
    lessonAnchor: "shared-and-exclusive-locks",
  },
  {
    id: "hld-2pl-cascade",
    lectures: [23],
    tags: ["2pl", "cascading-aborts"],
    type: "scenario",
    prompt:
      "In a lock-based engine, T1 updates a row and, after its lock point, releases the exclusive lock before committing. T2 reads the row and commits. T1 then aborts.\nWhat went wrong, and which variant prevents it?",
    fields: [
      { label: "Problem", options: ["Unrecoverable schedule: a committed transaction read data that was rolled back", "Deadlock", "Phantom read", "Lost update"], answer: "Unrecoverable schedule: a committed transaction read data that was rolled back" },
      { label: "Variant", options: VARIANTS, answer: "Strict 2PL" },
    ],
    explanation:
      "Basic 2PL lets X locks go before commit, so others can depend on uncommitted writes. Strict 2PL holds X locks until commit or abort, which rules out cascading aborts and unrecoverable schedules.",
    lessonAnchor: "basic-2pl-and-cascading-aborts",
  },
  {
    id: "hld-2pl-commit-order",
    lectures: [23],
    tags: ["2pl", "variants"],
    type: "mcq",
    prompt:
      "An audit system needs the equivalent serial order of transactions to be exactly their commit order, so it can replay the commit log. Which variant gives that directly?",
    options: VARIANTS,
    answer: "Rigorous 2PL",
    explanation:
      "Rigorous 2PL holds every lock, shared and exclusive, until commit, so a transaction's lock point is its commit. Strict 2PL releases shared locks early, so a later-committing transaction can still come first in the serial order.",
    lessonAnchor: "rigorous-2pl",
  },
  {
    id: "hld-2pl-conservative",
    lectures: [23],
    tags: ["2pl", "deadlocks"],
    type: "scenario",
    prompt:
      "A batch system runs fixed jobs whose full list of rows is known before each job starts. Deadlock retries are wasting hours. Which variant removes deadlocks entirely, and why doesn't a typical web app use it?",
    fields: [
      { label: "Variant", options: VARIANTS, answer: "Conservative 2PL" },
      { label: "Why web apps rarely use it", options: ["Transactions usually don't know which rows they'll touch until they read data", "It isn't serializable", "It causes cascading aborts", "It needs two-phase commit"], answer: "Transactions usually don't know which rows they'll touch until they read data" },
    ],
    explanation:
      "Acquiring every lock up front means no transaction ever holds some locks while waiting for others, so no cycle can form. That requires knowing the lock set in advance, which most interactive transactions can't.",
    lessonAnchor: "conservative-2pl",
  },
  {
    id: "hld-2pl-transfer-deadlock",
    lectures: [23],
    tags: ["2pl", "deadlocks"],
    type: "scenario",
    prompt:
      "Transfers lock the source account, then the destination. Under load, transfers between the same two accounts in opposite directions fail with 'deadlock detected'.\nWhat did the database do, and how do you stop it at the application level?",
    fields: [
      { label: "Database behaviour", options: ["Found a cycle in the wait-for graph and aborted a victim", "Timed out both transactions", "Escalated to a table lock", "Ran two-phase commit"], answer: "Found a cycle in the wait-for graph and aborted a victim" },
      { label: "Application fix", options: ["Always lock the lower account id first", "Lower the isolation level", "Release the first lock before taking the second", "Increase the lock wait timeout"], answer: "Always lock the lower account id first" },
    ],
    explanation:
      "Opposite lock orders create T1 waits for T2 waits for T1. A global lock order makes every wait point the same way, so cycles can't form. Releasing early would break 2PL itself.",
    lessonAnchor: "avoiding-deadlocks-in-application-code",
  },
  {
    id: "hld-2pl-wait-die",
    lectures: [23],
    tags: ["2pl", "deadlocks"],
    type: "scenario",
    prompt:
      "T5 (started at ts 5) holds row X. T9 (ts 9) requests X. Separately, T3 (ts 3) requests a row held by T7 (ts 7).\nUnder wait-die, what happens to each requester?",
    fields: [
      { label: "T9 requests from T5", options: ["T9 dies (aborts, restarts with ts 9)", "T9 waits", "T5 is aborted", "T9 restarts with a new timestamp"], answer: "T9 dies (aborts, restarts with ts 9)" },
      { label: "T3 requests from T7", options: ["T3 waits", "T3 dies", "T7 is aborted", "Both abort"], answer: "T3 waits" },
    ],
    explanation:
      "In wait-die only older transactions wait; a younger requester aborts itself. It restarts with its original timestamp so it eventually becomes the oldest and can't starve. Aborting the holder is wound-wait's behaviour.",
    lessonAnchor: "prevention-with-timestamps",
  },
  {
    id: "hld-2pl-wound-wait",
    lectures: [23],
    tags: ["2pl", "deadlocks"],
    type: "mcq",
    prompt:
      "A globally distributed database can't cheaply build one wait-for graph across all nodes. It assigns each transaction a timestamp, and when an older transaction needs a lock a younger one holds, the younger one is aborted. Which scheme is this?",
    options: ["Wound-wait", "Wait-die", "Wait-for graph detection", "Conservative 2PL"],
    answer: "Wound-wait",
    explanation:
      "Older wounds younger; younger waits for older. Like wait-die it prevents cycles with only local decisions, which is why distributed systems such as Spanner use it instead of global cycle detection.",
    lessonAnchor: "prevention-with-timestamps",
  },
  {
    id: "hld-2pl-upgrade",
    lectures: [23],
    tags: ["2pl", "deadlocks"],
    type: "scenario",
    prompt:
      "Two requests both run SELECT quantity FROM carts WHERE id = 8 (taking shared locks under serializable), then both try UPDATE carts SET quantity = ... WHERE id = 8. They deadlock every time they overlap.\nWhat is this and what's the fix?",
    fields: [
      { label: "Kind of deadlock", options: ["Lock upgrade deadlock: both hold S and wait to get X", "Two resources locked in opposite order", "Phantom deadlock", "Cascading abort"], answer: "Lock upgrade deadlock: both hold S and wait to get X" },
      { label: "Fix", options: ["Read with SELECT ... FOR UPDATE", "Read without a transaction", "Add an index on id", "Use rigorous 2PL"], answer: "Read with SELECT ... FOR UPDATE" },
    ],
    explanation:
      "Each holds a shared lock the other's exclusive request must wait for. Taking the write-intent lock at read time means the second request waits at the SELECT, before it holds anything.",
    lessonAnchor: "deadlocks",
  },
  {
    id: "hld-2pl-phantom",
    lectures: [23],
    tags: ["2pl", "phantoms"],
    type: "mcq",
    prompt:
      "A room-booking transaction under row-level 2PL checks for existing bookings on room 7 for Friday, finds none, and inserts one. Occasionally two bookings for the same slot appear. Rows are locked correctly. What's missing?",
    options: [
      "A range or predicate lock (e.g. next-key locks on an index over room and day) so inserts into the checked range wait",
      "Exclusive locks on the rows read",
      "Rigorous instead of strict 2PL",
      "Two-phase commit",
    ],
    answer: "A range or predicate lock (e.g. next-key locks on an index over room and day) so inserts into the checked range wait",
    explanation:
      "There were no rows to lock, so row locks protect nothing. Locking the index range (the gap) makes a concurrent insert into that slot wait. A unique constraint on (room, day) is an even simpler guard.",
    lessonAnchor: "phantoms-and-lock-granularity",
  },
  {
    id: "hld-2pl-vs-2pc",
    lectures: [23],
    tags: ["2pl", "2pc"],
    type: "scenario",
    prompt:
      "A distributed SQL database must keep concurrent transactions isolated on each shard, and must also make a transaction that touches three shards commit on all three or none.\nWhich protocol handles each concern?",
    fields: [
      { label: "Isolation between concurrent transactions", options: ["Two-phase locking", "Two-phase commit", "Wait-die", "Read committed"], answer: "Two-phase locking" },
      { label: "All-or-nothing commit across shards", options: ["Two-phase commit", "Two-phase locking", "Wound-wait", "Rigorous 2PL"], answer: "Two-phase commit" },
    ],
    explanation:
      "2PL governs when locks are taken and released so schedules are serializable. 2PC is the prepare-then-commit vote that makes a multi-node commit atomic. Real systems often run both together.",
    lessonAnchor: "the-problem-2pl-solves",
  },
];
