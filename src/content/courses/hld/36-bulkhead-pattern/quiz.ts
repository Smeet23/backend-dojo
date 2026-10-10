import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-bulkhead-cascade",
    lectures: [36],
    tags: ["bulkhead", "cascading-failure"],
    type: "scenario",
    prompt:
      "Your product page service has one pool of 200 threads. A third-party reviews API starts hanging (no errors, just no response). Within seconds, product pages fail entirely, even though pricing and inventory are healthy.",
    fields: [
      { label: "Mechanism", options: ["Hung review calls hold every shared thread", "The reviews API sent malformed JSON", "Pricing was rate limited", "The load balancer removed all instances"], answer: "Hung review calls hold every shared thread" },
      { label: "Pattern to add", options: ["A separate bulkhead for the reviews calls", "A bigger shared pool of 400 threads", "Retries on the reviews call", "A longer reviews timeout"], answer: "A separate bulkhead for the reviews calls" },
    ],
    explanation:
      "A slow dependency holds resources hostage; with a shared pool, it eventually holds all of them. A bigger pool only delays the same outcome, and retries make it worse. Isolating the reviews calls caps the damage to their own compartment.",
    lessonAnchor: "the-failure-it-prevents",
  },
  {
    id: "hld-bulkhead-semaphore-leak",
    lectures: [36],
    tags: ["semaphore"],
    type: "mcq",
    prompt:
      "A Node.js service wraps calls to a geocoding API in a semaphore bulkhead of 20 permits, with no timeout on the HTTP call. The geocoder hangs. Ten minutes later, every geocoding call is still rejected, although the geocoder recovered after two minutes. Why?",
    options: [
      "Semaphores can't be used in Node.js",
      "Permits are held by calls that never complete, because nothing times them out",
      "The bulkhead resets only on deploy",
      "20 permits is too many",
    ],
    answer: "Permits are held by calls that never complete, because nothing times them out",
    explanation:
      "A semaphore bulkhead can't abandon a hung call by itself. Without a call timeout, the stuck requests keep their permits indefinitely. Pair every semaphore bulkhead with a timeout.",
    lessonAnchor: "semaphore-isolation",
  },
  {
    id: "hld-bulkhead-thread-vs-semaphore",
    lectures: [36],
    tags: ["thread-pool", "semaphore"],
    type: "scenario",
    prompt:
      "Pick the bulkhead type.\nA: A Java service calls a legacy SOAP library that sometimes ignores its own timeout settings and blocks forever.\nB: A Go service makes 5,000 concurrent calls per second to an internal gRPC API with deadlines set on every call.",
    fields: [
      { label: "Case A", options: ["Thread-pool bulkhead", "Semaphore bulkhead", "No bulkhead needed", "Separate Kubernetes cluster"], answer: "Thread-pool bulkhead" },
      { label: "Case B", options: ["Thread-pool bulkhead", "Semaphore bulkhead", "No bulkhead needed", "Separate Kubernetes cluster"], answer: "Semaphore bulkhead" },
    ],
    explanation:
      "A thread-pool bulkhead lets the caller stop waiting even when the library won't, which is what A needs. B is async-style with reliable deadlines and high volume, where a cheap semaphore fits and extra thread hand-offs would be pure overhead.",
    lessonAnchor: "kinds-of-bulkhead",
  },
  {
    id: "hld-bulkhead-sizing",
    lectures: [36],
    tags: ["sizing"],
    type: "mcq",
    prompt:
      "Calls to the pricing service peak at 300 per second, with average latency 20 ms and p99 latency 50 ms. Which bulkhead size is most reasonable for one instance handling all of that traffic?",
    options: ["6", "20", "200", "1,000"],
    answer: "20",
    explanation:
      "Little's Law with p99 latency: 300 x 0.05 = 15 concurrent calls, plus headroom, gives about 20. Sizing on the average (6) rejects calls during normal tail spikes; 200 contains nothing.",
    lessonAnchor: "sizing-a-bulkhead",
  },
  {
    id: "hld-bulkhead-reporting-pool",
    lectures: [36],
    tags: ["connection-pool"],
    type: "scenario",
    prompt:
      "Every Monday morning, finance runs heavy reports through the same API service and Postgres pool as checkout. Checkout latency spikes and some orders fail during those hours.",
    fields: [
      { label: "Fix", options: ["Separate, smaller connection pool (or deployment) for reporting", "One bigger shared pool", "Add retries to checkout", "Cache checkout responses"], answer: "Separate, smaller connection pool (or deployment) for reporting" },
      { label: "Ideal database target for reports", options: ["A read replica", "The primary", "Redis", "The checkout service's cache"], answer: "A read replica" },
    ],
    explanation:
      "Workloads with very different costs shouldn't share one pool. A dedicated, capped reporting pool (better, against a replica) means slow reports can only exhaust their own connections.",
    lessonAnchor: "connection-pool-isolation",
  },
  {
    id: "hld-bulkhead-shuffle-shard",
    lectures: [36],
    tags: ["shuffle-sharding"],
    type: "mcq",
    prompt:
      "A multi-tenant API runs on 8 instances. One customer occasionally sends a malformed request that crashes whatever instance processes it, and retries spread it to all 8. Which infrastructure bulkhead limits the blast radius to a small fraction of customers?",
    options: [
      "Shuffle sharding: assign each customer to a small random subset of instances",
      "Round-robin load balancing across all 8",
      "Doubling the number of instances",
      "A single shared retry queue",
    ],
    answer: "Shuffle sharding: assign each customer to a small random subset of instances",
    explanation:
      "With each customer on, say, 2 of 8 instances, the poison request can only take down those 2. Very few other customers share that exact pair, so nearly everyone keeps a healthy instance.",
    lessonAnchor: "isolation-at-the-infrastructure-level",
  },
  {
    id: "hld-bulkhead-decorator-order",
    lectures: [36],
    tags: ["composition"],
    type: "order",
    prompt: "Order the resilience layers around an outgoing call, from outermost to innermost.",
    steps: ["Retry", "Circuit breaker", "Bulkhead", "Timeout", "The actual call"],
    explanation:
      "Each attempt is bounded by a timeout, limited by the bulkhead, gated by the breaker, and the retry wraps it all so every retried attempt also passes through the breaker and bulkhead.",
    lessonAnchor: "combining-with-timeouts-and-circuit-breakers",
  },
  {
    id: "hld-bulkhead-fallback",
    lectures: [36],
    tags: ["fallback"],
    type: "scenario",
    prompt:
      "The recommendations bulkhead on your home-feed service is full and rejecting calls. The pricing bulkhead is also full.",
    fields: [
      { label: "Recommendations", options: ["Render the feed with a cached popular list", "Return a 500 for the whole feed", "Queue the call until a permit frees", "Retry until it succeeds"], answer: "Render the feed with a cached popular list" },
      { label: "Pricing", options: ["Show items without prices silently", "Fail clearly (or use a cached price only if the business allows it)", "Make up a price", "Retry forever"], answer: "Fail clearly (or use a cached price only if the business allows it)" },
    ],
    explanation:
      "Fallbacks depend on importance. Optional features degrade quietly. Critical data needs either a clear failure or a business-approved fallback; showing nothing or inventing a value is worse.",
    lessonAnchor: "fallbacks",
  },
];
