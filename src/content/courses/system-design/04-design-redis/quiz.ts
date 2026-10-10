import type { Question } from "@/lib/types";

const POLICIES = ["noeviction", "allkeys-lru", "allkeys-lfu", "volatile-ttl", "allkeys-random"];
const PERSISTENCE = ["No persistence", "RDB snapshots only", "AOF appendfsync always", "AOF everysec with RDB preamble", "AOF appendfsync no"];

export const quiz: Question[] = [
  {
    id: "sd-redis-eviction-mix",
    lectures: [4],
    tags: ["redis", "eviction"],
    type: "scenario",
    prompt:
      "You run two Redis instances.\n• Instance 1 caches user sessions for a web app. When memory is full, idle sessions can simply be dropped (users log in again).\n• Instance 2 holds per-API-key rate-limit counters. Losing a counter silently would let a client exceed its limit.\nPick maxmemory-policy for each.",
    fields: [
      { label: "Session cache", options: POLICIES, answer: "allkeys-lru" },
      { label: "Rate-limit counters", options: POLICIES, answer: "noeviction" },
    ],
    explanation:
      "Sessions that haven't been touched recently are the right ones to drop, so allkeys-lru fits. Counters must never vanish silently; noeviction makes writes fail loudly instead, which tells you to add memory or shard. allkeys-random would evict hot sessions as readily as idle ones.",
    lessonAnchor: "eviction-policies",
  },
  {
    id: "sd-redis-keys-stall",
    lectures: [4],
    tags: ["redis", "event-loop"],
    type: "scenario",
    prompt:
      "Every few minutes, p99 latency for all Redis clients jumps from 1 ms to 400 ms at the same moment, then recovers. CPU is low otherwise. SLOWLOG shows a cron job running KEYS session:* on an instance with 12 million keys.",
    fields: [
      { label: "Root cause", options: ["Network congestion", "One O(n) command blocking the single execution thread", "Eviction storms", "Too many client connections"], answer: "One O(n) command blocking the single execution thread" },
      { label: "Fix", options: ["Enable I/O threads", "Replace KEYS with incremental SCAN", "Raise maxmemory", "Add more client connections"], answer: "Replace KEYS with incremental SCAN" },
    ],
    explanation:
      "Commands execute one at a time on the main thread, so a 400 ms KEYS makes every other client wait. SCAN walks the keyspace in small batches between other commands. I/O threads only parallelise socket reads and writes, not command execution.",
    lessonAnchor: "epoll-and-the-reactor-loop",
  },
  {
    id: "sd-redis-why-single-thread",
    lectures: [4],
    tags: ["redis", "event-loop"],
    type: "mcq",
    prompt:
      "A teammate proposes forking Redis to use one thread per client connection \"so it can finally use all 32 cores\". Which is the strongest argument that this would make a typical Redis workload slower, not faster?",
    options: [
      "Commands are microseconds of in-memory work, so threads add stack memory, context switches and locking that cost more than they save",
      "Linux cannot open more than 1,024 sockets per process",
      "RESP can only be parsed by one thread",
      "Threads cannot read from RAM in parallel",
    ],
    answer: "Commands are microseconds of in-memory work, so threads add stack memory, context switches and locking that cost more than they save",
    explanation:
      "With no disk waits inside a command, there is nothing for extra threads to overlap; they would mostly add overhead and lock contention, and break the free atomicity of single-threaded execution. The socket limit is configurable and epoll handles hundreds of thousands of sockets.",
    lessonAnchor: "why-not-a-thread-per-client",
  },
  {
    id: "sd-redis-resp-encode",
    lectures: [4],
    tags: ["redis", "resp"],
    type: "mcq",
    prompt: "You are writing a minimal Redis client. Which byte stream correctly sends GET user:42?",
    options: [
      "*2\\r\\n$3\\r\\nGET\\r\\n$7\\r\\nuser:42\\r\\n",
      "+GET user:42\\r\\n",
      "*2\\r\\n$3\\r\\nGET\\r\\n$6\\r\\nuser:42\\r\\n",
      "$2\\r\\n*3\\r\\nGET\\r\\n*7\\r\\nuser:42\\r\\n",
    ],
    answer: "*2\\r\\n$3\\r\\nGET\\r\\n$7\\r\\nuser:42\\r\\n",
    explanation:
      "A command is an array (*) of bulk strings ($), each with its exact byte length: GET is 3 bytes and user:42 is 7. The $6 version miscounts, so the server would read the wrong bytes. A + prefix is a simple-string reply, not how commands are sent.",
    lessonAnchor: "the-wire-protocol",
  },
  {
    id: "sd-redis-encoding-memory",
    lectures: [4],
    tags: ["redis", "encoding", "memory"],
    type: "scenario",
    prompt:
      "You store 50 million user profiles as Redis hashes, about 10 short fields each. Memory is lower than you expected. Then a release adds a \"bio\" field that is often 300 characters, and memory per user jumps several times even though total bytes stored grew only a little.",
    fields: [
      { label: "Encoding before", options: ["listpack", "hashtable", "skiplist", "intset"], answer: "listpack" },
      { label: "Encoding after", options: ["listpack", "hashtable", "skiplist", "embstr"], answer: "hashtable" },
      { label: "Why it switched", options: ["More than 128 fields", "A value over hash-max-listpack-value (64 bytes)", "The key got a TTL", "AOF rewrite ran"], answer: "A value over hash-max-listpack-value (64 bytes)" },
    ],
    explanation:
      "Small hashes are packed into a single listpack block. Any value longer than 64 bytes converts the hash to a real hash table with per-entry allocations and pointers, even with only 11 fields. Storing the bio in a separate string key would keep the profile hash compact.",
    lessonAnchor: "hashes-and-sorted-sets",
  },
  {
    id: "sd-redis-persistence-pick",
    lectures: [4],
    tags: ["redis", "persistence"],
    type: "scenario",
    prompt:
      "Choose persistence for two deployments.\n• A: a cache of product pages that can be fully rebuilt from Postgres. A cold start is acceptable.\n• B: a job queue (Redis lists). Losing more than about a second of enqueued jobs after a crash is not acceptable, but every write waiting on the disk would be too slow.",
    fields: [
      { label: "A: page cache", options: PERSISTENCE, answer: "No persistence" },
      { label: "B: job queue", options: PERSISTENCE, answer: "AOF everysec with RDB preamble" },
    ],
    explanation:
      "A rebuildable cache gains little from persistence and avoids fork and disk costs. The queue needs a small loss window: AOF everysec loses about one second, and the RDB preamble keeps restarts fast. appendfsync always would make every enqueue wait for the disk; RDB alone could lose minutes.",
    lessonAnchor: "append-only-file",
  },
  {
    id: "sd-redis-fork-oom",
    lectures: [4],
    tags: ["redis", "persistence", "memory"],
    type: "scenario",
    prompt:
      "A write-heavy Redis node with 30 GB of data runs on a 32 GB machine. Every time a background RDB save starts, memory climbs and the Linux OOM killer eventually kills Redis.",
    fields: [
      { label: "What is consuming the extra memory", options: ["The AOF buffer", "Copy-on-write page copies made while the child writes the snapshot", "Replication backlog", "Lazy-free threads"], answer: "Copy-on-write page copies made while the child writes the snapshot" },
      { label: "Best fix", options: ["Lower maxmemory to leave headroom (or snapshot on a replica)", "Switch to appendfsync always", "Disable lazy freeing", "Use KEYS less often"], answer: "Lower maxmemory to leave headroom (or snapshot on a replica)" },
    ],
    explanation:
      "After fork, every page the parent modifies is copied so the child keeps a frozen view. Heavy writes during the save can approach doubling memory. Leave headroom below physical RAM, or take snapshots on a replica that serves no writes.",
    lessonAnchor: "rdb-snapshots",
  },
  {
    id: "sd-redis-unlink",
    lectures: [4],
    tags: ["redis", "lazy-free"],
    type: "mcq",
    prompt:
      "A nightly job deletes yesterday's leaderboard, a sorted set with 20 million members, using DEL. Users report a short freeze of the whole app at midnight. What change removes the freeze while still deleting the data?",
    options: ["Use UNLINK so the memory is freed on a background thread", "Run DEL inside MULTI/EXEC", "Set a 1-second TTL instead of deleting", "Enable appendfsync always"],
    answer: "Use UNLINK so the memory is freed on a background thread",
    explanation:
      "UNLINK removes the key from the keyspace immediately and frees its 20 million allocations in the background, so the event loop isn't blocked. A transaction still frees synchronously, and an expiring key is freed synchronously too unless lazyfree-lazy-expire is on.",
    lessonAnchor: "lazy-freeing",
  },
  {
    id: "sd-redis-crossslot",
    lectures: [4],
    tags: ["redis", "cluster"],
    type: "scenario",
    prompt:
      "After moving to Redis Cluster, a Lua script that atomically moves an item from cart:1000 to order:1000 fails with CROSSSLOT. You need the script to stay atomic.",
    fields: [
      { label: "Why it fails", options: ["Lua is disabled in cluster mode", "The two keys hash to different slots, possibly on different nodes", "The keys are too long", "Replicas reject scripts"], answer: "The two keys hash to different slots, possibly on different nodes" },
      { label: "Fix", options: ["Rename keys to {user:1000}:cart and {user:1000}:order", "Increase the number of slots", "Run the script on a replica", "Use DEL before the script"], answer: "Rename keys to {user:1000}:cart and {user:1000}:order" },
    ],
    explanation:
      "Cluster hashes CRC16(key) mod 16384, and multi-key operations must stay inside one slot. With a hash tag, only the part inside {} is hashed, so both keys land in the same slot and the script can run atomically on one node.",
    lessonAnchor: "hash-slots",
  },
  {
    id: "sd-redis-write-path",
    lectures: [4],
    tags: ["redis", "architecture"],
    type: "order",
    prompt: "Put the steps of SET user:1 Alice on a Redis server with AOF enabled in order.",
    steps: [
      "epoll_wait reports the client's socket as readable",
      "The main thread reads the bytes and parses the RESP array",
      "The SET handler is found in the command table",
      "The key is hashed into the keyspace and an embstr value object is created",
      "The command is appended to the AOF buffer and replication stream",
      "+OK is written back to the client",
    ],
    explanation:
      "The event loop wakes on a ready socket, parses RESP, dispatches by command name, mutates memory, propagates the write, and replies. The fsync to disk happens later in the background (with everysec), not before the reply.",
    lessonAnchor: "the-life-of-a-write",
  },
  {
    id: "sd-redis-failover-loss",
    lectures: [4],
    tags: ["redis", "replication"],
    type: "mcq",
    prompt:
      "Your primary acknowledged an INCR to a client, then crashed 5 ms later. Sentinel promoted a replica, and the increment is missing. AOF everysec was on for the primary. What explains the lost write?",
    options: [
      "Replication is asynchronous, so the write had not reached the replica that was promoted",
      "AOF everysec always loses exactly one command",
      "Sentinel replays the AOF of the new primary, not the old one, so it skips INCR",
      "INCR is not replicated",
    ],
    answer: "Replication is asynchronous, so the write had not reached the replica that was promoted",
    explanation:
      "The primary replies before replicas confirm. The new primary never saw that INCR, and the old primary's AOF doesn't matter once it's no longer the primary. WAIT can narrow this window but not guarantee zero loss.",
    lessonAnchor: "replicas-and-failover",
  },
];
