import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-idem-timeout",
    lectures: [14],
    tags: ["idempotency", "retries"],
    type: "mcq",
    prompt:
      "Your checkout service calls POST /payments on the payments team's API with a 5 s timeout. The call times out. What do you actually know about the payment?",
    options: [
      "Nothing: it may or may not have been charged",
      "It was not charged, because the server didn't respond",
      "It was charged, because timeouts happen after processing",
      "It was rolled back automatically by HTTP",
    ],
    answer: "Nothing: it may or may not have been charged",
    explanation:
      "The request might have failed before reaching the server, during processing, or after the work finished while the response was in flight. That uncertainty is why retries must be made safe with idempotency.",
    lessonAnchor: "the-double-charge-problem",
  },
  {
    id: "hld-idem-key-generation",
    lectures: [14],
    tags: ["idempotency", "client"],
    type: "scenario",
    prompt:
      "You're writing the mobile client for POST /payments. The SDK retries up to 3 times on network errors. Decide how the Idempotency-Key is produced.",
    fields: [
      { label: "Who generates it", options: ["The client", "The API gateway", "The payments server", "The database"], answer: "The client" },
      { label: "When", options: ["Once when the user taps Pay, reused on every retry", "Fresh for every HTTP attempt", "Once per app install", "Once per day"], answer: "Once when the user taps Pay, reused on every retry" },
      { label: "Value", options: ["A random UUID v4", "The amount plus the user id", "The current timestamp in seconds", "An incrementing counter per device"], answer: "A random UUID v4" },
    ],
    explanation:
      "Only the client knows whether a request is a retry of the same action. A fresh key per attempt makes every retry look new. Amount plus user id would wrongly merge two genuine identical payments, and timestamps or per-device counters can collide.",
    lessonAnchor: "who-generates-the-key",
  },
  {
    id: "hld-idem-concurrent",
    lectures: [14],
    tags: ["idempotency", "concurrency"],
    type: "scenario",
    prompt:
      "Your server does SELECT on the idempotency table, and if the key isn't there, charges the card and then INSERTs the key. A user double-clicks Pay and is charged twice even though both requests carried the same key.",
    fields: [
      { label: "Root cause", options: ["Check-then-act race between the two requests", "The TTL was too short", "The client generated two keys", "The response wasn't stored"], answer: "Check-then-act race between the two requests" },
      { label: "Fix", options: ["Claim the key first with INSERT ... ON CONFLICT DO NOTHING", "Add a 100 ms sleep before charging", "Cache the SELECT result in Redis", "Return 202 Accepted instead of 201"], answer: "Claim the key first with INSERT ... ON CONFLICT DO NOTHING" },
      { label: "The losing request should get", options: ["409 Conflict, retry shortly", "201 Created with a new payment", "500 Internal Server Error", "404 Not Found"], answer: "409 Conflict, retry shortly" },
    ],
    explanation:
      "Both requests saw 'not found' before either inserted. Using the unique constraint as an atomic claim means exactly one request owns the key. The loser finds it in progress and gets 409, then a retry replays the stored result.",
    lessonAnchor: "concurrent-duplicates",
  },
  {
    id: "hld-idem-mismatch",
    lectures: [14],
    tags: ["idempotency", "validation"],
    type: "mcq",
    prompt:
      "A request arrives with an idempotency key that already completed for a ₹2,000 payment, but this body says ₹5,000. What should the server do?",
    options: [
      "Reject it with 422, because the key was reused for a different request",
      "Replay the stored ₹2,000 response",
      "Process the ₹5,000 payment and overwrite the stored response",
      "Process the ₹5,000 payment and keep the old response",
    ],
    answer: "Reject it with 422, because the key was reused for a different request",
    explanation:
      "Storing a hash of the request lets the server detect key reuse. Replaying the ₹2,000 response would tell the client a ₹5,000 payment succeeded when it never ran; processing it would break the key's meaning.",
    lessonAnchor: "what-to-store",
  },
  {
    id: "hld-idem-store",
    lectures: [14],
    tags: ["idempotency", "storage"],
    type: "scenario",
    prompt:
      "Designing the key store for a payments API on Postgres. You need the key's final state and the payment row to never disagree, even if the server crashes mid-request.",
    fields: [
      { label: "Where the completed key lives", options: ["Same Postgres DB, same transaction as the payment row", "Redis only, written after the DB commit", "In the API server's memory", "In the client's local storage"], answer: "Same Postgres DB, same transaction as the payment row" },
      { label: "Primary key", options: ["(account_id, idem_key)", "idem_key alone", "payment_id", "(amount, created_at)"], answer: "(account_id, idem_key)" },
    ],
    explanation:
      "One transaction means the payment and the completed key commit or roll back together. A Redis write after the commit can be lost in a crash, leaving a payment with no recorded key. Scoping by account stops one customer replaying another's stored response.",
    lessonAnchor: "where-to-store-it",
  },
  {
    id: "hld-idem-errors",
    lectures: [14],
    tags: ["idempotency", "errors"],
    type: "scenario",
    prompt: "Decide which outcomes are cached against the idempotency key (so retries replay them).",
    fields: [
      { label: "Card declined (402)", options: ["Cache and replay", "Don't cache; release the key"], answer: "Cache and replay" },
      { label: "Database unavailable before any charge (503)", options: ["Cache and replay", "Don't cache; release the key"], answer: "Don't cache; release the key" },
      { label: "Payment succeeded (201)", options: ["Cache and replay", "Don't cache; release the key"], answer: "Cache and replay" },
    ],
    explanation:
      "Deterministic results, success or a decline, will be the same on retry, so replaying them is correct. A transient failure before any side effect should free the key so the client's retry can actually succeed.",
    lessonAnchor: "what-to-store-for-errors",
  },
  {
    id: "hld-idem-crash",
    lectures: [14],
    tags: ["idempotency", "failure"],
    type: "mcq",
    prompt:
      "A server claims key K, charges the card through the payment provider, then crashes before marking K completed. After K's lock times out, a retry takes over. How do you stop the card being charged a second time?",
    options: [
      "Pass K (or a key derived from it) to the payment provider so its charge call is idempotent too",
      "Make the lock timeout infinite",
      "Delete key K on startup",
      "Ask the user to confirm the payment again",
    ],
    answer: "Pass K (or a key derived from it) to the payment provider so its charge call is idempotent too",
    explanation:
      "Idempotency has to hold end to end. If the downstream charge is keyed, the takeover's charge call returns the original charge instead of creating a new one. An infinite lock would leave the payment stuck forever.",
    lessonAnchor: "crashed-in-the-middle",
  },
  {
    id: "hld-idem-ttl",
    lectures: [14],
    tags: ["idempotency", "ttl"],
    type: "mcq",
    prompt:
      "Your client SDK retries with backoff for up to 6 hours, and the mobile app resumes pending payments the next time it's opened (often the next day). Which key TTL fits?",
    options: ["60 seconds", "1 hour", "72 hours", "Forever"],
    answer: "72 hours",
    explanation:
      "The TTL must comfortably exceed the longest realistic retry window, including an app reopened a day later. Short TTLs turn late retries into new payments; keeping keys forever grows storage without bound.",
    lessonAnchor: "expiry-and-ttl",
  },
  {
    id: "hld-idem-flow",
    lectures: [14],
    tags: ["idempotency", "flow"],
    type: "order",
    prompt: "Order the server's steps for a POST /payments request carrying an idempotency key that has never been seen.",
    steps: [
      "Read the Idempotency-Key header and hash the request",
      "Insert the key as in_progress, relying on the unique constraint",
      "Charge the card, passing the key downstream",
      "In one transaction, save the payment and mark the key completed with the response",
      "Return 201 with the payment",
    ],
    explanation:
      "Claim first, then do the work, then commit the result and the key together. Replays of this key later skip straight to returning the stored response.",
    lessonAnchor: "the-request-flow",
  },
  {
    id: "hld-idem-exactly-once",
    lectures: [14],
    tags: ["idempotency", "messaging"],
    type: "mcq",
    prompt:
      "A Kafka consumer credits wallet balances. The broker guarantees at-least-once delivery, and a teammate asks how you'll guarantee each credit applies exactly once. What's the standard answer?",
    options: [
      "Record each message's transaction id in a dedup table in the same transaction as the credit",
      "Switch the broker to exactly-once delivery over the network",
      "Acknowledge each message before processing it",
      "Process each message twice and compare",
    ],
    answer: "Record each message's transaction id in a dedup table in the same transaction as the credit",
    explanation:
      "Exactly-once delivery over a lossy network isn't achievable; exactly-once effect is at-least-once delivery plus idempotent processing. Acking before processing just converts duplicates into lost messages.",
    lessonAnchor: "exactly-once-effects",
  },
];
