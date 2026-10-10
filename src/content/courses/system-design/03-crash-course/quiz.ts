import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "sd-crash-direct-db",
    lectures: [3],
    tags: ["client-server", "three-tier", "security"],
    type: "scenario",
    prompt:
      "A teammate proposes letting the mobile app connect straight to PostgreSQL to \"skip the API and save latency\". The app would ship with the database credentials.\nWhat's the main problem, and what architecture fixes it?",
    fields: [
      { label: "Main problem", options: ["Anyone who extracts the credentials can run any query", "PostgreSQL can't accept mobile connections", "It would be slower than going through an API", "Mobile apps can't speak SQL"], answer: "Anyone who extracts the credentials can run any query" },
      { label: "Architecture", options: ["Three-tier: app → API servers → database", "Two-tier with a read-only user", "Put the database behind a CDN", "Give each user their own database"], answer: "Three-tier: app → API servers → database" },
    ],
    explanation:
      "Credentials in a shipped app can be extracted, and then the database is wide open. A three-tier design puts an application tier in between that authenticates users, checks permissions and validates input before touching data.",
    lessonAnchor: "two-tier-and-three-tier",
  },
  {
    id: "sd-crash-sync-async",
    lectures: [3],
    tags: ["sync", "async", "queues"],
    type: "scenario",
    prompt: "In a food-delivery checkout, choose how each step should be called.",
    fields: [
      { label: "Charging the customer's card before showing \"Order placed\"", options: ["Synchronous", "Asynchronous via a queue"], answer: "Synchronous" },
      { label: "Sending the receipt email", options: ["Synchronous", "Asynchronous via a queue"], answer: "Asynchronous via a queue" },
      { label: "Updating the restaurant's weekly sales report", options: ["Synchronous", "Asynchronous via a queue"], answer: "Asynchronous via a queue" },
    ],
    explanation:
      "The confirmation depends on the payment result, so the caller must wait for it. The email and the report don't affect what the user sees now; queuing them keeps checkout fast and keeps it working if the email provider is down.",
    lessonAnchor: "synchronous-and-asynchronous-communication",
  },
  {
    id: "sd-crash-least-connections",
    lectures: [3],
    tags: ["load-balancing"],
    type: "mcq",
    prompt:
      "Behind a round-robin load balancer, server B keeps hitting 100% CPU while A and C idle. Logs show B happened to receive several 20-second PDF exports in a row and keeps getting new requests anyway. Which change helps most?",
    options: [
      "Switch to least connections",
      "Switch to IP hash",
      "Switch to a layer 4 balancer",
      "Add sticky sessions",
    ],
    answer: "Switch to least connections",
    explanation:
      "Round robin ignores how busy each server is. Least connections sees B has many requests in flight and sends new work elsewhere. IP hash and stickiness would make placement even less adaptive.",
    lessonAnchor: "round-robin-least-connections-and-sticky-sessions",
  },
  {
    id: "sd-crash-geo-routing",
    lectures: [3],
    tags: ["load-balancing", "dns", "latency"],
    type: "mcq",
    prompt:
      "You run servers in Mumbai and Virginia, each region with its own load balancer. How do users in India get sent to Mumbai and users in the US to Virginia?",
    options: [
      "Geo-aware DNS (or anycast) answers each user with the nearest region",
      "The Mumbai load balancer forwards US requests to Virginia",
      "Round robin across both regions",
      "Sticky sessions based on the user's country",
    ],
    answer: "Geo-aware DNS (or anycast) answers each user with the nearest region",
    explanation:
      "A load balancer spreads traffic across servers in its own location. Picking a region happens earlier, when the client resolves the domain; forwarding between regions after arrival would add the cross-world latency you're trying to avoid.",
    lessonAnchor: "routing-users-to-a-nearby-region",
  },
  {
    id: "sd-crash-lru-trace",
    lectures: [3],
    tags: ["caching", "eviction", "lru"],
    type: "mcq",
    prompt:
      "An LRU cache holds 3 items. Starting empty, it receives: X, Y, Z, X, W, Y. Which items are in the cache at the end?",
    options: ["X, W, Y", "Y, Z, W", "X, Z, Y", "Z, W, Y"],
    answer: "X, W, Y",
    explanation:
      "After X, Y, Z then a hit on X, the least recently used is Y, so W evicts Y (cache: Z, X, W). Then Y misses and evicts Z, the least recently used, leaving X, W, Y. FIFO would have evicted X first instead.",
    lessonAnchor: "eviction-algorithms",
  },
  {
    id: "sd-crash-what-to-cache",
    lectures: [3],
    tags: ["caching", "cdn"],
    type: "scenario",
    prompt: "For a banking app, decide where (if anywhere) each piece of data should be cached.",
    fields: [
      { label: "The bank's logo and JavaScript bundle", options: ["CDN and browser cache", "Redis with a 5-minute TTL", "Don't cache"], answer: "CDN and browser cache" },
      { label: "List of branch addresses (changes monthly)", options: ["CDN and browser cache", "Redis with a 5-minute TTL", "Don't cache"], answer: "Redis with a 5-minute TTL" },
      { label: "Balance shown before approving a transfer", options: ["CDN and browser cache", "Redis with a 5-minute TTL", "Don't cache"], answer: "Don't cache" },
    ],
    explanation:
      "Static assets are identical for everyone and belong at the edge. Rarely-changing reference data is a classic application-cache case. A balance used to approve money movement must come from the source of truth; a stale copy could approve an overdraft.",
    lessonAnchor: "when-not-to-cache",
  },
  {
    id: "sd-crash-cdn-flow",
    lectures: [3],
    tags: ["cdn"],
    type: "order",
    prompt: "A user in Delhi requests a product image for the first time in their region. Put the steps in order.",
    steps: [
      "The browser resolves the image domain",
      "The CDN's DNS answers with a nearby edge server",
      "The edge has no copy: a cache miss",
      "The edge fetches the image from the origin and stores it",
      "The edge returns the image to the user",
      "The next Delhi user's request is a hit served from the edge",
    ],
    explanation:
      "DNS steers the user to a nearby edge first. On a miss the edge pulls from the origin (the source of truth) and keeps a copy, so later users in that region are served locally.",
    lessonAnchor: "origin-edge-and-dns",
  },
  {
    id: "sd-crash-db-choice",
    lectures: [3],
    tags: ["sql", "nosql"],
    type: "scenario",
    prompt: "Pick a database type for each workload.",
    fields: [
      { label: "Ledger of money transfers between wallets", options: ["Relational (SQL)", "Key-value", "Wide-column", "Graph"], answer: "Relational (SQL)" },
      { label: "Login sessions looked up by token, expiring after 30 minutes", options: ["Relational (SQL)", "Key-value", "Wide-column", "Graph"], answer: "Key-value" },
      { label: "Billions of sensor readings per day, always queried by device and time", options: ["Relational (SQL)", "Key-value", "Wide-column", "Graph"], answer: "Wide-column" },
      { label: "\"Friends of friends who like hiking\" recommendations", options: ["Relational (SQL)", "Key-value", "Wide-column", "Graph"], answer: "Graph" },
    ],
    explanation:
      "Money needs ACID transactions. Sessions are simple lookups by key with expiry. Massive write-heavy time series fit a partitioned wide-column store like Cassandra. Multi-hop relationship traversal is what graph databases are built for.",
    lessonAnchor: "choosing",
  },
  {
    id: "sd-crash-acid",
    lectures: [3],
    tags: ["acid", "transactions"],
    type: "scenario",
    prompt: "Match each incident to the ACID property that would have prevented it.",
    fields: [
      { label: "A transfer debited Alice, then the server crashed before crediting Bob", options: ["Atomicity", "Consistency", "Isolation", "Durability"], answer: "Atomicity" },
      { label: "Two concurrent checkouts both read stock = 1 and both sold the last item", options: ["Atomicity", "Consistency", "Isolation", "Durability"], answer: "Isolation" },
      { label: "An order confirmed to the user vanished after a power cut", options: ["Atomicity", "Consistency", "Isolation", "Durability"], answer: "Durability" },
    ],
    explanation:
      "Atomicity makes multi-step changes all-or-nothing. Isolation stops concurrent transactions from interfering (here, a lost update). Durability means a committed transaction survives crashes because it was written to disk before being confirmed.",
    lessonAnchor: "acid-transactions",
  },
  {
    id: "sd-crash-scaling-choice",
    lectures: [3],
    tags: ["scaling"],
    type: "scenario",
    prompt: "Choose the scaling approach for each situation.",
    fields: [
      { label: "Internal admin tool at 60% CPU on a small VM; downtime at night is fine", options: ["Vertical", "Horizontal"], answer: "Vertical" },
      { label: "Public API that must stay up through single-server failures and expects 10× growth", options: ["Vertical", "Horizontal"], answer: "Horizontal" },
    ],
    explanation:
      "When load is modest and brief downtime is acceptable, a bigger machine is the cheapest, simplest fix. When surviving a server failure and growing past one machine's ceiling are requirements, you need several stateless servers behind a load balancer.",
    lessonAnchor: "vertical-and-horizontal-scaling",
  },
  {
    id: "sd-crash-shard-strategy",
    lectures: [3],
    tags: ["sharding"],
    type: "scenario",
    prompt:
      "A social app shards its users table by user_id using ranges of 10 million: ids 1 to 10M on shard 1, the next 10M on shard 2, and so on. IDs are sequential.",
    fields: [
      { label: "Likely problem", options: ["The newest shard gets almost all signups and the most active users", "Every query must hit all shards", "Adding a shard reshuffles most rows", "user_id changes too often"], answer: "The newest shard gets almost all signups and the most active users" },
      { label: "Better strategy for even load", options: ["Hash-based on user_id", "Range-based on signup date", "Shard by country", "Shard by username's first letter"], answer: "Hash-based on user_id" },
    ],
    explanation:
      "Sequential IDs plus ranges create a hotspot on whichever shard holds the newest IDs. Hashing user_id scatters consecutive IDs across shards. Country and first letter are low-cardinality or skewed keys that create their own hotspots.",
    lessonAnchor: "range-based-sharding",
  },
  {
    id: "sd-crash-directory",
    lectures: [3],
    tags: ["sharding", "directory"],
    type: "mcq",
    prompt:
      "You move to directory-based sharding so one huge enterprise customer can live on its own shard. All shards are healthy, but every request is failing. What's the most likely culprit?",
    options: [
      "The directory (lookup service) is down or unreachable",
      "The hash function changed",
      "The enterprise shard is too large",
      "Range boundaries overlap",
    ],
    answer: "The directory (lookup service) is down or unreachable",
    explanation:
      "Every query must first ask the directory which shard holds the key, so the directory is a single point of failure that must be highly available (and usually cached). There's no hash function or range in directory-based sharding.",
    lessonAnchor: "directory-based-sharding",
  },
];
