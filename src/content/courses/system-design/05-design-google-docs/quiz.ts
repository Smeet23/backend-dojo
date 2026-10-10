import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "sd-gdocs-transform-insert-delete",
    lectures: [5],
    tags: ["ot", "conflicts"],
    type: "scenario",
    prompt:
      "The document is \"abcde\" at v0. Alice sends insert \"X\" at position 1 (base v0). Bob sends delete 1 character at position 3, meaning the \"d\" (base v0). Alice's operation reaches the server first and becomes v1.\nHow must the server transform Bob's operation, and what is the final text?",
    fields: [
      { label: "Bob's transformed op", options: ["delete at 2", "delete at 3", "delete at 4", "no-op"], answer: "delete at 4" },
      { label: "Final text at v2", options: ["aXbce", "aXbde", "aXbcd", "abce"], answer: "aXbce" },
    ],
    explanation:
      "Alice's insert landed before Bob's target, so Bob's delete shifts right by one: delete at 4 on \"aXbcde\" removes the d, giving \"aXbce\". Applying \"delete at 3\" unchanged would remove the c, which Bob never asked for.",
    lessonAnchor: "transform-rules",
  },
  {
    id: "sd-gdocs-range-delete-insert",
    lectures: [5],
    tags: ["ot", "conflicts"],
    type: "mcq",
    prompt:
      "\"abcdefg\" at v0. Alice deletes 3 characters starting at position 2 (\"cde\") and is sequenced first. Bob, also on v0, inserted \"X\" at position 4 (between \"d\" and \"e\"). What should Bob's transformed operation be?",
    options: ["insert X at 2", "insert X at 1", "insert X at 4", "drop Bob's insert, the region is gone"],
    answer: "insert X at 2",
    explanation:
      "Bob's position falls inside the deleted range, so it snaps to the start of that range: position 2, giving \"abXfg\". Dropping the insert would silently lose Bob's work, and leaving it at 4 would put X at the very end, after g, which is not where he typed.",
    lessonAnchor: "transform-rules",
  },
  {
    id: "sd-gdocs-tie-break",
    lectures: [5],
    tags: ["ot"],
    type: "mcq",
    prompt:
      "In testing, two clients that both insert at the same position at the same version sometimes end up showing \"XY\" on one screen and \"YX\" on the other. Everything else converges. What is most likely missing?",
    options: [
      "A deterministic tie-break rule that every participant applies the same way",
      "Wall-clock timestamps on each operation",
      "A larger snapshot interval",
      "Presence throttling",
    ],
    answer: "A deterministic tie-break rule that every participant applies the same way",
    explanation:
      "Equal positions are ambiguous; the server and clients must break the tie the same way (e.g. first-sequenced wins, or lower client ID wins). Timestamps from different machines aren't reliable enough to order anything, and the other options don't affect transform results.",
    lessonAnchor: "tie-breaking",
  },
  {
    id: "sd-gdocs-optimistic-typing",
    lectures: [5],
    tags: ["client", "latency"],
    type: "scenario",
    prompt:
      "Users on mobile networks (300 ms RTT) complain that typing feels sticky: each character appears a moment after they press the key. Today the client sends each keystroke and only renders it after the server's broadcast comes back.",
    fields: [
      { label: "Change", options: ["Apply edits locally at once and keep them in a pending queue", "Lock the paragraph while the user types", "Send the whole document every second", "Switch the WebSocket to HTTP polling"], answer: "Apply edits locally at once and keep them in a pending queue" },
      { label: "What the client must now also do", options: ["Transform incoming remote ops past its own unacknowledged ops", "Re-download the document after every ack", "Assign global version numbers itself", "Nothing else changes"], answer: "Transform incoming remote ops past its own unacknowledged ops" },
    ],
    explanation:
      "Optimistic local apply removes the round trip from the typing path. But the local text now contains edits the server hasn't sequenced yet, so remote operations must be transformed past those pending edits before being applied, or positions will be wrong.",
    lessonAnchor: "the-client-side",
  },
  {
    id: "sd-gdocs-cursor",
    lectures: [5],
    tags: ["presence", "cursors"],
    type: "scenario",
    prompt:
      "Your cursor is at position 20. Two remote operations arrive, one after another:\n1. Someone inserts 5 characters at position 3.\n2. Someone deletes 10 characters starting at position 18 (on the document after op 1).\nWhere is your cursor after each?",
    fields: [
      { label: "After op 1", options: ["20", "25", "15", "3"], answer: "25" },
      { label: "After op 2", options: ["25", "15", "18", "28"], answer: "18" },
    ],
    explanation:
      "The insert is before the cursor, so it shifts right by 5 to 25. The delete covers positions 18 to 27, which contains 25, so the cursor moves to the start of the deleted range, 18. Cursors use the same transform rules as operations.",
    lessonAnchor: "cursors-and-presence",
  },
  {
    id: "sd-gdocs-presence-storage",
    lectures: [5],
    tags: ["presence", "architecture"],
    type: "mcq",
    prompt:
      "An engineer proposes writing every cursor movement into the operations table so that presence survives server restarts. What is the best response?",
    options: [
      "Keep presence ephemeral: in memory or Redis with a TTL, throttled, never in the op log",
      "Good idea, but use the snapshots table instead",
      "Good idea, as long as cursor moves get version numbers",
      "Store presence in Kafka with infinite retention",
    ],
    answer: "Keep presence ephemeral: in memory or Redis with a TTL, throttled, never in the op log",
    explanation:
      "Cursor positions are high-frequency, short-lived and replaced by the next update, so persisting them wastes write capacity and pollutes history. After a restart, clients simply resend their current cursor.",
    lessonAnchor: "cursors-and-presence",
  },
  {
    id: "sd-gdocs-routing",
    lectures: [5],
    tags: ["architecture", "routing"],
    type: "scenario",
    prompt:
      "Your WebSocket gateway round-robins each new connection across 50 collaboration servers. Users editing the same document report edits appearing in different orders and documents slowly diverging.",
    fields: [
      { label: "Root cause", options: ["Different servers are sequencing the same document independently", "WebSockets reorder messages", "Snapshots are too frequent", "Kafka is down"], answer: "Different servers are sequencing the same document independently" },
      { label: "Fix", options: ["Route by hash(docId) so one server owns each document", "Add sticky sessions by user ID", "Increase the number of servers", "Use UDP for operations"], answer: "Route by hash(docId) so one server owns each document" },
    ],
    explanation:
      "OT relies on one authoritative order per document. If two servers each assign versions, there are two histories. Routing by document ID gives each document a single sequencer; sticky-by-user still splits a document's editors across servers.",
    lessonAnchor: "component-by-component",
  },
  {
    id: "sd-gdocs-recovery",
    lectures: [5],
    tags: ["snapshots", "failover"],
    type: "order",
    prompt: "A collaboration server dies. Put the recovery of one of its documents in order.",
    steps: [
      "Clients' WebSockets drop and they reconnect; the router picks a new owner for the document",
      "The new owner acquires the document's lease so no other server can sequence it",
      "It loads the latest snapshot from storage",
      "It replays operations logged after the snapshot to reach the last durable version",
      "Clients resend pending ops; duplicates (same clientId and seq) are re-acked, the rest transformed and applied",
    ],
    explanation:
      "Ownership comes first so two servers never sequence the same document. State is rebuilt from snapshot plus log tail, and only then are clients' unacknowledged operations accepted, deduplicated by clientId and seq.",
    lessonAnchor: "failover",
  },
  {
    id: "sd-gdocs-ot-vs-crdt",
    lectures: [5],
    tags: ["crdt", "ot"],
    type: "scenario",
    prompt:
      "Pick a concurrency approach for two products.\n• A: a hosted company wiki editor; users are always online and every document has a server.\n• B: a field-notes app used on oil rigs, offline for days, syncing peer-to-peer between tablets when they meet.",
    fields: [
      { label: "Product A", options: ["Operational transformation with a central server", "CRDT", "Last writer wins", "Paragraph locking"], answer: "Operational transformation with a central server" },
      { label: "Product B", options: ["Operational transformation with a central server", "CRDT", "Last writer wins", "Paragraph locking"], answer: "CRDT" },
    ],
    explanation:
      "With a server always present, OT's central sequencing is simple and has no per-character metadata. Long offline periods and peer-to-peer sync with no central orderer are exactly what CRDTs handle, since their operations commute in any order. Last writer wins would discard work in both.",
    lessonAnchor: "crdts-as-an-alternative",
  },
  {
    id: "sd-gdocs-estimate",
    lectures: [5],
    tags: ["estimation"],
    type: "mcq",
    prompt:
      "You estimate 2 million peak concurrent editors, each producing 4 operations per second, with operations averaging 60 bytes. Roughly what incoming bandwidth must the collaboration tier handle?",
    options: ["About 480 MB/s", "About 48 MB/s", "About 4.8 GB/s", "About 8 MB/s"],
    answer: "About 480 MB/s",
    explanation:
      "2M × 4 = 8M ops/s; 8M × 60 B = 480 MB/s. 48 MB/s drops a factor of ten, and 8 MB/s forgets to multiply by the operation size.",
    lessonAnchor: "scale-estimates",
  },
];
