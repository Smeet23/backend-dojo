import type { Question } from "@/lib/types";

const POLICIES = ["LRU", "LFU", "noeviction", "Random"];

export const quiz: Question[] = [
  {
    id: "caching-weather-api",
    lectures: [13],
    tags: ["external-api", "ttl"],
    type: "scenario",
    prompt:
      "Your shop's checkout page shows the weather at the delivery city, from a third-party API that allows 1,000 calls per day. You have 50,000 checkouts a day across about 200 cities, and the bill for overage calls just arrived.",
    fields: [
      { label: "Strategy", options: ["Cache-aside in Redis", "Write-through on every order", "Call the API from the browser instead", "No cache; buy a bigger plan"], answer: "Cache-aside in Redis" },
      { label: "Cache key", options: ["weather:<city>", "weather:<user-id>", "weather:<order-id>", "weather"], answer: "weather:<city>" },
      { label: "TTL", options: ["About 1 hour", "1 second", "No TTL, cache forever", "30 days"], answer: "About 1 hour" },
    ],
    explanation:
      "Weather changes slowly, so a cached answer per city is fine for an hour. Keying by city means all checkouts to the same city share one entry, which brings 200 cities × 24 refreshes down to at most about 4,800 calls a day, and only for cities people actually order to. Keying by user or order would barely ever hit.",
    lessonAnchor: "external-apis",
  },
  {
    id: "caching-stale-price",
    lectures: [13],
    tags: ["invalidation", "cache-aside"],
    type: "scenario",
    prompt:
      "Users report that after an admin cuts a product's price from $1,299 to $999, the product page keeps showing $1,299 for up to an hour, while the cart correctly charges $999. Product pages use cache-aside with a 1-hour TTL.",
    fields: [
      {
        label: "Cause",
        options: ["The cache entry isn't invalidated when the price changes", "The TTL is too short", "The database is replicating slowly", "The CDN is caching the cart"],
        answer: "The cache entry isn't invalidated when the price changes",
      },
      {
        label: "Fix in the update handler",
        options: ["After the DB update, DEL product:<id>", "Before the DB update, DEL product:<id> and never set a TTL", "Raise the TTL to 24 hours", "Read the price from the cache in the cart too"],
        answer: "After the DB update, DEL product:<id>",
      },
    ],
    explanation:
      "With cache-aside, the cache only learns about changes when the entry expires or you remove it. Deleting the key after the database write means the next read misses and loads $999. Keep the TTL as a safety net. Deleting before the write leaves a window where a reader can re-cache the old value.",
    lessonAnchor: "invalidation",
  },
  {
    id: "caching-eviction-choice",
    lectures: [13],
    tags: ["eviction"],
    type: "scenario",
    prompt: "Pick a Redis eviction policy for each cache.",
    fields: [
      {
        label: "A news site: today's stories are hot, and interest fades over a day or two",
        options: POLICIES,
        answer: "LRU",
      },
      {
        label: "A catalogue where 500 bestsellers are read constantly, but a nightly crawler touches thousands of random products once each",
        options: POLICIES,
        answer: "LFU",
      },
      {
        label: "A Redis instance holding background-job data that must never be silently dropped",
        options: POLICIES,
        answer: "noeviction",
      },
    ],
    explanation:
      "Recency predicts reuse for news, so LRU fits. Under LRU, the crawler's one-off reads would look \"recent\" and push the bestsellers out; LFU keeps the frequently read keys. When losing a key is worse than failing loudly, use noeviction so writes error instead of data disappearing.",
    lessonAnchor: "eviction-policies",
  },
  {
    id: "caching-rate-limiter",
    lectures: [13],
    tags: ["rate-limiting", "redis"],
    type: "scenario",
    prompt:
      "Bots are hammering POST /search, an expensive endpoint. You're adding a limit of 50 requests per minute per client IP. The API runs as 6 instances behind Nginx.",
    fields: [
      { label: "Where counters live", options: ["Redis, shared by all instances", "A Postgres table", "A variable in each instance's memory", "A cookie on the client"], answer: "Redis, shared by all instances" },
      { label: "Where the client IP comes from", options: ["The entry Nginx adds to X-Forwarded-For", "The User-Agent header", "The first value in X-Forwarded-For, whoever set it", "The request body"], answer: "The entry Nginx adds to X-Forwarded-For" },
      { label: "Response over the limit", options: ["429 Too Many Requests", "403 Forbidden", "503 Service Unavailable", "400 Bad Request"], answer: "429 Too Many Requests" },
    ],
    explanation:
      "Counters must be shared, or each instance allows 50 and the real limit becomes 300. Redis INCR with a 60-second expiry is atomic and fast, while Postgres would add a write to every request. Behind a proxy, the socket IP is Nginx's, so use the address your proxy appended, because clients can forge earlier entries. 429 is the status for rate limiting.",
    lessonAnchor: "rate-limiting",
  },
  {
    id: "caching-dns-resolution",
    lectures: [13],
    tags: ["dns", "network"],
    type: "order",
    prompt: "A user visits shop.dev for the first time and no cache has the answer. Put the DNS lookup in order.",
    steps: [
      "Browser and OS caches miss, so the device asks its recursive resolver",
      "The resolver misses its cache and asks a root server",
      "The root server refers it to the .dev TLD servers",
      "The TLD server refers it to shop.dev's authoritative name servers",
      "The authoritative server returns the A record with a TTL",
      "The resolver caches the answer for the TTL and returns it to the device",
    ],
    explanation:
      "Each level only knows who to ask next, until the authoritative server gives the real answer. Every layer then caches it for the record's TTL, so the next lookup usually stops at the browser, OS or resolver.",
    lessonAnchor: "how-a-lookup-works",
  },
  {
    id: "caching-dns-migration",
    lectures: [13],
    tags: ["dns", "ttl"],
    type: "mcq",
    prompt:
      "You moved api.shop.dev to a new server and updated its A record. Hours later, some users still reach the old server. The record's TTL was 86400. What happened, and what should you have done?",
    options: [
      "Resolvers and devices cached the old answer for up to 24 hours; lower the TTL a day before switching",
      "DNS changes are pushed slowly to every ISP; nothing could speed it up",
      "The CDN is serving the old IP; purge the CDN",
      "The old server is redirecting users; shut it down immediately",
    ],
    answer: "Resolvers and devices cached the old answer for up to 24 hours; lower the TTL a day before switching",
    explanation:
      "DNS isn't pushed anywhere: each cache keeps the old record until its TTL expires. Dropping the TTL to a few minutes ahead of time means caches refresh quickly once you switch. Keep the old server running until the old TTL has passed.",
    lessonAnchor: "where-dns-answers-are-cached",
  },
  {
    id: "caching-cdn-first-request",
    lectures: [13],
    tags: ["cdn"],
    type: "mcq",
    prompt:
      "Your origin is in Virginia. A shopper in Mumbai is the first person in India to load a new product image through your CDN. What happens?",
    options: [
      "The Mumbai-area edge misses, fetches the image from the origin, caches it and serves it; later Mumbai shoppers get edge hits",
      "The CDN redirects the browser to download it from Virginia every time",
      "The image is pushed to every edge in the world at deploy time, so it's a hit",
      "The request fails until someone purges the CDN",
    ],
    answer: "The Mumbai-area edge misses, fetches the image from the origin, caches it and serves it; later Mumbai shoppers get edge hits",
    explanation:
      "CDN edges usually fill lazily, like cache-aside. The first request in a region pays the trip to the origin; everyone after that is served nearby until the TTL expires.",
    lessonAnchor: "how-a-cdn-request-works",
  },
  {
    id: "caching-good-candidate",
    lectures: [13],
    tags: ["cache-design"],
    type: "mcq",
    prompt: "You can add Redis caching to one endpoint this sprint. Which is the best candidate?",
    options: [
      "GET /dashboard/stats: a 2-second aggregate query, called on every admin page load, where data 5 minutes old is fine",
      "GET /cart: changes on almost every request and must always be exact",
      "POST /orders: creates a new order",
      "GET /admin/audit-export: runs once a month",
    ],
    answer: "GET /dashboard/stats: a 2-second aggregate query, called on every admin page load, where data 5 minutes old is fine",
    explanation:
      "Good candidates are expensive, read often and tolerant of slight staleness. A cart changes constantly, so you'd get few hits and lots of invalidation. Writes aren't cached, and a monthly export would almost never hit.",
    lessonAnchor: "database-query-results",
  },
  {
    id: "caching-write-through",
    lectures: [13],
    tags: ["write-through", "strategies"],
    type: "mcq",
    prompt:
      "A celebrity's profile is read about a million times a day. When they edit their bio, the very next read must already be served from the cache with the new bio, and you don't want a burst of misses hitting the database. Which strategy fits?",
    options: [
      "Write-through: update the database and SET the cache key in the same request",
      "Cache-aside with a 24-hour TTL and no invalidation",
      "Delete the key on write and let the next read repopulate it",
      "No cache: read the profile from Postgres every time",
    ],
    answer: "Write-through: update the database and SET the cache key in the same request",
    explanation:
      "Write-through puts the fresh value into the cache as part of the write, so the next read is a hit. Deleting the key is correct but makes the next reads miss, and on a key this hot that miss can turn into a stampede. A TTL-only cache would serve the old bio for up to a day.",
    lessonAnchor: "write-through",
  },
];
