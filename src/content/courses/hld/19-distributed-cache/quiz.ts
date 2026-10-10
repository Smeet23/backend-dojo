import type { Question } from "@/lib/types";

const STRATEGIES = ["Cache-aside", "Read-through", "Write-through", "Write-back", "Write-around"];

export const quiz: Question[] = [
  {
    id: "hld-cache-like-counter",
    lectures: [19],
    tags: ["caching", "write-strategies"],
    type: "scenario",
    prompt:
      "A video platform records view counts. Popular videos get 50,000 increments per second, the database can't take that write rate, and losing a few seconds of counts in a rare crash is acceptable.\nHow should writes be handled?",
    fields: [
      { label: "Write strategy", options: STRATEGIES, answer: "Write-back" },
      { label: "Main risk you accept", options: ["Stale reads in the cache", "Lost increments if a cache node dies before flushing", "Every write pays two round trips", "Cache pollution with cold data"], answer: "Lost increments if a cache node dies before flushing" },
    ],
    explanation:
      "Write-back acks from the cache and flushes in batches, collapsing thousands of increments into one DB write. The price is that unflushed writes vanish if the node crashes. Write-through would still send every increment to the DB synchronously.",
    lessonAnchor: "write-back",
  },
  {
    id: "hld-cache-audit-log",
    lectures: [19],
    tags: ["caching", "write-strategies"],
    type: "mcq",
    prompt:
      "Your service writes millions of audit records a day. Almost none are ever read again, but your write-through cache is filling with them and evicting hot product data. What should you change for the audit records?",
    options: ["Switch them to write-around", "Switch them to write-back", "Raise their TTL", "Switch the eviction policy to FIFO"],
    answer: "Switch them to write-around",
    explanation:
      "Write-around writes straight to the database and only caches data that is later read, so write-once records stop polluting the cache. Write-back would still put every record in the cache, and a longer TTL makes the pollution worse.",
    lessonAnchor: "write-around",
  },
  {
    id: "hld-cache-delete-vs-set",
    lectures: [19],
    tags: ["caching", "invalidation"],
    type: "scenario",
    prompt:
      "Two admins update the same product price within milliseconds. Each request updates the database and then runs SET on the cache key with its new price. Afterwards the DB says 12 and the cache says 10, and it stays wrong for an hour.\nWhat happened and what's the fix?",
    fields: [
      { label: "Cause", options: ["The two SETs reached the cache in a different order than the DB writes", "The DB transaction was not committed", "LRU evicted the newer value", "Replication lag on a DB replica"], answer: "The two SETs reached the cache in a different order than the DB writes" },
      { label: "Fix on the write path", options: ["Delete the key after the DB write", "Set the cache before the DB write", "Use LFU eviction", "Increase the TTL"], answer: "Delete the key after the DB write" },
    ],
    explanation:
      "Setting values is order-sensitive: the slower writer's SET overwrote the newer value. Deleting is idempotent, so whichever order the deletes arrive in, the next read loads the current row. Setting the cache before the DB just moves the race.",
    lessonAnchor: "why-delete-beats-update",
  },
  {
    id: "hld-cache-delete-first",
    lectures: [19],
    tags: ["caching", "invalidation"],
    type: "mcq",
    prompt:
      "A teammate's write path is: DEL cache key, then UPDATE the database. Under load, users occasionally see the old value for a full TTL. Why?",
    options: [
      "A reader can miss between the DEL and the UPDATE, load the old row, and cache it again",
      "DEL is asynchronous in Redis",
      "The UPDATE invalidates the cache a second time",
      "The TTL resets on every DEL",
    ],
    answer: "A reader can miss between the DEL and the UPDATE, load the old row, and cache it again",
    explanation:
      "Deleting first opens a window where the database still has the old value and the cache is empty, so a concurrent reader repopulates it with stale data. Update the database first, then delete.",
    lessonAnchor: "order-of-operations",
  },
  {
    id: "hld-cache-stampede",
    lectures: [19],
    tags: ["caching", "stampede"],
    type: "scenario",
    prompt:
      "The homepage config key is read 30,000 times per second. Every 5 minutes, when it expires, the database CPU spikes to 100% for a few seconds.\nWhat is this and what's the most direct fix?",
    fields: [
      { label: "Problem", options: ["Cache stampede", "Hot key on one shard", "Cache penetration", "Write-back data loss"], answer: "Cache stampede" },
      { label: "Fix", options: ["Let one request rebuild the value while others wait or get the stale copy", "Switch to write-through", "Add more cache shards", "Remove the TTL entirely and never invalidate"], answer: "Let one request rebuild the value while others wait or get the stale copy" },
    ],
    explanation:
      "Thousands of simultaneous misses on one expiring key is a stampede. Single-flight rebuilding or stale-while-revalidate turns them into one DB query. More shards don't help because all requests are for the same key.",
    lessonAnchor: "cache-stampede",
  },
  {
    id: "hld-cache-hot-key",
    lectures: [19],
    tags: ["caching", "hot-keys"],
    type: "scenario",
    prompt:
      "A celebrity joins your platform. One Redis shard hits 100% CPU serving their profile key while the other 11 shards sit at 20%. The key never expires during this period.\nWhat's going on and what helps most?",
    fields: [
      { label: "Problem", options: ["Hot key", "Cache stampede", "Uneven consistent-hash ring", "Memory pressure evicting keys"], answer: "Hot key" },
      { label: "Best fix", options: ["Short-TTL in-process cache on app servers plus split copies across shards", "Add a 13th shard", "Switch eviction to LFU", "Move to hash mod N"], answer: "Short-TTL in-process cache on app servers plus split copies across shards" },
    ],
    explanation:
      "Hashing spreads keys, not traffic; one key always lives on one shard, so adding shards changes nothing. A 1 to 2 second local cache absorbs most reads, and splitting the key into several copies spreads what's left.",
    lessonAnchor: "hot-keys",
  },
  {
    id: "hld-cache-mod-n",
    lectures: [19],
    tags: ["caching", "partitioning"],
    type: "mcq",
    prompt:
      "Your cache client picks a node with hash(key) % 4. You add a fifth node during peak traffic and the database is immediately overwhelmed. Why?",
    options: [
      "About 80% of keys now map to a different node, so most lookups miss",
      "The new node starts with an empty LRU list",
      "Replicas need to resync from the new node",
      "The TTLs were reset when the cluster changed",
    ],
    answer: "About 80% of keys now map to a different node, so most lookups miss",
    explanation:
      "With mod N, changing N remaps almost every key, which is effectively a cache flush. Consistent hashing or hash slots would move only about a fifth of the keys.",
    lessonAnchor: "why-not-hash-mod-n",
  },
  {
    id: "hld-cache-penetration",
    lectures: [19],
    tags: ["caching", "penetration"],
    type: "mcq",
    prompt:
      "A scraper requests /users/1 through /users/50000000. Most ids don't exist, so every request misses the cache and queries the database. Which change stops these from reaching the DB?",
    options: [
      "Cache a short-lived not-found marker or check a Bloom filter of valid ids",
      "Increase the TTL on existing users",
      "Switch to write-through",
      "Use LFU instead of LRU",
    ],
    answer: "Cache a short-lived not-found marker or check a Bloom filter of valid ids",
    explanation:
      "This is cache penetration: keys that don't exist can never be cached as values. Caching the negative result or rejecting impossible ids up front protects the database. Changing TTLs or eviction doesn't affect keys that are never stored.",
    lessonAnchor: "cache-penetration",
  },
  {
    id: "hld-cache-read-your-writes",
    lectures: [19],
    tags: ["caching", "consistency"],
    type: "scenario",
    prompt:
      "Users of a profile page need to see their own edits immediately, but everyone else can see changes up to a minute late. Reads vastly outnumber writes.\nPick a design.",
    fields: [
      { label: "Read pattern", options: ["Cache-aside", "Write-back only", "No cache", "Write-around with no reads from cache"], answer: "Cache-aside" },
      { label: "Write path", options: ["Update DB, then delete the key before responding", "Set the cache, update DB later", "Update DB only and rely on a 1 hour TTL", "Delete the key, then update DB"], answer: "Update DB, then delete the key before responding" },
      { label: "TTL", options: ["About 60 seconds as a safety net", "No TTL", "24 hours", "1 second"], answer: "About 60 seconds as a safety net" },
    ],
    explanation:
      "Deleting before the response means the user's next read reloads fresh data, and the TTL bounds staleness if any delete is missed. Relying on TTL alone would show the user their old profile.",
    lessonAnchor: "consistency-issues",
  },
  {
    id: "hld-cache-ttl-vs-eviction",
    lectures: [19],
    tags: ["caching", "eviction"],
    type: "mcq",
    prompt:
      "Your cache is configured with maxmemory-policy noeviction and no TTLs. After a month, writes to the cache start failing with OOM errors. What's the right fix for a cache workload?",
    options: [
      "Use allkeys-lru (or LFU) and give keys a TTL",
      "Keep noeviction and add a node every month",
      "Switch to FIFO and remove TTLs",
      "Turn on write-back so the DB stores the overflow",
    ],
    answer: "Use allkeys-lru (or LFU) and give keys a TTL",
    explanation:
      "noeviction is for primary data stores that must never drop data. A cache should evict under pressure (LRU or LFU) and expire entries by TTL to bound staleness. Adding nodes forever just delays the same failure.",
    lessonAnchor: "eviction-policies",
  },
];
