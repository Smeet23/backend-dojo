import type { Question } from "@/lib/types";

const IN = ["path", "query", "header", "cookie", "requestBody"];

export const quiz: Question[] = [
  {
    id: "openapi-drift-incident",
    lectures: [28],
    tags: ["contract", "drift"],
    type: "mcq",
    prompt:
      "Production incident: a new settings page sends { \"to\": \"done\" } to POST /api/move and gets 400. Months ago the field was renamed to \"column\" in the backend and the old frontend, but the wiki page still says \"to\". What's the root problem OpenAPI addresses here?",
    options: [
      "The backend should accept both field names forever",
      "API knowledge lived in three unenforced copies, and nothing like a compiler checks calls across the network",
      "The wiki should have been written in Markdown tables",
      "The frontend should have used axios instead of fetch",
    ],
    answer: "API knowledge lived in three unenforced copies, and nothing like a compiler checks calls across the network",
    explanation:
      "Within one codebase a renamed field breaks every caller at compile time; across HTTP nothing does. A machine-readable contract that generates the client and server types turns that drift into a build error.",
    lessonAnchor: "three-copies-of-the-same-truth",
  },
  {
    id: "openapi-param-locations",
    lectures: [28],
    tags: ["parameters"],
    type: "scenario",
    prompt:
      "You're describing the task board API. Where does each input go?\n• The task ID in GET /api/tasks/42\n• ?since=120 on GET /api/events\n• Last-Event-ID sent by the browser on reconnect\n• The JSON with taskId and to on POST /api/move",
    fields: [
      { label: "Task ID", options: IN, answer: "path" },
      { label: "since", options: IN, answer: "query" },
      { label: "Last-Event-ID", options: IN, answer: "header" },
      { label: "Move JSON", options: IN, answer: "requestBody" },
    ],
    explanation:
      "Parameters have in: path, query, header or cookie; a JSON body is described by requestBody instead. Remember that the path parameter must be marked required: true.",
    lessonAnchor: "parameters",
  },
  {
    id: "openapi-two-versions",
    lectures: [28],
    tags: ["anatomy", "versioning"],
    type: "scenario",
    prompt:
      "Your team ships a backwards-compatible addition to the Task Board API (now 1.5.0). Your docs renderer and type generator support OpenAPI 3.1 but not 3.2. Fill in the root of openapi.yaml.",
    fields: [
      { label: "openapi:", options: ["3.1.1", "3.2.0", "1.5.0", "2.0"], answer: "3.1.1" },
      { label: "info.version:", options: ["3.1.1", "1.5.0", "latest", "v2"], answer: "1.5.0" },
    ],
    explanation:
      "The openapi field is the specification version, which tells tools how to read the file, so pick one your tools support. info.version is your own API's version and changes as the API evolves.",
    lessonAnchor: "the-minimum-valid-file",
  },
  {
    id: "openapi-operationid",
    lectures: [28],
    tags: ["operations", "codegen"],
    type: "mcq",
    prompt:
      "The generated TypeScript client has functions named postApiMove and getApiTasksTaskId, and two operations failed to generate because they clash. Which spec change fixes this best?",
    options: [
      "Add a unique, function-style operationId to each operation, like moveTask and getTask",
      "Add more tags to each operation",
      "Rename the paths to /moveTask and /getTask",
      "Switch the file from YAML to JSON",
    ],
    answer: "Add a unique, function-style operationId to each operation, like moveTask and getTask",
    explanation:
      "Generators derive function names from operationId, which must be unique across the file. Putting verbs into paths would break REST conventions and still not guarantee uniqueness.",
    lessonAnchor: "paths-and-operations",
  },
  {
    id: "openapi-move-schema",
    lectures: [28],
    tags: ["schemas", "responses"],
    type: "scenario",
    prompt:
      "You're writing the schema for POST /api/move. taskId and the target column must be present; the column must be todo, doing or done; actor is optional and defaults to guest. The handler returns 404 when the task doesn't exist.",
    fields: [
      {
        label: "taskId schema",
        options: ["type: integer", "type: string", "type: number, format: id", "type: object"],
        answer: "type: integer",
      },
      {
        label: "Column constraint",
        options: ["enum: [todo, doing, done]", "pattern: todo|doing|done", "maxLength: 5", "default: todo"],
        answer: "enum: [todo, doing, done]",
      },
      {
        label: "actor",
        options: ["In required, with default guest", "Not required, default: guest", "A header parameter", "Omitted from the spec"],
        answer: "Not required, default: guest",
      },
      {
        label: "Response key for missing task",
        options: ["\"404\"", "404", "notFound", "\"4XX\" only"],
        answer: "\"404\"",
      },
    ],
    explanation:
      "Use integer for whole-number IDs and enum for a fixed set of values. A default only makes sense on an optional field. Response keys are quoted status codes so YAML doesn't read them as numbers.",
    lessonAnchor: "schemas",
  },
  {
    id: "openapi-pipeline-order",
    lectures: [28],
    tags: ["design-first", "tooling"],
    type: "order",
    prompt: "You're starting a new service design-first. Put the pipeline in a sensible order.",
    steps: [
      "Write openapi.yaml for the endpoints",
      "Lint it with Spectral",
      "Start a Prism mock server so the frontend can begin",
      "Generate TypeScript client types and Go server interfaces",
      "Implement the handlers until the build passes",
      "Run Schemathesis against the real server",
    ],
    explanation:
      "The contract comes first and is linted before anyone builds on it. Mocks unblock the frontend while generated interfaces force the server to match, and contract testing finally checks the running server against the file.",
    lessonAnchor: "a-design-first-toolchain",
  },
  {
    id: "openapi-pick-tool",
    lectures: [28],
    tags: ["tooling"],
    type: "scenario",
    prompt:
      "Match each need to a tool:\n• The mobile team needs realistic responses today, though the backend won't exist for two weeks.\n• You want the build to fail if a Go handler doesn't match the spec.\n• You want to fire thousands of generated valid and invalid requests at staging and flag responses that break the contract.\n• Reviewers keep missing operations that have no description.",
    fields: [
      { label: "Fake responses now", options: ["Prism", "Spectral", "Schemathesis", "oapi-codegen", "Scalar"], answer: "Prism" },
      { label: "Build fails on mismatch", options: ["Prism", "Spectral", "Schemathesis", "oapi-codegen", "Scalar"], answer: "oapi-codegen" },
      { label: "Generated requests vs real server", options: ["Prism", "Spectral", "Schemathesis", "oapi-codegen", "Scalar"], answer: "Schemathesis" },
      { label: "Missing descriptions", options: ["Prism", "Spectral", "Schemathesis", "oapi-codegen", "Scalar"], answer: "Spectral" },
    ],
    explanation:
      "Prism mocks from the spec, oapi-codegen generates interfaces the compiler enforces, Schemathesis does property-based contract testing against a live server, and Spectral lints the description itself. Scalar renders docs.",
    lessonAnchor: "a-design-first-toolchain",
  },
  {
    id: "openapi-code-vs-design",
    lectures: [28],
    tags: ["design-first", "code-first"],
    type: "scenario",
    prompt:
      "Two situations:\n• A five-year-old Express API with 80 routes and no docs; partners want a typed client next month.\n• A brand-new booking service where web and mobile teams want to start the same week as the backend.",
    fields: [
      { label: "Legacy Express API", options: ["Code-first", "Design-first"], answer: "Code-first" },
      { label: "New booking service", options: ["Code-first", "Design-first"], answer: "Design-first" },
      {
        label: "Most drift-resistant code-first flavour",
        options: ["Schemas defined in code (e.g. Zod plus ts-rest)", "Comment annotations on each handler", "A hand-maintained wiki", "Copying JSON from the Network tab"],
        answer: "Schemas defined in code (e.g. Zod plus ts-rest)",
      },
    ],
    explanation:
      "For an existing server, deriving the spec from code is the practical route; for a new one, agreeing the contract first lets teams build in parallel. Schemas that live in code also validate at runtime, so they can't drift the way comments can.",
    lessonAnchor: "spec-first-or-code-first",
  },
  {
    id: "openapi-terms",
    lectures: [28],
    tags: ["terminology"],
    type: "mcq",
    prompt: "A colleague says \"send me the Swagger for the billing API\". What do they most likely want?",
    options: [
      "The OpenAPI Description file (openapi.yaml or .json) for the billing API",
      "A copy of the OpenAPI Specification document",
      "Membership in the OpenAPI Initiative",
      "A screenshot of Swagger UI",
    ],
    answer: "The OpenAPI Description file (openapi.yaml or .json) for the billing API",
    explanation:
      "Swagger is the spec's old name, so people still say \"Swagger file\" for an OAD. The OAS is the rulebook every description follows, and the OAI is the organisation maintaining it.",
    lessonAnchor: "four-terms-people-mix-up",
  },
];
