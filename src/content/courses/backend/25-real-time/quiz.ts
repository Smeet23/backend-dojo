import type { Question } from "@/lib/types";

const TRANSPORTS = ["Polling", "Long polling", "Server-Sent Events", "WebSockets"];

export const quiz: Question[] = [
  {
    id: "real-time-polling-cost",
    lectures: [25],
    tags: ["polling", "cost"],
    type: "scenario",
    prompt:
      "Your SaaS task board polls GET /boards/:id/changes every 3 seconds. There are 12,000 boards open at peak. Product wants updates to feel faster, and someone suggests polling every second.",
    fields: [
      { label: "Requests per second at a 1 s interval", options: ["About 4,000", "About 12,000", "About 36,000", "About 1,000"], answer: "About 12,000" },
      { label: "Average delay at a 1 s interval", options: ["0 s", "About 0.5 s", "About 1 s", "About 1.5 s"], answer: "About 0.5 s" },
      { label: "What polling cost scales with", options: ["Number of changes", "Number of open boards", "Size of each board", "Number of instances"], answer: "Number of open boards" },
    ],
    explanation:
      "12,000 boards at one request per second is about 12,000 req/s, each running auth, logging and a DB query, and average delay is half the interval. You pay per watcher whether or not anything changes, which is the core problem with polling at scale.",
    lessonAnchor: "why-polling-gets-expensive",
  },
  {
    id: "real-time-pick-transport",
    lectures: [25],
    tags: ["sse", "websockets", "polling"],
    type: "scenario",
    prompt: "Pick the simplest transport that fits each feature.",
    fields: [
      { label: "Streaming an AI summary of a note, token by token", options: TRANSPORTS, answer: "Server-Sent Events" },
      { label: "Live collaborative whiteboard with cursors from every user", options: TRANSPORTS, answer: "WebSockets" },
      { label: "Internal admin page for 5 ops staff showing job queue length", options: TRANSPORTS, answer: "Polling" },
    ],
    explanation:
      "Token streaming is one-way, server to client, which is exactly what SSE does over plain HTTP. Cursors need frequent messages in both directions, so WebSockets. For a handful of internal users, polling every few seconds is simple and perfectly adequate.",
    lessonAnchor: "choosing-a-transport",
  },
  {
    id: "real-time-sse-resume",
    lectures: [25],
    tags: ["sse"],
    type: "mcq",
    prompt:
      "Your notifications use SSE. A user's train goes through a tunnel for 20 seconds. When signal returns, how does the client get the events it missed, with the least custom code?",
    options: [
      "The browser reconnects automatically and sends Last-Event-ID; the server replays events after it",
      "The client must poll a /missed endpoint after reconnecting",
      "The server keeps writing to the dead connection and TCP delivers it later",
      "SSE can't recover; the user has to refresh",
    ],
    answer: "The browser reconnects automatically and sends Last-Event-ID; the server replays events after it",
    explanation:
      "EventSource reconnects on its own after the retry delay and includes Last-Event-ID with the last id it saw. Your server only needs to send everything after that id. TCP won't hold data for a connection that's already broken.",
    lessonAnchor: "reconnecting-and-resuming",
  },
  {
    id: "real-time-handshake",
    lectures: [25],
    tags: ["websockets", "http"],
    type: "scenario",
    prompt:
      "You're debugging a WebSocket connection to wss://api.taskboard.dev/boards/412/ws in DevTools. Fill in what a successful handshake looks like.",
    fields: [
      { label: "Request method", options: ["GET", "POST", "CONNECT", "OPTIONS"], answer: "GET" },
      { label: "Success status", options: ["200 OK", "101 Switching Protocols", "204 No Content", "426 Upgrade Required"], answer: "101 Switching Protocols" },
      { label: "Purpose of Sec-WebSocket-Accept", options: ["Authenticates the user", "Encrypts the connection", "Proves the server understood the WebSocket request", "Sets the message size limit"], answer: "Proves the server understood the WebSocket request" },
    ],
    explanation:
      "The handshake is a normal GET with Upgrade: websocket, answered by 101. The accept value is SHA-1 of the client key plus a public GUID, so it isn't security; it shows the responder really speaks WebSocket and isn't, say, a cache replaying an old response. Auth still needs a token or cookie.",
    lessonAnchor: "the-handshake",
  },
  {
    id: "real-time-masking",
    lectures: [25],
    tags: ["websockets", "security"],
    type: "mcq",
    prompt:
      "A teammate says \"WebSocket frames from the browser are masked, so we don't need wss:// for task data.\" What's wrong with this?",
    options: [
      "Masking is a reversible XOR with a key sent in the frame; it prevents proxy cache poisoning, not eavesdropping",
      "Nothing; masking is AES encryption",
      "Masking only applies to server-to-client frames",
      "Masking is optional and browsers skip it",
    ],
    answer: "Masking is a reversible XOR with a key sent in the frame; it prevents proxy cache poisoning, not eavesdropping",
    explanation:
      "Each client frame is XORed with a random 4-byte key that travels in clear text right before the payload. It stops attackers from crafting bytes that look like HTTP to a caching proxy. Confidentiality comes from TLS, so use wss://.",
    lessonAnchor: "masking",
  },
  {
    id: "real-time-heartbeat",
    lectures: [25],
    tags: ["websockets", "heartbeats"],
    type: "scenario",
    prompt:
      "Production incident: the WebSocket servers' memory and open-socket counts creep up all week, then reset on each deploy. Many mobile users switch between Wi-Fi and cellular. Servers never ping.",
    fields: [
      { label: "Likely cause", options: ["Dead connections the server thinks are idle", "A memory leak in JSON parsing", "Too many pub/sub topics", "Clients sending oversized frames"], answer: "Dead connections the server thinks are idle" },
      { label: "Fix", options: ["Ping periodically; close sockets with no pong in about 30 s", "Raise ulimit -n", "Enable sticky sessions", "Switch to Redis Streams"], answer: "Ping periodically; close sockets with no pong in about 30 s" },
    ],
    explanation:
      "When a phone changes networks, the old TCP connection often vanishes without a close, and an idle socket looks the same as a dead one. Only a ping that goes unanswered reveals it. Raising the fd limit just lets the leak grow bigger.",
    lessonAnchor: "heartbeats",
  },
  {
    id: "real-time-connection-limits",
    lectures: [25],
    tags: ["scaling", "linux"],
    type: "scenario",
    prompt:
      "You load-test a new WebSocket service from a single test machine.\nRun 1 (Node server, default settings): stalls at about 1,017 connections; server logs \"too many open files\" but passes health checks.\nRun 2 (limit raised): stalls at about 28,000 with \"cannot assign requested address\" on the load generator.",
    fields: [
      { label: "Run 1 limit", options: ["File descriptors (ulimit -n)", "Ephemeral ports", "RAM", "CPU"], answer: "File descriptors (ulimit -n)" },
      { label: "Run 2 limit", options: ["The server's 65,535 ports", "The client's ephemeral port range", "Server RAM", "Load balancer max connections"], answer: "The client's ephemeral port range" },
      { label: "Fix for run 2", options: ["A bigger server", "More client IPs or machines", "Sticky sessions", "Lower the heartbeat interval"], answer: "More client IPs or machines" },
    ],
    explanation:
      "Each socket is a file descriptor, and 1,024 is a common default soft limit. Connections are unique by the 4-tuple, so with one client IP the only variable is the client's source port (about 28,000 in Linux's default range). The server isn't the bottleneck; add client IPs.",
    lessonAnchor: "how-many-connections-fit-on-one-machine",
  },
  {
    id: "real-time-cross-instance",
    lectures: [25],
    tags: ["pubsub", "scaling"],
    type: "scenario",
    prompt:
      "Your live board works perfectly on one instance. After scaling to three, users report teammates' moves sometimes don't show up. Ana's socket is on instance 1, Ben's on instance 2.",
    fields: [
      { label: "Root cause", options: ["Each instance only knows its own connections", "WebSocket frames are being masked", "The load balancer drops upgrades", "The DB is eventually consistent"], answer: "Each instance only knows its own connections" },
      { label: "Fix", options: ["Sticky sessions", "Publish events to a broker all instances subscribe to", "Increase the number of instances", "Switch to long polling"], answer: "Publish events to a broker all instances subscribe to" },
    ],
    explanation:
      "A persistent connection is state living in one process. Sticky sessions keep Ana on instance 1 and Ben on instance 2, which doesn't help instance 1 reach Ben. Pub/sub lets the instance that receives a change differ from the one that delivers it.",
    lessonAnchor: "connections-are-state",
  },
  {
    id: "real-time-delivery-guarantee",
    lectures: [25],
    tags: ["pubsub", "delivery"],
    type: "mcq",
    prompt:
      "You fan out board events with Redis Pub/Sub. After every deploy, a few users miss task moves that happened during the restart. Which statement is accurate?",
    options: [
      "Redis Pub/Sub is at-most-once; use Redis Streams, Kafka or a queue (plus catch-up) for at-least-once",
      "Redis Pub/Sub queues messages for 24 hours; the instances just need to reconnect faster",
      "This is a CORS issue on the WebSocket endpoint",
      "Increase the Redis maxmemory setting",
    ],
    answer: "Redis Pub/Sub is at-most-once; use Redis Streams, Kafka or a queue (plus catch-up) for at-least-once",
    explanation:
      "Pub/Sub delivers only to subscribers connected at the moment of publishing; anything published while an instance restarts is gone. Durable logs with acknowledgements, or sequence-number catch-up from a store, close that gap.",
    lessonAnchor: "delivery-guarantees",
  },
  {
    id: "real-time-catch-up-order",
    lectures: [25],
    tags: ["catch-up", "reconnect"],
    type: "order",
    prompt: "Order the steps of a sequence-number catch-up after a client's WebSocket drops.",
    steps: [
      "Server tags every board event with an increasing sequence number",
      "Client stores the last sequence number it processed",
      "Connection drops and the client reconnects",
      "Client sends its last seen sequence number",
      "Server sends every event after that number",
      "Client continues receiving live events",
    ],
    explanation:
      "Sequence numbers turn \"what did I miss?\" into a simple range query. It's the same idea as SSE's Last-Event-ID, and it works regardless of which instance the client reconnects to.",
    lessonAnchor: "catching-up-after-disconnects",
  },
  {
    id: "real-time-reconnect-storm",
    lectures: [25],
    tags: ["scaling", "reliability"],
    type: "scenario",
    prompt:
      "Production incident: an instance holding 50,000 WebSocket connections crashes. Within a second all 50,000 clients reconnect and each fetches its full initial state. The database falls over, which takes down another instance.",
    fields: [
      { label: "Name of this failure", options: ["Reconnect storm", "Hot partition", "Fan-out", "Head-of-line blocking"], answer: "Reconnect storm" },
      { label: "Client-side fix", options: ["Reconnect immediately in a tight loop", "Randomized backoff (jitter) on reconnect", "Disable heartbeats", "Open two sockets per client"], answer: "Randomized backoff (jitter) on reconnect" },
      { label: "Server-side fix", options: ["Serve initial state from a cache near the edge", "Make the DB query uncached", "Turn on sticky sessions", "Use Redis Pub/Sub"], answer: "Serve initial state from a cache near the edge" },
    ],
    explanation:
      "Everyone reconnecting at once makes connecting the most expensive moment. Jitter spreads reconnects over time, and an edge cache for initial state keeps the storm away from core services. Sticky sessions don't help when the instance itself is gone.",
    lessonAnchor: "reconnect-storms",
  },
];
