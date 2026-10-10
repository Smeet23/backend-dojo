import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-dtx-coordinator-crash",
    lectures: [20],
    tags: ["2pc", "failure"],
    type: "scenario",
    prompt:
      "In a 2PC transaction across three databases, all three voted YES. The coordinator then crashes before logging any decision. Ten minutes later, unrelated checkouts on the same rows are timing out.\nDiagnose it.",
    fields: [
      { label: "Participant state", options: ["Prepared and holding locks, waiting for the decision", "Committed, waiting for ACK", "Aborted automatically after a timeout", "Idle, nothing was written"], answer: "Prepared and holding locks, waiting for the decision" },
      { label: "Can a participant safely abort on its own?", options: ["No, the coordinator may have decided commit", "Yes, any participant may abort after a timeout", "Yes, if it voted YES", "Only the first participant may"], answer: "No, the coordinator may have decided commit" },
      { label: "Property this demonstrates", options: ["2PC is a blocking protocol", "2PC loses durability", "2PC allows dirty reads", "2PC needs synchronized clocks"], answer: "2PC is a blocking protocol" },
    ],
    explanation:
      "After voting YES a participant has promised to commit if told to, so it can neither commit nor abort alone and keeps its locks. That's the blocking problem; it ends only when the coordinator recovers and reads its log.",
    lessonAnchor: "the-blocking-problem",
  },
  {
    id: "hld-dtx-2pc-order",
    lectures: [20],
    tags: ["2pc"],
    type: "order",
    prompt: "Put the steps of a successful two-phase commit in order.",
    steps: [
      "Coordinator sends PREPARE to all participants",
      "Each participant does its writes, takes locks and logs a prepare record",
      "Each participant votes YES",
      "Coordinator writes COMMIT to its durable log",
      "Coordinator sends COMMIT to all participants",
      "Participants commit, release locks and ACK",
    ],
    explanation:
      "Participants must durably prepare before voting so the promise survives a crash, and the coordinator must durably log the decision before announcing it, because that log entry is what makes the outcome final.",
    lessonAnchor: "two-phase-commit",
  },
  {
    id: "hld-dtx-3pc-partition",
    lectures: [20],
    tags: ["3pc"],
    type: "mcq",
    prompt:
      "An engineer proposes replacing 2PC with 3PC across two data centres to avoid blocking. Why is this a risky choice?",
    options: [
      "During a network partition, one side can time out and commit while the other times out and aborts",
      "3PC needs more disk space for its logs",
      "3PC cannot abort a transaction once CanCommit is sent",
      "3PC requires every participant to be the same database vendor",
    ],
    answer: "During a network partition, one side can time out and commit while the other times out and aborts",
    explanation:
      "3PC's timeout-based recovery assumes bounded delays and no partitions. Across data centres, partitions happen, and 3PC can then violate atomicity. Systems that need non-blocking commit replicate the coordinator with consensus instead.",
    lessonAnchor: "why-3pc-is-rarely-used",
  },
  {
    id: "hld-dtx-hotel-booking",
    lectures: [20],
    tags: ["saga"],
    type: "scenario",
    prompt:
      "A travel site books a flight (airline API), a hotel (partner API) and a car (rental API) as one trip. None of the partners support XA, and confirmations can take minutes.\nHow should you implement it?",
    fields: [
      { label: "Approach", options: ["Saga", "Two-phase commit", "Three-phase commit", "One local database transaction"], answer: "Saga" },
      { label: "If the car booking fails", options: ["Cancel the hotel, then cancel the flight", "Roll back all three with ROLLBACK", "Retry the flight booking", "Leave the flight and hotel booked"], answer: "Cancel the hotel, then cancel the flight" },
    ],
    explanation:
      "External APIs can't participate in 2PC, and holding locks for minutes is impossible. A saga commits each booking and, on failure, runs compensations in reverse order. There is no ROLLBACK across third-party systems.",
    lessonAnchor: "the-saga-pattern",
  },
  {
    id: "hld-dtx-orchestration-choice",
    lectures: [20],
    tags: ["saga", "orchestration"],
    type: "scenario",
    prompt:
      "An insurance claim flow has nine steps, conditional branches (fraud check, manual review), timeouts of up to two days and several compensations. The team struggles to answer \"where is claim 123 stuck?\".\nPick the saga style and where state lives.",
    fields: [
      { label: "Style", options: ["Orchestration", "Choreography", "Two-phase commit", "No saga, one big transaction"], answer: "Orchestration" },
      { label: "Saga state stored in", options: ["The orchestrator's durable store", "Each service's in-memory cache", "The message broker's retention only", "The client's browser"], answer: "The orchestrator's durable store" },
    ],
    explanation:
      "Many steps, branching and long timeouts favour a central orchestrator (often a workflow engine) whose persisted state answers \"where is it?\" directly. With choreography the flow is scattered across event handlers and must be reconstructed from logs.",
    lessonAnchor: "orchestration-vs-choreography",
  },
  {
    id: "hld-dtx-compensation-retry",
    lectures: [20],
    tags: ["saga", "compensation"],
    type: "mcq",
    prompt:
      "In an order saga, inventory reservation fails, so the orchestrator calls Payment's refund. The call times out and the orchestrator doesn't know whether the refund happened. What should the design guarantee?",
    options: [
      "The refund is idempotent (keyed by saga id) so the orchestrator can safely retry until it gets a definite answer",
      "The orchestrator gives up and marks the saga failed",
      "The orchestrator charges the customer again to reach a known state",
      "Payment rolls back its earlier database transaction",
    ],
    answer: "The refund is idempotent (keyed by saga id) so the orchestrator can safely retry until it gets a definite answer",
    explanation:
      "Compensations must be retryable and idempotent so a lost reply can be resolved by retrying without double refunds. The original charge already committed, so there's nothing left to roll back.",
    lessonAnchor: "compensations-are-not-rollbacks",
  },
  {
    id: "hld-dtx-outbox",
    lectures: [20],
    tags: ["saga", "outbox"],
    type: "scenario",
    prompt:
      "In a choreographed saga, the Order service commits a new order and then publishes OrderCreated to Kafka. Occasionally the service crashes between the two, and the order sits PENDING forever because Payment never hears about it.\nWhat's the problem and the fix?",
    fields: [
      { label: "Problem", options: ["Dual write: DB commit and event publish aren't atomic", "Kafka lost the message", "Payment consumer isn't idempotent", "Clock skew between services"], answer: "Dual write: DB commit and event publish aren't atomic" },
      { label: "Fix", options: ["Write the event to an outbox table in the same transaction and relay it", "Publish the event before committing", "Switch to 3PC", "Increase the Kafka retention period"], answer: "Write the event to an outbox table in the same transaction and relay it" },
    ],
    explanation:
      "Committing and publishing are two separate operations, so a crash between them loses the event. The outbox puts the event in the same local transaction as the order, and a relay publishes it at least once. Publishing first just flips the failure into an event for an order that doesn't exist.",
    lessonAnchor: "making-sagas-reliable",
  },
  {
    id: "hld-dtx-isolation",
    lectures: [20],
    tags: ["saga", "isolation"],
    type: "mcq",
    prompt:
      "During an order saga, a customer's order is visible as created and an analytics job counts it as revenue, then the saga cancels it after a payment failure. Which countermeasure fits best?",
    options: [
      "Give the order a PENDING state that downstream readers ignore until it becomes CONFIRMED",
      "Wrap the saga in a serializable transaction",
      "Use choreography instead of orchestration",
      "Run compensations in forward order",
    ],
    answer: "Give the order a PENDING state that downstream readers ignore until it becomes CONFIRMED",
    explanation:
      "Sagas have no isolation, so intermediate states leak. A semantic lock (a pending status that others respect) is the standard countermeasure. A serializable transaction can't span services, and the saga style doesn't change visibility.",
    lessonAnchor: "isolation-anomalies",
  },
  {
    id: "hld-dtx-spanner",
    lectures: [20],
    tags: ["2pc", "consensus"],
    type: "mcq",
    prompt:
      "Your data is in one distributed SQL database (sharded across nodes), and a transaction updates rows on two shards. Should you build a saga in the application?",
    options: [
      "No, use the database's transactions; it runs 2PC internally with a replicated coordinator",
      "Yes, sagas are always required across shards",
      "Yes, because 2PC across shards always blocks",
      "No, use 3PC from the application",
    ],
    answer: "No, use the database's transactions; it runs 2PC internally with a replicated coordinator",
    explanation:
      "Distributed SQL engines already provide ACID across shards by running 2PC where the coordinator's state is replicated through Raft or Paxos, which removes the blocking problem. Sagas are for boundaries no single database controls.",
    lessonAnchor: "where-2pc-is-used",
  },
];
