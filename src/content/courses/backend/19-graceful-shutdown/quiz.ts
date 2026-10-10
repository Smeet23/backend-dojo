import type { Question } from "@/lib/types";

const SIGNALS = ["SIGTERM", "SIGINT", "SIGKILL", "SIGHUP"];

export const quiz: Question[] = [
  {
    id: "graceful-shutdown-signals",
    lectures: [19],
    tags: ["signals"],
    type: "scenario",
    prompt:
      "Your notes API runs in three places. Which signal does each situation send to the process first?",
    fields: [
      { label: "You press Ctrl+C in your local terminal", options: SIGNALS, answer: "SIGINT" },
      { label: "Kubernetes stops a pod during a rolling deploy", options: SIGNALS, answer: "SIGTERM" },
      { label: "The pod is still alive after its grace period", options: SIGNALS, answer: "SIGKILL" },
    ],
    explanation:
      "Ctrl+C sends SIGINT and orchestrators send SIGTERM; both can be handled and should trigger the same shutdown. SIGKILL is the follow-up when the grace period runs out, and it can't be caught.",
    lessonAnchor: "unix-signals",
  },
  {
    id: "graceful-shutdown-order",
    lectures: [19],
    tags: ["draining", "cleanup"],
    type: "order",
    prompt:
      "Your shop's API receives SIGTERM during a deploy. Put its shutdown steps in the right order.",
    steps: [
      "Fail the readiness check so the load balancer stops sending new traffic",
      "Stop accepting new connections",
      "Let in-flight requests and current jobs finish",
      "Flush buffered logs and metrics",
      "Close the Redis client and the database pool",
      "Exit with code 0",
    ],
    explanation:
      "First stop new work arriving (balancer, then listener), then drain what's already running, then release the dependencies that work relied on, and only then exit. Closing the database earlier would break requests that are still draining.",
    lessonAnchor: "putting-it-together",
  },
  {
    id: "graceful-shutdown-double-charge",
    lectures: [19],
    tags: ["signals", "incidents"],
    type: "mcq",
    prompt:
      "Production incident: after every deploy, a few customers are charged but have no order, and some pay twice after retrying. Logs show the old instances never print \"shutdown signal received\". What's the most likely cause?",
    options: [
      "The payment provider is down during deploys",
      "The app has no SIGTERM handler, so it keeps running until the orchestrator SIGKILLs it mid-request",
      "The drain timeout is too long",
      "The database pool is too small",
    ],
    answer: "The app has no SIGTERM handler, so it keeps running until the orchestrator SIGKILLs it mid-request",
    explanation:
      "Without a handler the polite signal is ignored, new traffic keeps arriving, and SIGKILL eventually cuts off requests halfway through a charge-then-save sequence. A too-long timeout would delay deploys, not produce a missing log line.",
    lessonAnchor: "unix-signals",
  },
  {
    id: "graceful-shutdown-timeout",
    lectures: [19],
    tags: ["timeouts", "draining"],
    type: "scenario",
    prompt:
      "Your API's p99 latency is 900 ms, and Kubernetes uses its default 30-second grace period. One rare admin endpoint generates reports that take 3 minutes.",
    fields: [
      { label: "Drain timeout in your code", options: ["2 seconds", "25 seconds", "5 minutes", "No timeout"], answer: "25 seconds" },
      { label: "What to do about the 3-minute reports", options: ["Raise the grace period to 5 minutes", "Move them to a background job queue", "Kill them with SIGKILL first", "Ignore SIGTERM while one is running"], answer: "Move them to a background job queue" },
    ],
    explanation:
      "25 seconds is far above normal request time and still under the 30-second grace period, so your cleanup runs before SIGKILL. Very long work shouldn't block deploys; a job queue lets a worker finish or retry it independently.",
    lessonAnchor: "choosing-the-drain-timeout",
  },
  {
    id: "graceful-shutdown-draining-types",
    lectures: [19],
    tags: ["draining", "websockets"],
    type: "scenario",
    prompt:
      "Your SaaS product has several kinds of process. What should each one do while draining?",
    fields: [
      {
        label: "Chat WebSocket server",
        options: ["Close all sockets immediately", "Tell clients it's closing so they reconnect elsewhere, then close", "Keep sockets open until clients leave on their own", "Restart in place"],
        answer: "Tell clients it's closing so they reconnect elsewhere, then close",
      },
      {
        label: "Email queue worker mid-job",
        options: ["Drop the job", "Finish the current job, or return it to the queue, and take no new ones", "Pull as many jobs as possible before exiting", "Mark the job as sent"],
        answer: "Finish the current job, or return it to the queue, and take no new ones",
      },
    ],
    explanation:
      "Long-lived connections need a heads-up so clients reconnect smoothly instead of erroring. Workers stop taking new jobs and make sure the current one is either completed or safely handed back for retry.",
    lessonAnchor: "draining-in-flight-requests",
  },
  {
    id: "graceful-shutdown-reverse-order",
    lectures: [19],
    tags: ["cleanup"],
    type: "mcq",
    prompt:
      "A teammate's shutdown code closes the database pool first, then calls server.Shutdown(). During deploys, a few requests fail with \"sql: database is closed\". What's the fix?",
    options: [
      "Increase the database pool size",
      "Shut down the HTTP server (draining requests) first, then close the database",
      "Remove the drain timeout",
      "Catch SIGKILL and close the database there",
    ],
    answer: "Shut down the HTTP server (draining requests) first, then close the database",
    explanation:
      "Release resources in reverse order: stop and drain the things that use the database before closing the database itself. SIGKILL can't be caught at all.",
    lessonAnchor: "release-in-reverse-order",
  },
  {
    id: "graceful-shutdown-container",
    lectures: [19],
    tags: ["signals", "containers"],
    type: "mcq",
    prompt:
      "Your app has a perfect SIGTERM handler, but in Docker it always takes the full 10 seconds to stop and never logs its shutdown message. The container runs `sh start.sh`, which calls `node server.js`. Why?",
    options: [
      "Node.js can't handle SIGTERM",
      "The shell is the main process and doesn't forward SIGTERM, so the app is SIGKILLed after the timeout",
      "Docker only sends SIGINT",
      "The drain timeout is set to 10 seconds",
    ],
    answer: "The shell is the main process and doesn't forward SIGTERM, so the app is SIGKILLed after the timeout",
    explanation:
      "The signal goes to the container's main process. A wrapper shell that doesn't forward it leaves your app unaware until SIGKILL. Use exec in the script, or start the binary directly.",
    lessonAnchor: "putting-it-together",
  },
];
