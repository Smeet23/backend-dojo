import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-ch-mod-n-outage",
    lectures: [7],
    tags: ["consistent-hashing", "cache"],
    type: "scenario",
    prompt:
      "Your app picks a Memcached node with hash(key) % 8. Ops added a ninth node during peak, and within a minute the database was overloaded and requests started timing out.\nExplain and fix.",
    fields: [
      { label: "Share of keys that changed node", options: ["About 89% (8/9)", "About 11% (1/9)", "Exactly 50%", "None, only new keys go to the new node"], answer: "About 89% (8/9)" },
      { label: "Why the database fell over", options: ["Almost every lookup missed and fell through to it", "The new node had a bug", "Memcached replicated all data to the database", "The hash function got slower"], answer: "Almost every lookup missed and fell through to it" },
      { label: "Fix", options: ["Consistent hashing with virtual nodes in the client", "Use hash(key) % 9 from the start", "Add nodes only at night", "Use a cryptographic hash"], answer: "Consistent hashing with virtual nodes in the client" },
    ],
    explanation:
      "Changing N under mod-N hashing remaps about N/(N+1) of keys, so nearly all reads miss at once. With a ring only about 1/9 of keys move, all to the new node. Adding nodes at night just moves the outage.",
    lessonAnchor: "why-hash-mod-n-breaks",
  },
  {
    id: "hld-ch-lookup",
    lectures: [7],
    tags: ["consistent-hashing"],
    type: "order",
    prompt: "Put the steps of a consistent-hash lookup in order.",
    steps: [
      "Hash each server id onto the ring and sort the positions",
      "Hash the key onto the same ring",
      "Binary search for the first server position at or after the key's hash",
      "If none is found, wrap around to the first position",
      "Send the request to that position's physical server",
    ],
    explanation:
      "The ring is a sorted array of server positions; a key is owned by its clockwise successor, with wrap-around past the largest position.",
    lessonAnchor: "looking-up-a-key",
  },
  {
    id: "hld-ch-uneven",
    lectures: [7],
    tags: ["virtual-nodes"],
    type: "scenario",
    prompt:
      "A 5-node store uses a ring with one point per node. Node C stores 38% of the data while node E stores 7%. When C crashed last week, its successor D was overwhelmed and crashed too.\nWhat do you change?",
    fields: [
      { label: "Change", options: ["Give each node many virtual nodes", "Switch to hash mod N", "Add a sixth node at a random point", "Increase the replication factor"], answer: "Give each node many virtual nodes" },
      { label: "Effect on balance", options: ["Each node's share becomes close to 20%", "C's share grows", "Nothing changes", "Data becomes sorted"], answer: "Each node's share becomes close to 20%" },
      { label: "Effect when a node fails", options: ["Its load is spread across all survivors", "Its load goes to one neighbour", "Its data is lost", "The ring must be rebuilt from scratch"], answer: "Its load is spread across all survivors" },
    ],
    explanation:
      "One random point per node gives random, uneven arcs and hands a failed node's whole arc to one successor. Many small arcs per node average out and spread a failure's load. Adding one more random point doesn't fix the variance.",
    lessonAnchor: "virtual-nodes",
  },
  {
    id: "hld-ch-weighted",
    lectures: [7],
    tags: ["virtual-nodes"],
    type: "mcq",
    prompt:
      "Your cluster has 64 GB nodes and you're adding new 128 GB nodes. How do you make the new nodes hold about twice as much data with consistent hashing?",
    options: [
      "Give the new nodes twice as many virtual nodes",
      "Hash the new nodes' names twice as often per lookup",
      "Place the new nodes at the start of the ring",
      "Use a different hash function for the new nodes",
    ],
    answer: "Give the new nodes twice as many virtual nodes",
    explanation:
      "A node's share is roughly proportional to its number of points on the ring, so weighting by vnode count expresses capacity. Ring position at 'the start' means nothing on a circle.",
    lessonAnchor: "virtual-nodes",
  },
  {
    id: "hld-ch-same-machine",
    lectures: [7],
    tags: ["replication"],
    type: "scenario",
    prompt:
      "A store with RF = 3 picks the next three ring points clockwise. After one machine died, some keys became unreadable at quorum even though only one machine was down.\nDiagnose and fix.",
    fields: [
      { label: "Cause", options: ["Two of a key's three points belonged to the same physical machine", "The hash function collided", "Hinted handoff was enabled", "Too many virtual nodes"], answer: "Two of a key's three points belonged to the same physical machine" },
      { label: "Fix", options: ["Skip points whose physical server is already in the list", "Lower RF to 2", "Remove virtual nodes", "Use mod-N for replicas"], answer: "Skip points whose physical server is already in the list" },
      { label: "Further hardening", options: ["Also require replicas in different racks or zones", "Put all replicas in one rack for speed", "Store replicas only on the newest node", "Disable gossip"], answer: "Also require replicas in different racks or zones" },
    ],
    explanation:
      "With vnodes, consecutive points can belong to one machine, so one failure removes two copies. The replica walk must pick distinct physical servers, and ideally distinct racks or zones.",
    lessonAnchor: "skip-virtual-nodes-of-the-same-machine",
  },
  {
    id: "hld-ch-hinted-handoff",
    lectures: [7],
    tags: ["replication", "availability"],
    type: "mcq",
    prompt:
      "In a Dynamo-style store, one of a key's three replicas is down for 10 minutes, but the system must keep accepting writes for that key. What happens to those writes?",
    options: [
      "The next healthy server along the ring stores them with a hint and hands them back when the replica returns",
      "They are rejected until the replica is back",
      "They are written only to the two healthy replicas and the third is rebuilt from scratch",
      "The ring is resized to exclude the down node permanently",
    ],
    answer: "The next healthy server along the ring stores them with a hint and hands them back when the replica returns",
    explanation:
      "Sloppy quorum with hinted handoff keeps writes available during short outages: a stand-in holds the data with a note of its real owner and forwards it later.",
    lessonAnchor: "when-a-replica-is-down",
  },
  {
    id: "hld-ch-hot-key",
    lectures: [7],
    tags: ["hot-key"],
    type: "scenario",
    prompt:
      "A flash sale sends 200,000 reads per second to product:9001. The cache ring is perfectly balanced by key count, yet the one node owning that key is at 100% CPU while the others idle.\nWhat helps?",
    fields: [
      { label: "Would more virtual nodes help?", options: ["No, the key still has a single owner", "Yes, it spreads that key", "Yes, if doubled", "Only with mod-N"], answer: "No, the key still has a single owner" },
      { label: "Best quick fix", options: ["A short-TTL local cache in each app server", "Add one more cache node", "Lower the replication factor", "Change the hash function"], answer: "A short-TTL local cache in each app server" },
      { label: "Structural fix for hot counters", options: ["Split the key into sub-keys on different nodes and sum on read", "Store the key twice on the same node", "Disable caching for it", "Move it to the end of the ring"], answer: "Split the key into sub-keys on different nodes and sum on read" },
    ],
    explanation:
      "Consistent hashing balances keys, not traffic per key. A local cache absorbs the reads before they reach the ring, and splitting a key spreads its load across owners.",
    lessonAnchor: "hot-keys",
  },
  {
    id: "hld-ch-moved-keys",
    lectures: [7],
    tags: ["consistent-hashing"],
    type: "mcq",
    prompt:
      "A ring with virtual nodes holds 10 million keys on 10 servers. You add an 11th server. Roughly which keys move?",
    options: [
      "About 900,000 keys, all onto the new server, taken in small slices from every old server",
      "About 9 million keys, spread across all servers",
      "About 900,000 keys, all taken from one neighbouring server",
      "None until a server is removed",
    ],
    answer: "About 900,000 keys, all onto the new server, taken in small slices from every old server",
    explanation:
      "The new server should own 1/11 of the ring, and only those keys move. With vnodes its many points take small slices from every existing server; with one point per server it would all come from one neighbour.",
    lessonAnchor: "adding-and-removing-servers",
  },
  {
    id: "hld-ch-slots",
    lectures: [7],
    tags: ["hash-slots"],
    type: "scenario",
    prompt:
      "Your team wants partitioning where operators can see exactly which node owns which part of the keyspace and rebalance by moving chunks explicitly, like Redis Cluster does.\nPick the scheme.",
    fields: [
      { label: "Scheme", options: ["Fixed hash slots with a slot-to-node table", "hash(key) mod number of nodes", "Range partitioning by first letter", "Random placement"], answer: "Fixed hash slots with a slot-to-node table" },
      { label: "What moves when a node is added", options: ["Some whole slots, reassigned in the table", "Every key", "Only keys written after the change", "Nothing, new nodes take only new keys"], answer: "Some whole slots, reassigned in the table" },
    ],
    explanation:
      "Hashing into a fixed number of slots (16,384 in Redis Cluster) keeps the minimal-movement property and makes ownership an explicit table. Mod-N over nodes would remap nearly everything.",
    lessonAnchor: "related-approaches",
  },
];
