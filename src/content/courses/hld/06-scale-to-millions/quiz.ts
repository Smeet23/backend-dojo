import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-scale-first-split",
    lectures: [6],
    tags: ["scaling", "database"],
    type: "scenario",
    prompt:
      "Your app and Postgres run on one VM. At peak, the database's buffer cache is being squeezed by the app's memory, and you want to add a second app server soon.\nWhat is the next step?",
    fields: [
      { label: "Change", options: ["Move the database to its own server", "Shard the database", "Add a CDN", "Add a message queue"], answer: "Move the database to its own server" },
      { label: "Why it comes first", options: ["Tiers get sized independently, and multiple app servers need data off their own disks", "It removes all single points of failure", "It eliminates network latency", "It doubles write throughput"], answer: "Tiers get sized independently, and multiple app servers need data off their own disks" },
    ],
    explanation:
      "The app and database want different resources, and you can't run several app servers if the data lives on one of them. Sharding or queues solve problems you don't have yet.",
    lessonAnchor: "step-1-separate-the-database",
  },
  {
    id: "hld-scale-sticky-logout",
    lectures: [6],
    tags: ["stateless", "sessions"],
    type: "scenario",
    prompt:
      "You added a load balancer with sticky sessions in front of four app servers. Every time autoscaling removes a server or a deploy replaces one, a batch of users is logged out, and one server runs much hotter than the others.\nFix it.",
    fields: [
      { label: "Where sessions should live", options: ["A shared store such as replicated Redis", "In each server's memory", "In the load balancer's memory", "In the CDN"], answer: "A shared store such as replicated Redis" },
      { label: "What the cookie carries", options: ["Only a session id", "The full cart and profile", "The server's private IP", "Nothing"], answer: "Only a session id" },
      { label: "Resulting property of the app tier", options: ["Stateless: any server can handle any request", "Sharded by user", "Active-passive", "Write-through"], answer: "Stateless: any server can handle any request" },
    ],
    explanation:
      "Sticky sessions tie users to one machine, so losing it loses their sessions and load can't be balanced freely. Moving session state to a shared store makes servers interchangeable.",
    lessonAnchor: "step-6-move-state-out-of-the-web-tier",
  },
  {
    id: "hld-scale-replica-lag",
    lectures: [6],
    tags: ["replication"],
    type: "scenario",
    prompt:
      "After you added read replicas, users report that a photo they just uploaded is missing when the page reloads, then appears a second later.\nDiagnose and fix.",
    fields: [
      { label: "Cause", options: ["Asynchronous replication lag", "Cache eviction", "CDN purge delay", "Load balancer health checks"], answer: "Asynchronous replication lag" },
      { label: "Fix", options: ["Read-your-writes: send that user's reads to the primary for a short window after a write", "Add more replicas", "Increase the cache TTL", "Use sticky sessions"], answer: "Read-your-writes: send that user's reads to the primary for a short window after a write" },
    ],
    explanation:
      "Replicas apply changes slightly after the primary. Routing a user's own reads to the primary right after they write hides the lag where it matters. More replicas don't reduce lag.",
    lessonAnchor: "step-3-database-replication",
  },
  {
    id: "hld-scale-replicas-vs-shards",
    lectures: [6],
    tags: ["sharding", "replication"],
    type: "mcq",
    prompt:
      "The primary database handles 25,000 writes per second at 95% CPU, and the data is 12 TB and growing. A teammate suggests adding three more read replicas. Why won't that help?",
    options: [
      "Every write still goes through the one primary, and every replica stores the full 12 TB",
      "Replicas can't be added to a busy primary",
      "Replicas only work with NoSQL databases",
      "Replicas make writes synchronous and slower",
    ],
    answer: "Every write still goes through the one primary, and every replica stores the full 12 TB",
    explanation:
      "Replication scales reads, not writes or storage. When writes or data size outgrow one machine, you shard so each primary owns only part of the data.",
    lessonAnchor: "step-8-sharding-the-database",
  },
  {
    id: "hld-scale-shard-key",
    lectures: [6],
    tags: ["sharding"],
    type: "scenario",
    prompt:
      "You're sharding a photo app's data. Most queries are 'photos of user X', 'likes on user X's photos' and 'settings of user X'. One proposal shards by upload date, another by user_id.\nChoose.",
    fields: [
      { label: "Shard key", options: ["user_id (hashed)", "Upload date (range)", "Photo file size", "Random per row"], answer: "user_id (hashed)" },
      { label: "Main risk to plan for", options: ["A celebrity user creating a hot shard", "All of today's writes landing on one shard", "Losing the ability to store images", "Replication stopping"], answer: "A celebrity user creating a hot shard" },
    ],
    explanation:
      "Sharding by user keeps each user's data on one shard, matching the queries. Date ranges would send every new upload to the newest shard. The remaining risk with user_id is a single very popular user.",
    lessonAnchor: "step-8-sharding-the-database",
  },
  {
    id: "hld-scale-cdn",
    lectures: [6],
    tags: ["cdn"],
    type: "scenario",
    prompt:
      "Your servers are in Virginia. Users in Sydney see 2-second image loads while the servers are at 20% CPU. Images are stored on the app servers' local disks.\nWhat do you change?",
    fields: [
      { label: "Where images are stored", options: ["Object storage, with the URL in the database", "A BLOB column in Postgres", "Redis", "Each app server's disk, replicated with rsync"], answer: "Object storage, with the URL in the database" },
      { label: "How they reach users", options: ["Through a CDN with edge caches near users", "More app servers in Virginia", "A bigger load balancer", "A read replica in Sydney"], answer: "Through a CDN with edge caches near users" },
      { label: "How to ship an edited image safely", options: ["Give it a new versioned URL", "Purge every edge and hope", "Set TTL to zero for all images", "Restart the CDN"], answer: "Give it a new versioned URL" },
    ],
    explanation:
      "The problem is distance, not capacity. Object storage behind a CDN serves bytes from nearby edges, and versioned URLs avoid the need to purge stale copies.",
    lessonAnchor: "step-5-a-cdn",
  },
  {
    id: "hld-scale-queue",
    lectures: [6],
    tags: ["queue"],
    type: "scenario",
    prompt:
      "Uploading a photo takes 4 seconds because the request generates five thumbnails, runs moderation and fans out to followers' feeds. During evening spikes the database falls over.\nRedesign it.",
    fields: [
      { label: "What the upload request does", options: ["Store the original, enqueue a job, return", "Everything, but with more threads", "Nothing until the thumbnails exist", "Write directly to the CDN"], answer: "Store the original, enqueue a job, return" },
      { label: "How workers scale", options: ["On queue depth, independently of the web tier", "With the web tier's CPU", "They don't need to", "By adding replicas"], answer: "On queue depth, independently of the web tier" },
      { label: "Requirement on workers", options: ["Idempotent, because delivery is at least once", "Stateful, holding sessions", "Single-threaded", "Running on the database server"], answer: "Idempotent, because delivery is at least once" },
    ],
    explanation:
      "None of that work must finish before the user gets a response. A queue absorbs spikes and lets workers scale on backlog; since messages may be redelivered, workers must tolerate duplicates.",
    lessonAnchor: "step-7-a-message-queue",
  },
  {
    id: "hld-scale-order",
    lectures: [6],
    tags: ["scaling"],
    type: "order",
    prompt: "Put these scaling steps in the order a typical read-heavy product adopts them.",
    steps: [
      "Move the database to its own server",
      "Add a load balancer and more app servers",
      "Add read replicas",
      "Add a cache for hot reads",
      "Shard the database",
      "Run in multiple regions",
    ],
    explanation:
      "Each step addresses the next bottleneck: first separating tiers, then app CPU, then read load, then repeated hot reads, then write and storage limits, and finally region-level availability and global latency.",
    lessonAnchor: "what-breaks-at-each-step",
  },
  {
    id: "hld-scale-multiregion",
    lectures: [6],
    tags: ["multi-region"],
    type: "scenario",
    prompt:
      "You're adding a second region in Europe. Product wants European users to get low latency, and a full region outage must not take the site down. Writes are moderate and the team wants to avoid write conflicts.\nPick the setup.",
    fields: [
      { label: "Routing users", options: ["GeoDNS to the nearest healthy region", "Round-robin DNS across regions", "Always the US region", "Client picks manually"], answer: "GeoDNS to the nearest healthy region" },
      { label: "Data layout", options: ["Each user has a home region that takes their writes", "Every region accepts any write with no conflict handling", "One shared database in the US for both", "No replication between regions"], answer: "Each user has a home region that takes their writes" },
      { label: "Proof the failover works", options: ["Regular failover drills", "A design document", "Monitoring CPU", "Bigger instances"], answer: "Regular failover drills" },
    ],
    explanation:
      "GeoDNS sends users to a nearby region and away from a dead one. Partitioning writes by home region gets most of active-active's benefit without conflict resolution. Untested failover usually fails when needed.",
    lessonAnchor: "step-9-multiple-data-centres",
  },
  {
    id: "hld-scale-cache-stampede",
    lectures: [6],
    tags: ["cache"],
    type: "mcq",
    prompt:
      "The front-page feed is cached with a 60-second TTL. Every minute, database CPU spikes to 100% for a moment, right when the key expires. What's happening?",
    options: [
      "A thundering herd: thousands of requests miss at once and all query the database",
      "Replication lag on the replicas",
      "The CDN is purging the feed",
      "The load balancer health checks are failing",
    ],
    answer: "A thundering herd: thousands of requests miss at once and all query the database",
    explanation:
      "When a hot key expires, every concurrent request misses together. Coalescing requests so one refreshes the key, or refreshing early before expiry, removes the spike.",
    lessonAnchor: "step-4-a-cache",
  },
];
