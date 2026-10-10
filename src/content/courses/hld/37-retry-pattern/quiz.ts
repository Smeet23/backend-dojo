import type { Question } from "@/lib/types";

const RETRY = ["Retry with backoff", "Retry after Retry-After", "Don't retry", "Retry immediately forever"];

export const quiz: Question[] = [
  {
    id: "hld-retry-classify",
    lectures: [37],
    tags: ["transient-errors"],
    type: "scenario",
    prompt: "Your order service calls an inventory API. Decide what to do for each failure.",
    fields: [
      { label: "ECONNRESET on a GET", options: RETRY, answer: "Retry with backoff" },
      { label: "422 Unprocessable Entity", options: RETRY, answer: "Don't retry" },
      { label: "429 with Retry-After: 3", options: RETRY, answer: "Retry after Retry-After" },
      { label: "403 Forbidden", options: RETRY, answer: "Don't retry" },
    ],
    explanation:
      "Connection resets are transient. 422 and 403 will fail identically next time, so retrying only adds load. A 429 with Retry-After tells you exactly when to come back.",
    lessonAnchor: "transient-vs-permanent-errors",
  },
  {
    id: "hld-retry-timeout-payment",
    lectures: [37],
    tags: ["idempotency"],
    type: "scenario",
    prompt:
      "POST /charges to the payment provider times out after 5 seconds. Your code retries, and the retry succeeds. Next day, support reports customers charged twice.",
    fields: [
      { label: "What happened", options: ["The first request succeeded; only its response was lost", "The provider has a bug", "The retry used the wrong amount", "The timeout was too long"], answer: "The first request succeeded; only its response was lost" },
      { label: "Fix", options: ["Send the same Idempotency-Key on every attempt of one charge", "Stop using timeouts", "Retry with a new key each time", "Lower the timeout to 1 second"], answer: "Send the same Idempotency-Key on every attempt of one charge" },
    ],
    explanation:
      "A timeout is ambiguous: the server may have done the work. Reusing one idempotency key per logical charge lets the provider return the original result instead of charging again. A new key per attempt defeats the purpose.",
    lessonAnchor: "idempotency-is-a-requirement",
  },
  {
    id: "hld-retry-thundering",
    lectures: [37],
    tags: ["backoff", "jitter"],
    type: "mcq",
    prompt:
      "A cache cluster restarts. 5,000 app instances fail at the same moment and retry with exponential backoff (100 ms, 200 ms, 400 ms...). The cluster comes back but gets knocked over by huge spikes at regular intervals. What's missing?",
    options: ["Jitter", "A higher base delay", "More retry attempts", "A shorter cap"],
    answer: "Jitter",
    explanation:
      "Clients that fail together and back off deterministically retry together, in synchronised waves. Randomising each delay spreads them out; changing the base or cap just moves the waves.",
    lessonAnchor: "jitter",
  },
  {
    id: "hld-retry-amplification",
    lectures: [37],
    tags: ["retry-storm"],
    type: "scenario",
    prompt:
      "A request goes gateway → BFF → orders → database. The gateway, BFF and orders service each retry failed calls 3 times (4 attempts each). The database starts timing out.",
    fields: [
      { label: "Worst-case database attempts per user request", options: ["4", "12", "64", "256"], answer: "64" },
      { label: "Best structural fix", options: ["Retry at one layer only and signal \"don't retry\" upward", "Lower every layer to 2 retries", "Increase the database timeout", "Add retries at the database driver too"], answer: "Retry at one layer only and signal \"don't retry\" upward" },
    ],
    explanation:
      "Three retrying layers multiply: 4 x 4 x 4 = 64 attempts at the bottom. Reducing counts everywhere still multiplies; retrying at a single layer removes the multiplication.",
    lessonAnchor: "retry-storms-and-amplification",
  },
  {
    id: "hld-retry-budget",
    lectures: [37],
    tags: ["retry-budget"],
    type: "mcq",
    prompt:
      "You want retries to fix occasional blips, but during a full outage of a dependency you don't want retries to multiply its load. Which policy achieves both?",
    options: [
      "A retry budget: retries may add at most about 10% on top of first attempts",
      "Max 5 attempts per request",
      "Retry immediately, but only once",
      "Fixed 1-second delay between attempts",
    ],
    answer: "A retry budget: retries may add at most about 10% on top of first attempts",
    explanation:
      "A per-request limit still multiplies load when every request fails. A budget lets the few failures of a healthy period retry, but runs out instantly during an outage, keeping load near 1.1x.",
    lessonAnchor: "retry-budgets",
  },
  {
    id: "hld-retry-deadline",
    lectures: [37],
    tags: ["deadlines"],
    type: "scenario",
    prompt:
      "A user-facing endpoint has a 2-second budget. It calls a search service with a 1.5-second per-attempt timeout and 3 attempts. Users see 4.5-second hangs during search incidents.",
    fields: [
      { label: "Problem", options: ["Per-attempt timeouts with no overall deadline", "Too few attempts", "Missing jitter", "Search isn't idempotent"], answer: "Per-attempt timeouts with no overall deadline" },
      { label: "Fix", options: ["Cap total retry time at the remaining budget and pass it as each attempt's timeout", "Raise the endpoint budget to 5 seconds", "Remove timeouts", "Retry 5 times with 300 ms each"], answer: "Cap total retry time at the remaining budget and pass it as each attempt's timeout" },
    ],
    explanation:
      "Attempts must fit inside the caller's deadline. Once the budget is gone, a further attempt can't produce a useful answer, so give up and return a fallback or error.",
    lessonAnchor: "how-many-attempts",
  },
  {
    id: "hld-retry-mesh",
    lectures: [37],
    tags: ["where-to-retry"],
    type: "mcq",
    prompt:
      "You enable Envoy retries on 5xx for every route in the mesh. Soon after, the finance team finds duplicate invoices. Which change is the right one?",
    options: [
      "Restrict mesh retries to connection failures and idempotent methods",
      "Raise the mesh retry count",
      "Retry 5xx only on POST",
      "Remove timeouts from Envoy",
    ],
    answer: "Restrict mesh retries to connection failures and idempotent methods",
    explanation:
      "The proxy can't tell whether a POST is safe to repeat. A 5xx on POST /invoices may come after the invoice was created. Let the application retry non-idempotent calls only with idempotency keys.",
    lessonAnchor: "in-the-infrastructure",
  },
  {
    id: "hld-retry-webhook",
    lectures: [37],
    tags: ["async"],
    type: "mcq",
    prompt:
      "Your service sends webhooks to customer endpoints. Some customers' servers are down for hours. What retry approach fits?",
    options: [
      "Queue the deliveries and retry with long exponential backoff over hours, then dead-letter",
      "Retry 3 times within the original API request",
      "Retry every second until it succeeds",
      "Never retry webhooks",
    ],
    answer: "Queue the deliveries and retry with long exponential backoff over hours, then dead-letter",
    explanation:
      "No user is waiting, so the retry can move off the request path to a queue with long backoff. A dead-letter queue catches deliveries that never succeed instead of retrying forever.",
    lessonAnchor: "asynchronously",
  },
  {
    id: "hld-retry-breaker",
    lectures: [37],
    tags: ["circuit-breaker"],
    type: "mcq",
    prompt: "A circuit breaker around the recommendations client is open. A call is rejected with CallNotPermittedException. What should the retry layer do?",
    options: ["Not retry; return the fallback", "Retry immediately", "Retry with backoff up to 3 times", "Retry on a different thread"],
    answer: "Not retry; return the fallback",
    explanation:
      "An open breaker means the dependency is known to be failing; retrying just adds latency and defeats the breaker's purpose. Treat breaker rejections as non-retryable.",
    lessonAnchor: "retries-with-other-patterns",
  },
];
