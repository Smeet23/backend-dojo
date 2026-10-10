import type { Question } from "@/lib/types";

const PROTOCOLS = ["REST over HTTPS", "gRPC", "WebSocket", "Server-Sent Events", "WebRTC", "Short polling", "Raw UDP"];

export const quiz: Question[] = [
  {
    id: "hld-net-collab-editor",
    lectures: [2],
    tags: ["protocols", "real-time"],
    type: "scenario",
    prompt:
      "You're building a browser-based whiteboard. Every user's cursor position and strokes must reach the others within about 100 ms, and users draw constantly. Pick the client connection, and what the servers need so that users connected to different servers see each other.",
    fields: [
      { label: "Client connection", options: PROTOCOLS, answer: "WebSocket" },
      {
        label: "Server-side addition",
        options: ["A pub-sub backplane between servers", "Sticky sessions only", "A CDN in front of the servers", "A bigger database"],
        answer: "A pub-sub backplane between servers",
      },
    ],
    explanation:
      "Both sides send frequently, so a full-duplex WebSocket fits; SSE only pushes one way. Because each user is attached to one server, a message must be relayed to the servers holding the other users' connections, which is what a pub-sub backplane does. Sticky sessions alone don't connect users on different servers.",
    lessonAnchor: "scaling-websockets",
  },
  {
    id: "hld-net-llm-stream",
    lectures: [2],
    tags: ["protocols", "real-time"],
    type: "mcq",
    prompt:
      "A chat assistant's web UI sends a prompt with a normal POST and then needs to display the answer token by token as the model generates it. Nothing else flows from the browser during generation. Which is the simplest fit for streaming the answer?",
    options: ["Server-Sent Events", "WebSocket", "WebRTC data channel", "Short polling every 200 ms"],
    answer: "Server-Sent Events",
    explanation:
      "The data flows one way, server to client, which is exactly what SSE does over plain HTTP, with reconnection built in. A WebSocket would work but adds a stateful bidirectional channel you don't need; polling adds latency and wasted requests.",
    lessonAnchor: "real-time-updates",
  },
  {
    id: "hld-net-game",
    lectures: [2],
    tags: ["tcp", "udp"],
    type: "scenario",
    prompt:
      "A native multiplayer shooter sends each player's position 30 times a second. On a lossy network, testers see everyone freeze for a moment and then jump forward. The game currently uses TCP.",
    fields: [
      {
        label: "Cause",
        options: [
          "A lost segment holds back all later updates until it's retransmitted",
          "TCP's handshake runs before each update",
          "TCP compresses the packets too much",
          "The server is out of CPU",
        ],
        answer: "A lost segment holds back all later updates until it's retransmitted",
      },
      { label: "Transport for position updates", options: ["TCP with a bigger buffer", "UDP", "HTTP/2", "SSE"], answer: "UDP" },
    ],
    explanation:
      "TCP delivers bytes strictly in order, so newer positions wait behind a lost old one, then arrive in a burst. Over UDP the newest update is used as soon as it arrives and stale ones are just dropped. TCP's handshake happens once per connection, not per message.",
    lessonAnchor: "udp",
  },
  {
    id: "hld-net-h2-mobile",
    lectures: [2],
    tags: ["http", "quic"],
    type: "scenario",
    prompt:
      "Your API moved from HTTP/1.1 to HTTP/2 and desktop latency dropped. But on mobile networks with 2% packet loss, p99 latency got worse. Users also lose in-flight requests when their phone switches from Wi-Fi to 4G.",
    fields: [
      {
        label: "Why HTTP/2 hurts here",
        options: [
          "All streams share one TCP connection, so one loss stalls them all",
          "HPACK makes headers larger",
          "HTTP/2 disables keep-alive",
          "HTTP/2 can't carry JSON",
        ],
        answer: "All streams share one TCP connection, so one loss stalls them all",
      },
      { label: "Upgrade", options: ["HTTP/3 over QUIC", "Back to HTTP/1.1 with domain sharding", "WebSockets for every request", "gRPC-Web"], answer: "HTTP/3 over QUIC" },
    ],
    explanation:
      "HTTP/2 removed HTTP-level head-of-line blocking but not TCP's: one lost packet delays every multiplexed stream. QUIC orders data per stream and identifies connections by an id, so it also survives a network change. Going back to HTTP/1.1 trades one problem for handshake costs and the 6-connection limit.",
    lessonAnchor: "http3-and-quic",
  },
  {
    id: "hld-net-grpc-lb",
    lectures: [2],
    tags: ["grpc", "load-balancing"],
    type: "scenario",
    prompt:
      "You switch internal calls from REST to gRPC. You scale the inventory service from 4 to 12 pods, but dashboards show 4 pods busy and 8 nearly idle. The services sit behind an L4 (TCP) load balancer.",
    fields: [
      {
        label: "Cause",
        options: [
          "Each client's long-lived HTTP/2 connection is pinned to one pod",
          "Protobuf is too slow to parse",
          "gRPC doesn't support more than 4 servers",
          "The new pods failed health checks",
        ],
        answer: "Each client's long-lived HTTP/2 connection is pinned to one pod",
      },
      {
        label: "Fix",
        options: ["Balance per request at L7 (proxy, mesh or client-side)", "Switch back to HTTP/1.1", "Increase the TCP timeout", "Add more L4 load balancers"],
        answer: "Balance per request at L7 (proxy, mesh or client-side)",
      },
    ],
    explanation:
      "gRPC multiplexes many calls over one HTTP/2 connection, and an L4 balancer only chooses a backend when a connection opens. An L7 proxy, service mesh sidecar or client-side balancer spreads individual calls. More L4 balancers would pin connections in exactly the same way.",
    lessonAnchor: "grpc",
  },
  {
    id: "hld-net-video-call",
    lectures: [2],
    tags: ["webrtc", "p2p"],
    type: "scenario",
    prompt:
      "You're adding browser video calls. 1:1 calls work in testing, but 15% of users on corporate networks can't connect, and a new 12-person meeting feature makes laptops' upload bandwidth max out.",
    fields: [
      { label: "For the corporate users", options: ["Add a TURN relay", "Add more STUN servers", "Switch media to TCP WebSockets", "Use HTTP/3"], answer: "Add a TURN relay" },
      { label: "For 12-person meetings", options: ["Route through an SFU", "Full mesh P2P", "Lower the frame rate only", "Send video over SSE"], answer: "Route through an SFU" },
    ],
    explanation:
      "STUN only discovers a public address; when firewalls block direct paths, TURN relays the media. In a full mesh each sender uploads 11 copies of its video; an SFU takes one upload and forwards it to everyone.",
    lessonAnchor: "webrtc",
  },
  {
    id: "hld-net-public-vs-internal",
    lectures: [2],
    tags: ["protocols", "api"],
    type: "scenario",
    prompt:
      "A payments platform exposes an API to thousands of merchants written in every language, and internally has 40 services calling each other at high QPS with strict schemas and deadlines.",
    fields: [
      { label: "Merchant-facing API", options: PROTOCOLS, answer: "REST over HTTPS" },
      { label: "Internal service calls", options: PROTOCOLS, answer: "gRPC" },
    ],
    explanation:
      "External developers need something every language, proxy and debugging tool understands, so REST over HTTPS. Inside, gRPC's generated clients, compact protobuf, streaming and deadline propagation pay off and you control both ends.",
    lessonAnchor: "choosing-a-protocol",
  },
  {
    id: "hld-net-dns-udp",
    lectures: [2],
    tags: ["udp", "dns"],
    type: "mcq",
    prompt: "Why do DNS lookups normally use UDP rather than TCP?",
    options: [
      "A single small request and response doesn't justify a handshake round trip; a lost query is simply retried",
      "UDP guarantees the answer arrives in order",
      "UDP is encrypted by default",
      "TCP cannot carry packets smaller than 1 KB",
    ],
    answer: "A single small request and response doesn't justify a handshake round trip; a lost query is simply retried",
    explanation:
      "TCP's handshake would roughly double the latency of a one-packet exchange, and the client can retry on loss itself. DNS does fall back to TCP for large responses and zone transfers. UDP guarantees neither order nor encryption.",
    lessonAnchor: "udp",
  },
  {
    id: "hld-net-p2p-or-cs",
    lectures: [2],
    tags: ["p2p", "architecture"],
    type: "scenario",
    prompt:
      "A game studio ships 60 GB patches to 5 million players on release day and wants to cut CDN bandwidth costs. Separately, player inventories and purchases must never be tampered with.",
    fields: [
      { label: "Patch distribution", options: ["Peer-assisted P2P (with the CDN as fallback)", "Client-server only, bigger origin", "WebSocket broadcast", "SSE stream"], answer: "Peer-assisted P2P (with the CDN as fallback)" },
      { label: "Inventory and purchases", options: ["Client-server with the server as the source of truth", "Peer-to-peer consensus between players", "Stored on the client", "WebRTC data channel between players"], answer: "Client-server with the server as the source of truth" },
    ],
    explanation:
      "Large identical files are where P2P shines: every downloader also uploads, so capacity grows with demand (patch chunks are verified by hash). Data that needs authority and protection from cheating belongs on a server clients can't control.",
    lessonAnchor: "communication-models",
  },
  {
    id: "hld-net-ws-handshake",
    lectures: [2],
    tags: ["websocket", "http"],
    type: "order",
    prompt: "Order what happens when a browser opens a WebSocket to wss://chat.example.com.",
    steps: [
      "TCP handshake with the server",
      "TLS handshake",
      "Browser sends an HTTP GET with Upgrade: websocket",
      "Server replies 101 Switching Protocols",
      "Both sides exchange WebSocket frames on the same connection",
    ],
    explanation:
      "A WebSocket starts life as an ordinary HTTPS request on a TCP connection secured by TLS. The 101 response switches the protocol, and from then on the connection carries frames in both directions.",
    lessonAnchor: "real-time-updates",
  },
];
