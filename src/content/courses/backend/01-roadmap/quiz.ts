import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "roadmap-middleware-order",
    lectures: [1],
    tags: ["middleware"],
    type: "order",
    prompt: "You're wiring up middleware for a new API. Put the chain in a sensible order, from the moment a request arrives.",
    steps: ["Request logging", "Authentication", "Input validation", "Route handler", "Error handling"],
    explanation:
      "Log first so even rejected requests are visible. Authenticate before validating so anonymous callers can't probe your validation rules. The handler does the work, and the error handler sits last to turn any failure into a consistent response.",
    lessonAnchor: "middleware-order-matters",
  },
  {
    id: "roadmap-background-job",
    lectures: [1],
    tags: ["queues"],
    type: "mcq",
    prompt:
      "A \"Delete my account\" button triggers deletes across 20 tables and takes about 8 seconds. Users think the app froze. Best fix?",
    options: [
      "Respond immediately and run the deletion as a background job on a queue",
      "Increase the request timeout to 30 seconds",
      "Show a loading spinner for 8 seconds",
      "Move the deletes into the frontend",
    ],
    answer: "Respond immediately and run the deletion as a background job on a queue",
    explanation:
      "Slow work that the user doesn't need to wait for belongs off the request path. Acknowledge right away (e.g. 202 Accepted) and let a worker finish the job.",
    lessonAnchor: "push-slow-work-to-the-background",
  },
  {
    id: "roadmap-layers",
    lectures: [1],
    tags: ["architecture"],
    type: "scenario",
    prompt:
      "In a notes API, which layer should own each piece of code?",
    fields: [
      { label: "Checking the request body has a non-empty title", options: ["Presentation", "Business logic", "Data access"], answer: "Presentation" },
      { label: "\"Free users can have at most 50 notes\"", options: ["Presentation", "Business logic", "Data access"], answer: "Business logic" },
      { label: "INSERT INTO notes …", options: ["Presentation", "Business logic", "Data access"], answer: "Data access" },
    ],
    explanation:
      "Input shape checks live at the edge (presentation). Business rules like plan limits live in services (business logic). SQL lives in repositories (data access). Each layer has one job.",
    lessonAnchor: "three-layers-per-request",
  },
  {
    id: "roadmap-timing-attack",
    lectures: [1],
    tags: ["security", "auth"],
    type: "mcq",
    prompt:
      "Your login endpoint returns \"invalid credentials\" for both unknown emails and wrong passwords, but unknown emails respond in 3 ms and wrong passwords in 250 ms. What's the risk?",
    options: [
      "Attackers can tell which emails are registered by timing responses",
      "None: the error messages are identical",
      "The server will run out of memory",
      "Passwords are sent in plain text",
    ],
    answer: "Attackers can tell which emails are registered by timing responses",
    explanation:
      "Identical messages aren't enough if the timing differs. Hash a dummy password for unknown users too, so both paths take about the same time.",
    lessonAnchor: "timing-attacks-are-real",
  },
  {
    id: "roadmap-io-vs-cpu",
    lectures: [1],
    tags: ["concurrency"],
    type: "scenario",
    prompt: "Classify each workload.",
    fields: [
      { label: "Calling 5 external APIs and waiting for replies", options: ["I/O-bound → concurrency", "CPU-bound → parallelism"], answer: "I/O-bound → concurrency" },
      { label: "Resizing 1,000 uploaded images", options: ["I/O-bound → concurrency", "CPU-bound → parallelism"], answer: "CPU-bound → parallelism" },
    ],
    explanation:
      "While waiting on the network, one thread can juggle many requests (concurrency). Heavy computation needs more cores working at once (parallelism).",
    lessonAnchor: "concurrency-vs-parallelism",
  },
  {
    id: "roadmap-framework-blindspot",
    lectures: [1],
    tags: ["mindset"],
    type: "mcq",
    prompt:
      "A teammate has used Rails for five years. The company moves a service to Go and they feel lost. What's the most likely root cause?",
    options: [
      "They learned the framework, not the underlying concepts",
      "Go is harder than Ruby",
      "They need a Go bootcamp first",
      "Rails experience doesn't count as backend experience",
    ],
    answer: "They learned the framework, not the underlying concepts",
    explanation:
      "Framework-first learning ties knowledge to one ecosystem. Concept-first knowledge (routing, validation, DB access, errors) transfers; only the syntax and libraries change.",
    lessonAnchor: "why-learning-it-is-hard",
  },
];
