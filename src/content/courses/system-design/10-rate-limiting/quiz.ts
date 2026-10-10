import type { Question } from "@/lib/types";

const ALGOS = ["Leaky bucket", "Token bucket", "Fixed window counter", "Sliding window log", "Sliding window counter"];

export const quiz: Question[] = [
  {
    id: "sd-rl-algo-pick",
    lectures: [10],
    tags: ["algorithms"],
    type: "scenario",
    prompt: "Choose the best-fitting algorithm for each limit.",
    fields: [
      { label: "Public API: 100 req/min per key, but a mobile app opening fires 15 calls at once and should not be throttled", options: ALGOS, answer: "Token bucket" },
      { label: "Calls to a legacy mainframe that falls over above a steady 20 req/s, and callers can wait", options: ALGOS, answer: "Leaky bucket" },
      { label: "OTP verification: at most 5 attempts per 15 minutes per phone, exactly, low volume", options: ALGOS, answer: "Sliding window log" },
    ],
    explanation:
      "Token bucket allows short bursts up to its capacity while holding the average. Leaky bucket queues and releases at a fixed pace, which is what a fragile backend needs. For a strict, low-volume security limit, the exact sliding log is affordable and has no boundary loophole.",
    lessonAnchor: "comparing-them",
  },
  {
    id: "sd-rl-boundary",
    lectures: [10],
    tags: ["fixed-window"],
    type: "mcq",
    prompt:
      "Your login endpoint allows 10 attempts per minute using a counter keyed by the minute (INCR login:{ip}:{minute}). A pentest shows 20 attempts within 2 seconds from one IP. How?",
    options: [
      "Redis INCR isn't atomic",
      "10 attempts at hh:mm:59 and 10 at hh:(mm+1):00 fall in different fixed windows",
      "The attacker used IPv6",
      "The TTL was too long",
    ],
    answer: "10 attempts at hh:mm:59 and 10 at hh:(mm+1):00 fall in different fixed windows",
    explanation:
      "Fixed windows reset at boundaries, so up to 2× the limit can pass across one. A sliding log or sliding counter closes the gap. INCR is atomic; that isn't the problem.",
    lessonAnchor: "fixed-window-counter",
  },
  {
    id: "sd-rl-token-math",
    lectures: [10],
    tags: ["token-bucket"],
    type: "scenario",
    prompt:
      "A token bucket has capacity 10 and refills 2 tokens/second. It's full at t=0, when 14 requests arrive at once. Then nothing until t=3, when 8 requests arrive.",
    fields: [
      { label: "Allowed at t=0", options: ["2", "10", "14", "0"], answer: "10" },
      { label: "Tokens available at t=3", options: ["0", "3", "6", "10"], answer: "6" },
      { label: "Allowed at t=3", options: ["2", "6", "8", "10"], answer: "6" },
    ],
    explanation:
      "The full bucket lets 10 through and rejects 4. Three seconds at 2/s refills 6 tokens (under the cap of 10), so 6 of the 8 later requests pass.",
    lessonAnchor: "token-bucket",
  },
  {
    id: "sd-rl-distributed",
    lectures: [10],
    tags: ["distributed", "redis"],
    type: "scenario",
    prompt:
      "You run 12 API servers behind a load balancer, each with an in-memory token bucket set to 100 req/min per user. A scraper is getting about 1,200 req/min through.\nFix it.",
    fields: [
      { label: "Why it leaks", options: ["Each server enforces the limit on only its slice of traffic", "Token bucket allows unlimited bursts", "The load balancer caches responses", "Clocks differ between servers"], answer: "Each server enforces the limit on only its slice of traffic" },
      { label: "Where the counters should live", options: ["In each server's memory, with 12× the limit", "A shared Redis, updated atomically with a Lua script", "In the user's cookie", "In the primary SQL database with SELECT then UPDATE"], answer: "A shared Redis, updated atomically with a Lua script" },
    ],
    explanation:
      "Per-server buckets multiply the effective limit by the number of servers. A shared store with an atomic check-and-decrement enforces one limit. SELECT-then-UPDATE races (two servers both see 99) and loads the main database on every request.",
    lessonAnchor: "rate-limiting-across-many-servers",
  },
  {
    id: "sd-rl-response",
    lectures: [10],
    tags: ["http"],
    type: "scenario",
    prompt: "A client exceeded its limit; the next token arrives in 7 seconds. Fill in the response.",
    fields: [
      { label: "Status", options: ["400 Bad Request", "403 Forbidden", "429 Too Many Requests", "503 Service Unavailable"], answer: "429 Too Many Requests" },
      { label: "Header telling the client when to retry", options: ["Cache-Control: max-age=7", "Retry-After: 7", "Expires: 7", "Location: /retry"], answer: "Retry-After: 7" },
    ],
    explanation:
      "429 says this client sent too many requests; 503 would blame the server. Retry-After lets well-behaved clients back off for exactly the right time instead of hammering.",
    lessonAnchor: "where-the-limiter-lives",
  },
  {
    id: "sd-rl-redis-down",
    lectures: [10],
    tags: ["distributed", "failure"],
    type: "mcq",
    prompt:
      "Your public read API's rate limiter stores counters in Redis. Redis becomes unreachable for 30 seconds. The API itself is healthy and well under capacity. What's the usual choice?",
    options: [
      "Fail closed: reject every request until Redis is back",
      "Fail open: allow requests (maybe with a local fallback limit) and alert",
      "Return 500 for every request",
      "Restart all API servers",
    ],
    answer: "Fail open: allow requests (maybe with a local fallback limit) and alert",
    explanation:
      "Failing closed turns a limiter outage into a full API outage. For most public APIs, briefly unlimited traffic is the smaller risk; strict security limits (like login attempts) may justify failing closed.",
    lessonAnchor: "rate-limiting-across-many-servers",
  },
];
