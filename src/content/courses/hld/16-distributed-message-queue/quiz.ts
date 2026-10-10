import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-mq-model",
    lectures: [16],
    tags: ["queue", "pubsub"],
    type: "scenario",
    prompt:
      "When an order is placed, billing, shipping and analytics must each react. Billing runs 6 instances and each order must be billed by exactly one of them.\nPick the messaging shape.",
    fields: [
      { label: "Between order service and the three consumers", options: ["Publish/subscribe: each service gets every event", "One shared point-to-point queue for all three", "Direct HTTP calls", "A shared database table polled by all"], answer: "Publish/subscribe: each service gets every event" },
      { label: "Among billing's 6 instances", options: ["Competing consumers: each event goes to one instance", "Every instance gets every event", "Only the leader instance consumes", "Round-robin HTTP from the order service"], answer: "Competing consumers: each event goes to one instance" },
    ],
    explanation:
      "Fan-out across services is pub/sub; sharing work within a service is a queue. Kafka does both with one consumer group per service; on AWS, SNS to one SQS queue per service does the same.",
    lessonAnchor: "two-messaging-models",
  },
  {
    id: "hld-mq-idle-consumers",
    lectures: [16],
    tags: ["kafka", "consumer-groups"],
    type: "scenario",
    prompt:
      "A topic has 8 partitions. Lag is growing, so you scale the consumer group from 8 to 20 instances. Lag doesn't improve and 12 instances report no assigned partitions.\nExplain and fix.",
    fields: [
      { label: "Cause", options: ["A partition is consumed by at most one member of a group", "The broker is out of disk", "Consumers must be added one at a time", "Offsets were reset"], answer: "A partition is consumed by at most one member of a group" },
      { label: "Fix for more parallelism", options: ["Increase the partition count (planning for key remapping)", "Add a second consumer group for the same work", "Enable auto-commit", "Lower the replication factor"], answer: "Increase the partition count (planning for key remapping)" },
    ],
    explanation:
      "Partition count caps parallelism within one group, so extra members sit idle. More partitions raise the cap, but they change hash(key) mod N, so per-key ordering breaks across the change. A second group would process every message twice.",
    lessonAnchor: "consumer-groups",
  },
  {
    id: "hld-mq-ordering-key",
    lectures: [16],
    tags: ["ordering"],
    type: "scenario",
    prompt:
      "Order events (Created, Paid, Shipped) for the same order are sometimes processed out of order: Shipped arrives before Paid. The producer sends without a key to a 12-partition topic.\nFix it.",
    fields: [
      { label: "Message key", options: ["order_id", "Event type", "A random UUID per event", "No key"], answer: "order_id" },
      { label: "Ordering scope you then get", options: ["Per order, within its partition", "Global across the topic", "None", "Per event type"], answer: "Per order, within its partition" },
      { label: "Inside the consumer, avoid", options: ["Handing one partition's messages to an unkeyed thread pool", "Committing after processing", "Batching fetches", "Using a consumer group"], answer: "Handing one partition's messages to an unkeyed thread pool" },
    ],
    explanation:
      "Same key means same partition, and a partition is ordered. Keying by event type would put all Paid events together but split one order across partitions. Parallelising a partition without keying the threads reintroduces reordering.",
    lessonAnchor: "ordering",
  },
  {
    id: "hld-mq-commit-order",
    lectures: [16],
    tags: ["delivery", "offsets"],
    type: "scenario",
    prompt:
      "A consumer uses auto-commit every 5 seconds. After a crash, some orders were never shipped, although their events are in the topic.\nDiagnose and fix.",
    fields: [
      { label: "What happened", options: ["Offsets were committed before processing finished, so restart skipped them", "The broker deleted the messages", "The producer never sent them", "A rebalance duplicated them"], answer: "Offsets were committed before processing finished, so restart skipped them" },
      { label: "Fix", options: ["Commit explicitly after processing", "Commit before processing", "Increase the auto-commit interval", "Disable replication"], answer: "Commit explicitly after processing" },
      { label: "Resulting guarantee", options: ["At least once", "At most once", "Exactly once", "Best effort"], answer: "At least once" },
    ],
    explanation:
      "A commit that runs ahead of processing turns a crash into lost work: at-most-once behaviour. Committing after processing makes crashes cause redelivery instead, so consumers must then be idempotent.",
    lessonAnchor: "offsets-and-commits",
  },
  {
    id: "hld-mq-exactly-once",
    lectures: [16],
    tags: ["delivery", "idempotency"],
    type: "mcq",
    prompt:
      "A payment consumer reads from Kafka and charges cards through a third-party API. A vendor slide says 'Kafka supports exactly-once.' How do you actually prevent double charges?",
    options: [
      "At-least-once consumption plus an idempotency key per payment, recorded with the result and passed to the card API",
      "Enable Kafka transactions; that covers the card API too",
      "Use acks=all on the producer",
      "Switch to at-most-once so duplicates can't happen",
    ],
    answer: "At-least-once consumption plus an idempotency key per payment, recorded with the result and passed to the card API",
    explanation:
      "Kafka's exactly-once covers reads and writes within Kafka. A side effect in another system needs an idempotent consumer. At-most-once avoids duplicates by losing payments, which is worse.",
    lessonAnchor: "what-exactly-once-really-means",
  },
  {
    id: "hld-mq-durability",
    lectures: [16],
    tags: ["replication", "kafka"],
    type: "scenario",
    prompt:
      "A topic has replication factor 3 and producers use acks=1. A leader broker died seconds after acknowledging a batch, and those messages are gone. Losing at most one broker must never lose acknowledged data.\nConfigure it.",
    fields: [
      { label: "Producer acks", options: ["all", "1", "0", "2"], answer: "all" },
      { label: "min.insync.replicas", options: ["2", "1", "3", "0"], answer: "2" },
      { label: "Unclean leader election", options: ["Disabled", "Enabled", "Enabled only at night", "Irrelevant"], answer: "Disabled" },
    ],
    explanation:
      "acks=1 acknowledges before followers copy the data. acks=all with min ISR 2 means every acknowledged write is on at least two brokers, and refusing unclean elections ensures a new leader comes from the in-sync set. Min ISR 3 would block writes whenever any one broker is down.",
    lessonAnchor: "replication-and-isr",
  },
  {
    id: "hld-mq-poison",
    lectures: [16],
    tags: ["dlq", "retries"],
    type: "scenario",
    prompt:
      "One malformed message makes the consumer throw every time. The consumer retries it forever, and lag on that partition has grown to 2 million while other partitions are fine.\nWhat should the pipeline do?",
    fields: [
      { label: "Kind of failure", options: ["Poison message: retrying will never succeed", "Transient: keep retrying", "Broker failure", "Rebalance storm"], answer: "Poison message: retrying will never succeed" },
      { label: "Handling", options: ["Retry a few times with backoff, then move it to a dead-letter queue and continue", "Delete the partition", "Restart the consumer in a loop", "Increase partition count"], answer: "Retry a few times with backoff, then move it to a dead-letter queue and continue" },
      { label: "What makes the DLQ useful", options: ["An alert, an owner and a redrive procedure", "A long retention only", "Putting it on the same partition", "Hiding it from dashboards"], answer: "An alert, an owner and a redrive procedure" },
    ],
    explanation:
      "A message that can never succeed blocks an ordered partition. Bounded retries followed by a DLQ keep the stream moving; without alerts and redrive, the DLQ just hides data loss.",
    lessonAnchor: "retries-and-dead-letter-queues",
  },
  {
    id: "hld-mq-visibility",
    lectures: [16],
    tags: ["sqs"],
    type: "mcq",
    prompt:
      "An SQS consumer takes up to 90 seconds to process a video job, and the queue's visibility timeout is 30 seconds. What goes wrong?",
    options: [
      "The message becomes visible again mid-processing and a second consumer processes it too",
      "The message is deleted after 30 seconds",
      "The message moves straight to the DLQ",
      "SQS rejects the receive call",
    ],
    answer: "The message becomes visible again mid-processing and a second consumer processes it too",
    explanation:
      "Visibility timeout hides a received message only until it expires. Set it above worst-case processing time (or extend it while working), and keep the handler idempotent.",
    lessonAnchor: "retries-and-dead-letter-queues",
  },
  {
    id: "hld-mq-backpressure",
    lectures: [16],
    tags: ["back-pressure"],
    type: "scenario",
    prompt:
      "Consumers write each message to a Postgres database that's already at 100% CPU. Lag is rising, and someone proposes tripling the consumer count.\nWhat do you do?",
    fields: [
      { label: "Effect of tripling consumers", options: ["Makes the database bottleneck worse", "Fixes lag immediately", "Has no effect at all", "Reduces database CPU"], answer: "Makes the database bottleneck worse" },
      { label: "Better response", options: ["Throttle consumers to what the DB sustains and let the queue hold the backlog", "Delete old messages", "Switch to at-most-once", "Lower retention"], answer: "Throttle consumers to what the DB sustains and let the queue hold the backlog" },
      { label: "Metric to alert on", options: ["Consumer lag or age of the oldest message", "Producer CPU", "Number of topics", "Broker uptime"], answer: "Consumer lag or age of the oldest message" },
    ],
    explanation:
      "More consumers only help when consumers are the bottleneck. When the downstream is saturated, the queue's job is to absorb the backlog while consumers go at a sustainable rate; lag tells you how far behind you are.",
    lessonAnchor: "back-pressure",
  },
  {
    id: "hld-mq-choose-broker",
    lectures: [16],
    tags: ["kafka", "rabbitmq", "sqs"],
    type: "scenario",
    prompt:
      "Match each need to a broker.\n1) Clickstream at 2 million events/s, read by five teams, with the ability to reprocess last week's data after a bug fix.\n2) A small AWS team needs a reliable job queue for sending emails and wants zero operations.\n3) Tasks routed by pattern (eu.invoice.*, us.refund.*) with priorities and per-message acks.",
    fields: [
      { label: "Need 1", options: ["Kafka", "RabbitMQ", "SQS"], answer: "Kafka" },
      { label: "Need 2", options: ["Kafka", "RabbitMQ", "SQS"], answer: "SQS" },
      { label: "Need 3", options: ["Kafka", "RabbitMQ", "SQS"], answer: "RabbitMQ" },
    ],
    explanation:
      "Kafka's retained, partitioned log suits high-volume streams with many readers and replay. SQS is a fully managed work queue. RabbitMQ's exchanges give pattern routing, priorities and per-message acks.",
    lessonAnchor: "kafka-vs-rabbitmq-vs-sqs",
  },
  {
    id: "hld-mq-compaction",
    lectures: [16],
    tags: ["retention", "kafka"],
    type: "mcq",
    prompt:
      "A topic carries the current price of each of 2 million products, updated often. New services must be able to load every product's latest price at startup, forever. Which retention policy fits?",
    options: [
      "Log compaction keyed by product id",
      "Time-based retention of 7 days",
      "Size-based retention of 1 GB",
      "Delete each message after it's consumed",
    ],
    answer: "Log compaction keyed by product id",
    explanation:
      "Compaction keeps at least the latest value per key indefinitely, so the topic acts as a table of current prices. Time retention would drop products that haven't changed in a week.",
    lessonAnchor: "retention-and-compaction",
  },
];
