import type { Question } from "@/lib/types";

const LAYERS = ["Middleware", "Handler / controller", "Service", "Repository"];

export const quiz: Question[] = [
  {
    id: "layers-where-does-it-go",
    lectures: [10],
    tags: ["layers"],
    type: "scenario",
    prompt:
      "You're building \"share a note\" for the notes app. Place each piece of code in the right layer.",
    fields: [
      { label: "Return 201 with the share record", options: LAYERS, answer: "Handler / controller" },
      { label: "Check the note belongs to the caller, look up the invitee, then send them an email", options: LAYERS, answer: "Service" },
      { label: "INSERT INTO shares (note_id, user_id) VALUES ($1, $2)", options: LAYERS, answer: "Repository" },
      { label: "Verify the JWT on every request to /notes/*", options: LAYERS, answer: "Middleware" },
    ],
    explanation:
      "Status codes are HTTP, so they belong in the handler. Orchestrating ownership checks, lookups and email is business logic for the service. Building and running SQL is the repository's only job. A check that every route needs is middleware.",
    lessonAnchor: "why-split-into-layers",
  },
  {
    id: "layers-service-knows-http",
    lectures: [10],
    tags: ["layers", "service"],
    type: "mcq",
    prompt:
      "In code review you see notesService.archive(req, res), which reads req.params.id and calls res.status(404) when the note is missing. The team now wants a nightly job to archive old notes using the same logic. What's the core problem?",
    options: [
      "The service should use PATCH instead of status codes",
      "The service is coupled to HTTP; it should take plain data (a note ID) and throw a domain error that the handler maps to 404",
      "The repository should send the 404 instead",
      "Nothing; the nightly job can build a fake req and res",
    ],
    answer: "The service is coupled to HTTP; it should take plain data (a note ID) and throw a domain error that the handler maps to 404",
    explanation:
      "A service shouldn't be able to tell it's called from an API. Taking plain inputs and throwing errors like NotFoundError makes it reusable from jobs, scripts and tests, while the handler or error handler turns errors into status codes.",
    lessonAnchor: "the-service-layer",
  },
  {
    id: "layers-repo-single-purpose",
    lectures: [10],
    tags: ["layers", "repository"],
    type: "mcq",
    prompt:
      "A repository has getNotes(id?: string): it returns one note when id is passed and all notes otherwise. Callers keep crashing because they don't know whether they got an array or an object. Best fix?",
    options: [
      "Always return an array, even for a single note",
      "Split it into getAllNotes(options) and getNoteById(id)",
      "Move the branching into the service",
      "Add a boolean parameter called single",
    ],
    answer: "Split it into getAllNotes(options) and getNoteById(id)",
    explanation:
      "One repository method should return one kind of data. Two explicit methods make intent obvious at every call site and can each be optimised separately; a boolean flag just hides the same branching.",
    lessonAnchor: "the-repository-layer",
  },
  {
    id: "layers-error-handler-position",
    lectures: [10],
    tags: ["middleware", "errors"],
    type: "scenario",
    prompt:
      "Production incident: when a service throws, clients get the framework's default HTML error page with a stack trace instead of your JSON error shape. The global error handler is registered right after the CORS middleware, before the routes.",
    fields: [
      {
        label: "Root cause",
        options: [
          "Errors thrown later in the chain never reach a handler registered earlier",
          "The error handler must call next() twice",
          "Services aren't allowed to throw errors",
          "CORS strips the JSON body from error responses",
        ],
        answer: "Errors thrown later in the chain never reach a handler registered earlier",
      },
      { label: "Fix", options: ["Register it first", "Register it last, after all routes", "Call it from every service", "Remove it and let the framework decide"], answer: "Register it last, after all routes" },
    ],
    explanation:
      "Middleware run in registration order, and errors flow forward to the next error-handling step. Registered last, the error handler wraps everything before it and returns one consistent, safe error shape.",
    lessonAnchor: "global-error-handler",
  },
  {
    id: "layers-owner-from-context",
    lectures: [10],
    tags: ["request-context", "security"],
    type: "scenario",
    prompt:
      "POST /notes currently accepts { \"title\": \"…\", \"ownerId\": \"u_17\" } and saves ownerId straight into notes.owner_id. A security review flags it.",
    fields: [
      {
        label: "Where should owner_id come from?",
        options: [
          "The request context, set by the auth middleware after verifying the token",
          "The ownerId in the body, after checking it's a valid UUID",
          "A query parameter instead of the body",
          "The X-Request-ID header",
        ],
        answer: "The request context, set by the auth middleware after verifying the token",
      },
      { label: "The risk if unchanged", options: ["Any user can create notes as someone else", "Notes are created twice", "CORS will block the request", "Responses get slower"], answer: "Any user can create notes as someone else" },
    ],
    explanation:
      "The only trustworthy identity is the one the server verified. Validating the format of a client-supplied ownerId doesn't help: it's still whatever the client chose to send.",
    lessonAnchor: "who-is-calling",
  },
  {
    id: "layers-trace-request",
    lectures: [10],
    tags: ["request-context", "observability"],
    type: "mcq",
    prompt:
      "A checkout request in the shop touches the API gateway, orders service, payments service and email service. A customer reports a failure, and you need every log line for that one request across all four services. What makes that possible?",
    options: [
      "Logging the full request body in each service",
      "An early middleware assigns a request ID, stores it in the context, logs it everywhere and forwards it as X-Request-ID",
      "Sorting all services' logs by timestamp",
      "Including the user ID in each log line",
    ],
    answer: "An early middleware assigns a request ID, stores it in the context, logs it everywhere and forwards it as X-Request-ID",
    explanation:
      "A request ID uniquely identifies one request and travels with it between services, so one search finds its whole path. Timestamps and user IDs are ambiguous, since a user makes many requests and many requests share a second.",
    lessonAnchor: "tracing-with-request-ids",
  },
  {
    id: "layers-chain-order",
    lectures: [10],
    tags: ["middleware"],
    type: "order",
    prompt: "Put this middleware chain for the notes API in a sensible order.",
    steps: [
      "CORS (answer preflights, check Origin)",
      "Assign a request ID",
      "Rate limiting (429 if over the limit)",
      "Authentication (401, or put the user in the context)",
      "Route handler",
      "Global error handler",
    ],
    explanation:
      "CORS goes first so preflights aren't rejected by auth. The request ID comes early so every later log can use it. Cheap rate limiting runs before more expensive auth work, the handler comes after auth so it can read the user, and the error handler goes last to catch everything.",
    lessonAnchor: "a-typical-order",
  },
  {
    id: "layers-default-sort",
    lectures: [10],
    tags: ["handler", "transformation"],
    type: "scenario",
    prompt:
      "GET /notes accepts an optional ?sort=title|createdAt. Right now the service, the repository and two other callers all contain \"if sort is undefined, use createdAt\". You want that logic in exactly one place.",
    fields: [
      { label: "Where", options: ["Handler's validation and transformation step", "Repository", "Database view", "Frontend"], answer: "Handler's validation and transformation step" },
      { label: "What it does", options: ["Fills sort = \"createdAt\" when missing", "Rejects requests without sort with 400", "Sorts the array in the handler", "Returns 404 when sort is missing"], answer: "Fills sort = \"createdAt\" when missing" },
    ],
    explanation:
      "Making query params optional and filling sane defaults during transformation means everything downstream receives one predictable shape. Rejecting a missing optional param with 400 makes the API needlessly hard to use.",
    lessonAnchor: "step-2-validate-and-transform",
  },
];
