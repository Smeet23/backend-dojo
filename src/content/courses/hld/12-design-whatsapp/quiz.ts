import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-whatsapp-transport",
    lectures: [12],
    tags: ["websockets", "realtime"],
    type: "mcq",
    prompt:
      "An early prototype polls GET /messages every 3 seconds. With 50 million online users, servers are overloaded and messages take seconds to show up. What should clients use instead?",
    options: [
      "A persistent WebSocket per device, with periodic heartbeats",
      "Poll every 1 second instead",
      "Server-Sent Events for both sending and receiving",
      "Email-style SMTP delivery",
    ],
    answer: "A persistent WebSocket per device, with periodic heartbeats",
    explanation:
      "Chat is two-way and push-driven. A WebSocket lets the server push the instant a message arrives and lets the client send on the same connection. Faster polling multiplies the wasted load; SSE is one-way only.",
    lessonAnchor: "why-websockets",
  },
  {
    id: "hld-whatsapp-ack-order",
    lectures: [12],
    tags: ["reliability", "message-flow"],
    type: "order",
    prompt: "Order what happens when Alice sends a message to Bob, who is online.",
    steps: [
      "Alice's app assigns a client message id and sends it over her WebSocket",
      "Chat service assigns a sequence number and writes the message durably",
      "Server acks Alice (one grey tick)",
      "Session registry lookup finds Bob's gateway",
      "Bob's gateway pushes the message; Bob's app acks delivery",
      "Delivered receipt reaches Alice (two grey ticks)",
    ],
    explanation:
      "Persisting before acking is what makes one tick a durable promise. Routing comes next, and the delivered receipt only follows Bob's device ack.",
    lessonAnchor: "one-to-one-message-flow",
  },
  {
    id: "hld-whatsapp-lost-message",
    lectures: [12],
    tags: ["reliability"],
    type: "scenario",
    prompt:
      "Users report that occasionally a message shows one grey tick but the recipient never gets it. Logs show a chat-service pod crashed between acking the sender and writing to the message store.\nWhat's the bug, and the fix?",
    fields: [
      { label: "Bug", options: ["Ack sent before durable persistence", "Missing push notification", "Wrong WebSocket subprotocol", "Read receipts disabled"], answer: "Ack sent before durable persistence" },
      { label: "Fix", options: ["Write to the message store first; ack only after it succeeds", "Ack twice to be safe", "Keep messages only in gateway memory", "Retry the push notification"], answer: "Write to the message store first; ack only after it succeeds" },
    ],
    explanation:
      "The sent tick promises durability. If the ack can precede the write, a crash in between loses a message the sender thinks is safe. Persist, then ack.",
    lessonAnchor: "one-to-one-message-flow",
  },
  {
    id: "hld-whatsapp-duplicates",
    lectures: [12],
    tags: ["idempotency", "retries"],
    type: "scenario",
    prompt:
      "On a train, Alice's phone sends a message, the server stores it, but the ack is lost when the connection drops. Her app resends on reconnect, and Bob sees the message twice.\nWhat prevents this?",
    fields: [
      {
        label: "Mechanism",
        options: [
          "Resend with the same client message id; server dedups on (sender, client_msg_id)",
          "Never retry sends",
          "Generate a new UUID for every retry",
          "Use a global wall clock to detect duplicates",
        ],
        answer: "Resend with the same client message id; server dedups on (sender, client_msg_id)",
      },
      { label: "Resulting guarantee", options: ["Effectively-once (at-least-once + dedup)", "At-most-once", "Exactly-once over TCP alone", "Best effort"], answer: "Effectively-once (at-least-once + dedup)" },
    ],
    explanation:
      "Retries are required on mobile networks, so make them idempotent: the same id lets the server recognise the retry and just re-ack. A new UUID per retry is exactly what creates duplicates.",
    lessonAnchor: "message-ids-retries-and-ordering",
  },
  {
    id: "hld-whatsapp-ordering",
    lectures: [12],
    tags: ["ordering"],
    type: "mcq",
    prompt:
      "Bob's phone clock is 4 minutes fast. In his chat with Alice, his replies appear above the messages they reply to. How should ordering work?",
    options: [
      "Order by a server-assigned per-conversation sequence number; use device timestamps for display only",
      "Order by the sender's device timestamp",
      "Order by the time each message reached the recipient",
      "Use one global sequence number for all chats worldwide",
    ],
    answer: "Order by a server-assigned per-conversation sequence number; use device timestamps for display only",
    explanation:
      "Phone clocks drift, so they can't define order. Ordering only needs to hold within a conversation, so a per-conversation sequence is enough; a single global sequence would be a needless bottleneck.",
    lessonAnchor: "message-ids-retries-and-ordering",
  },
  {
    id: "hld-whatsapp-offline",
    lectures: [12],
    tags: ["offline", "push"],
    type: "scenario",
    prompt:
      "Bob's phone has been off for two days. Alice sent him 30 messages.\nWhere do they wait, how is Bob alerted, and how does he catch up?",
    fields: [
      { label: "Messages wait in", options: ["Bob's inbox in the message store", "Alice's phone until Bob is online", "The gateway's memory", "The CDN"], answer: "Bob's inbox in the message store" },
      { label: "Alert", options: ["Push notification via APNs/FCM", "SMS from the gateway", "An email", "Nothing; he must open the app"], answer: "Push notification via APNs/FCM" },
      { label: "Catch-up", options: ["App sends its last sequence number; server streams everything after it in order", "Server resends all messages ever sent to Bob", "Alice's app resends them", "Bob polls every minute"], answer: "App sends its last sequence number; server streams everything after it in order" },
    ],
    explanation:
      "Messages are durable in the recipient's inbox from the moment they're sent. A push notification wakes the phone; on reconnect a cursor-based sync delivers exactly the missing messages in order, after which they're acked and removed.",
    lessonAnchor: "offline-storage-and-delivery",
  },
  {
    id: "hld-whatsapp-group-fanout",
    lectures: [12],
    tags: ["groups", "fan-out"],
    type: "scenario",
    prompt: "Pick the delivery strategy for each.",
    fields: [
      { label: "A family group of 25 members", options: ["Fan-out on write to each member's inbox", "Fan-out on read: members pull from the channel"], answer: "Fan-out on write to each member's inbox" },
      { label: "A news broadcast channel with 8 million followers", options: ["Fan-out on write to each member's inbox", "Fan-out on read: members pull from the channel"], answer: "Fan-out on read: members pull from the channel" },
    ],
    explanation:
      "Bounded groups make per-member inbox writes affordable and give each member a simple ordered inbox. Writing 8 million inbox entries per post is wasteful, so huge audiences store once and let clients pull.",
    lessonAnchor: "group-chat",
  },
  {
    id: "hld-whatsapp-presence",
    lectures: [12],
    tags: ["presence"],
    type: "mcq",
    prompt:
      "Presence updates are 60% of all traffic: every connect, disconnect and reconnect is pushed to all of a user's contacts. Which change cuts this most without hurting the experience?",
    options: [
      "Only send presence to users currently viewing that person's chat, and debounce quick disconnect/reconnect flaps",
      "Store presence in the durable message store with full replication",
      "Push presence to contacts every second instead of on change",
      "Remove heartbeats",
    ],
    answer: "Only send presence to users currently viewing that person's chat, and debounce quick disconnect/reconnect flaps",
    explanation:
      "Presence is only visible on an open chat screen, so subscribing on open cuts fan-out massively, and debouncing removes flapping. Presence is best effort, so making it durable adds cost for nothing; removing heartbeats would break offline detection.",
    lessonAnchor: "presence-and-last-seen",
  },
  {
    id: "hld-whatsapp-media",
    lectures: [12],
    tags: ["media", "object-storage"],
    type: "scenario",
    prompt:
      "Users send 20 MB videos. Sending them through the WebSocket and message store is saturating gateways.\nHow should media flow, and what does the chat message carry?",
    fields: [
      { label: "Media path", options: ["Encrypt on device, upload over HTTPS to object storage (pre-signed URL); download via CDN", "Split into 1 KB WebSocket frames", "Store as blobs in the inbox table", "Send peer-to-peer only"], answer: "Encrypt on device, upload over HTTPS to object storage (pre-signed URL); download via CDN" },
      { label: "Message carries", options: ["Media URL, decryption key, hash and a thumbnail", "The full video bytes", "Only the file name", "The server's private key"], answer: "Media URL, decryption key, hash and a thumbnail" },
    ],
    explanation:
      "Large blobs travel out of band to storage built for them, keeping the chat path light. The E2EE chat message carries the reference plus the key and hash, so only the recipient can decrypt and verify the blob.",
    lessonAnchor: "media-messages",
  },
  {
    id: "hld-whatsapp-e2ee",
    lectures: [12],
    tags: ["encryption", "privacy"],
    type: "mcq",
    prompt:
      "Product asks for server-side full-text search across all of a user's chat history. Messages are end-to-end encrypted with the Signal Protocol. What's the honest answer?",
    options: [
      "The server only holds ciphertext, so search must run on the device over its local decrypted history",
      "Decrypt on the server using the identity keys it stores",
      "Index the ciphertext directly; it's searchable",
      "Ask the key server for the session keys",
    ],
    answer: "The server only holds ciphertext, so search must run on the device over its local decrypted history",
    explanation:
      "With E2EE, private keys never leave devices; the key server holds only public keys. Content features like search and previews move to the client. The server still sees metadata such as who talks to whom and when.",
    lessonAnchor: "end-to-end-encryption",
  },
];
