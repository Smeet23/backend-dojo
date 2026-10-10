import type { Question } from "@/lib/types";

const STATUS = ["400 Bad Request", "404 Not Found", "409 Conflict", "422 Unprocessable Content", "500 Internal Server Error", "503 Service Unavailable"];

export const quiz: Question[] = [
  {
    id: "error-handling-global-mapping",
    lectures: [16],
    tags: ["global-error-handler", "status-codes"],
    type: "scenario",
    prompt:
      "You're writing the global error middleware for a book catalogue API on Postgres. What should each raw error become?",
    fields: [
      { label: "Unique violation on books.title (23505)", options: STATUS, answer: "409 Conflict" },
      { label: "\"No rows\" for GET /books/123", options: STATUS, answer: "404 Not Found" },
      { label: "Title longer than 500 characters, caught in the handler", options: STATUS, answer: "400 Bad Request" },
      { label: "relation \"book_ratngs\" does not exist", options: STATUS, answer: "500 Internal Server Error" },
    ],
    explanation:
      "A duplicate conflicts with existing state (409), a missing row is 404, and bad input caught by validation is 400. A typo in SQL is your bug, so the client gets a generic 500 while the details go to the logs.",
    lessonAnchor: "worked-examples",
  },
  {
    id: "error-handling-leaky-500",
    lectures: [16],
    tags: ["security", "global-error-handler"],
    type: "mcq",
    prompt:
      "A security review finds that a failing request returns: {\"error\": \"insert on table \\\"orders\\\" violates foreign key constraint \\\"orders_customer_id_fkey\\\"\"}. What's the right fix?",
    options: [
      "Have the global handler map known errors to messages you wrote, and return a generic 500 for anything unrecognized",
      "Wrap the message in base64 so it isn't readable",
      "Only return the raw error in production",
      "Return 200 with the error inside the body",
    ],
    answer: "Have the global handler map known errors to messages you wrote, and return a generic 500 for anything unrecognized",
    explanation:
      "Raw database errors reveal table and constraint names that help attackers craft injections. Every client-facing message should be one you wrote; the raw error belongs in the logs with a request id. Encoding it hides nothing.",
    lessonAnchor: "dont-leak-internals",
  },
  {
    id: "error-handling-login-message",
    lectures: [16],
    tags: ["security", "auth", "enumeration"],
    type: "scenario",
    prompt:
      "Your login endpoint returns \"No account with that email\" or \"Wrong password\". A pentester flags it.",
    fields: [
      { label: "Attack this enables", options: ["User enumeration", "CSRF", "Clickjacking", "SQL injection"], answer: "User enumeration" },
      {
        label: "Message to return in both cases",
        options: ["Invalid email or password", "Account not found", "Password incorrect, 2 attempts left", "Login failed: see server logs"],
        answer: "Invalid email or password",
      },
    ],
    explanation:
      "Different messages let an attacker test a list of emails and learn which have accounts, then focus password guessing on them. One identical message for both failures removes that signal.",
    lessonAnchor: "login-error-messages",
  },
  {
    id: "error-handling-missing-config",
    lectures: [16],
    tags: ["configuration", "fail-fast"],
    type: "mcq",
    prompt:
      "A feature using OPENAI_API_KEY was merged, but the key was never added to production. With blue-green deploys, which behaviour do you want?",
    options: [
      "The new version validates config at startup, refuses to start, and the old version keeps serving",
      "The app starts and returns 500 only on the AI endpoint",
      "The app starts and silently disables the AI feature with no log",
      "The app reads the key from a developer's laptop",
    ],
    answer: "The new version validates config at startup, refuses to start, and the old version keeps serving",
    explanation:
      "Failing fast at startup turns a user-facing runtime error into a failed deploy with a clear message, and blue-green means the old version keeps serving. Starting anyway just waits for a customer to discover the bug.",
    lessonAnchor: "configuration-errors",
  },
  {
    id: "error-handling-logic-error",
    lectures: [16],
    tags: ["logic-errors", "monitoring"],
    type: "mcq",
    prompt:
      "For three weeks a coupon was applied twice on some orders, making shipping negative. Error rates and latency were normal the whole time. Which monitoring would most likely have caught it?",
    options: [
      "A business metric such as average order margin or shipping revenue",
      "HTTP 5xx rate",
      "CPU and memory dashboards",
      "Database connection count",
    ],
    answer: "A business metric such as average order margin or shipping revenue",
    explanation:
      "Logic errors don't crash or throw, so technical metrics stay green. Business metrics show the effect: money moving the wrong way.",
    lessonAnchor: "logic-errors",
  },
  {
    id: "error-handling-retry-or-degrade",
    lectures: [16],
    tags: ["retries", "graceful-degradation"],
    type: "scenario",
    prompt: "You're deciding how a shop's product page reacts to failures. Pick a strategy for each.",
    fields: [
      {
        label: "One call to the inventory service times out once",
        options: ["Retry with backoff and jitter", "Degrade gracefully", "Return 500 immediately", "Restart the server"],
        answer: "Retry with backoff and jitter",
      },
      {
        label: "The recommendations service has been down for 20 minutes",
        options: ["Retry with backoff and jitter", "Degrade gracefully", "Return 500 immediately", "Restart the server"],
        answer: "Degrade gracefully",
      },
      {
        label: "Email provider returns 429 with Retry-After: 30",
        options: ["Retry right away in a tight loop", "Wait at least 30 s, then retry", "Treat as permanent and drop", "Switch to 404"],
        answer: "Wait at least 30 s, then retry",
      },
    ],
    explanation:
      "One-off timeouts are transient, so retry with backoff. A long outage of a non-essential feature calls for hiding it while the page still works. A 429 tells you how long to wait; hammering it makes the rate limiting worse.",
    lessonAnchor: "recoverable-vs-non-recoverable",
  },
  {
    id: "error-handling-retry-storm",
    lectures: [16],
    tags: ["circuit-breaker", "retries"],
    type: "mcq",
    prompt:
      "Production incident: the payment service slows down. Every API instance retries failed calls 3 times with no delay, and within minutes the payment service is completely down. What would have helped most?",
    options: [
      "Timeouts plus a circuit breaker that fails fast after repeated failures",
      "More retries per call",
      "Removing timeouts so calls eventually succeed",
      "Logging the full card number for debugging",
    ],
    answer: "Timeouts plus a circuit breaker that fails fast after repeated failures",
    explanation:
      "Immediate retries multiplied the load on an already struggling service, a retry storm. A circuit breaker stops calling once failures pile up, giving the service room to recover, and timeouts stop hung calls from tying up your own resources.",
    lessonAnchor: "dont-make-it-worse",
  },
  {
    id: "error-handling-breaker-order",
    lectures: [16],
    tags: ["circuit-breaker"],
    type: "order",
    prompt: "Put a circuit breaker's life during a dependency outage and recovery in order.",
    steps: [
      "Closed: calls pass through and failures are counted",
      "Failures reach the threshold and the breaker opens",
      "Open: calls fail fast without touching the dependency",
      "The cool-down expires and the breaker goes half-open",
      "A single trial call succeeds",
      "The breaker closes and normal traffic resumes",
    ],
    explanation:
      "Closed counts failures, open protects the dependency, half-open tests it with one call, and success closes the breaker. A failed trial would send it back to open.",
    lessonAnchor: "dont-make-it-worse",
  },
  {
    id: "error-handling-health-probes",
    lectures: [16],
    tags: ["health-checks"],
    type: "scenario",
    prompt:
      "A new instance of your API starts, but its cache takes 40 s to warm up. Kubernetes keeps sending it traffic immediately, and early users get slow 504s. Meanwhile, a deadlocked instance stays in rotation forever.",
    fields: [
      { label: "Check that should fail until the cache is warm", options: ["Readiness", "Liveness", "Startup banner", "Access log"], answer: "Readiness" },
      { label: "Check that should fail for the deadlocked process", options: ["Readiness", "Liveness", "Startup banner", "Access log"], answer: "Liveness" },
      { label: "What probes look at", options: ["The status code", "The response body text", "The response size", "The Server header"], answer: "The status code" },
    ],
    explanation:
      "Readiness means don't route to me yet, which is right while warming up. Liveness means restart me, which is right for a stuck process. Probes judge health by the status code.",
    lessonAnchor: "health-checks",
  },
  {
    id: "error-handling-logging-pii",
    lectures: [16],
    tags: ["logging", "security"],
    type: "mcq",
    prompt: "You need to debug failed checkouts from logs. Which log line is best?",
    options: [
      "{\"msg\":\"checkout failed\",\"user_id\":4812,\"request_id\":\"req_8f2c\",\"code\":\"card_declined\"}",
      "{\"msg\":\"checkout failed\",\"email\":\"ana@example.com\",\"card\":\"4242424242424242\"}",
      "checkout failed for ana@example.com with password hunter2",
      "{\"msg\":\"checkout failed\"}",
    ],
    answer: "{\"msg\":\"checkout failed\",\"user_id\":4812,\"request_id\":\"req_8f2c\",\"code\":\"card_declined\"}",
    explanation:
      "Structured JSON with a user id, request id and error code gives you enough to trace the failure without exposing personal data or secrets. Logs get shipped to many places and leak in breaches. A bare message is safe but useless for debugging.",
    lessonAnchor: "dont-log-sensitive-data",
  },
  {
    id: "error-handling-wrap-propagate",
    lectures: [16],
    tags: ["propagation"],
    type: "mcq",
    prompt:
      "A repository function gets \"no rows\" while loading book 123. Where should that turn into an HTTP 404?",
    options: [
      "Bubble it up, wrapped with context, and let the global error handler map it to 404",
      "Inside the repository, by writing the HTTP response directly",
      "Swallow it in the repository and return an empty book",
      "Crash the process so it restarts",
    ],
    answer: "Bubble it up, wrapped with context, and let the global error handler map it to 404",
    explanation:
      "The repository has no HTTP context and shouldn't know about responses. Wrapping keeps the cause and adds context; the global handler at the top decides the response in one place. Returning an empty book hides the error and causes confusing bugs later.",
    lessonAnchor: "propagation",
  },
];
