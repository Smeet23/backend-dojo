import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-tinyurl-code-length",
    lectures: [8],
    tags: ["estimation", "base62"],
    type: "scenario",
    prompt:
      "Product expects 50 million new short links per day and wants codes to last at least 20 years without reuse. Codes use base62.\nPick the shortest code length that fits, and the rough keyspace it gives.",
    fields: [
      { label: "Code length", options: ["5 characters", "6 characters", "7 characters", "10 characters"], answer: "7 characters" },
      { label: "Keyspace", options: ["About 916 million", "About 56.8 billion", "About 3.5 trillion", "About 839 quadrillion"], answer: "About 3.5 trillion" },
    ],
    explanation:
      "20 years × 365 × 50M is about 365 billion links. 62^6 is only about 56.8 billion, so 6 characters runs out in about 3 years; 62^7 is about 3.5 trillion, which fits with room to spare. 10 characters works but wastes length.",
    lessonAnchor: "how-long-should-the-code-be",
  },
  {
    id: "hld-tinyurl-hash-collisions",
    lectures: [8],
    tags: ["key-generation", "collisions"],
    type: "mcq",
    prompt:
      "A teammate's design: MD5 the long URL, base62 it, keep the first 7 characters. \"62^7 is 3.5 trillion, so collisions are basically impossible at our 2M links per day.\" What is wrong with this reasoning?",
    options: [
      "Nothing; collisions only matter near 3.5 trillion links",
      "By the birthday bound, random 7-char codes reach a 50% collision chance after about 2 million links, so collisions start on day one",
      "MD5 output can't be base62-encoded",
      "Collisions only happen if two users shorten the same long URL",
    ],
    answer: "By the birthday bound, random 7-char codes reach a 50% collision chance after about 2 million links, so collisions start on day one",
    explanation:
      "The chance that some pair collides grows with the square of the count: roughly 1.18 × √(3.5 trillion) ≈ 2.2 million codes for even odds. Same-URL inputs are actually the harmless case, because they map to the same destination; it's different URLs sharing a prefix that breaks things.",
    lessonAnchor: "approach-1-hash-and-truncate",
  },
  {
    id: "hld-tinyurl-race",
    lectures: [8],
    tags: ["key-generation", "consistency"],
    type: "scenario",
    prompt:
      "With hash-and-truncate, two API servers handle different long URLs whose codes truncate to the same 7 characters. Both run `SELECT ... WHERE code = ?`, both see nothing, both insert. One user's link now points to the other's destination.\nWhat's the root cause, and the fix?",
    fields: [
      { label: "Root cause", options: ["Check-then-insert is not atomic", "MD5 is too weak", "The cache served a stale entry", "The code is too short"], answer: "Check-then-insert is not atomic" },
      { label: "Fix", options: ["Conditional insert (put-if-absent / primary key constraint) and retry on conflict", "Switch MD5 to SHA-256", "Add a longer TTL to the cache", "Read from a replica instead"], answer: "Conditional insert (put-if-absent / primary key constraint) and retry on conflict" },
    ],
    explanation:
      "Any check-then-act sequence races under concurrency. The database must enforce uniqueness in the write itself, then the loser retries with a salt. A stronger hash doesn't help: truncation to 7 characters is what makes collisions likely.",
    lessonAnchor: "approach-1-hash-and-truncate",
  },
  {
    id: "hld-tinyurl-enumeration",
    lectures: [8],
    tags: ["key-generation", "security"],
    type: "scenario",
    prompt:
      "You use a global counter with base62. A security researcher reports that after creating sho.rt/00bX4kQ she could open 00bX4kR, 00bX4kS... and read other customers' private document links.\nWhat change fixes this while keeping codes collision-free and 7 characters long?",
    fields: [
      {
        label: "Change",
        options: [
          "Pass the counter through a bijective scramble before base62 encoding",
          "Switch to hash-and-truncate of the counter",
          "Use 64-bit Snowflake ids instead",
          "Return 301 instead of 302",
        ],
        answer: "Pass the counter through a bijective scramble before base62 encoding",
      },
    ],
    explanation:
      "A bijection (multiply by a constant coprime to 62 mod 62^7, or a small Feistel cipher) maps distinct ids to distinct codes, so uniqueness is kept, but neighbouring ids no longer produce neighbouring codes. Hashing reintroduces collisions; Snowflake ids encode to about 11 characters.",
    lessonAnchor: "approach-2-counter-plus-base62",
  },
  {
    id: "hld-tinyurl-allocator-outage",
    lectures: [8],
    tags: ["key-generation", "availability"],
    type: "mcq",
    prompt:
      "App servers fetch blocks of 1,000,000 ids from a ZooKeeper-backed range allocator. The allocator is down for 4 minutes. Create traffic is 1,200 per second spread over 20 servers. What happens?",
    options: [
      "All creates fail immediately",
      "Creates keep working: each server has ample ids left in its current block",
      "Servers start generating duplicate codes",
      "Redirects fail because they need the allocator",
    ],
    answer: "Creates keep working: each server has ample ids left in its current block",
    explanation:
      "Each server uses about 60 ids per second, so roughly 14,400 over four minutes, far less than a block. Large blocks are exactly what lets the system ride out allocator outages. Redirects never touch the allocator at all.",
    lessonAnchor: "approach-2-counter-plus-base62",
  },
  {
    id: "hld-tinyurl-redirect-code",
    lectures: [8],
    tags: ["http", "redirects"],
    type: "scenario",
    prompt:
      "Marketing wants per-click analytics for every campaign link, and Trust & Safety must be able to disable a phishing link within minutes.\nWhich redirect do you return, and what do you set alongside it?",
    fields: [
      { label: "Status", options: ["301 Moved Permanently", "302 Found", "200 OK with an HTML meta refresh", "304 Not Modified"], answer: "302 Found" },
      { label: "Caching", options: ["Cache-Control: private, max-age=0 (or a very short max-age)", "Cache-Control: public, max-age=31536000", "No headers; browsers never cache redirects", "ETag only"], answer: "Cache-Control: private, max-age=0 (or a very short max-age)" },
    ],
    explanation:
      "A 302 is not cached by default, so every click reaches you (analytics) and a disabled link stops working immediately. A 301 with a long max-age would be cached by browsers, hiding repeat clicks and keeping the phishing destination alive.",
    lessonAnchor: "redirects-301-vs-302",
  },
  {
    id: "hld-tinyurl-database",
    lectures: [8],
    tags: ["database", "data-model"],
    type: "mcq",
    prompt:
      "Your links table will reach about 180 TB, is read by primary key 120,000 times per second, and is never joined with anything. Which storage choice fits best?",
    options: [
      "A distributed key-value or wide-column store partitioned by code",
      "A single large Postgres instance with a B-tree index on code",
      "A graph database with links as edges",
      "An object store, one file per link, listed by prefix",
    ],
    answer: "A distributed key-value or wide-column store partitioned by code",
    explanation:
      "The access pattern is a single-key lookup at huge scale with no relational needs, which is exactly what partitioned KV stores are built for. One Postgres box can't hold 180 TB or serve that load; sharded SQL is possible but adds work for features you don't use.",
    lessonAnchor: "data-model-and-database-choice",
  },
  {
    id: "hld-tinyurl-expired-cache",
    lectures: [8],
    tags: ["caching", "expiry"],
    type: "scenario",
    prompt:
      "A link expired at noon. At 12:30 users report it still redirects. The nightly cleanup job hasn't run, and the cache entry was written at 9 AM with a 24-hour TTL.\nWhat are the two fixes?",
    fields: [
      { label: "Redirect path", options: ["Check expires_at on every lookup, cache hit or miss, and return 404/410 when past", "Run the cleanup job hourly instead", "Switch to 301 so browsers handle it", "Delete the row synchronously at noon"], answer: "Check expires_at on every lookup, cache hit or miss, and return 404/410 when past" },
      { label: "Cache TTL", options: ["min(default TTL, time until the link expires)", "Always 24 hours", "No TTL at all", "Twice the link's lifetime"], answer: "min(default TTL, time until the link expires)" },
    ],
    explanation:
      "Lazy expiry on read is what makes expiry correct; cleanup only reclaims space and may lag. Capping the cache TTL at the link's remaining lifetime stops the cache from outliving the link.",
    lessonAnchor: "expiry-and-cleanup",
  },
  {
    id: "hld-tinyurl-alias-clash",
    lectures: [8],
    tags: ["custom-alias"],
    type: "mcq",
    prompt:
      "A customer reserves the alias \"Promo24\" (7 base62 characters). Months later your counter-based generator produces exactly Promo24 for someone else. How should the design prevent this?",
    options: [
      "Insert generated codes with put-if-absent too (skip to the next id on conflict), or keep aliases in a disjoint namespace such as a different length",
      "Nothing; a collision this rare can be ignored",
      "Overwrite the alias with the newer link",
      "Only allow aliases that are all lowercase",
    ],
    answer: "Insert generated codes with put-if-absent too (skip to the next id on conflict), or keep aliases in a disjoint namespace such as a different length",
    explanation:
      "Counter codes are unique among themselves, but aliases live in the same table. A conditional insert catches the clash cheaply; a disjoint namespace avoids it entirely. Overwriting would silently hijack the customer's link.",
    lessonAnchor: "custom-aliases",
  },
  {
    id: "hld-tinyurl-redirect-order",
    lectures: [8],
    tags: ["architecture", "analytics"],
    type: "order",
    prompt: "Order the steps a redirect server performs for GET /aZ3kQ9x on a cache miss.",
    steps: [
      "Look up aZ3kQ9x in Redis and miss",
      "Read the record from the KV store by primary key",
      "Check expires_at against the current time",
      "Populate the cache with a TTL capped at the link's expiry",
      "Return 302 with the Location header",
      "Publish a click event to the queue without waiting",
    ],
    explanation:
      "Cache first, then the store, then validate expiry before caching or redirecting. The click event is fire-and-forget so analytics never adds latency or failure to the redirect; it can even be sent just before the response as long as nothing waits on it.",
    lessonAnchor: "analytics",
  },
];
