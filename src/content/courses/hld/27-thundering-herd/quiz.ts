import type { Question } from "@/lib/types";

const FIXES = [
  "Request coalescing (single-flight)",
  "Distributed lock on recompute",
  "Jittered TTLs",
  "Stale-while-revalidate background refresh",
  "Virtual waiting room",
  "Bigger cache instance",
];

export const quiz: Question[] = [
  {
    id: "hld-herd-hot-key-expiry",
    lectures: [27],
    tags: ["cache-stampede"],
    type: "scenario",
    prompt:
      "A news homepage is cached under one key with a 30-second TTL and read 8,000 times per second from a single Node.js process. Every 30 seconds the database CPU spikes to 100% for about a second. Building the page takes 150 ms.\nDiagnose it and pick the cheapest first fix.",
    fields: [
      { label: "What's happening", options: ["Cache stampede on key expiry", "Cache eviction under memory pressure", "Replication lag", "Hot shard"], answer: "Cache stampede on key expiry" },
      { label: "Cheapest first fix", options: FIXES, answer: "Request coalescing (single-flight)" },
    ],
    explanation:
      "In the 150 ms after expiry, about 1,200 reads miss and each rebuilds the same page. With a single process, in-process single-flight collapses them into one load. A bigger cache doesn't help: the key isn't being evicted, it's expiring.",
    lessonAnchor: "fix-1-request-coalescing",
  },
  {
    id: "hld-herd-fleet-coalescing",
    lectures: [27],
    tags: ["cache-stampede", "locks"],
    type: "scenario",
    prompt:
      "You added single-flight, but the service now runs on 120 pods. The recompute is a 4-second analytics query, and on each expiry the warehouse still gets about 120 copies of it and struggles.\nWhat do you add, and what should the losing requests do?",
    fields: [
      { label: "Add", options: FIXES, answer: "Distributed lock on recompute" },
      {
        label: "Requests that don't get the lock",
        options: ["Run the query anyway", "Serve the stale copy or briefly poll the cache", "Return 500 immediately", "Flush the cache"],
        answer: "Serve the stale copy or briefly poll the cache",
      },
    ],
    explanation:
      "Single-flight only de-duplicates inside one process, so 120 pods still means 120 queries. A Redis SET NX lock with an expiry picks one leader fleet-wide; the others wait a moment or serve stale data instead of hitting the warehouse.",
    lessonAnchor: "fix-2-a-distributed-lock",
  },
  {
    id: "hld-herd-warmup-job",
    lectures: [27],
    tags: ["ttl", "jitter"],
    type: "mcq",
    prompt:
      "Every night at 02:00 a job pre-loads 300,000 product keys into Redis with EX 3600. Every night at 03:00 the product database alarms fire for a few minutes, then everything recovers. What's the simplest fix?",
    options: [
      "Add a random 0 to 15 minutes to each key's TTL",
      "Run the warm-up job every 30 minutes instead",
      "Switch the eviction policy to LFU",
      "Double the database's connection pool",
    ],
    answer: "Add a random 0 to 15 minutes to each key's TTL",
    explanation:
      "All keys were written together with the same TTL, so they all expire together at 03:00. Jitter spreads expirations over a window. Re-running the job more often just moves the cliff, and a bigger pool lets even more simultaneous queries in.",
    lessonAnchor: "fix-3-jittered-ttls",
  },
  {
    id: "hld-herd-never-cold",
    lectures: [27],
    tags: ["cache-stampede", "refresh"],
    type: "mcq",
    prompt:
      "Your pricing page key is extremely hot, and product says users must never wait on a cache miss, but prices can be up to 30 seconds stale. Which approach fits best?",
    options: [
      "Soft TTL with a single background refresh, serving the old value meanwhile",
      "No TTL at all, and never refresh",
      "A distributed lock where waiters poll until the new value is ready",
      "Shorter TTL so data is always fresh",
    ],
    answer: "Soft TTL with a single background refresh, serving the old value meanwhile",
    explanation:
      "Stale-while-revalidate keeps the key warm: readers always get an instant answer and one refresher updates it in the background. A lock still makes waiters wait, and a shorter TTL just causes more frequent stampedes.",
    lessonAnchor: "fix-4-refresh-before-expiry",
  },
  {
    id: "hld-herd-ticket-sale",
    lectures: [27],
    tags: ["flash-sale", "admission-control"],
    type: "scenario",
    prompt:
      "A stadium tour goes on sale Friday at 10:00. You expect 3 million users for 60,000 seats. Checkout can safely process 1,500 purchases per minute. Last year the site went down in the first 20 seconds and seats were double-sold.\nDesign the core of the fix.",
    fields: [
      { label: "In front of the sale", options: FIXES, answer: "Virtual waiting room" },
      {
        label: "Seat reservation",
        options: ["Lock the seat row until payment completes", "Short seat hold with an expiry, then pay", "Cache seat availability for 60 seconds", "Let payment decide who wins"],
        answer: "Short seat hold with an expiry, then pay",
      },
      {
        label: "Admission rate",
        options: ["As fast as users click", "About what checkout can handle per minute", "One user at a time", "Whatever autoscaling reaches"],
        answer: "About what checkout can handle per minute",
      },
    ],
    explanation:
      "Every purchase must touch inventory, so caching can't help; you need admission control. A waiting room meters users in at checkout's real capacity, and short holds keep row locks brief so the database isn't serialised behind slow payments.",
    lessonAnchor: "fix-5-queues-and-waiting-rooms",
  },
  {
    id: "hld-herd-retry-storm",
    lectures: [27],
    tags: ["retries", "backoff"],
    type: "mcq",
    prompt:
      "Your API blipped for 5 seconds. 40,000 mobile clients all retried exactly 1 s later, then 2 s, then 4 s, and the API kept falling over in waves for 10 minutes. What change to the client fixes this?",
    options: [
      "Exponential backoff with random jitter and a retry cap",
      "Retry immediately so requests finish sooner",
      "Fixed 1-second retries forever",
      "Remove timeouts so clients never retry",
    ],
    answer: "Exponential backoff with random jitter and a retry cap",
    explanation:
      "Plain exponential backoff keeps every client synchronised, so they keep arriving together. Jitter randomises each wait, spreading the retries out, and a cap stops infinite retry loops.",
    lessonAnchor: "fix-6-rate-limiting-and-load-shedding",
  },
  {
    id: "hld-herd-cache-restart",
    lectures: [27],
    tags: ["cache-stampede", "load-shedding"],
    type: "order",
    prompt:
      "Your Redis cluster restarted and came back empty during peak traffic. Order the events in the outage that follows if nothing protects the database.",
    steps: [
      "Every read misses the empty cache",
      "All reads fall through to the database at once",
      "Database queries slow down and requests pile up",
      "Clients time out and retry, adding more load",
      "Health checks fail and instances are pulled, overloading the rest",
    ],
    explanation:
      "This is the self-feeding herd: misses become DB load, slowness widens the window, timeouts turn into retries, and failing health checks concentrate traffic on fewer nodes. Coalescing, bounded DB concurrency and backoff break the loop.",
    lessonAnchor: "why-the-spike-gets-worse-not-better",
  },
];
