import type { Question } from "@/lib/types";

const STATES = ["CLOSED", "OPEN", "HALF-OPEN"];

export const quiz: Question[] = [
  {
    id: "hld-breaker-why",
    lectures: [38],
    tags: ["circuit-breaker"],
    type: "scenario",
    prompt:
      "A shipping-rates API has been returning errors for 10 minutes. Your checkout service still calls it on every request, waits 3 seconds for the timeout, retries twice, and then shows a default rate. Checkout p99 is now 9 seconds.",
    fields: [
      { label: "Pattern to add", options: ["Circuit breaker around the shipping client", "More retries", "A longer timeout", "A bigger thread pool"], answer: "Circuit breaker around the shipping client" },
      { label: "Checkout latency while the API is down", options: ["Near normal, using the default rate immediately", "Still about 9 seconds", "Exactly 3 seconds", "Requests fail with 500"], answer: "Near normal, using the default rate immediately" },
    ],
    explanation:
      "The outcome is already predictable, so paying three timeouts per request is pure waste. An open breaker short-circuits to the fallback in microseconds and also stops hammering the struggling API.",
    lessonAnchor: "the-problem-a-breaker-solves",
  },
  {
    id: "hld-breaker-transitions",
    lectures: [38],
    tags: ["states"],
    type: "scenario",
    prompt: "Fill in the state the breaker moves to in each situation.",
    fields: [
      { label: "CLOSED, failure rate rises to 70% over 50 calls (threshold 50%)", options: STATES, answer: "OPEN" },
      { label: "OPEN, the 30-second wait elapses", options: STATES, answer: "HALF-OPEN" },
      { label: "HALF-OPEN, 4 of 5 trial calls fail", options: STATES, answer: "OPEN" },
      { label: "HALF-OPEN, all 5 trial calls succeed", options: STATES, answer: "CLOSED" },
    ],
    explanation:
      "Crossing the threshold trips the breaker open; after the wait it lets a few trials through in half-open; the trials decide whether to close or open again.",
    lessonAnchor: "the-three-states",
  },
  {
    id: "hld-breaker-404s",
    lectures: [38],
    tags: ["failure-classification"],
    type: "mcq",
    prompt:
      "A scraper hits your product-lookup endpoint with thousands of nonexistent ids. The catalog service correctly returns 404s, and your breaker around the catalog client opens, blocking lookups for real products too. What's the fix?",
    options: [
      "Configure the breaker to ignore 404 (and other 4xx) responses",
      "Raise the failure threshold to 95%",
      "Shorten the open wait duration",
      "Remove the breaker",
    ],
    answer: "Configure the breaker to ignore 404 (and other 4xx) responses",
    explanation:
      "A 404 says the request was for something missing, not that the catalog is unhealthy. Only record failures that indicate dependency health: timeouts, connection errors, 5xx.",
    lessonAnchor: "what-counts-as-a-failure",
  },
  {
    id: "hld-breaker-min-calls",
    lectures: [38],
    tags: ["tuning"],
    type: "mcq",
    prompt:
      "At 3 a.m., an internal admin API gets 2 calls a minute. One fails, and the breaker (50% threshold, no minimum) opens, blocking the on-call engineer. Which setting fixes this?",
    options: [
      "A minimum number of calls before the failure rate is evaluated",
      "A longer half-open trial",
      "A lower failure threshold",
      "Slow-call detection",
    ],
    answer: "A minimum number of calls before the failure rate is evaluated",
    explanation:
      "One failure out of two calls is 50%, but that's noise, not evidence. A minimum sample size (or a longer time-based window) stops the breaker reacting to tiny samples.",
    lessonAnchor: "minimum-number-of-calls",
  },
  {
    id: "hld-breaker-slow",
    lectures: [38],
    tags: ["slow-calls"],
    type: "scenario",
    prompt:
      "A pricing service degrades: it never errors, but responses take 6 to 10 seconds instead of 50 ms. Your breaker only counts exceptions, and your client timeout is 15 seconds. The breaker stays CLOSED while your threads pile up.",
    fields: [
      { label: "Breaker setting to add", options: ["Slow-call duration and slow-call rate thresholds", "A higher failure-rate threshold", "More half-open trial calls", "Ignore TimeoutException"], answer: "Slow-call duration and slow-call rate thresholds" },
      { label: "Also change", options: ["Lower the client timeout to something near normal p99", "Raise the timeout to 30 seconds", "Disable the breaker", "Add retries"], answer: "Lower the client timeout to something near normal p99" },
    ],
    explanation:
      "Slow successes are invisible to an exception-only breaker. Slow-call thresholds let it open on degradation, and a realistic timeout stops each call holding resources for 15 seconds.",
    lessonAnchor: "slow-calls",
  },
  {
    id: "hld-breaker-granularity",
    lectures: [38],
    tags: ["granularity"],
    type: "scenario",
    prompt:
      "Your gateway uses a single circuit breaker for all outgoing calls. The reviews service fails and the breaker opens.\nSeparately, 1 of 5 payment instances has a bad disk and fails every request; the service-level payment breaker sees 20% failures and stays closed.",
    fields: [
      { label: "Problem with the gateway setup", options: ["Payments, search and everything else are blocked too", "Reviews will never recover", "The breaker can't open", "Fallbacks will be too slow"], answer: "Payments, search and everything else are blocked too" },
      { label: "Tool for the bad payment instance", options: ["Per-host breaker or outlier detection", "A lower service-level threshold of 10%", "Longer open wait", "Shuffle the retry order"], answer: "Per-host breaker or outlier detection" },
    ],
    explanation:
      "Breakers must match failure domains: one per dependency so a reviews outage doesn't block payments, and per host when single instances fail independently. Lowering the service-level threshold would trip on noise and block all five instances.",
    lessonAnchor: "one-breaker-per-dependency",
  },
  {
    id: "hld-breaker-stack-order",
    lectures: [38],
    tags: ["composition"],
    type: "order",
    prompt: "Order the layers around a remote call, from outermost to innermost.",
    steps: ["Fallback", "Retry", "Circuit breaker", "Bulkhead", "Timeout", "Remote call"],
    explanation:
      "The fallback catches anything that escapes; each retry attempt passes through the breaker and bulkhead; the timeout bounds every individual attempt.",
    lessonAnchor: "combining-with-retries-and-bulkheads",
  },
  {
    id: "hld-breaker-retry-open",
    lectures: [38],
    tags: ["retries"],
    type: "mcq",
    prompt:
      "Your retry policy (3 attempts, exponential backoff starting at 500 ms) wraps a circuit breaker. When the breaker is open, requests still take about 1.5 seconds before returning the fallback. What's wrong?",
    options: [
      "The retry policy is retrying CallNotPermittedException instead of treating it as non-retryable",
      "The breaker's wait duration is too short",
      "The timeout is too long",
      "The bulkhead is too small",
    ],
    answer: "The retry policy is retrying CallNotPermittedException instead of treating it as non-retryable",
    explanation:
      "Each rejection is instant, but the retry waits its backoff schedule between instant rejections. Rejections from an open breaker should go straight to the fallback.",
    lessonAnchor: "combining-with-retries-and-bulkheads",
  },
  {
    id: "hld-breaker-fallback",
    lectures: [38],
    tags: ["fallback"],
    type: "scenario",
    prompt: "Breakers have opened around two dependencies of your banking app's home screen.",
    fields: [
      { label: "Promotions banner service", options: ["Hide the banner", "Show a balance of 0", "Show a full-page error", "Retry until it works"], answer: "Hide the banner" },
      { label: "Account balance service", options: ["Show balance 0", "Show the last known balance marked as possibly out of date, or a clear error", "Hide the balance silently", "Show yesterday's balance as current"], answer: "Show the last known balance marked as possibly out of date, or a clear error" },
    ],
    explanation:
      "Optional features can disappear quietly. Critical data must never be faked: either show it honestly labelled as stale or report the failure. A silent zero is worse than an error.",
    lessonAnchor: "fallbacks",
  },
  {
    id: "hld-breaker-envoy",
    lectures: [38],
    tags: ["service-mesh"],
    type: "mcq",
    prompt:
      "In Envoy, you set max_connections and max_pending_requests under circuit_breakers for a cluster. Which classic pattern do these settings most resemble?",
    options: ["Bulkhead", "Retry budget", "Transactional outbox", "Service discovery"],
    answer: "Bulkhead",
    explanation:
      "Despite the name, they cap concurrent connections and queued requests to a cluster, which is a bulkhead. Envoy's outlier detection, which ejects failing hosts, is the closer analogue to the classic breaker.",
    lessonAnchor: "libraries-and-infrastructure",
  },
];
