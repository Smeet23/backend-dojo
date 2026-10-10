import type { Question } from "@/lib/types";

const STORES = ["Redis", "Object storage (S3/R2)", "Local disk of each instance", "In-process memory map", "A SQLite file on the server"];

export const quiz: Question[] = [
  {
    id: "scaling-part-2-random-logouts",
    lectures: [21.2],
    tags: ["statelessness", "sessions"],
    type: "scenario",
    prompt:
      "Users report: \"I keep getting logged out at random, and my profile picture sometimes shows as broken.\" It started the day you went from one API instance to three behind a load balancer. Sessions are kept in a Map in memory and avatars are saved to ./uploads.\nWhere should each live instead?",
    fields: [
      { label: "Sessions", options: STORES, answer: "Redis" },
      { label: "Avatars", options: STORES, answer: "Object storage (S3/R2)" },
    ],
    explanation:
      "Each instance only sees its own memory and disk, so a request landing on a different instance can't find the session (401) or the file (404). Moving state to stores every instance can reach makes the servers stateless and interchangeable.",
    lessonAnchor: "statelessness",
  },
  {
    id: "scaling-part-2-lb-algorithm",
    lectures: [21.2],
    tags: ["load-balancing"],
    type: "scenario",
    prompt:
      "Your shop runs three identical API servers behind round robin. Monitoring shows one server pegged at 100% CPU with long queues while the other two idle. Most requests are quick GETs, but checkout calls a payment provider and takes about 2 s.\nWhat's going on, and which algorithm should you switch to?",
    fields: [
      { label: "Cause", options: ["Heavy requests keep landing on the same server", "One server is smaller than the others", "Health checks are too frequent", "DNS is caching the server IP"], answer: "Heavy requests keep landing on the same server" },
      { label: "Algorithm", options: ["Weighted round robin", "Least connections", "Random", "Keep round robin, add servers"], answer: "Least connections" },
    ],
    explanation:
      "Round robin ignores how expensive each request is. Least connections sends new work to the server with the fewest requests in flight, so a server tied up with slow checkouts is skipped. Weighted round robin fixes unequal servers, not unequal requests.",
    lessonAnchor: "least-connections",
  },
  {
    id: "scaling-part-2-weighted",
    lectures: [21.2],
    tags: ["load-balancing"],
    type: "mcq",
    prompt:
      "You add a new server with 8 vCPUs to a pool of two 4-vCPU servers. All requests cost about the same. How should the load balancer share traffic?",
    options: [
      "Plain round robin: every server gets a third",
      "Weighted round robin with the new server at weight 2",
      "Send everything to the new server",
      "Hash by client IP",
    ],
    answer: "Weighted round robin with the new server at weight 2",
    explanation:
      "With similar requests but unequal servers, weights let the bigger machine take a proportional share (half the traffic here). Plain round robin would leave the big server underused and the small ones overloaded.",
    lessonAnchor: "weighted-round-robin",
  },
  {
    id: "scaling-part-2-health-checks",
    lectures: [21.2],
    tags: ["load-balancing", "health-checks"],
    type: "order",
    prompt: "Server B runs out of memory and crashes, then gets restarted 5 minutes later. Put what a load balancer with health checks does in order.",
    steps: [
      "The LB periodically sends GET /health to every server",
      "B stops answering 200, so it fails its checks",
      "The LB removes B from rotation; user traffic goes only to A and C",
      "The LB keeps probing B while it's out",
      "B answers 200 again after restarting and is added back to rotation",
    ],
    explanation:
      "Health checks are continuous: they detect the failure, stop routing to the dead server, and keep probing so the server can rejoin once it recovers. Without them, every request rotated to B would return a 502 or 503.",
    lessonAnchor: "health-checks",
  },
  {
    id: "scaling-part-2-replica-lag",
    lectures: [21.2],
    tags: ["database", "replication"],
    type: "scenario",
    prompt:
      "Production incident: a user in Singapore updates their billing address, sees \"Saved\", and the refreshed page shows the old address. Writes go to the primary in us-east; reads go to a replica in Singapore.\nName the cause and the most targeted fix.",
    fields: [
      { label: "Cause", options: ["Replication lag", "A missing index", "Cache stampede", "N+1 queries"], answer: "Replication lag" },
      { label: "Fix", options: ["Route that user's reads to the primary for a short time after a write", "Send all reads for all users to the primary forever", "Remove the replica", "Add a bigger replica"], answer: "Route that user's reads to the primary for a short time after a write" },
    ],
    explanation:
      "The replica hasn't applied the write yet when the re-fetch arrives. Read-your-writes routing keeps fresh data for the user who just wrote, without giving up the replica's benefits for everyone else. A bigger replica doesn't make light travel faster.",
    lessonAnchor: "replication-lag",
  },
  {
    id: "scaling-part-2-shard-key",
    lectures: [21.2],
    tags: ["database", "sharding"],
    type: "mcq",
    prompt:
      "Your marketplace's orders table has billions of rows and must be sharded. The hottest query is \"orders for user X\", and new orders arrive all day. Which shard key is best?",
    options: [
      "A hash of user_id",
      "Order month (one shard per month)",
      "Order status",
      "Shard randomly, then query all shards",
    ],
    answer: "A hash of user_id",
    explanation:
      "Hashing user_id puts all of a user's orders on one shard (the main query hits one shard) and spreads writes evenly. Sharding by month makes \"orders for user X\" hit every shard and sends all new writes to the current month's shard, creating a hot spot.",
    lessonAnchor: "sharding",
  },
  {
    id: "scaling-part-2-cdn-edge",
    lectures: [21.2],
    tags: ["cdn", "edge"],
    type: "scenario",
    prompt:
      "Your SaaS origin is in Virginia and 40% of users are in Japan. You want to speed things up for them without moving the database.\nWhat should go where?",
    fields: [
      { label: "JS/CSS bundles and images", options: ["CDN cache", "Edge function", "Origin only", "Background queue"], answer: "CDN cache" },
      { label: "Rejecting requests with an invalid JWT", options: ["CDN cache", "Edge function", "Origin only", "Background queue"], answer: "Edge function" },
      { label: "Running the monthly invoice query", options: ["CDN cache", "Edge function", "Origin only", "Background queue"], answer: "Origin only" },
    ],
    explanation:
      "Static assets are ideal CDN content. A signature check is small, fast logic that saves a trans-Pacific round trip for bad requests, so it suits the edge. A heavy query needs the database, which lives at the origin; running it at the edge would still cross the ocean.",
    lessonAnchor: "edge-computing",
  },
  {
    id: "scaling-part-2-async-invite",
    lectures: [21.2],
    tags: ["async", "queues"],
    type: "scenario",
    prompt:
      "Inviting a teammate takes 450 ms: 40 ms of database work plus about 400 ms calling the email provider. When the provider has an outage, invites fail entirely.\nHow should you restructure it?",
    fields: [
      { label: "In the request", options: ["Validate, insert the pending invite, return 200", "Send the email, then insert the invite", "Do nothing and return 202 before validating", "Retry the email provider until it succeeds"], answer: "Validate, insert the pending invite, return 200" },
      { label: "Sending the email", options: ["Push a job to a queue for a worker", "Inside the request, with a longer timeout", "From the browser", "In a cron job once a day"], answer: "Push a job to a queue for a worker" },
    ],
    explanation:
      "The user doesn't need the email to be sent before seeing \"Invited\". Returning after the database work cuts latency to about 40 ms, and a worker with retries survives provider outages. Validation must still happen in the request so the user gets errors immediately.",
    lessonAnchor: "inviting-a-teammate",
  },
  {
    id: "scaling-part-2-microservices",
    lectures: [21.2],
    tags: ["architecture", "microservices"],
    type: "mcq",
    prompt:
      "A 12-person startup's monolith handles 300 RPS on two servers. The CTO wants to split it into eight microservices \"so it scales\". What's the strongest objection?",
    options: [
      "Monoliths can't be scaled horizontally",
      "Microservices mainly solve team-scaling problems they don't have, while adding network calls, distributed debugging and data consistency issues",
      "Microservices can't use databases",
      "Microservices always need serverless",
    ],
    answer: "Microservices mainly solve team-scaling problems they don't have, while adding network calls, distributed debugging and data consistency issues",
    explanation:
      "A monolith scales horizontally behind a load balancer just fine. Microservices pay off with large organisations and genuinely different scaling or technology needs; for a small team the costs usually outweigh the benefits.",
    lessonAnchor: "monoliths-and-microservices",
  },
  {
    id: "scaling-part-2-serverless-fit",
    lectures: [21.2],
    tags: ["serverless"],
    type: "scenario",
    prompt:
      "You're choosing where to run three parts of a notes app:\n• A: resizing images whenever a user uploads one (a few hundred a day, in bursts)\n• B: the real-time collaboration server holding WebSocket connections all day\n• C: a nightly export that takes about 40 minutes\nWhich are good fits for AWS Lambda-style functions?",
    fields: [
      { label: "A: image resizing", options: ["Good fit for serverless", "Poor fit for serverless"], answer: "Good fit for serverless" },
      { label: "B: WebSocket server", options: ["Good fit for serverless", "Poor fit for serverless"], answer: "Poor fit for serverless" },
      { label: "C: 40-minute export", options: ["Good fit for serverless", "Poor fit for serverless"], answer: "Poor fit for serverless" },
    ],
    explanation:
      "Occasional, event-driven work is serverless's sweet spot: you pay only when uploads happen. Long-lived connections clash with short-lived instances, and Lambda caps a run at 15 minutes, so the export would be killed partway.",
    lessonAnchor: "when-serverless-fits",
  },
  {
    id: "scaling-part-2-autoscale-spike",
    lectures: [21.2],
    tags: ["autoscaling", "capacity"],
    type: "mcq",
    prompt:
      "Your autoscaler adds VMs when CPU passes 70%. A push notification sends traffic from 50 to 2,000 RPS within 10 seconds, and users see errors for about two minutes before things recover. Why?",
    options: [
      "Autoscaling is reactive and new VMs take minutes to boot and join the load balancer",
      "The load balancer was using least connections",
      "The CPU threshold should have been 100%",
      "Autoscaling only works with microservices",
    ],
    answer: "Autoscaling is reactive and new VMs take minutes to boot and join the load balancer",
    explanation:
      "Autoscaling reacts after the threshold is crossed, and fresh instances need time to boot, start the app and pass health checks. For known spikes, scale up ahead of time or keep more headroom.",
    lessonAnchor: "autoscaling",
  },
  {
    id: "scaling-part-2-rules",
    lectures: [21.2, 21.1],
    tags: ["mindset"],
    type: "mcq",
    prompt:
      "A new engineer proposes Kubernetes, Kafka and sharding for a product with 2,000 users \"so we're ready for Netflix scale\". Which rule of thumb applies most directly?",
    options: [
      "Scale for the problems you have, plus reasonable headroom",
      "Always copy the architecture of large tech companies",
      "Complexity is free once it's set up",
      "Observability can wait until you have a million users",
    ],
    answer: "Scale for the problems you have, plus reasonable headroom",
    explanation:
      "Most products never reach that scale, and every added component must be run, monitored and understood. Build for today's measured needs and keep observability in from day one so you see real bottlenecks coming.",
    lessonAnchor: "rules-of-thumb",
  },
];
