import type { Question } from "@/lib/types";

const TRANSPORTS = ["Short polling", "Long polling", "Server-Sent Events", "WebSockets"];

export const quiz: Question[] = [
  {
    id: "sd-push-pick-transport",
    lectures: [11],
    tags: ["realtime", "sse", "websockets"],
    type: "scenario",
    prompt:
      "You're designing three features for a food-delivery app:\n• A: the customer's order tracker shows status changes (\"preparing\", \"picked up\") within a second or two.\n• B: in-app chat between customer and rider, with typing indicators.\n• C: an admin CSV export that takes 2–5 minutes; the page should say when it's ready.\nPick a transport for each.",
    fields: [
      { label: "A: order tracker", options: TRANSPORTS, answer: "Server-Sent Events" },
      { label: "B: chat with typing indicators", options: TRANSPORTS, answer: "WebSockets" },
      { label: "C: slow export job", options: TRANSPORTS, answer: "Short polling" },
    ],
    explanation:
      "The tracker is one-way and needs to be fresh, which is exactly SSE. Chat sends frequent small messages in both directions, so WebSockets. A job that takes minutes can be checked every 10 seconds with plain polling; a persistent connection would be overkill.",
    lessonAnchor: "choosing-in-practice",
  },
  {
    id: "sd-push-polling-load",
    lectures: [11],
    tags: ["realtime", "polling", "estimation"],
    type: "scenario",
    prompt:
      "200,000 users keep a dashboard open. It short-polls GET /metrics every 2 seconds, but the numbers only change about once a minute. The API tier is struggling.\nWhat's the request rate, what fraction of responses carry new data, and what's the best fix?",
    fields: [
      { label: "Requests per second", options: ["3,300", "20,000", "100,000", "400,000"], answer: "100,000" },
      { label: "Responses with new data", options: ["About 3%", "About 30%", "About 50%", "Nearly all"], answer: "About 3%" },
      {
        label: "Fix",
        options: ["Poll every 500 ms instead", "Switch to SSE and push only on change", "Switch to WebSockets so clients can send acks", "Add more API servers"],
        answer: "Switch to SSE and push only on change",
      },
    ],
    explanation:
      "200,000 ÷ 2 s = 100,000 requests per second, and with one change per 60 s only about 1 poll in 30 finds anything new. Pushing on change over SSE removes the empty requests entirely. WebSockets would also work, but the traffic is one-way, so the simpler SSE fits better.",
    lessonAnchor: "short-polling",
  },
  {
    id: "sd-push-long-poll-gap",
    lectures: [11],
    tags: ["realtime", "long-polling"],
    type: "mcq",
    prompt:
      "Your long-polling chat sometimes loses messages. Logs show they arrive in the half-second between the server answering one poll and the client sending the next. What's the right fix?",
    options: [
      "Have the client send a cursor of the last message it saw (e.g. ?after=1041) and return everything newer",
      "Shorten the server timeout from 30 s to 5 s",
      "Have the server retry delivery until the client acknowledges",
      "Switch the endpoint from GET to POST",
    ],
    answer: "Have the client send a cursor of the last message it saw (e.g. ?after=1041) and return everything newer",
    explanation:
      "There's always a moment with no request parked. A cursor makes the next request pick up whatever arrived in that gap. A shorter timeout just creates more gaps, and the server can't push to a client with no open request.",
    lessonAnchor: "long-polling",
  },
  {
    id: "sd-push-sse-tabs",
    lectures: [11],
    tags: ["realtime", "sse", "http"],
    type: "scenario",
    prompt:
      "Users report that your SSE-powered notification bell works, but when they open the app in more than six tabs, new tabs hang forever on load. The site is served over HTTP/1.1.\nWhat's the cause and the fix?",
    fields: [
      {
        label: "Cause",
        options: [
          "Each SSE stream holds one of the browser's ~6 HTTP/1.1 connections per origin",
          "SSE can only send text, so the page HTML is blocked",
          "The server's Cache-Control: no-cache disables keep-alive",
          "EventSource reconnects in a loop",
        ],
        answer: "Each SSE stream holds one of the browser's ~6 HTTP/1.1 connections per origin",
      },
      {
        label: "Fix",
        options: ["Serve over HTTP/2 so streams share one connection", "Switch to short polling every 100 ms", "Remove Content-Type: text/event-stream", "Send events as binary"],
        answer: "Serve over HTTP/2 so streams share one connection",
      },
    ],
    explanation:
      "Browsers cap HTTP/1.1 connections per origin at about six, and an SSE stream never releases its slot. HTTP/2 multiplexes many streams over one connection, so the limit disappears. Fast polling would trade a hang for a flood of requests.",
    lessonAnchor: "server-sent-events",
  },
  {
    id: "sd-push-ws-handshake-order",
    lectures: [11],
    tags: ["realtime", "websockets", "http"],
    type: "order",
    prompt: "Put the life of a WebSocket connection in order.",
    steps: [
      "Client sends GET /chat with Upgrade: websocket and Sec-WebSocket-Key",
      "Server replies 101 Switching Protocols with Sec-WebSocket-Accept",
      "Client and server exchange text or binary frames, with no HTTP headers",
      "Either side sends periodic ping frames to detect a dead peer",
      "One side sends a close frame and the TCP connection ends",
    ],
    explanation:
      "The connection starts as a normal HTTP request asking to upgrade; 101 confirms the switch. After that only lightweight frames flow, heartbeats keep it honest, and either party may close it.",
    lessonAnchor: "the-upgrade-handshake",
  },
  {
    id: "sd-push-ws-scale",
    lectures: [11],
    tags: ["realtime", "websockets", "scaling"],
    type: "scenario",
    prompt:
      "Your chat service grows from one WebSocket server to ten behind a load balancer. Now users on different servers can't see each other's messages, and every deploy causes a burst of \"message missing\" complaints.\nWhat do you add?",
    fields: [
      {
        label: "Cross-server delivery",
        options: ["A pub/sub backplane (e.g. Redis Pub/Sub) that every server subscribes to", "Round-robin load balancing", "A longer idle timeout on the load balancer", "Switch to SSE"],
        answer: "A pub/sub backplane (e.g. Redis Pub/Sub) that every server subscribes to",
      },
      {
        label: "Surviving reconnects",
        options: ["Sequence numbers, with clients resuming from the last one they saw", "Rely on TCP's in-order delivery", "Use binary frames", "Disable deploys during peak hours"],
        answer: "Sequence numbers, with clients resuming from the last one they saw",
      },
    ],
    explanation:
      "Each WebSocket is pinned to one server, so messages must be fanned out through a shared channel. TCP only guarantees delivery within one connection; once a deploy kills the socket, the client needs a sequence number to ask for what it missed.",
    lessonAnchor: "the-hard-parts",
  },
];
