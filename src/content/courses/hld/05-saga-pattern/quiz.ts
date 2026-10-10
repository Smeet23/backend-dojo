import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-saga-authorize-capture",
    lectures: [5],
    tags: ["saga", "compensation"],
    type: "scenario",
    prompt:
      "Your order saga charges the card in step 2 and books a courier in step 3. When no courier is available, the compensation issues a refund. Support is drowning in 'why was I charged?' tickets and refund fees are adding up.\nRedesign the payment part.",
    fields: [
      { label: "Payment action before shipping is confirmed", options: ["Authorize (place a hold)", "Charge in full", "Charge a small deposit", "Skip payment until delivery"], answer: "Authorize (place a hold)" },
      { label: "Its compensation", options: ["Void the authorization", "Issue a refund", "Email an apology", "Nothing, holds can't be undone"], answer: "Void the authorization" },
      { label: "Where the actual capture goes", options: ["As the pivot, after the compensatable steps", "As the very first step", "In a nightly batch, outside the saga", "In the compensation path"], answer: "As the pivot, after the compensatable steps" },
    ],
    explanation:
      "A hold is cheap and invisible to undo, while a refund is slow, visible and costs fees. Capturing at the pivot means money only moves once nothing earlier can fail.",
    lessonAnchor: "the-running-example",
  },
  {
    id: "hld-saga-step-order",
    lectures: [5],
    tags: ["saga", "pivot"],
    type: "order",
    prompt: "Order these steps of a well-shaped order saga.",
    steps: [
      "Create order with status PENDING",
      "Reserve stock",
      "Authorize payment",
      "Capture payment (pivot)",
      "Mark order APPROVED",
      "Send confirmation email",
    ],
    explanation:
      "Compensatable steps come first, with likely failures early; the pivot is the point of no return; after it only retryable steps that can't meaningfully fail remain, so nothing irreversible ever needs compensating.",
    lessonAnchor: "the-running-example",
  },
  {
    id: "hld-saga-timeout-retry",
    lectures: [5],
    tags: ["saga", "failure"],
    type: "scenario",
    prompt:
      "The orchestrator sends BookShipment and gets a timeout after 3 seconds. An engineer proposes immediately compensating all earlier steps.\nWhat should happen instead?",
    fields: [
      { label: "Kind of failure", options: ["Technical: outcome unknown", "Business: definite no", "Data corruption", "Isolation anomaly"], answer: "Technical: outcome unknown" },
      { label: "First response", options: ["Retry the same idempotent command with backoff", "Compensate all earlier steps now", "Skip the step and continue", "Mark the saga COMPLETED"], answer: "Retry the same idempotent command with backoff" },
      { label: "Risk of compensating right away", options: ["The booking may succeed later, leaving a courier booked for a rejected order", "The orchestrator's database fills up", "The card is charged twice", "Nothing, compensation is always safe"], answer: "The booking may succeed later, leaving a courier booked for a rejected order" },
    ],
    explanation:
      "A timeout means 'unknown', not 'no'. Retrying an idempotent command is safe; compensating something that is still in flight creates a race. Compensate only after retries or the step's deadline are exhausted.",
    lessonAnchor: "business-failures-versus-technical-failures",
  },
  {
    id: "hld-saga-duplicate-auth",
    lectures: [5],
    tags: ["saga", "idempotency"],
    type: "scenario",
    prompt:
      "Customers occasionally see two identical card holds for one order. Logs show the payment service processed AuthorizePayment for the same saga twice after a broker redelivery.\nFix it.",
    fields: [
      { label: "Dedupe key", options: ["Saga id plus step name", "Customer id", "Timestamp of the message", "Card number"], answer: "Saga id plus step name" },
      { label: "Where the dedupe record is written", options: ["In the same local transaction as the authorization record", "In a separate cache after the call", "In the orchestrator only", "In the broker's config"], answer: "In the same local transaction as the authorization record" },
      { label: "What else to pass to the card processor", options: ["An idempotency key derived from the saga id", "The full saga history", "A new random key per attempt", "Nothing"], answer: "An idempotency key derived from the saga id" },
    ],
    explanation:
      "At-least-once delivery means duplicates will arrive. Recording (saga id, step) atomically with the business change makes the handler a no-op on repeat, and forwarding a stable key protects the external call too. A random key per attempt would defeat the purpose.",
    lessonAnchor: "the-usual-mechanics",
  },
  {
    id: "hld-saga-out-of-order",
    lectures: [5],
    tags: ["saga", "idempotency"],
    type: "mcq",
    prompt:
      "ReserveStock timed out, so the orchestrator sent ReleaseStock. The release arrived first and found nothing; then the delayed ReserveStock arrived and reserved stock that nobody will ever release. What design prevents this?",
    options: [
      "The release leaves a tombstone for the saga, and a later reserve for a cancelled saga is refused",
      "Send ReleaseStock twice to be safe",
      "Use a bigger timeout on ReserveStock",
      "Delete the reservation row physically instead of marking it released",
    ],
    answer: "The release leaves a tombstone for the saga, and a later reserve for a cancelled saga is refused",
    explanation:
      "Messages can reorder, so the compensation and the action must commute. A tombstone makes the end state 'nothing reserved' whichever arrives first. Bigger timeouts only make the race rarer.",
    lessonAnchor: "out-of-order-compensation",
  },
  {
    id: "hld-saga-orch-vs-chor",
    lectures: [5],
    tags: ["saga", "orchestration", "choreography"],
    type: "scenario",
    prompt:
      "A travel booking flow has 9 steps (flight, hotel, car, insurance, fraud check, two payment steps, loyalty, email), with branches for international trips and a 30-minute deadline on supplier replies. Support often asks for the status of a specific booking.\nPick the design.",
    fields: [
      { label: "Coordination style", options: ["Orchestration with a workflow engine", "Choreography over a broker", "Two-phase commit", "A single cron job"], answer: "Orchestration with a workflow engine" },
      { label: "Main reason", options: ["Branches, timers and per-saga status live in one place", "It needs no extra infrastructure", "It gives full isolation", "It avoids idempotency work"], answer: "Branches, timers and per-saga status live in one place" },
    ],
    explanation:
      "Many steps, branching, deadlines and the need to answer 'where is booking X?' all favour an orchestrator that persists saga state. Choreography suits short linear flows; it would scatter this logic across nine services.",
    lessonAnchor: "choosing-between-them",
  },
  {
    id: "hld-saga-semantic-lock",
    lectures: [5],
    tags: ["saga", "isolation"],
    type: "scenario",
    prompt:
      "While an order saga is compensating, a support agent changes the delivery address. The compensation then overwrites the order row and the agent's edit disappears.\nName the anomaly and the fix.",
    fields: [
      { label: "Anomaly", options: ["Lost update", "Dirty read", "Phantom read", "Split brain"], answer: "Lost update" },
      { label: "Fix", options: ["Semantic lock: a CANCELLING status that blocks or rejects edits", "Increase the saga timeout", "Switch to choreography", "Add a read replica"], answer: "Semantic lock: a CANCELLING status that blocks or rejects edits" },
    ],
    explanation:
      "Sagas give up isolation, so a concurrent write can be overwritten by a compensation. A status flag acting as an application-level lock tells other operations the record is in flux. Changing the coordination style doesn't restore isolation.",
    lessonAnchor: "isolation-and-semantic-locks",
  },
  {
    id: "hld-saga-stuck-compensation",
    lectures: [5],
    tags: ["saga", "failure"],
    type: "mcq",
    prompt:
      "A compensation keeps failing because the payment provider says the authorization expired and can't be voided. Retrying won't change that. What should the saga do?",
    options: [
      "Move to a STUCK state, alert, and route it to a human operations queue",
      "Retry forever with backoff",
      "Mark the saga COMPLETED",
      "Run the forward steps again",
    ],
    answer: "Move to a STUCK state, alert, and route it to a human operations queue",
    explanation:
      "Retries only help transient failures. A permanent compensation failure needs a defined owner and process; silently retrying forever hides an inconsistency.",
    lessonAnchor: "when-compensation-itself-fails",
  },
  {
    id: "hld-saga-observability",
    lectures: [5],
    tags: ["saga", "observability"],
    type: "scenario",
    prompt:
      "Your choreographed checkout saga spans five services. Finance found 30 orders last month with captured payments but no shipment, and nobody noticed for weeks.\nWhat do you add?",
    fields: [
      { label: "To follow one order across services", options: ["Saga id on every event, log and trace span", "Bigger log retention", "A second broker", "Synchronous HTTP calls"], answer: "Saga id on every event, log and trace span" },
      { label: "To spot sagas that never finished", options: ["A saga tracker with alerts on sagas older than their expected duration", "CPU alerts on each service", "A load balancer health check", "Daily database backups"], answer: "A saga tracker with alerts on sagas older than their expected duration" },
      { label: "Safety net for bugs the design missed", options: ["A reconciliation job comparing captures with shipments", "Deleting completed saga records", "Disabling retries", "Moving to 2PC"], answer: "A reconciliation job comparing captures with shipments" },
    ],
    explanation:
      "Choreography has no central saga record, so you build one for observation and alert on stuck sagas. A correlation id makes any single case traceable, and reconciliation catches inconsistencies no alert anticipated.",
    lessonAnchor: "observability",
  },
  {
    id: "hld-saga-vs-2pc",
    lectures: [5, 20],
    tags: ["saga", "2pc"],
    type: "mcq",
    prompt:
      "A hotel booking flow waits up to 20 minutes for a partner hotel's API to confirm a room. Why is two-phase commit a poor fit here?",
    options: [
      "Participants would hold locks for 20 minutes, and the partner's API doesn't speak a prepare protocol",
      "2PC can't handle more than two participants",
      "2PC doesn't write anything durably",
      "2PC is only for NoSQL databases",
    ],
    answer: "Participants would hold locks for 20 minutes, and the partner's API doesn't speak a prepare protocol",
    explanation:
      "2PC needs every participant to prepare and hold locks until the decision, which is impossible for long waits and third-party APIs. A saga commits each step locally and compensates if the hotel says no.",
    lessonAnchor: "saga-versus-two-phase-commit",
  },
];
