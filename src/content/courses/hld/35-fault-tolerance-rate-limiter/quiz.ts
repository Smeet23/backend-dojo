import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-shed-goodput-collapse",
    lectures: [35],
    tags: ["overload"],
    type: "scenario",
    prompt:
      "During a flash sale your product API receives 1.5x its capacity. Dashboards show CPU at 100% and the server completing nearly as many requests per second as usual, yet users see almost nothing but timeouts.",
    fields: [
      { label: "What's happening", options: ["Requests queue so long that they finish after clients have given up", "The database ran out of disk", "The load balancer is dropping packets", "TLS handshakes are failing"], answer: "Requests queue so long that they finish after clients have given up" },
      { label: "Metric that reveals it", options: ["Goodput (responses completed within the client's timeout)", "Total requests completed", "Average CPU", "Number of open TCP connections"], answer: "Goodput (responses completed within the client's timeout)" },
      { label: "First fix", options: ["Reject excess work quickly at the front door", "Increase the queue size", "Raise client timeouts to 60s", "Add more logging"], answer: "Reject excess work quickly at the front door" },
    ],
    explanation:
      "Throughput can look healthy while all the work is wasted on abandoned requests. Rejecting the excess fast keeps queues short so the admitted requests finish in time; a bigger queue only adds latency.",
    lessonAnchor: "how-overload-kills-a-service",
  },
  {
    id: "hld-shed-concurrency-vs-rate",
    lectures: [35],
    tags: ["concurrency-limit"],
    type: "mcq",
    prompt:
      "Your search service has a limit of 500 req/s, chosen from a load test. One day the backing index gets slower and each query takes 4x longer. The service falls over even though traffic stays at 400 req/s. Which limit would have adapted automatically?",
    options: [
      "A per-user quota of 10 req/s",
      "A cap on concurrent in-flight requests",
      "A daily request quota",
      "A larger fixed req/s limit",
    ],
    answer: "A cap on concurrent in-flight requests",
    explanation:
      "In-flight = rate x latency. When latency quadruples, a concurrency cap admits a quarter of the rate automatically. A fixed req/s limit assumes requests cost the same as on load-test day.",
    lessonAnchor: "concurrency-limits-beat-rate-limits",
  },
  {
    id: "hld-shed-priority",
    lectures: [35],
    tags: ["load-shedding", "priority"],
    type: "scenario",
    prompt:
      "Your storefront backend is at 85% of its concurrency limit and climbing. It serves checkout, product pages, the \"customers also bought\" widget and analytics beacons.",
    fields: [
      { label: "Shed first", options: ["Checkout", "Product pages", "\"Customers also bought\"", "Analytics beacons"], answer: "Analytics beacons" },
      { label: "Protect longest", options: ["Checkout", "Product pages", "\"Customers also bought\"", "Analytics beacons"], answer: "Checkout" },
      { label: "Good response for shed recommendations", options: ["A static fallback list", "A 500 error page", "Wait until capacity frees up", "Redirect to the homepage"], answer: "A static fallback list" },
    ],
    explanation:
      "Shed background work first, then deferrable features, and keep revenue-critical paths up. Shedding a widget is best done with a cheap degraded answer rather than an error.",
    lessonAnchor: "prioritise-by-importance",
  },
  {
    id: "hld-shed-retry-amplify",
    lectures: [35],
    tags: ["retries"],
    type: "scenario",
    prompt:
      "A service with capacity 800 req/s gets 1,000 req/s and correctly rejects 200 with 503. Every client retries immediately up to 3 times. Within a minute the service is rejecting over half its traffic.",
    fields: [
      { label: "Why", options: ["Immediate retries multiply the offered load", "The limiter is miscounting", "503 isn't a retryable status", "The service is leaking memory"], answer: "Immediate retries multiply the offered load" },
      { label: "Best client change", options: ["Exponential backoff with jitter, honour Retry-After, and a retry budget", "Retry 5 times instead of 3", "Retry on a fixed 100 ms interval", "Treat 503 as success"], answer: "Exponential backoff with jitter, honour Retry-After, and a retry budget" },
    ],
    explanation:
      "Each rejection comes back as more load. Spacing retries out, respecting the server's hint, and capping retries as a fraction of traffic stops the limiter from spending its capacity on rejections.",
    lessonAnchor: "how-limits-interact-with-retries",
  },
  {
    id: "hld-shed-adaptive",
    lectures: [35],
    tags: ["adaptive"],
    type: "mcq",
    prompt:
      "An adaptive concurrency limiter sees latency rise from a 20 ms baseline to 60 ms while CPU stays at 50%. What does it do, and why is that sensible?",
    options: [
      "Raise the limit, because CPU has headroom",
      "Cut the limit, because rising latency means requests are queueing on some bottleneck",
      "Leave the limit alone until CPU reaches 90%",
      "Restart the service",
    ],
    answer: "Cut the limit, because rising latency means requests are queueing on some bottleneck",
    explanation:
      "Latency above baseline is the signal that work is waiting somewhere: a lock, a pool, a downstream. CPU can look fine while the service is saturated elsewhere, which is why adaptive limiters key off latency.",
    lessonAnchor: "adaptive-concurrency-limits",
  },
  {
    id: "hld-shed-client-throttle",
    lectures: [35],
    tags: ["client-side"],
    type: "mcq",
    prompt:
      "A backend is rejecting 60% of requests from your service with 503, but each rejection still costs it a TLS handshake and some CPU. What can your service do so the backend recovers faster?",
    options: [
      "Retry each rejection immediately",
      "Locally reject a proportion of calls based on the backend's recent accept rate",
      "Open more connections to the backend",
      "Switch to HTTP/1.0",
    ],
    answer: "Locally reject a proportion of calls based on the backend's recent accept rate",
    explanation:
      "Client-side adaptive throttling stops sending requests that are likely to be rejected anyway, so the backend spends its capacity on real work. It fades out as accepts recover.",
    lessonAnchor: "client-side-throttling",
  },
  {
    id: "hld-shed-deadline",
    lectures: [35],
    tags: ["queues", "deadlines"],
    type: "scenario",
    prompt:
      "Under overload, a worker picks up a request that has been sitting in its queue for 3 seconds. The caller's timeout is 1 second.",
    fields: [
      { label: "What should the worker do", options: ["Drop it without doing the work", "Process it normally", "Process it and cache the result", "Move it to the back of the queue"], answer: "Drop it without doing the work" },
      { label: "Mechanism that enables this", options: ["Deadline propagation or a max queue wait time", "A bigger thread pool", "Sticky sessions", "Response compression"], answer: "Deadline propagation or a max queue wait time" },
    ],
    explanation:
      "Nobody is waiting for that response, so doing the work only steals capacity from requests that can still succeed. Carrying deadlines or bounding queue wait lets workers skip it.",
    lessonAnchor: "bound-every-queue",
  },
  {
    id: "hld-shed-autoscaling",
    lectures: [35],
    tags: ["autoscaling"],
    type: "mcq",
    prompt:
      "A teammate says: \"We have autoscaling, so we don't need load shedding.\" Traffic triples within 20 seconds during a live event. What's the main flaw in that argument?",
    options: [
      "Autoscaling only works on Kubernetes",
      "New instances take minutes to arrive and warm up, and the service must survive until then",
      "Autoscaling always scales down under load",
      "Load shedding makes autoscaling impossible",
    ],
    answer: "New instances take minutes to arrive and warm up, and the service must survive until then",
    explanation:
      "Autoscaling adds capacity slowly. Without shedding, the existing instances collapse in the meantime, and may never recover because of queues and retries.",
    lessonAnchor: "putting-it-together",
  },
  {
    id: "hld-shed-where",
    lectures: [35],
    tags: ["load-shedding"],
    type: "mcq",
    prompt:
      "A request passes through gateway → orders → pricing → inventory. Inventory sheds it with a 503 after orders and pricing have each done 30 ms of work. What principle does this violate?",
    options: [
      "Shed as early in the request path as possible",
      "Always use 429 instead of 503",
      "Never shed at the edge",
      "Shed newest requests first",
    ],
    answer: "Shed as early in the request path as possible",
    explanation:
      "Dropping deep in the call chain wastes all the upstream work. Coarse shedding at the gateway plus precise limits per service, and propagating priority and deadlines, avoid this.",
    lessonAnchor: "where-to-shed",
  },
];
