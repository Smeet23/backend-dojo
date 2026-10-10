import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "scaling-part-1-dashboard-metric",
    lectures: [21.1],
    tags: ["latency", "percentiles"],
    type: "scenario",
    prompt:
      "Your shop's checkout API shows an average latency of 120 ms, yet support keeps getting \"checkout hangs for ages\" tickets. You're rebuilding the latency dashboard.\nWhat should the main panel show, and what should page the on-call engineer?",
    fields: [
      { label: "Main panel", options: ["Average latency", "p50, p95 and p99 latency", "Maximum latency only", "Total request count"], answer: "p50, p95 and p99 latency" },
      { label: "Alert on", options: ["Average above 200 ms", "p99 above the target", "p50 above the target", "Any single slow request"], answer: "p99 above the target" },
    ],
    explanation:
      "Averages blend a fast majority with a slow tail into a number nobody experiences, so the hanging checkouts disappear. Percentiles expose the tail, and alerting on p99 (or p95) catches it without paging on every single outlier.",
    lessonAnchor: "percentiles",
  },
  {
    id: "scaling-part-1-p99-meaning",
    lectures: [21.1],
    tags: ["percentiles"],
    type: "mcq",
    prompt: "Your tracing tool reports p99 = 1.8 s for GET /orders. Which statement is correct?",
    options: [
      "1% of requests take exactly 1.8 s",
      "99% of requests finish in 1.8 s or less; the slowest 1% take longer",
      "The average request takes 1.8 s",
      "99% of requests take at least 1.8 s",
    ],
    answer: "99% of requests finish in 1.8 s or less; the slowest 1% take longer",
    explanation:
      "A percentile is a cut-off in the sorted list of durations. 100 minus 99 gives the share slower than it: 1% of requests take longer than 1.8 s, not exactly 1.8 s.",
    lessonAnchor: "percentiles",
  },
  {
    id: "scaling-part-1-headroom",
    lectures: [21.1],
    tags: ["utilization", "capacity"],
    type: "scenario",
    prompt:
      "Your notes app's API servers sit at 92% CPU during the working day. Latency is erratic: usually fine, sometimes several seconds. A teammate says \"we still have 8% spare, no need for more capacity yet\".\nWhat's happening, and what utilization should you target?",
    fields: [
      { label: "Cause of the erratic latency", options: ["Requests are queueing near saturation", "The code got slower at high CPU", "The database is down", "DNS caching"], answer: "Requests are queueing near saturation" },
      { label: "Target utilization", options: ["About 30%", "About 60–80%", "About 95%", "100%, to use what you pay for"], answer: "About 60–80%" },
    ],
    explanation:
      "Each request's work time is unchanged; the waiting time balloons because latency grows sharply, not linearly, as utilization approaches 100%. Keeping 20–40% headroom absorbs bursts. 30% would work but wastes a lot of money.",
    lessonAnchor: "utilization-and-queueing",
  },
  {
    id: "scaling-part-1-measure-first",
    lectures: [21.1],
    tags: ["bottlenecks", "tracing"],
    type: "order",
    prompt: "GET /products/:id got slow after a release. Put a sensible investigation in order.",
    steps: [
      "Confirm and quantify it: check p95/p99 for that endpoint before and after the release",
      "Open a few slow traces to see which span takes the time",
      "Form a hypothesis about that span (for example a missing index or a blocking call)",
      "Apply one targeted fix",
      "Measure the percentiles again to confirm the fix worked",
    ],
    explanation:
      "Measure first, locate the bottleneck with data, change one thing, and verify. Jumping straight to a cache or more servers risks fixing a problem you don't have.",
    lessonAnchor: "find-the-bottleneck-first",
  },
  {
    id: "scaling-part-1-profiler-vs-tracing",
    lectures: [21.1],
    tags: ["profiling", "tracing"],
    type: "scenario",
    prompt:
      "Two slow endpoints:\n• A: POST /images/thumbnail resizes uploaded photos in the handler.\n• B: GET /dashboard makes six database queries and calls a billing API.\nWhich tool should you reach for first on each?",
    fields: [
      { label: "Endpoint A", options: ["CPU profiler and flame graph", "Distributed tracing", "EXPLAIN ANALYZE", "Increase the pool size"], answer: "CPU profiler and flame graph" },
      { label: "Endpoint B", options: ["CPU profiler and flame graph", "Distributed tracing", "Vertical scaling", "A bigger cache TTL"], answer: "Distributed tracing" },
    ],
    explanation:
      "Image resizing is CPU-bound, so a profiler shows which functions burn the cycles. The dashboard is IO-bound: it mostly waits, which profilers explain poorly, while a trace shows exactly which query or API call is slow.",
    lessonAnchor: "cpu-bound-vs-io-bound-work",
  },
  {
    id: "scaling-part-1-n-plus-one",
    lectures: [21.1],
    tags: ["database", "n-plus-one", "orm"],
    type: "scenario",
    prompt:
      "Production incident: the order history page loads 200 orders, and the database log shows 201 queries per page view: one SELECT on orders, then SELECT ... FROM customers WHERE id = $1 repeated 200 times. Your stack is Django.\nName the problem and the fix.",
    fields: [
      { label: "Problem", options: ["N+1 queries", "Missing primary key", "Connection pool exhausted", "Cache stampede"], answer: "N+1 queries" },
      { label: "Fix", options: ["select_related(\"customer\")", "Add a Redis cache per customer", "Raise max_connections", "Add more app servers"], answer: "select_related(\"customer\")" },
    ],
    explanation:
      "One query for the list plus one per row is N+1. select_related loads the foreign key with a JOIN, so the page needs one query however many orders it shows. Caching each customer still sends 200 round trips to Redis.",
    lessonAnchor: "n-plus-one-queries",
  },
  {
    id: "scaling-part-1-composite-index",
    lectures: [21.1],
    tags: ["database", "indexes"],
    type: "scenario",
    prompt:
      "Traces show this query is the slowest part of the \"My orders\" page:\nSELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20;\nEXPLAIN ANALYZE shows a Seq Scan on 40 million rows. What do you add, and what should the plan show afterwards?",
    fields: [
      { label: "Index", options: ["(created_at, user_id)", "(user_id, created_at)", "Separate indexes on every column", "(id)"], answer: "(user_id, created_at)" },
      { label: "Plan afterwards", options: ["Seq Scan", "Index Scan", "Hash Join", "Sort on disk"], answer: "Index Scan" },
    ],
    explanation:
      "Put the filtered column first: the index is sorted by user_id, then by created_at within it, so the database jumps to the user and reads rows already in order. (created_at, user_id) can't be used efficiently for a user_id filter because of the leftmost prefix rule.",
    lessonAnchor: "composite-indexes",
  },
  {
    id: "scaling-part-1-index-everything",
    lectures: [21.1],
    tags: ["database", "indexes"],
    type: "mcq",
    prompt:
      "A teammate proposes indexing all 30 columns of the events table \"so every query is fast\". The table receives 5,000 inserts per second. What's the main problem?",
    options: [
      "Postgres can't have more than 10 indexes per table",
      "Every insert must update all 30 indexes, so writes slow down badly",
      "Indexes make SELECT queries slower",
      "Indexes are dropped when the server restarts",
    ],
    answer: "Every insert must update all 30 indexes, so writes slow down badly",
    explanation:
      "Each index is a sorted copy that must be kept in sync on every INSERT, UPDATE and DELETE, and it costs storage. On a write-heavy table, index only the access patterns you've measured.",
    lessonAnchor: "indexes-arent-free",
  },
  {
    id: "scaling-part-1-pooler",
    lectures: [21.1],
    tags: ["database", "connection-pooling"],
    type: "scenario",
    prompt:
      "Your SaaS API runs on Kubernetes with an autoscaler. Each pod's driver pool allows 100 connections and Postgres allows 300. During a launch the autoscaler goes from 2 to 5 pods and the database starts rejecting connections with \"too many clients\".\nWhat's the root cause, and what's the durable fix?",
    fields: [
      { label: "Root cause", options: ["Per-pod pools multiply: 5 × 100 exceeds 300", "Postgres is out of disk", "An N+1 query", "Missing index on users"], answer: "Per-pod pools multiply: 5 × 100 exceeds 300" },
      { label: "Fix", options: ["Put an external pooler such as PgBouncer in front of Postgres", "Open a new connection per request", "Disable the autoscaler permanently", "Add a Redis cache"], answer: "Put an external pooler such as PgBouncer in front of Postgres" },
    ],
    explanation:
      "Internal pools are per instance, so autoscaling multiplies the total. An external pooler holds one shared limit that stays under the database's maximum however many pods run. Opening a connection per request makes both latency and the limit worse.",
    lessonAnchor: "internal-vs-external-pools",
  },
  {
    id: "scaling-part-1-cache-pattern",
    lectures: [21.1],
    tags: ["caching"],
    type: "scenario",
    prompt:
      "The shop's product page is read 50,000 times for every price change. Product data must never be stale for long after an admin edits it, and losing a write is unacceptable.\nChoose the caching pattern and how to handle edits.",
    fields: [
      { label: "Pattern", options: ["Cache-aside", "Write-behind", "No cache", "Cache only in each server's memory"], answer: "Cache-aside" },
      { label: "On admin edit", options: ["Update the DB, then delete the cache key", "Update only the cache", "Wait for a 7-day TTL", "Restart the servers"], answer: "Update the DB, then delete the cache key" },
    ],
    explanation:
      "Read-heavy data with occasional writes is the classic cache-aside case: event-based invalidation removes the stale entry and the next read refills it (keep a TTL as a safety net). Write-behind risks losing writes, and per-server memory caches disagree with each other.",
    lessonAnchor: "caching-patterns",
  },
  {
    id: "scaling-part-1-vertical-or-horizontal",
    lectures: [21.1],
    tags: ["scaling"],
    type: "mcq",
    prompt:
      "A small team's notes app runs on one 4-core server at 85% CPU. Traffic is steady and all users are in Europe. They have no load balancer and keep sessions in server memory. What's the simplest sensible next step?",
    options: [
      "Scale vertically to a bigger machine (and add a standby for failover)",
      "Split the app into microservices",
      "Run 10 small instances behind a load balancer this week",
      "Move every query behind a Redis cache",
    ],
    answer: "Scale vertically to a bigger machine (and add a standby for failover)",
    explanation:
      "Vertical scaling needs no code changes and suits steady, single-region traffic. Going horizontal would first require removing in-memory sessions and adding a load balancer; that's worth it later for redundancy or capacity beyond one machine.",
    lessonAnchor: "vertical-scaling",
  },
];
