import type { Question } from "@/lib/types";

const ALGOS = ["Token bucket", "Leaky bucket", "Fixed window counter", "Sliding window log", "Sliding window counter"];

export const quiz: Question[] = [
  {
    id: "hld-rl-mobile-burst",
    lectures: [13],
    tags: ["rate-limiting", "algorithms"],
    type: "scenario",
    prompt:
      "Your mobile app fires 12 API calls in parallel when the home screen opens, then makes maybe one call every few seconds. You want to cap each user at an average of 2 requests per second without breaking app launch.",
    fields: [
      { label: "Algorithm", options: ALGOS, answer: "Token bucket" },
      { label: "Bucket capacity", options: ["1", "2", "15", "1000"], answer: "15" },
    ],
    explanation:
      "Token bucket separates burst size (capacity) from sustained rate (refill), so a capacity of about 15 absorbs the launch burst while the 2/s refill holds the average. A leaky bucket would queue the launch calls and make the home screen slow; a capacity of 2 would reject most of the launch burst.",
    lessonAnchor: "token-bucket",
  },
  {
    id: "hld-rl-boundary",
    lectures: [13],
    tags: ["rate-limiting", "algorithms"],
    type: "mcq",
    prompt:
      "Your limit is 100 requests per minute using a fixed window counter. Logs show a scraper sending 100 requests at 10:04:59 and 100 more at 10:05:00, all accepted. What's the cheapest change that stops this pattern for a high-volume API?",
    options: [
      "Switch to a sliding window counter",
      "Switch to a sliding window log",
      "Halve the limit to 50 per minute",
      "Move the limiter from the gateway into the service",
    ],
    answer: "Switch to a sliding window counter",
    explanation:
      "The boundary burst comes from resetting the counter at fixed edges. A sliding window counter weights the previous window in, removing the burst with only two counters per key. A sliding log also fixes it, but it stores every timestamp, which is costly at high volume.",
    lessonAnchor: "fixed-window-counter",
  },
  {
    id: "hld-rl-otp",
    lectures: [13],
    tags: ["rate-limiting", "security"],
    type: "scenario",
    prompt:
      "You're limiting OTP verification attempts: at most 5 per phone number in any rolling 15 minutes, with no slack at all. Volume is low. Also decide what happens if the Redis cluster behind the limiter is unreachable.",
    fields: [
      { label: "Algorithm", options: ALGOS, answer: "Sliding window log" },
      { label: "If Redis is down", options: ["Fail open (allow)", "Fail closed (reject)", "Skip the limiter and log a warning"], answer: "Fail closed (reject)" },
    ],
    explanation:
      "A sliding log is exact and the memory cost is trivial at 5 entries per key. Brute-forcing a 6-digit OTP is exactly what the limit prevents, so this security limit should fail closed; failing open would hand attackers unlimited guesses during an outage.",
    lessonAnchor: "when-redis-is-down",
  },
  {
    id: "hld-rl-race",
    lectures: [13],
    tags: ["rate-limiting", "redis", "concurrency"],
    type: "scenario",
    prompt:
      "Your 30 gateway pods share a Redis token bucket. Each pod does HGET to read tokens, computes the refill in application code, then HSET to write back. Under load tests, heavy users get about 3x their limit.",
    fields: [
      { label: "Root cause", options: ["Clock skew between pods", "Read-modify-write race between pods", "Redis evicting keys", "Network latency to Redis"], answer: "Read-modify-write race between pods" },
      { label: "Fix", options: ["Run the whole bucket update as one Lua script", "Add a local cache of token counts", "Increase Redis memory", "Use a longer TTL"], answer: "Run the whole bucket update as one Lua script" },
    ],
    explanation:
      "Several pods read the same token count before any of them writes, so each grants a token that only existed once. A Lua script runs atomically inside Redis, so no other pod's command can interleave between the read and the write. A local cache would make the overshoot worse.",
    lessonAnchor: "the-race-condition",
  },
  {
    id: "hld-rl-response",
    lectures: [13],
    tags: ["rate-limiting", "http"],
    type: "scenario",
    prompt:
      "A client exceeded its plan limit of 1,000 requests per hour. The window resets in 17 minutes. Fill in the response.",
    fields: [
      { label: "Status", options: ["400 Bad Request", "403 Forbidden", "429 Too Many Requests", "503 Service Unavailable"], answer: "429 Too Many Requests" },
      { label: "Retry-After", options: ["0", "17", "1020", "3600"], answer: "1020" },
      { label: "X-RateLimit-Remaining", options: ["0", "1", "1000", "-1"], answer: "0" },
    ],
    explanation:
      "429 is the per-client limit status; 503 would claim the whole server is overloaded. Retry-After is in seconds, so 17 minutes is 1020. Remaining is 0 because the client has used its quota.",
    lessonAnchor: "the-429-response",
  },
  {
    id: "hld-rl-placement",
    lectures: [13],
    tags: ["rate-limiting", "architecture"],
    type: "scenario",
    prompt:
      "Two new limits: (1) block any IP sending more than 2,000 requests per minute, and (2) free-plan users may generate at most 3 PDF reports per day. Where should each one be enforced?",
    fields: [
      { label: "IP flood limit", options: ["Client SDK", "API gateway or edge", "Service middleware", "Database trigger"], answer: "API gateway or edge" },
      { label: "Free-plan report limit", options: ["Client SDK", "API gateway or edge", "Service middleware", "Database trigger"], answer: "Service middleware" },
    ],
    explanation:
      "Floods should be dropped as early and cheaply as possible, before they reach app servers. The report limit needs business context (the user's plan, what counts as a report), which the service has and the gateway usually doesn't. A client SDK can never enforce anything.",
    lessonAnchor: "where-the-limiter-lives",
  },
  {
    id: "hld-rl-thundering",
    lectures: [13],
    tags: ["rate-limiting", "retries"],
    type: "mcq",
    prompt:
      "After a brief outage, 50,000 clients are rate limited at once. They all retry exactly 1 second later, get limited again, and retry again 1 second later. What client behaviour fixes this?",
    options: [
      "Exponential backoff with jitter, honouring Retry-After",
      "Retry immediately until success",
      "Retry every 1 second but with a smaller payload",
      "Open a new connection for each retry",
    ],
    answer: "Exponential backoff with jitter, honouring Retry-After",
    explanation:
      "Fixed-interval retries keep everyone synchronised, so each retry wave is another spike. Backoff spreads retries out over time, and jitter randomises them so clients stop arriving in lockstep.",
    lessonAnchor: "client-behaviour",
  },
  {
    id: "hld-rl-flow",
    lectures: [13],
    tags: ["rate-limiting", "architecture"],
    type: "order",
    prompt: "Put the steps of a gateway handling a request under a Redis-backed token bucket in order.",
    steps: [
      "Gateway builds the limit key from the API key and route",
      "Gateway runs the token bucket Lua script in Redis with a short timeout",
      "Script refills tokens based on elapsed time and tries to take one",
      "Gateway gets back allowed or rejected plus remaining tokens",
      "Gateway forwards the request, or returns 429 with Retry-After",
    ],
    explanation:
      "Key first, then one atomic call to Redis that both refills and consumes, then the decision. The response carries rate limit headers either way.",
    lessonAnchor: "putting-it-together",
  },
  {
    id: "hld-rl-tiers",
    lectures: [13],
    tags: ["rate-limiting", "design"],
    type: "mcq",
    prompt:
      "Your paid plan promises 1,000,000 requests per day. A customer burns 400,000 of them in 90 seconds and your database falls over. What was missing?",
    options: [
      "A short-window limit (per second) alongside the daily quota",
      "A larger daily quota",
      "A fixed window instead of a token bucket for the daily quota",
      "Client-side throttling in the SDK",
    ],
    answer: "A short-window limit (per second) alongside the daily quota",
    explanation:
      "A daily quota enforces the plan but says nothing about how fast the quota is spent. Stack a per-second or per-minute limit on top to control bursts; the request must pass both.",
    lessonAnchor: "multi-tier-limits",
  },
];
