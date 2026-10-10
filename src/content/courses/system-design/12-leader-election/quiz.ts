import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "sd-election-cron-duplicates",
    lectures: [12],
    tags: ["leader-election", "split-brain"],
    type: "scenario",
    prompt:
      "Your billing service runs on 4 identical pods, and each pod has the same in-process cron job that charges subscriptions at midnight. Customers are being charged 4 times.\nWhat's the underlying problem, and what's the standard fix?",
    fields: [
      {
        label: "Problem",
        options: ["No single node is responsible for the job", "The cron expression is wrong", "The database lacks an index", "Heartbeats are too frequent"],
        answer: "No single node is responsible for the job",
      },
      {
        label: "Fix",
        options: [
          "Elect a leader (e.g. via an etcd or ZooKeeper lease) and only the leader runs the job",
          "Run the job on a random pod",
          "Shorten the cron interval",
          "Add a read replica",
        ],
        answer: "Elect a leader (e.g. via an etcd or ZooKeeper lease) and only the leader runs the job",
      },
    ],
    explanation:
      "Identical nodes doing a must-run-once task is the textbook case for leader election. Picking a random pod doesn't coordinate anything, because each pod picks independently.",
    lessonAnchor: "why-pick-a-leader",
  },
  {
    id: "sd-election-timeout-tuning",
    lectures: [12],
    tags: ["leader-election", "heartbeats"],
    type: "scenario",
    prompt:
      "Your cluster's leader sends heartbeats every 100 ms and followers time out after 150 ms. You see an election roughly every hour, always during the leader's JVM garbage-collection pauses of about 300 ms. The old leader is fine afterwards.\nWhat's happening and what do you change?",
    fields: [
      {
        label: "Diagnosis",
        options: ["False elections: the timeout is shorter than normal pauses", "The leader is really crashing", "Split brain from a network partition", "The heartbeat interval is too long"],
        answer: "False elections: the timeout is shorter than normal pauses",
      },
      {
        label: "Change",
        options: ["Raise the timeout to a few times the worst normal pause (e.g. 1–1.5 s)", "Lower the timeout to 50 ms", "Stop sending heartbeats during GC", "Add more followers"],
        answer: "Raise the timeout to a few times the worst normal pause (e.g. 1–1.5 s)",
      },
    ],
    explanation:
      "A follower can't tell slow from dead; it only sees silence. When ordinary pauses exceed the timeout, you get needless elections. A longer timeout costs some failover speed but stops the churn. Lowering it would make things worse.",
    lessonAnchor: "detecting-a-dead-leader",
  },
  {
    id: "sd-election-bully-winner",
    lectures: [12],
    tags: ["leader-election", "bully"],
    type: "scenario",
    prompt:
      "Seven nodes, IDs 1–7, use the bully algorithm. Leader 7 crashes and node 6 is also down. Node 3 notices first.\nWho does node 3 send ELECTION to, and who becomes leader?",
    fields: [
      { label: "Node 3 sends ELECTION to", options: ["1 and 2", "4, 5, 6 and 7", "Every node", "Only 7"], answer: "4, 5, 6 and 7" },
      { label: "New leader", options: ["3", "4", "5", "6"], answer: "5" },
    ],
    explanation:
      "Bully only contacts higher IDs, since lower ones can't win while the sender is alive. The highest live ID is 5: it hears nothing back from 6 or 7, declares itself leader and broadcasts COORDINATOR.",
    lessonAnchor: "the-bully-algorithm",
  },
  {
    id: "sd-election-ring-order",
    lectures: [12],
    tags: ["leader-election", "ring"],
    type: "order",
    prompt: "In the ring algorithm, node 2 notices the leader is dead. Put the steps in order.",
    steps: [
      "Node 2 sends ELECTION carrying ID 2 to its next live successor",
      "Each node forwards the message, replacing the ID with its own if it's higher",
      "The message returns to node 2 carrying the highest live ID",
      "Node 2 sends COORDINATOR with that ID around the ring",
      "Every node records the new leader and starts expecting its heartbeats",
    ],
    explanation:
      "One lap finds the maximum, a second lap announces it. That's about 2n messages in total, against bully's O(n²).",
    lessonAnchor: "the-ring-algorithm",
  },
  {
    id: "sd-election-message-cost",
    lectures: [12],
    tags: ["leader-election", "bully", "ring"],
    type: "mcq",
    prompt:
      "You're comparing election schemes for a 500-node cluster where the lowest-ID node is often the first to notice failures. Which statement is accurate?",
    options: [
      "Bully can need on the order of 250,000 messages; ring needs about 1,000 but finishes slowly because hops are sequential",
      "Both need about 500 messages",
      "Ring needs O(n²) messages because every node talks to every other node",
      "Bully is O(log n) because only higher IDs are contacted",
    ],
    answer: "Bully can need on the order of 250,000 messages; ring needs about 1,000 but finishes slowly because hops are sequential",
    explanation:
      "When the lowest node starts, every node ends up messaging everyone above it: roughly n²/2 messages. Ring sends one lap for ELECTION and one for COORDINATOR (about 2n), but 500 sequential hops make failover slow.",
    lessonAnchor: "ring-message-cost",
  },
  {
    id: "sd-election-successor-list",
    lectures: [12],
    tags: ["leader-election", "ring"],
    type: "scenario",
    prompt:
      "Your ring election keeps a successor list of size 2. During a rack failure, three consecutive nodes in the ring go down, and the election never completes.\nWhy, and what are your options?",
    fields: [
      {
        label: "Why",
        options: ["The node before the gap can't see past two dead successors", "The highest ID was in the failed rack", "The coordinator message was too large", "Bully messages interfered"],
        answer: "The node before the gap can't see past two dead successors",
      },
      {
        label: "Option",
        options: ["Increase k or keep full membership, accepting more sync work", "Decrease k to 1", "Switch to O(n²) broadcasts every heartbeat", "Remove the coordinator lap"],
        answer: "Increase k or keep full membership, accepting more sync work",
      },
    ],
    explanation:
      "With k successors, k consecutive failures break the ring. A bigger k (up to full membership) survives more, at the cost of keeping more state in sync.",
    lessonAnchor: "skipping-a-dead-neighbour",
  },
  {
    id: "sd-election-partition",
    lectures: [12],
    tags: ["leader-election", "consensus", "split-brain"],
    type: "scenario",
    prompt:
      "A 5-node cluster using the bully algorithm is split by a network partition into {1, 2} and {3, 4, 5}. Leader 5 is on the larger side.\nWhat happens on the {1, 2} side, and what mechanism in Raft prevents it?",
    fields: [
      {
        label: "On the {1, 2} side",
        options: ["Node 2 elects itself: two leaders (split brain)", "No election starts", "Node 1 becomes leader", "The side shuts down safely"],
        answer: "Node 2 elects itself: two leaders (split brain)",
      },
      {
        label: "What Raft uses",
        options: ["A candidate needs votes from a majority (3 of 5)", "Higher IDs always win", "Shorter heartbeats", "A successor list"],
        answer: "A candidate needs votes from a majority (3 of 5)",
      },
    ],
    explanation:
      "To nodes 1 and 2, the silent nodes look dead, so bully happily elects 2. A majority quorum makes that impossible: the 2-node side can never gather 3 votes, so at most one leader exists.",
    lessonAnchor: "why-production-systems-use-neither",
  },
];
