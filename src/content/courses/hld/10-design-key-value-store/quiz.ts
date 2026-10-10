import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-kv-modulo-resharding",
    lectures: [10],
    tags: ["partitioning", "consistent-hashing"],
    type: "scenario",
    prompt:
      "Your store places keys with hash(key) % 8. Adding a ninth node during Black Friday caused a storm of data movement and cache misses.\nWhat should placement use instead, and roughly what fraction of keys moves when the ninth node joins?",
    fields: [
      { label: "Placement", options: ["Consistent hashing with virtual nodes", "hash(key) % 16 so you double at once", "Range partitioning by first letter", "Random placement with a lookup table per key"], answer: "Consistent hashing with virtual nodes" },
      { label: "Keys moved", options: ["About 1/9", "About 1/2", "About 8/9", "All of them"], answer: "About 1/9" },
    ],
    explanation:
      "With modulo, changing 8 to 9 remaps about 8/9 of keys. On a consistent-hash ring the new node takes only its arcs, about 1/N of the data, and vnodes spread that take across all existing nodes.",
    lessonAnchor: "partitioning-with-consistent-hashing",
  },
  {
    id: "hld-kv-vnodes-hetero",
    lectures: [10],
    tags: ["virtual-nodes"],
    type: "mcq",
    prompt:
      "Your cluster has 10 old nodes with 2 TB disks and adds 5 new nodes with 8 TB disks. Each node currently gets one ring position. What change lets the new nodes carry proportionally more data and spreads a failed node's load evenly?",
    options: [
      "Give each node many virtual nodes, with 4× as many for the 8 TB machines",
      "Place the new nodes next to each other on the ring",
      "Increase the replication factor to 5",
      "Switch to hash(key) % 15",
    ],
    answer: "Give each node many virtual nodes, with 4× as many for the 8 TB machines",
    explanation:
      "Vnode count sets each machine's share of the ring, so capacity-weighted vnodes handle mixed hardware. Many small arcs also mean a failed node's keys go to many neighbours instead of one. Replication factor doesn't change balance.",
    lessonAnchor: "virtual-nodes",
  },
  {
    id: "hld-kv-quorum-pick",
    lectures: [10],
    tags: ["quorum", "consistency"],
    type: "scenario",
    prompt:
      "N = 3. The user-profile service needs reads to see the latest acknowledged write, and both reads and writes must keep working when any one replica is down.\nChoose W and R.",
    fields: [
      { label: "W", options: ["1", "2", "3"], answer: "2" },
      { label: "R", options: ["1", "2", "3"], answer: "2" },
    ],
    explanation:
      "R + W = 4 > 3 gives overlap, so reads include an up-to-date replica, and N − W = N − R = 1 tolerates one failure on both paths. W = 3, R = 1 also overlaps but blocks writes when any replica is down.",
    lessonAnchor: "quorum-reads-and-writes",
  },
  {
    id: "hld-kv-quorum-stale",
    lectures: [10],
    tags: ["quorum"],
    type: "mcq",
    prompt:
      "A team set N = 3, W = 1, R = 1 for speed. Users occasionally see an old avatar right after changing it. Why?",
    options: [
      "R + W = 2 is not greater than N, so a read can hit a replica the write hasn't reached yet",
      "The memtable hasn't flushed to an SSTable",
      "Bloom filters returned a false negative",
      "Gossip hasn't detected the write",
    ],
    answer: "R + W = 2 is not greater than N, so a read can hit a replica the write hasn't reached yet",
    explanation:
      "With W = 1 the write may be on one replica only, and R = 1 may ask a different one. Reads are served from the memtable too, and Bloom filters never give false negatives, so those aren't the cause.",
    lessonAnchor: "quorum-reads-and-writes",
  },
  {
    id: "hld-kv-cart-conflict",
    lectures: [10],
    tags: ["versioning", "conflicts"],
    type: "scenario",
    prompt:
      "During a partition, a user adds \"headphones\" to their cart on their phone and \"charger\" on their laptop. Both writes are accepted on different replicas. After the partition heals, the cart shows only the charger.\nWhat caused it, and what should the store use?",
    fields: [
      { label: "Cause", options: ["Last-write-wins discarded the concurrent update", "R + W was greater than N", "Hinted handoff lost the hint", "Compaction removed a tombstone"], answer: "Last-write-wins discarded the concurrent update" },
      { label: "Fix", options: ["Vector clocks to detect siblings, then merge (union) them, or a set CRDT", "Synchronise server clocks with NTP", "Increase W to 3", "Disable read repair"], answer: "Vector clocks to detect siblings, then merge (union) them, or a set CRDT" },
    ],
    explanation:
      "LWW keeps one value by timestamp, so concurrent additions are lost no matter how good the clocks are. Vector clocks reveal that neither version descends from the other, so both are kept and merged; a set CRDT merges automatically.",
    lessonAnchor: "versioning-and-conflicts",
  },
  {
    id: "hld-kv-vector-compare",
    lectures: [10],
    tags: ["vector-clocks"],
    type: "scenario",
    prompt:
      "A read returns two versions of a key:\n• V1 with clock [(A,3), (B,1)]\n• V2 with clock [(A,2), (B,2)]\nAnd separately, V3 [(A,3), (B,2)] versus V1.",
    fields: [
      { label: "V1 vs V2", options: ["Concurrent: keep both as siblings", "V1 descends from V2", "V2 descends from V1", "They are identical"], answer: "Concurrent: keep both as siblings" },
      { label: "V3 vs V1", options: ["V3 descends from V1, so V1 can be dropped", "Concurrent: keep both", "V1 descends from V3", "Cannot tell without timestamps"], answer: "V3 descends from V1, so V1 can be dropped" },
    ],
    explanation:
      "V1 has a higher A counter and V2 a higher B counter, so neither dominates: concurrent. V3 is greater than or equal to V1 in every entry (3 ≥ 3, 2 ≥ 1), so it is a descendant and supersedes V1.",
    lessonAnchor: "vector-clocks",
  },
  {
    id: "hld-kv-failure-mechanisms",
    lectures: [10],
    tags: ["failures", "repair"],
    type: "scenario",
    prompt: "Match each incident to the mechanism that handles it.",
    fields: [
      {
        label: "Node C reboots for 10 minutes; writes for its keys must still succeed",
        options: ["Sloppy quorum + hinted handoff", "Merkle-tree anti-entropy", "Bloom filters", "Compaction"],
        answer: "Sloppy quorum + hinted handoff",
      },
      {
        label: "Node D was offline 3 days; the stand-in holding its hints also died",
        options: ["Sloppy quorum + hinted handoff", "Merkle-tree anti-entropy", "Bloom filters", "Compaction"],
        answer: "Merkle-tree anti-entropy",
      },
      {
        label: "Every node must learn that E is unresponsive, with no central monitor",
        options: ["Gossip protocol", "Read repair", "Vector clocks", "Commit log"],
        answer: "Gossip protocol",
      },
    ],
    explanation:
      "Hinted handoff covers short outages by parking writes on a stand-in. When hints are lost or outages are long, Merkle-tree comparison finds and syncs the differences. Gossip spreads heartbeats so every node can detect failures in a decentralised way.",
    lessonAnchor: "handling-failures",
  },
  {
    id: "hld-kv-merkle",
    lectures: [10],
    tags: ["anti-entropy", "merkle-trees"],
    type: "mcq",
    prompt:
      "Two replicas each hold 2 billion keys, of which about 50 differ. Why do they compare Merkle trees rather than streaming their key lists to each other?",
    options: [
      "Equal subtree hashes prove whole ranges match, so only the paths to the ~50 differing buckets are explored",
      "Merkle trees compress values so the transfer is smaller",
      "Merkle trees order writes by timestamp",
      "Merkle trees replace the need for replication",
    ],
    answer: "Equal subtree hashes prove whole ranges match, so only the paths to the ~50 differing buckets are explored",
    explanation:
      "Comparing roots then descending only into mismatched children makes the work proportional to the number of differences, not the dataset size. It's a comparison structure, not compression or ordering.",
    lessonAnchor: "anti-entropy-with-merkle-trees",
  },
  {
    id: "hld-kv-write-path",
    lectures: [10],
    tags: ["write-path", "lsm"],
    type: "order",
    prompt: "Order what a storage node does with a put, from arrival to long-term storage.",
    steps: [
      "Append the write to the commit log on disk",
      "Insert it into the in-memory memtable",
      "Acknowledge the write to the coordinator",
      "Flush the full memtable to a new immutable SSTable",
      "Background compaction merges SSTables and drops old versions",
    ],
    explanation:
      "The commit log makes the write durable, the memtable makes it readable, then it's acknowledged. Flushing and compaction happen later, in the background, using only sequential I/O.",
    lessonAnchor: "write-path",
  },
  {
    id: "hld-kv-bloom",
    lectures: [10],
    tags: ["read-path", "bloom-filters"],
    type: "scenario",
    prompt:
      "A node has 40 SSTables. Lookups for keys that don't exist are slow because each one reads index blocks from many files.\nWhat do you add, and what can it never do?",
    fields: [
      { label: "Add", options: ["A Bloom filter per SSTable", "A larger commit log", "More replicas", "A vector clock per SSTable"], answer: "A Bloom filter per SSTable" },
      { label: "It never", options: ["Says 'definitely not here' for a key that is there", "Says 'maybe' for a key that isn't there", "Uses memory", "Needs hashing"], answer: "Says 'definitely not here' for a key that is there" },
    ],
    explanation:
      "Bloom filters have no false negatives, so a 'definitely not' lets the read skip that file safely. They do have occasional false positives ('maybe' for an absent key), which just costs one extra lookup.",
    lessonAnchor: "bloom-filters",
  },
  {
    id: "hld-kv-zombie-delete",
    lectures: [10],
    tags: ["compaction", "tombstones"],
    type: "mcq",
    prompt:
      "Users report deleted sessions reappearing days later. Tombstones are purged by compaction after 1 day; anti-entropy repair runs weekly; one replica was down for 3 days when the deletes happened. What's the fix?",
    options: [
      "Keep tombstones longer than the repair interval (and ensure repairs run within it)",
      "Disable Bloom filters",
      "Switch the deletes to W = 1",
      "Shorten the commit log",
    ],
    answer: "Keep tombstones longer than the repair interval (and ensure repairs run within it)",
    explanation:
      "The down replica still holds the old value. Once the other replicas purge their tombstones, repair sees a live value on one side and nothing on the other, and copies it back. The tombstone grace period must outlast the time it takes repairs to reach every replica.",
    lessonAnchor: "compaction",
  },
];
