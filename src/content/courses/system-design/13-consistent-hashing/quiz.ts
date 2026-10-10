import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "sd-chash-cache-stampede",
    lectures: [13],
    tags: ["consistent-hashing", "caching"],
    type: "scenario",
    prompt:
      "Your app picks a Memcached node with hash(key) % N. You scale from 9 to 10 cache nodes during a sale, and the database immediately hits 100% CPU.\nRoughly what fraction of keys changed node, and what should the client have used?",
    fields: [
      { label: "Keys that moved", options: ["About 10%", "About 50%", "About 90%", "None; only new keys go to node 10"], answer: "About 90%" },
      {
        label: "Better placement",
        options: ["Consistent hashing with virtual nodes", "hash(key) % N with a better hash function", "Random node per request", "Always the least-loaded node"],
        answer: "Consistent hashing with virtual nodes",
      },
    ],
    explanation:
      "With mod N, a key keeps its node only if hash % 9 equals hash % 10, which is about 1 key in 10, so ~90% of lookups miss and hit the database. On a consistent-hash ring the new node takes only about 1/10 of the keys.",
    lessonAnchor: "why-hash-mod-n-breaks",
  },
  {
    id: "sd-chash-who-owns",
    lectures: [13],
    tags: ["consistent-hashing"],
    type: "scenario",
    prompt:
      "A ring of size 0–99 has servers at A=10, B=40, C=75 (one point each, keys go clockwise to the next server).\nWhere do these keys live, and where does key 80 go if C is removed?",
    fields: [
      { label: "Key at 25", options: ["A", "B", "C"], answer: "B" },
      { label: "Key at 90", options: ["A", "B", "C"], answer: "A" },
      { label: "Key at 80 after C is removed", options: ["A", "B", "Nowhere until C returns"], answer: "A" },
    ],
    explanation:
      "25 walks clockwise and hits B at 40. 90 passes the end of the ring, wraps to 0 and hits A at 10. Key 80 was already past C, so it belonged to A all along; removing C doesn't change it. Only C's own keys (41–75) move, to A.",
    lessonAnchor: "the-hash-ring",
  },
  {
    id: "sd-chash-add-node",
    lectures: [13],
    tags: ["consistent-hashing"],
    type: "mcq",
    prompt:
      "Servers S0, S1 and S2 are on a ring without virtual nodes. You add S3, which hashes to a point between S1 and S2. Which keys move?",
    options: [
      "Only keys between S1 and S3, and they move from S2 to S3",
      "About a quarter of the keys from every server",
      "All of S1's keys",
      "Every key, because the ring has a new size",
    ],
    answer: "Only keys between S1 and S3, and they move from S2 to S3",
    explanation:
      "Keys in that arc used to walk on to S2; now S3 is the first server they meet. The ring's size is fixed, so no other key's position or owner changes. Taking a little from every server is what virtual nodes would give you.",
    lessonAnchor: "adding-a-server",
  },
  {
    id: "sd-chash-cascade",
    lectures: [13],
    tags: ["consistent-hashing", "virtual-nodes", "reliability"],
    type: "scenario",
    prompt:
      "A 5-node cache uses one ring point per node. Node 3 dies; node 4, its clockwise neighbour, instantly doubles in load, runs out of memory and dies too, and then node 5 follows.\nWhat's the root cause, and what change stops the cascade?",
    fields: [
      {
        label: "Root cause",
        options: ["A dead node's whole arc goes to a single neighbour", "The hash function is too slow", "Too many virtual nodes", "Hot keys"],
        answer: "A dead node's whole arc goes to a single neighbour",
      },
      {
        label: "Change",
        options: ["Give each node ~100 virtual nodes on the ring", "Switch to hash % N", "Use a 64-bit hash space", "Remove nodes in reverse order"],
        answer: "Give each node ~100 virtual nodes on the ring",
      },
    ],
    explanation:
      "With one point per node, the failed node's entire range has exactly one successor. With many vnodes, its small arcs are interleaved with everyone else's, so its load spreads across all survivors. A bigger hash space doesn't change who the neighbour is.",
    lessonAnchor: "virtual-nodes",
  },
  {
    id: "sd-chash-hetero",
    lectures: [13],
    tags: ["consistent-hashing", "virtual-nodes"],
    type: "mcq",
    prompt:
      "Your storage cluster mixes 2 TB and 8 TB machines. With equal treatment, the small machines fill up first. What's the cleanest fix on a consistent-hash ring?",
    options: [
      "Give the 8 TB machines four times as many virtual nodes as the 2 TB ones",
      "Hash the 8 TB machines with a different hash function",
      "Put the 8 TB machines at evenly spaced fixed positions",
      "Route keys to small machines only when large ones are full",
    ],
    answer: "Give the 8 TB machines four times as many virtual nodes as the 2 TB ones",
    explanation:
      "The share of keys a server owns is proportional to its number of ring points, so vnode count is a capacity weight. A different hash function per machine would break the shared view every client needs.",
    lessonAnchor: "virtual-nodes",
  },
  {
    id: "sd-chash-hot-key",
    lectures: [13],
    tags: ["consistent-hashing", "hot-keys"],
    type: "mcq",
    prompt:
      "After moving to consistent hashing with 200 vnodes per node, key counts are within 3% across nodes. But one node still runs at 95% CPU while others idle, because one celebrity profile key gets 40% of reads. What helps?",
    options: [
      "Replicate or cache the hot key (e.g. copies on several nodes or a local in-process cache)",
      "Add more virtual nodes",
      "Switch to a 128-bit hash",
      "Rebalance with hash % N",
    ],
    answer: "Replicate or cache the hot key (e.g. copies on several nodes or a local in-process cache)",
    explanation:
      "Consistent hashing balances how many keys each node holds, not how popular they are. A single key always maps to one owner, so more vnodes can't split it; you need copies of that key.",
    lessonAnchor: "the-load-imbalance-problem",
  },
  {
    id: "sd-chash-impl",
    lectures: [13],
    tags: ["consistent-hashing", "data-structures"],
    type: "scenario",
    prompt:
      "You're implementing the ring in a client library: 50 servers × 160 vnodes, and 10 million keys stored in the cluster.\nPick the data structure and the lookup cost.",
    fields: [
      {
        label: "Data structure",
        options: ["Sorted map / sorted array of ring positions", "Hash map from key to server", "Linked list of servers", "Array indexed by hash % 50"],
        answer: "Sorted map / sorted array of ring positions",
      },
      { label: "Lookup cost", options: ["O(log 8,000)", "O(log 10,000,000)", "O(8,000)", "O(1) always"], answer: "O(log 8,000)" },
    ],
    explanation:
      "You need \"the first position at or after hash(key)\", which is a sorted search. The structure holds only ring points (50 × 160 = 8,000), never the keys, so a lookup is a binary search over 8,000 entries.",
    lessonAnchor: "implementing-the-ring",
  },
];
