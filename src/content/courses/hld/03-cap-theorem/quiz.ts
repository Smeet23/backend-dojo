import type { Question } from "@/lib/types";

const CHOICE = ["CP", "AP"];
const LEVELS = ["Linearizable", "Causal", "Read-your-writes", "Monotonic reads", "Eventual"];

export const quiz: Question[] = [
  {
    id: "hld-cap-ticketing",
    lectures: [3],
    tags: ["cap", "consistency"],
    type: "scenario",
    prompt:
      "A concert ticketing system replicates data across three regions. During a partition between regions, decide how each piece of data should behave.",
    fields: [
      { label: "Seat inventory (each seat sold once)", options: CHOICE, answer: "CP" },
      { label: "Event descriptions and artist bios", options: CHOICE, answer: "AP" },
      { label: "\"People viewing this event\" counter", options: CHOICE, answer: "AP" },
    ],
    explanation:
      "Selling the same seat twice is worse than briefly refusing sales, so inventory should be CP with a majority quorum. Descriptions and a viewer counter can be stale for seconds without harm, so serving them from any reachable replica is the better trade.",
    lessonAnchor: "using-cap-in-an-interview",
  },
  {
    id: "hld-cap-ca-claim",
    lectures: [3],
    tags: ["cap"],
    type: "mcq",
    prompt:
      "A vendor says their new geo-replicated database is \"CA: consistent and available, so you don't need to worry about CAP\". What's the right response?",
    options: [
      "Partitions can't be ruled out across a network, so ask what it does when one happens",
      "Great, CA is the best of the three options",
      "CA is only possible with more than five replicas",
      "CA means it uses ACID transactions, which is enough",
    ],
    answer: "Partitions can't be ruled out across a network, so ask what it does when one happens",
    explanation:
      "Any system whose replicas talk over a network will see partitions, so it must either refuse some requests or risk inconsistency when they happen. \"CA\" only describes a system that assumes the network never fails. ACID's C is a different property entirely.",
    lessonAnchor: "partitions-are-not-optional",
  },
  {
    id: "hld-cap-gc-pause",
    lectures: [3],
    tags: ["cap", "partitions"],
    type: "mcq",
    prompt:
      "In a 3-node etcd cluster, the leader freezes for 25 seconds in a stop-the-world GC pause. No cables were cut and no switch failed. From the other nodes' point of view, what happened?",
    options: [
      "A partition: the leader is indistinguishable from an unreachable node, so they elect a new one",
      "Nothing, because the network was healthy",
      "A consistency violation, because the leader lost data",
      "An availability violation that CAP doesn't cover",
    ],
    answer: "A partition: the leader is indistinguishable from an unreachable node, so they elect a new one",
    explanation:
      "Other nodes only see silence, whether the cause is a cut link, an overloaded node or a GC pause. That's why partitions are a fact of life even on healthy networks. The leader didn't lose data; it just stopped responding.",
    lessonAnchor: "partition-tolerance",
  },
  {
    id: "hld-cap-lock-service",
    lectures: [3],
    tags: ["cap", "coordination"],
    type: "scenario",
    prompt:
      "You need a service that decides which of 20 workers is the leader for a nightly billing job. Two workers running billing at once would charge customers twice.",
    fields: [
      { label: "Partition behaviour", options: CHOICE, answer: "CP" },
      { label: "Store", options: ["etcd or ZooKeeper", "Cassandra at consistency ONE", "DNS records", "A Redis replica per worker"], answer: "etcd or ZooKeeper" },
    ],
    explanation:
      "Leader election must never produce two leaders, so it needs consensus where a minority partition can't grant leadership. etcd and ZooKeeper are built for that. Cassandra at ONE could let both sides of a split believe they hold the lock.",
    lessonAnchor: "cp-systems",
  },
  {
    id: "hld-cap-cart-merge",
    lectures: [3],
    tags: ["ap", "conflicts"],
    type: "scenario",
    prompt:
      "Your shopping cart is stored in an AP database across two regions. During a partition, a user adds headphones on their phone (routed to region 1) and a charger on their laptop (routed to region 2). Writes currently resolve by last write wins.",
    fields: [
      {
        label: "What the user sees after healing",
        options: ["Only one of the two items", "Both items", "An error", "An empty cart"],
        answer: "Only one of the two items",
      },
      {
        label: "Better resolution",
        options: ["Merge carts as a set union (or a CRDT set)", "Make the cart CP", "Use a longer TTL", "Pick the region with more nodes"],
        answer: "Merge carts as a set union (or a CRDT set)",
      },
    ],
    explanation:
      "LWW keeps whichever write has the later timestamp and silently drops the other. A cart is naturally mergeable: union the items (a CRDT set also handles removals). Making it CP would reject \"add to cart\" during a partition, which costs sales for no real benefit.",
    lessonAnchor: "ap-systems",
  },
  {
    id: "hld-cap-quorum",
    lectures: [3],
    tags: ["quorum", "tunable-consistency"],
    type: "scenario",
    prompt:
      "A Cassandra keyspace uses N = 3. You want reads to see the latest acknowledged write, and the system must keep both reading and writing when any one replica is down.",
    fields: [
      { label: "W", options: ["1", "2", "3"], answer: "2" },
      { label: "R", options: ["1", "2", "3"], answer: "2" },
    ],
    explanation:
      "R + W = 4 is greater than N = 3, so every read set overlaps every write set. With W = 2 and R = 2, one replica can be down and both operations still find two replicas. W = 3 would block writes whenever a single node fails.",
    lessonAnchor: "tunable-consistency",
  },
  {
    id: "hld-cap-pacelc",
    lectures: [3],
    tags: ["pacelc", "latency"],
    type: "scenario",
    prompt:
      "Your product catalogue is read 50,000 times per second worldwide. You moved it to a globally consistent database with synchronous cross-region writes and leader reads. There have been no partitions, yet p50 read latency for users in Asia went from 8 ms to 160 ms.",
    fields: [
      {
        label: "Trade-off at play",
        options: ["PACELC: else, latency vs consistency", "CAP: partition, availability vs consistency", "ACID isolation", "Thundering herd"],
        answer: "PACELC: else, latency vs consistency",
      },
      {
        label: "Fix for catalogue reads",
        options: ["Serve from the nearest replica, accepting slightly stale data", "Add more leader replicas in the US", "Use LWW for writes", "Increase the write quorum"],
        answer: "Serve from the nearest replica, accepting slightly stale data",
      },
    ],
    explanation:
      "With no partition, CAP says nothing; the cost is coordination latency, which PACELC's else branch names. A catalogue tolerates seconds of staleness, so local replica reads (PA/EL behaviour) are the right choice for it.",
    lessonAnchor: "pacelc",
  },
  {
    id: "hld-cap-ryw",
    lectures: [3],
    tags: ["consistency-levels", "replication"],
    type: "scenario",
    prompt:
      "Users edit their bio, the page reloads, and the old bio appears; a refresh a second later shows the new one. Reads go to async replicas behind a load balancer. Other users seeing the change a few seconds late is fine.",
    fields: [
      { label: "Guarantee you need", options: LEVELS, answer: "Read-your-writes" },
      {
        label: "Cheapest way to get it",
        options: [
          "Read the editor's own profile from the leader for a short time after they write",
          "Make every read in the system go to the leader",
          "Switch to synchronous replication to every replica",
          "Add a cache in front of the replicas",
        ],
        answer: "Read the editor's own profile from the leader for a short time after they write",
      },
    ],
    explanation:
      "Only the person who made the change needs to see it immediately, which is the read-your-writes session guarantee. Routing just their reads to the leader (or a caught-up replica) fixes it without paying linearizability costs for everyone. A cache would make staleness worse.",
    lessonAnchor: "consistency-levels",
  },
  {
    id: "hld-cap-monotonic",
    lectures: [3],
    tags: ["consistency-levels"],
    type: "mcq",
    prompt:
      "A comments thread shows 12 comments, then on refresh shows 9, then 12 again. Each refresh hits a random replica with different lag. Which guarantee is being violated?",
    options: ["Monotonic reads", "Read-your-writes", "Linearizability of writes", "Partition tolerance"],
    answer: "Monotonic reads",
    explanation:
      "The user sees time go backwards because successive reads hit replicas at different points in the replication stream. Pinning a session to one replica, or tracking the version it has seen, gives monotonic reads. Read-your-writes is about seeing your own writes, and this user didn't write anything.",
    lessonAnchor: "consistency-levels",
  },
  {
    id: "hld-cap-acid-c",
    lectures: [3],
    tags: ["cap", "misconceptions"],
    type: "mcq",
    prompt:
      "A teammate argues: \"Our Postgres primary enforces foreign keys and check constraints, so we already have the C in CAP for our read replicas.\" What's wrong?",
    options: [
      "Constraints are ACID consistency; CAP's C is about every replica returning the latest write",
      "Nothing; constraints guarantee linearizability",
      "Foreign keys aren't supported on replicas",
      "CAP doesn't apply to SQL databases",
    ],
    answer: "Constraints are ACID consistency; CAP's C is about every replica returning the latest write",
    explanation:
      "ACID's C means a transaction keeps the database's rules intact. CAP's C (linearizability) is about replicas agreeing on the latest value; async read replicas can be perfectly valid by every constraint and still be stale.",
    lessonAnchor: "consistency",
  },
];
