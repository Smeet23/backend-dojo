import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-ha-downtime-math",
    lectures: [15],
    tags: ["availability", "slo"],
    type: "mcq",
    prompt:
      "Your SLO is 99.95% availability per 30-day month. You've already had a 15-minute outage this month. Roughly how much downtime budget is left?",
    options: ["About 6.6 minutes", "About 28 minutes", "About 4.3 hours", "None, you've already broken the SLO"],
    answer: "About 6.6 minutes",
    explanation:
      "0.0005 × 30 × 24 × 60 = 21.6 minutes a month. After 15 minutes, about 6.6 remain. 28 minutes would be the budget at 99.935%, and 4.3 hours is the yearly figure.",
    lessonAnchor: "downtime-budgets",
  },
  {
    id: "hld-ha-series-parallel",
    lectures: [15],
    tags: ["availability", "redundancy"],
    type: "scenario",
    prompt:
      "A request passes through a load balancer (99.99%), one app server (99%), and one database (99.9%). Product wants 99.9% end to end.",
    fields: [
      { label: "Current end-to-end availability", options: ["About 99.99%", "About 99.9%", "About 98.9%", "About 97%"], answer: "About 98.9%" },
      { label: "Best first change", options: ["Add a second independent app server", "Upgrade the load balancer", "Add a cache in front of the DB", "Add a second load balancer"], answer: "Add a second independent app server" },
    ],
    explanation:
      "In series you multiply: 0.9999 × 0.99 × 0.999 is about 98.89%. The 99% app server is the weakest link; two independent copies in parallel give 1 - 0.01² = 99.99% for that tier, lifting the total to about 99.88%. The DB then becomes the next target.",
    lessonAnchor: "series-and-parallel",
  },
  {
    id: "hld-ha-shared-fate",
    lectures: [15],
    tags: ["availability", "redundancy"],
    type: "mcq",
    prompt:
      "You run four app servers, but a single top-of-rack switch failure took them all down. What principle was violated?",
    options: [
      "The copies weren't independent: they shared a failure domain",
      "Four servers is too few; you needed N+2",
      "Health checks were too slow",
      "The app should have been active-passive",
    ],
    answer: "The copies weren't independent: they shared a failure domain",
    explanation:
      "Parallel redundancy maths assumes independent failures. Servers in the same rack, power feed or zone fail together. Spread copies across racks and availability zones; more copies in the same rack wouldn't help.",
    lessonAnchor: "series-and-parallel",
  },
  {
    id: "hld-ha-active-mode",
    lectures: [15],
    tags: ["availability", "failover"],
    type: "scenario",
    prompt: "Choose a redundancy mode for each component.",
    fields: [
      { label: "Stateless web/API tier", options: ["Active-active", "Active-passive (hot standby)", "Cold standby"], answer: "Active-active" },
      { label: "Postgres for orders", options: ["Active-active", "Active-passive (hot standby)", "Cold standby"], answer: "Active-passive (hot standby)" },
      { label: "Internal reporting tool, 1-day RTO is fine", options: ["Active-active", "Active-passive (hot standby)", "Cold standby"], answer: "Cold standby" },
    ],
    explanation:
      "Stateless servers can all take traffic, and the LB simply skips dead ones. A relational database avoids write conflicts with a single primary plus a synced standby. A tool with a generous RTO doesn't justify paying for idle hot capacity.",
    lessonAnchor: "active-active-and-active-passive",
  },
  {
    id: "hld-ha-deep-health",
    lectures: [15],
    tags: ["health-checks", "failover"],
    type: "scenario",
    prompt:
      "Your /healthz endpoint checks the database. During a 20-second database blip, the load balancer marked all 30 app servers unhealthy, and the site served nothing at all, even cached pages.",
    fields: [
      { label: "What went wrong", options: ["Deep dependency check failed everywhere at once", "Health check interval too long", "Too few app servers", "Sticky sessions"], answer: "Deep dependency check failed everywhere at once" },
      { label: "Fix", options: ["Make the LB check shallow (process can serve) and handle DB errors in the app", "Check the database twice as often", "Remove health checks entirely", "Raise the unhealthy threshold to 1"], answer: "Make the LB check shallow (process can serve) and handle DB errors in the app" },
    ],
    explanation:
      "A shared dependency in every node's health check turns a partial failure into a total one, because the LB pulls every node. Keep LB checks about the node itself and degrade gracefully when the DB is down. Removing checks would leave truly dead nodes in rotation.",
    lessonAnchor: "detection-with-health-checks",
  },
  {
    id: "hld-ha-split-brain",
    lectures: [15],
    tags: ["failover", "consensus"],
    type: "mcq",
    prompt:
      "A network partition separates the database primary from its standby. The standby, unable to see the primary, promotes itself. Both now accept writes. Which mechanism would have prevented this?",
    options: [
      "Quorum-based failover with fencing of the old primary",
      "Shorter DNS TTLs",
      "Asynchronous replication",
      "More frequent backups",
    ],
    answer: "Quorum-based failover with fencing of the old primary",
    explanation:
      "Promotion should require a majority vote, which an isolated standby can't get, and the old primary must be fenced so it can't keep writing. DNS TTLs only affect how fast clients find the new node.",
    lessonAnchor: "deciding-and-split-brain",
  },
  {
    id: "hld-ha-rto-rpo",
    lectures: [15],
    tags: ["rto", "rpo", "disaster-recovery"],
    type: "scenario",
    prompt:
      "A payments ledger: the business says it may be down for at most 5 minutes, and must never lose a committed transaction if a single data centre fails.",
    fields: [
      { label: "RPO", options: ["0", "5 minutes", "1 hour", "24 hours"], answer: "0" },
      { label: "Replication to the standby", options: ["Synchronous, to another AZ", "Asynchronous, to another region", "Nightly backup to object storage", "None, use RAID"], answer: "Synchronous, to another AZ" },
      { label: "Failover", options: ["Automatic, with a hot standby", "Manual restore from backup", "Cold standby started by on-call"], answer: "Automatic, with a hot standby" },
    ],
    explanation:
      "Zero data loss means RPO 0, which needs synchronous replication; AZs are close enough to make that affordable. A 5-minute RTO rules out manual restores, so failover must be automatic to a hot standby. Async cross-region replication can lose the last seconds of writes.",
    lessonAnchor: "rto-and-rpo",
  },
  {
    id: "hld-ha-degrade",
    lectures: [15],
    tags: ["resilience", "degradation"],
    type: "mcq",
    prompt:
      "The recommendations service is responding in 30 seconds instead of 50 ms. Product pages call it synchronously, threads pile up, and the whole site stops responding. What's the best immediate design fix?",
    options: [
      "A short timeout and circuit breaker on the call, rendering the page without recommendations on failure",
      "Retry the recommendations call 3 times",
      "Add more threads to the product page service",
      "Return 500 for the product page until recommendations recover",
    ],
    answer: "A short timeout and circuit breaker on the call, rendering the page without recommendations on failure",
    explanation:
      "Recommendations are optional, so the core page should degrade gracefully. A timeout stops thread exhaustion, and the breaker stops hammering a struggling service. Retries would triple the load on it, and more threads only delay the pile-up.",
    lessonAnchor: "graceful-degradation",
  },
  {
    id: "hld-ha-failover-order",
    lectures: [15],
    tags: ["failover"],
    type: "order",
    prompt: "Order the steps of an automatic database failover.",
    steps: [
      "Health checks miss several heartbeats from the primary",
      "A quorum of monitors agrees the primary is down",
      "The old primary is fenced off from accepting writes",
      "The most up-to-date standby is promoted to primary",
      "The endpoint, floating IP or DNS is pointed at the new primary",
    ],
    explanation:
      "Detect, decide by quorum, fence, promote, then switch traffic. Fencing before promotion is what prevents two primaries.",
    lessonAnchor: "failover",
  },
  {
    id: "hld-ha-n-plus",
    lectures: [15],
    tags: ["capacity", "redundancy"],
    type: "mcq",
    prompt:
      "Peak load needs 6 app servers' worth of capacity. You spread servers evenly across 3 availability zones and want to survive losing a whole zone. What's the minimum total?",
    options: ["6", "7", "9", "12"],
    answer: "9",
    explanation:
      "Losing one of three zones removes a third of the fleet, so the remaining two thirds must still equal 6: 3 per zone, 9 total. 7 (N+1) survives one server failure, not a zone.",
    lessonAnchor: "n1-and-n2",
  },
];
