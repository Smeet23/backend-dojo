import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "sd-fund-stateless-scale-out",
    lectures: [2],
    tags: ["scaling", "load-balancing", "stateless"],
    type: "scenario",
    prompt:
      "You move from one big server to three servers behind a round-robin load balancer. Immediately, users report being logged out every few clicks. Sessions were stored in each server's memory.\nWhat's going on, and what's the robust fix?",
    fields: [
      { label: "Cause", options: ["Requests land on servers that don't hold the session", "The load balancer drops cookies", "TLS is renegotiated per request", "Round robin is too slow"], answer: "Requests land on servers that don't hold the session" },
      { label: "Best fix", options: ["Store sessions in a shared store like Redis", "Go back to one big server", "Switch to a layer 4 balancer", "Shorten the session timeout"], answer: "Store sessions in a shared store like Redis" },
    ],
    explanation:
      "Horizontal scaling needs stateless servers: any server must handle any request. Sticky sessions would mask the issue but break when a server dies or many users share an IP; moving session state to a shared store fixes it properly.",
    lessonAnchor: "horizontal-scaling",
  },
  {
    id: "sd-fund-lb-algorithm",
    lectures: [2],
    tags: ["load-balancing"],
    type: "scenario",
    prompt:
      "Pick the load-balancing algorithm for each service.",
    fields: [
      { label: "Static JSON config API, every request ~2 ms", options: ["Round robin", "Least connections", "IP hash"], answer: "Round robin" },
      { label: "Report export API, requests take 50 ms to 30 s", options: ["Round robin", "Least connections", "IP hash"], answer: "Least connections" },
      { label: "Legacy app that keeps per-user state in memory and can't be changed yet", options: ["Round robin", "Least connections", "IP hash"], answer: "IP hash" },
    ],
    explanation:
      "Uniform requests suit round robin. Wildly uneven durations need least connections, so slow servers stop receiving new work. In-memory state forces stickiness (IP hash or cookies) until the app can be made stateless.",
    lessonAnchor: "routing-algorithms",
  },
  {
    id: "sd-fund-l7-routing",
    lectures: [2],
    tags: ["load-balancing", "layer-7"],
    type: "mcq",
    prompt:
      "You want requests for /api/* to go to the app servers, /static/* to a file server, and requests with a beta=1 cookie to a canary pool. Which load balancer can do this?",
    options: ["A layer 7 load balancer", "A layer 4 load balancer", "DNS round robin", "Any of them; they all read the URL"],
    answer: "A layer 7 load balancer",
    explanation:
      "Paths and cookies live inside the HTTP request. A layer 4 balancer only sees IPs and ports, so it can't route on them; DNS doesn't see requests at all.",
    lessonAnchor: "layer-4-and-layer-7",
  },
  {
    id: "sd-fund-cdn-invalidation",
    lectures: [2],
    tags: ["cdn", "caching"],
    type: "scenario",
    prompt:
      "You deploy a fix to app.js, but users keep getting the old, buggy file from the CDN for hours. The HTML references /app.js and the CDN caches it for 24 hours.\nHow should assets be served going forward?",
    fields: [
      { label: "File naming", options: ["Content-hashed names like app.3f9a1c.js", "Same name, add ?v=random on every request", "Same name, never cache", "Same name, purge daily"], answer: "Content-hashed names like app.3f9a1c.js" },
      { label: "TTL for hashed assets", options: ["Very long (e.g. 1 year)", "5 seconds", "No caching", "Until the next purge only"], answer: "Very long (e.g. 1 year)" },
      { label: "TTL for the HTML page", options: ["Short (seconds to minutes)", "1 year", "Never expires", "Same as the assets"], answer: "Short (seconds to minutes)" },
    ],
    explanation:
      "A changed file gets a new hashed name, which no edge has cached, so it can be cached forever. The HTML that points to the names must stay fresh, so it gets a short TTL. A random query string on every request would defeat caching entirely.",
    lessonAnchor: "invalidation",
  },
  {
    id: "sd-fund-stampede",
    lectures: [2],
    tags: ["caching", "redis", "stampede"],
    type: "scenario",
    prompt:
      "A celebrity post is cached in Redis with a 60 s TTL. Every minute, at the moment it expires, database CPU spikes to 100% and requests time out for a few seconds.",
    fields: [
      { label: "Problem", options: ["Cache stampede", "Cold start", "Replication lag", "Write-back data loss"], answer: "Cache stampede" },
      { label: "Fix", options: ["Let one request refill the key under a lock while others wait", "Shorten the TTL to 5 s", "Remove the TTL and never refresh", "Add more app servers"], answer: "Let one request refill the key under a lock while others wait" },
    ],
    explanation:
      "When a hot key expires, thousands of simultaneous misses all hit the database. A lock (single flight) means one request rebuilds the value; a shorter TTL would make the spike happen more often, and more app servers would only send more queries.",
    lessonAnchor: "cache-stampede",
  },
  {
    id: "sd-fund-write-strategy",
    lectures: [2],
    tags: ["caching", "write-strategies"],
    type: "scenario",
    prompt: "Choose a cache write strategy for each kind of data.",
    fields: [
      { label: "Page view counters (losing a few seconds is acceptable)", options: ["Write-back", "Write-through", "Cache-aside + invalidate"], answer: "Write-back" },
      { label: "Customer orders", options: ["Write-back", "Write-through", "Cache-aside + invalidate"], answer: "Cache-aside + invalidate" },
    ],
    explanation:
      "Write-back is fastest and batches database writes, but data in the cache can vanish before it's flushed, which is fine for counters. Orders must hit the durable database first; deleting the cache key afterwards keeps reads correct. Write-through also keeps orders safe, but caches data that may never be read.",
    lessonAnchor: "write-strategies",
  },
  {
    id: "sd-fund-read-your-writes",
    lectures: [2],
    tags: ["replication", "consistency"],
    type: "mcq",
    prompt:
      "Users update their display name, the page reloads, and the old name shows for a second or two. Writes go to the primary; reads go to async read replicas. Other users seeing the old name briefly is fine. What's the targeted fix?",
    options: [
      "For a few seconds after a user writes, route that user's reads to the primary",
      "Send all reads to the primary",
      "Make all replicas synchronous",
      "Cache display names in the CDN",
    ],
    answer: "For a few seconds after a user writes, route that user's reads to the primary",
    explanation:
      "Only the writer needs to see their own change immediately. Routing just their reads to the primary briefly gives read-your-writes without throwing away the replicas' capacity, as sending all reads to the primary would.",
    lessonAnchor: "replication-lag",
  },
  {
    id: "sd-fund-replicas-vs-shards",
    lectures: [2],
    tags: ["sharding", "replication"],
    type: "scenario",
    prompt:
      "Two different databases are struggling.",
    fields: [
      { label: "News site: 50k reads/s, 20 writes/s, 40 GB of data", options: ["Add read replicas", "Shard the data"], answer: "Add read replicas" },
      { label: "IoT telemetry: 30k writes/s, 15 TB and growing", options: ["Add read replicas", "Shard the data"], answer: "Shard the data" },
    ],
    explanation:
      "Replicas multiply read capacity, but each holds all the data and every write still goes to one primary. When writes or data size outgrow one machine, only sharding spreads them out (with each shard replicated for availability).",
    lessonAnchor: "sharding",
  },
  {
    id: "sd-fund-consistent-hashing",
    lectures: [2],
    tags: ["sharding", "consistent-hashing"],
    type: "mcq",
    prompt:
      "Your cache cluster uses hash(key) mod 4. You add a fifth node for Black Friday, and the hit rate collapses to almost zero while the database melts. Why, and what would have prevented it?",
    options: [
      "mod 5 remaps most keys to different nodes; consistent hashing would move only about 1/5 of them",
      "The new node is empty; pre-warming it alone would have fixed everything",
      "Five is not a power of two; use 8 nodes instead",
      "The TTLs were too long; shorter TTLs would spread the load",
    ],
    answer: "mod 5 remaps most keys to different nodes; consistent hashing would move only about 1/5 of them",
    explanation:
      "Changing N in hash mod N reassigns roughly 80% of keys, so nearly every lookup misses at once. On a consistent-hash ring, a new node only takes the keys between it and its neighbour. Pre-warming the new node wouldn't help the keys reshuffled among the old ones.",
    lessonAnchor: "consistent-hashing",
  },
  {
    id: "sd-fund-upload-flow",
    lectures: [2],
    tags: ["object-storage", "queues", "presigned-urls"],
    type: "order",
    prompt: "Put a scalable photo-upload flow in order.",
    steps: [
      "Client asks the API for permission to upload",
      "API checks auth and returns a short-lived pre-signed URL",
      "Client uploads the file directly to object storage",
      "A photo.uploaded message is put on the queue",
      "Workers resize the image and generate a thumbnail",
      "Viewers load the image through the CDN",
    ],
    explanation:
      "The file bytes never pass through your app servers: the pre-signed URL lets the client write straight to storage. Processing happens asynchronously from the queue, and delivery goes through the CDN with object storage as its origin.",
    lessonAnchor: "pre-signed-urls",
  },
  {
    id: "sd-fund-idempotency",
    lectures: [2],
    tags: ["idempotency", "payments"],
    type: "scenario",
    prompt:
      "A mobile app's POST /payments times out and the app retries. Some customers are charged twice. You add an Idempotency-Key header.",
    fields: [
      { label: "Who generates the key, and when", options: ["Client, once per payment attempt, reused on retries", "Client, fresh on every retry", "Server, on every request", "Load balancer, per connection"], answer: "Client, once per payment attempt, reused on retries" },
      { label: "Server on a key it has seen", options: ["Return the stored result without charging", "Charge again and return the new result", "Return 400 Bad Request", "Ignore the key"], answer: "Return the stored result without charging" },
    ],
    explanation:
      "The key identifies the logical operation, so it must stay the same across retries; a new key per retry would look like a new payment. On a repeat, the server returns the saved result, so the customer is charged exactly once.",
    lessonAnchor: "idempotency",
  },
  {
    id: "sd-fund-cap-choice",
    lectures: [2],
    tags: ["cap", "consistency"],
    type: "scenario",
    prompt: "A network partition splits your replicas. Pick CP or AP for each feature.",
    fields: [
      { label: "Seat booking for a concert (no double-selling)", options: ["CP", "AP"], answer: "CP" },
      { label: "Video view counter", options: ["CP", "AP"], answer: "AP" },
      { label: "Shopping-cart contents (merge later is OK)", options: ["CP", "AP"], answer: "AP" },
    ],
    explanation:
      "Selling the same seat twice is worse than refusing a booking for a minute, so tickets choose consistency. Counters and carts can accept writes on both sides and reconcile after the partition heals.",
    lessonAnchor: "the-cap-theorem",
  },
];
