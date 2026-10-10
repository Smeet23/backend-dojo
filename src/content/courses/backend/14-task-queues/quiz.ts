import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "task-queues-signup-email",
    lectures: [14],
    tags: ["background-jobs", "email"],
    type: "scenario",
    prompt:
      "Production incident: your email provider has a 20-minute outage. During it, every signup returns 500 because the handler calls the provider inline. Redesign the signup endpoint.",
    fields: [
      {
        label: "What the handler does with the email",
        options: [
          "Calls the provider and ignores errors",
          "Enqueues a send-email task with the user id and token",
          "Retries the provider call in a loop before responding",
          "Skips the email and asks the user to request one later",
        ],
        answer: "Enqueues a send-email task with the user id and token",
      },
      { label: "Response to the client", options: ["201 Created immediately", "202 only after the email is sent", "500 until the provider recovers", "503 Service Unavailable"], answer: "201 Created immediately" },
      {
        label: "What happens while the provider is down",
        options: ["The task is lost", "The worker retries with exponential backoff", "The user gets a 500", "The broker sends the email itself"],
        answer: "The worker retries with exponential backoff",
      },
    ],
    explanation:
      "The response doesn't need the email to have been sent, so the handler saves the user, enqueues a task and returns at once. The worker retries with backoff until the provider is back. Swallowing the error looks fine to the user but means the email is silently never sent.",
    lessonAnchor: "doing-it-in-the-background",
  },
  {
    id: "task-queues-visibility-timeout",
    lectures: [14],
    tags: ["visibility-timeout", "ack"],
    type: "mcq",
    prompt:
      "A worker on SQS picks up a \"resize image\" task and is killed by a deploy halfway through. It never acks. What happens to the task?",
    options: [
      "It's lost; the worker had already removed it from the queue",
      "After the visibility timeout expires it becomes visible again and another worker runs it",
      "It goes straight to the dead-letter queue",
      "The producer is notified and must enqueue it again",
    ],
    answer: "After the visibility timeout expires it becomes visible again and another worker runs it",
    explanation:
      "Taking a task only hides it. Without an ack before the visibility timeout ends, the broker makes it visible again so another worker can pick it up. Nothing is deleted until an ack arrives, which is why crashes don't lose work.",
    lessonAnchor: "visibility-timeout",
  },
  {
    id: "task-queues-double-charge",
    lectures: [14],
    tags: ["idempotency", "at-least-once"],
    type: "scenario",
    prompt:
      "Users report being charged twice for one subscription renewal. Logs show the \"charge\" task ran twice: the first run took 90 s, the visibility timeout is 60 s, and a second worker picked the task up before the first finished.",
    fields: [
      { label: "Delivery guarantee you're seeing", options: ["Exactly-once", "At-most-once", "At-least-once", "Ordered delivery"], answer: "At-least-once" },
      {
        label: "Best fix for the handler",
        options: [
          "Pass the invoice id as an idempotency key to the payment API",
          "Lower max retries to 0",
          "Switch the broker to Redis Pub/Sub",
          "Add a sleep before charging",
        ],
        answer: "Pass the invoice id as an idempotency key to the payment API",
      },
      { label: "Also change", options: ["Visibility timeout to well above the task's run time", "Visibility timeout to 5 s", "Number of producers", "Queue name"], answer: "Visibility timeout to well above the task's run time" },
    ],
    explanation:
      "Task queues deliver at least once, so handlers must be idempotent; an idempotency key makes the second charge return the first result. The timeout was also shorter than the task's run time, which invited the duplicate. Turning off retries would just lose charges when real failures happen.",
    lessonAnchor: "design-considerations",
  },
  {
    id: "task-queues-backoff-schedule",
    lectures: [14],
    tags: ["retries", "backoff"],
    type: "mcq",
    prompt:
      "A push-notification task fails at 10:00 because the push service returns 503. Retries use exponential backoff starting at 1 minute, max 4 retries. When does the 4th retry run if every attempt fails?",
    options: ["10:04", "10:08", "10:15", "10:16"],
    answer: "10:15",
    explanation:
      "Delays double: 1, 2, 4, 8 minutes. Retries run at 10:01, 10:03, 10:07 and 10:15. 10:16 is what you get by adding 16 instead of summing the delays. After the 4th retry fails, the task goes to the dead-letter queue.",
    lessonAnchor: "retries-with-exponential-backoff",
  },
  {
    id: "task-queues-task-types",
    lectures: [14],
    tags: ["task-types"],
    type: "scenario",
    prompt: "You're designing background work for a course platform. Classify each job.",
    fields: [
      { label: "Delete expired sessions every night", options: ["One-off", "Recurring", "Chained", "Batch"], answer: "Recurring" },
      { label: "Encode video, then make thumbnails and subtitles from the encoded file", options: ["One-off", "Recurring", "Chained", "Batch"], answer: "Chained" },
      { label: "Send a password-reset email", options: ["One-off", "Recurring", "Chained", "Batch"], answer: "One-off" },
      { label: "At midnight, email a weekly report to each of 40,000 customers", options: ["One-off", "Recurring", "Chained", "Batch"], answer: "Batch" },
    ],
    explanation:
      "Scheduled cleanup is recurring. Steps that depend on a parent's output form a chain. A single event-triggered email is one-off. One trigger fanning out into thousands of identical tasks is a batch, even though the midnight trigger itself is scheduled.",
    lessonAnchor: "types-of-tasks",
  },
  {
    id: "task-queues-pubsub-broker",
    lectures: [14],
    tags: ["broker", "redis"],
    type: "mcq",
    prompt:
      "A teammate builds a job system on Redis Pub/Sub: the API publishes jobs and workers subscribe. During a worker deploy, jobs published in a 30-second window vanish. Why?",
    options: [
      "Redis Pub/Sub only delivers to subscribers connected at that moment and keeps nothing",
      "Redis can't store JSON",
      "The visibility timeout was too short",
      "Pub/Sub delivers messages in random order",
    ],
    answer: "Redis Pub/Sub only delivers to subscribers connected at that moment and keeps nothing",
    explanation:
      "Pub/Sub is fire-and-forget: no subscriber, no delivery, no storage. Real Redis-based queues (BullMQ, Asynq) keep tasks in lists, sorted sets or streams until a worker acks them. Visibility timeouts only exist when the broker stores the task in the first place.",
    lessonAnchor: "how-a-task-queue-works",
  },
  {
    id: "task-queues-monolithic-task",
    lectures: [14],
    tags: ["best-practices", "chaining"],
    type: "scenario",
    prompt:
      "One 25-minute task encodes a video, generates thumbnails and transcribes audio. Transcription fails about 10% of the time, and each retry re-encodes the whole video. Workers are pegged at 100% CPU.",
    fields: [
      {
        label: "Fix",
        options: [
          "Split into a chain: encode, then thumbnails and transcription as separate child tasks",
          "Increase max retries to 20",
          "Run the whole thing inline in the upload request",
          "Disable retries for this task",
        ],
        answer: "Split into a chain: encode, then thumbnails and transcription as separate child tasks",
      },
      { label: "Thumbnails and transcription should run", options: ["In parallel", "Strictly one after the other", "Before encoding", "Inside the API request"], answer: "In parallel" },
    ],
    explanation:
      "Small, focused tasks are retried on their own, so a failed transcription retries only transcription. Thumbnails and transcription both depend only on the encode, so they can run side by side on different workers. More retries would just multiply the wasted encoding.",
    lessonAnchor: "chained-tasks",
  },
  {
    id: "task-queues-monitoring",
    lectures: [14],
    tags: ["monitoring", "scaling"],
    type: "mcq",
    prompt:
      "Since a marketing campaign launched, verification emails arrive 40 minutes late. No errors are logged and the provider is healthy. Which metric most likely shows the problem, and what do you do?",
    options: [
      "Queue depth keeps growing; add more workers",
      "Error rate is high; raise max retries",
      "API latency is high; add a cache",
      "DLQ size is growing; delete the DLQ",
    ],
    answer: "Queue depth keeps growing; add more workers",
    explanation:
      "No errors plus long delays means workers simply can't keep up with the incoming rate, so the backlog grows. Workers are stateless, so you scale them horizontally, and an alert on queue depth would have caught this early.",
    lessonAnchor: "best-practices",
  },
  {
    id: "task-queues-flow-order",
    lectures: [14],
    tags: ["producer", "consumer", "ack"],
    type: "order",
    prompt: "Put the life of a verification-email task in order, on a run where everything succeeds.",
    steps: [
      "Signup handler serializes the user id, email and token to JSON",
      "Producer enqueues the task on the email queue",
      "API returns 201 to the client",
      "Worker dequeues the task and the broker hides it from other workers",
      "Worker deserializes the payload and runs the registered handler",
      "Handler calls the email provider's API",
      "Worker acks and the broker deletes the task",
    ],
    explanation:
      "The producer serializes and enqueues before responding. The worker then takes the task (hidden, not deleted), runs the handler, and only after success sends the ack that lets the broker delete it.",
    lessonAnchor: "how-a-task-queue-works",
  },
];
