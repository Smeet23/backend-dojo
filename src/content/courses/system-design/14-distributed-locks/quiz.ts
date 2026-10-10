import type { Question } from "@/lib/types";

const LOCK_STORES = ["Single Redis primary with async replicas", "Redis with Sentinel", "etcd or ZooKeeper (quorum)", "An in-process mutex"];

export const quiz: Question[] = [
  {
    id: "sd-lock-mutex-scaleout",
    lectures: [14],
    tags: ["distributed-locks"],
    type: "mcq",
    prompt:
      "An inventory service decrements stock inside a sync.Mutex and has never oversold. After scaling from 1 to 6 replicas, it oversells during flash sales. Why?",
    options: [
      "Each replica's mutex only excludes threads in that process; replicas don't share memory or a kernel",
      "Mutexes stop working under high load",
      "The load balancer reorders requests",
      "The mutex needs a longer timeout",
    ],
    answer: "Each replica's mutex only excludes threads in that process; replicas don't share memory or a kernel",
    explanation:
      "A mutex is arbitrated by one process's memory and kernel. Six processes mean six independent mutexes, so six replicas can decrement at once. You need a lock (or an atomic conditional update) that lives in a shared service.",
    lessonAnchor: "why-a-mutex-isnt-enough",
  },
  {
    id: "sd-lock-capacity",
    lectures: [14],
    tags: ["distributed-locks", "estimation"],
    type: "scenario",
    prompt:
      "A ticketing platform takes 20,000 bookings per second, each holding a seat lock for 250 ms. Each lock entry costs about 200 bytes including overhead.\nEstimate the numbers.",
    fields: [
      { label: "Locks held at once", options: ["80", "5,000", "20,000", "250,000"], answer: "5,000" },
      { label: "Memory for held locks", options: ["About 1 MB", "About 100 MB", "About 4 GB", "About 50 GB"], answer: "About 1 MB" },
      {
        label: "What to watch as you grow",
        options: ["Lock-service operations per second", "Lock-service RAM", "Disk space", "Number of resource keys"],
        answer: "Lock-service operations per second",
      },
    ],
    explanation:
      "By Little's law, 20,000/s × 0.25 s = 5,000 concurrent locks, and 5,000 × 200 B = 1 MB. Memory is trivial; acquires, renewals and releases per second are what saturate a single primary first.",
    lessonAnchor: "capacity-estimate",
  },
  {
    id: "sd-lock-setnx-expire",
    lectures: [14],
    tags: ["distributed-locks", "redis"],
    type: "scenario",
    prompt:
      "A teammate's lock code does:\nif not redis.exists(key): redis.set(key, token); redis.expire(key, 30)\nTwo bugs show up in production: occasionally two workers both get the lock, and once a lock stayed held forever after a crash.\nMatch each symptom to its cause and pick the fix.",
    fields: [
      {
        label: "Two holders",
        options: ["Check-then-set is not atomic", "The TTL is too short", "The token isn't random", "Redis is multi-threaded"],
        answer: "Check-then-set is not atomic",
      },
      {
        label: "Lock held forever",
        options: ["Crash between SET and EXPIRE", "The token isn't random", "Redis evicted the key", "Clock skew"],
        answer: "Crash between SET and EXPIRE",
      },
      {
        label: "Fix",
        options: ["SET key token NX PX 30000 in one command", "Wrap it in a local mutex", "Use EXPIRE before SET", "Retry the EXISTS check twice"],
        answer: "SET key token NX PX 30000 in one command",
      },
    ],
    explanation:
      "Two clients can both pass EXISTS before either SETs. And a crash after SET but before EXPIRE leaves a key with no TTL. SET with NX and PX does the test, the set and the expiry as one atomic command.",
    lessonAnchor: "acquiring-atomically",
  },
  {
    id: "sd-lock-unsafe-release",
    lectures: [14],
    tags: ["distributed-locks", "redis"],
    type: "mcq",
    prompt:
      "Your logs show a worker finishing a job 45 s after acquiring a 30 s lock, then calling DEL on the lock key. Shortly after, two workers process the same job concurrently. What is the correct release?",
    options: [
      "A Lua script that deletes the key only if its value equals this worker's owner token",
      "DEL the key, then SET it again with NX",
      "Call EXPIRE key 0 instead of DEL",
      "Release the lock before doing the work",
    ],
    answer: "A Lua script that deletes the key only if its value equals this worker's owner token",
    explanation:
      "After 30 s the lock had expired and another worker owned it; the late DEL removed someone else's lock. Comparing the stored token and deleting in one atomic script makes a stale release a harmless no-op. EXPIRE 0 deletes just as blindly.",
    lessonAnchor: "releasing-safely",
  },
  {
    id: "sd-lock-ttl-choice",
    lectures: [14],
    tags: ["distributed-locks", "leases"],
    type: "scenario",
    prompt:
      "Report-generation jobs normally take 5–60 s but occasionally 10 minutes. If a worker crashes, you want another to take over within about a minute.\nHow do you set up the lease?",
    fields: [
      { label: "TTL", options: ["2 s", "30 s", "15 min", "No TTL"], answer: "30 s" },
      { label: "Renew every", options: ["1 ms", "10 s", "29 s", "Never"], answer: "10 s" },
    ],
    explanation:
      "A moderate TTL with renewal at about a third of it covers long jobs while freeing a crashed worker's lock within 30 s. A 15-minute TTL makes failover take 15 minutes; renewing at 29 s leaves no margin for one slow renewal.",
    lessonAnchor: "leases-and-renewal",
  },
  {
    id: "sd-lock-fencing-where",
    lectures: [14],
    tags: ["distributed-locks", "fencing"],
    type: "scenario",
    prompt:
      "Even with safe release and renewals, you still find rare double-writes to the ledger table. They correlate with 20 s GC pauses on workers holding 15 s leases.\nWhat's happening, and where must the protection go?",
    fields: [
      {
        label: "What's happening",
        options: [
          "A paused worker's lease expires, another worker takes the lock, then the first wakes and writes anyway",
          "Redis granted the same lock twice",
          "The Lua release script has a race",
          "The ledger table has no primary key",
        ],
        answer: "A paused worker's lease expires, another worker takes the lock, then the first wakes and writes anyway",
      },
      {
        label: "Where the check belongs",
        options: ["In the ledger database: reject writes with a fencing token lower than the highest seen", "In the lock service", "In the worker, before it writes", "In the load balancer"],
        answer: "In the ledger database: reject writes with a fencing token lower than the highest seen",
      },
    ],
    explanation:
      "The paused worker never contacts the lock service again, and its own check would pass because it believes it still holds the lock. Only the resource sees the late write, so it must compare fencing tokens.",
    lessonAnchor: "fencing-tokens",
  },
  {
    id: "sd-lock-fencing-order",
    lectures: [14],
    tags: ["distributed-locks", "fencing"],
    type: "order",
    prompt: "Put the paused-client scenario, with fencing tokens enabled, in order.",
    steps: [
      "Client A acquires the lock and receives fencing token 33",
      "A freezes in a long GC pause",
      "The lease expires and client B acquires the lock with token 34",
      "B writes to storage with token 34, which storage accepts and records",
      "A wakes up and tries to write with token 33",
      "Storage rejects the write because 33 is lower than 34",
    ],
    explanation:
      "The lock service handed out strictly increasing tokens, and storage remembered the highest one it accepted. A's write arrives with an older token and is refused, even though A still thinks it holds the lock.",
    lessonAnchor: "fencing-tokens",
  },
  {
    id: "sd-lock-store-choice",
    lectures: [14],
    tags: ["distributed-locks", "consistency"],
    type: "scenario",
    prompt:
      "Pick a lock store for each case:\n• A: stop two workers from regenerating the same thumbnail (a duplicate just wastes CPU). Ops wants automatic failover.\n• B: make sure a customer's card is charged exactly once per order.",
    fields: [
      { label: "A: thumbnail dedupe", options: LOCK_STORES, answer: "Redis with Sentinel" },
      { label: "B: payment charge", options: LOCK_STORES, answer: "etcd or ZooKeeper (quorum)" },
    ],
    explanation:
      "Sentinel gives fast, highly available locks, and its rare lost-lock-on-failover only costs a wasted thumbnail. Payments need a lock that survives failover, which a quorum-committed store gives, plus fencing at the payment table. An in-process mutex can't coordinate machines at all.",
    lessonAnchor: "making-the-lock-service-reliable",
  },
  {
    id: "sd-lock-failover-loss",
    lectures: [14],
    tags: ["distributed-locks", "redis", "replication"],
    type: "mcq",
    prompt:
      "Worker A acquires lock:invoice:9 on the Redis primary. 2 ms later the primary crashes; Sentinel promotes a replica. Worker B then acquires lock:invoice:9 successfully. Why?",
    options: [
      "Replication is async, so the replica never received A's key before it was promoted",
      "Sentinel deletes all locks during failover",
      "B's owner token was identical to A's",
      "The TTL was too long",
    ],
    answer: "Replication is async, so the replica never received A's key before it was promoted",
    explanation:
      "The primary acknowledged A before copying the write to replicas. The promoted replica has no record of the lock, so it grants it again. Quorum stores avoid this by committing to a majority before replying.",
    lessonAnchor: "making-the-lock-service-reliable",
  },
  {
    id: "sd-lock-metrics",
    lectures: [14],
    tags: ["distributed-locks", "observability"],
    type: "scenario",
    prompt:
      "Your lock dashboard shows:\n• p99 lock wait time jumped from 3 ms to 900 ms on one resource key.\n• Fencing rejections went from 0 to 40 per hour after a JVM upgrade.\nWhat does each signal most likely mean?",
    fields: [
      {
        label: "Wait time spike",
        options: ["Heavy contention on a hot resource", "Clients are crashing", "Redis is out of memory", "Fencing is misconfigured"],
        answer: "Heavy contention on a hot resource",
      },
      {
        label: "Fencing rejections",
        options: ["Zombie clients outliving their leases, likely longer GC pauses", "The lock service is down", "Normal behaviour under load", "Tokens are being reused"],
        answer: "Zombie clients outliving their leases, likely longer GC pauses",
      },
    ],
    explanation:
      "Long waits on one key mean many clients queueing for the same lock. Fencing rejections are the defence working, but every one is a client that wrote after its lease expired, so investigate pause times or lengthen TTLs.",
    lessonAnchor: "putting-it-together",
  },
];
