import type { Question } from "@/lib/types";

const SEMANTICS = ["At most once", "At least once", "At least once + idempotent consumer", "No guarantee needed"];

export const quiz: Question[] = [
  {
    id: "sd-eda-cascade",
    lectures: [8],
    tags: ["coupling", "failure"],
    type: "scenario",
    prompt:
      "Checkout calls payment, then inventory, then the email service synchronously. During an email-provider outage, 30% of checkouts fail with timeouts even though payment and stock were fine.\nName the problem and the change.",
    fields: [
      { label: "Problem", options: ["Cascading failure from a synchronous dependency", "A database deadlock", "Too few load balancers", "Event sourcing overhead"], answer: "Cascading failure from a synchronous dependency" },
      { label: "Change", options: ["Increase the email timeout to 60 s", "Publish OrderCreated and let email consume it asynchronously", "Call email before payment", "Retry the whole checkout on any failure"], answer: "Publish OrderCreated and let email consume it asynchronously" },
    ],
    explanation:
      "A non-essential step failing shouldn't fail the order. As a consumer, email just falls behind and catches up when the provider recovers. A longer timeout makes users wait longer for the same failure.",
    lessonAnchor: "the-problem-with-call-chains",
  },
  {
    id: "sd-eda-add-consumer",
    lectures: [8],
    tags: ["decoupling"],
    type: "mcq",
    prompt:
      "Orders are already published as OrderCreated events to a Kafka topic. Product now wants a loyalty-points service that awards points per order. What's the least risky way to add it?",
    options: [
      "Add an HTTP call from the order service to the loyalty service",
      "Give the loyalty service its own consumer group on the orders topic",
      "Join the loyalty service to the payment service's consumer group",
      "Have the loyalty service poll the orders database every minute",
    ],
    answer: "Give the loyalty service its own consumer group on the orders topic",
    explanation:
      "A new consumer group receives every event without touching the producer. Joining payment's group would split the partitions between them, so each service would only see some orders.",
    lessonAnchor: "consumers",
  },
  {
    id: "sd-eda-semantics-pick",
    lectures: [8],
    tags: ["delivery-semantics"],
    type: "scenario",
    prompt: "Pick the delivery guarantee each consumer should use.",
    fields: [
      { label: "CPU metrics sampled every 10 s for a dashboard", options: SEMANTICS, answer: "At most once" },
      { label: "Crediting cashback to a wallet", options: SEMANTICS, answer: "At least once + idempotent consumer" },
      { label: "Updating a search index with the latest product (upsert by id)", options: SEMANTICS, answer: "At least once" },
    ],
    explanation:
      "A lost metric sample is harmless. A wallet credit must never be lost or applied twice, so it needs redelivery plus deduplication. An upsert by id is naturally idempotent, so plain at-least-once is already safe.",
    lessonAnchor: "when-things-fail",
  },
  {
    id: "sd-eda-double-charge",
    lectures: [8],
    tags: ["idempotency", "delivery-semantics"],
    type: "mcq",
    prompt:
      "The payment consumer commits its offset after processing. Logs show it charged order 881, then the pod was OOM-killed. Next morning a customer reports two charges for order 881. What's the right fix?",
    options: [
      "Commit the offset before charging",
      "Record the event_id as processed in the same transaction as the charge, and pass it as an idempotency key to the provider",
      "Reduce the number of partitions to one",
      "Switch the topic to RabbitMQ",
    ],
    answer: "Record the event_id as processed in the same transaction as the charge, and pass it as an idempotency key to the provider",
    explanation:
      "At-least-once redelivered the event after the crash, so the consumer must recognise duplicates. Committing before charging (at-most-once) would replace double charges with orders that are never charged.",
    lessonAnchor: "at-least-once",
  },
  {
    id: "sd-eda-outbox",
    lectures: [8],
    tags: ["outbox", "reliability"],
    type: "scenario",
    prompt:
      "Code does: INSERT order; COMMIT; producer.send(OrderCreated). After a deploy restart, support finds 14 orders that exist in the DB but were never paid or shipped.\nDiagnose and fix.",
    fields: [
      { label: "What happened", options: ["Kafka deleted the events", "The process died between COMMIT and send, so events were never published", "Consumers ran too fast", "The orders table was replicated"], answer: "The process died between COMMIT and send, so events were never published" },
      { label: "Fix", options: ["Send the event before the INSERT", "Write the event to an outbox table in the same transaction; a relay publishes it", "Wrap send() in try/catch and log", "Use at-most-once delivery"], answer: "Write the event to an outbox table in the same transaction; a relay publishes it" },
    ],
    explanation:
      "A DB commit and a broker publish are two systems with no shared transaction. The outbox makes the event part of the DB commit, and the relay retries until the broker acks. Sending first just flips the bug: events for orders that never committed.",
    lessonAnchor: "publishing-reliably",
  },
  {
    id: "sd-eda-ordering",
    lectures: [8],
    tags: ["ordering", "kafka"],
    type: "scenario",
    prompt:
      "The shipping consumer sometimes sees OrderCancelled before OrderCreated for the same order and crashes. The orders topic has 12 partitions and events are published with no key.\nWhat do you change?",
    fields: [
      { label: "Message key", options: ["None (round-robin)", "order_id", "event type", "timestamp"], answer: "order_id" },
      { label: "Guarantee you get", options: ["Global order across all orders", "Order per order_id within its partition", "Exactly-once delivery", "Order by wall clock"], answer: "Order per order_id within its partition" },
    ],
    explanation:
      "Without a key, one order's events spread over partitions that are read in parallel. Keying by order_id puts them all on one partition, which Kafka reads in order. You don't need (or get) global order across orders.",
    lessonAnchor: "topics",
  },
  {
    id: "sd-eda-pattern-pick",
    lectures: [8],
    tags: ["patterns"],
    type: "scenario",
    prompt: "Choose the event pattern for each situation.",
    fields: [
      {
        label: "A bank must answer 'what was this account's balance at 3 pm last Tuesday, and why?'",
        options: ["Event notification", "Event-carried state transfer", "Event sourcing"],
        answer: "Event sourcing",
      },
      {
        label: "Six consumers each call the order API back after every event, and it buckles during sales",
        options: ["Event notification", "Event-carried state transfer", "Event sourcing"],
        answer: "Event-carried state transfer",
      },
      {
        label: "The event is about a medical record; consumers must fetch details through an access-checked API",
        options: ["Event notification", "Event-carried state transfer", "Event sourcing"],
        answer: "Event notification",
      },
    ],
    explanation:
      "Event sourcing keeps every change so past state can be rebuilt. Carrying state in the event removes the callback storm. Thin notifications are right when the details are sensitive and must stay behind an authorised API.",
    lessonAnchor: "event-processing-patterns",
  },
  {
    id: "sd-eda-poison",
    lectures: [8],
    tags: ["dlq", "failure"],
    type: "mcq",
    prompt:
      "One event with malformed JSON makes the invoice consumer throw. It retries forever, and every invoice behind it on that partition is stuck. What's the standard fix?",
    options: [
      "Switch to at-most-once so it's skipped",
      "Retry a few times with backoff, then move it to a dead-letter queue and continue",
      "Delete the topic and recreate it",
      "Add more consumers to the group",
    ],
    answer: "Retry a few times with backoff, then move it to a dead-letter queue and continue",
    explanation:
      "A poison message will never succeed, so bounded retries plus a DLQ unblock the partition while keeping the event for inspection and replay. At-most-once would also silently drop good events whenever a consumer crashes.",
    lessonAnchor: "retries-and-dead-letters",
  },
  {
    id: "sd-eda-saga-order",
    lectures: [8],
    tags: ["saga", "choreography"],
    type: "order",
    prompt: "Payment is declined after stock was reserved. Put the choreographed saga in order.",
    steps: [
      "Order service commits the order and publishes OrderCreated via the outbox",
      "Inventory consumes OrderCreated and reserves stock, publishing InventoryReserved",
      "Payment consumes InventoryReserved, the card is declined, it publishes PaymentFailed",
      "Inventory consumes PaymentFailed and releases the reserved stock",
      "Order service consumes PaymentFailed and marks the order cancelled",
    ],
    explanation:
      "There is no distributed transaction; each service does a local step and reacts to failures with a compensating action (releasing stock, cancelling the order).",
    lessonAnchor: "choreography-and-its-limits",
  },
];
