import type { Question } from "@/lib/types";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const CODES = ["200 OK", "201 Created", "204 No Content", "400 Bad Request", "404 Not Found", "409 Conflict"];

export const quiz: Question[] = [
  {
    id: "rest-get-one-project",
    lectures: [11],
    tags: ["urls", "naming"],
    type: "scenario",
    prompt:
      "You're designing the project-management API. The project detail screen needs one project by its ID. Pick the request.",
    fields: [
      { label: "Method", options: METHODS, answer: "GET" },
      { label: "Route", options: ["/project/42", "/projects/42", "/getProject?id=42", "/projects/get/42"], answer: "/projects/42" },
    ],
    explanation:
      "Collections are plural, and stay plural when you address one member: /projects is the collection, /projects/42 is one item in it. Verbs don't belong in CRUD paths, because the method already says \"get\".",
    lessonAnchor: "plural-resource-names",
  },
  {
    id: "rest-create-org",
    lectures: [11],
    tags: ["crud", "status-codes", "payloads"],
    type: "scenario",
    prompt:
      "The \"New organization\" form has two fields: name and description. Design the create call.",
    fields: [
      { label: "Method and route", options: ["POST /organizations", "PUT /organizations", "POST /organizations/create", "PATCH /organizations"], answer: "POST /organizations" },
      {
        label: "Request body",
        options: [
          "{ name, description }",
          "{ id, name, description, createdAt }",
          "{ name, description, status, createdAt, updatedAt }",
          "No body; send name and description as query params",
        ],
        answer: "{ name, description }",
      },
      { label: "Success response", options: ["200 OK, empty body", "201 Created with the new organization", "204 No Content", "201 Created with just the id"], answer: "201 Created with the new organization" },
    ],
    explanation:
      "POST to the collection creates. The server owns id and timestamps, and status gets a sane default, so the client sends only what it controls. Return 201 with the full created entity (and a Location header) so the client needn't refetch.",
    lessonAnchor: "create",
  },
  {
    id: "rest-empty-filter",
    lectures: [11],
    tags: ["status-codes", "lists"],
    type: "mcq",
    prompt:
      "Users report the frontend shows a red \"Something went wrong\" banner when they filter tasks by a status that currently has no tasks: GET /tasks?status=blocked. The API returns 404. What should it return?",
    options: [
      "404 is correct; the frontend should special-case it",
      "200 with { \"data\": [], \"total\": 0, \"page\": 1, \"totalPages\": 0 }",
      "204 No Content",
      "400 Bad Request because the filter matched nothing",
    ],
    answer: "200 with { \"data\": [], \"total\": 0, \"page\": 1, \"totalPages\": 0 }",
    explanation:
      "An empty list is a successful answer (\"there are none\"), not a missing resource. 404 is for a specific resource that doesn't exist, like GET /tasks/does-not-exist. 204 would drop the envelope the client expects.",
    lessonAnchor: "not-found-vs-empty-list",
  },
  {
    id: "rest-archive-action",
    lectures: [11],
    tags: ["custom-actions", "status-codes"],
    type: "scenario",
    prompt:
      "Archiving an organization must also lock its projects and email all members. A teammate proposes PATCH /organizations/5b1e9f with { \"status\": \"archived\" }. You propose a dedicated endpoint instead.",
    fields: [
      { label: "Method", options: METHODS, answer: "POST" },
      { label: "Route", options: ["/organizations/5b1e9f/archive", "/archiveOrganization/5b1e9f", "/organizations/archive?id=5b1e9f", "/archives/organizations/5b1e9f"], answer: "/organizations/5b1e9f/archive" },
      { label: "Success status", options: CODES, answer: "200 OK" },
    ],
    explanation:
      "Non-CRUD actions with side effects are POST /resources/:id/action. Archiving changes an existing resource and creates nothing, so 200 with the updated organization, not 201.",
    lessonAnchor: "archive",
  },
  {
    id: "rest-clone-status",
    lectures: [11],
    tags: ["custom-actions", "status-codes"],
    type: "scenario",
    prompt:
      "POST /projects/42/clone copies the project and all its tasks into a new project with a new ID.",
    fields: [
      { label: "Status when it works", options: CODES, answer: "201 Created" },
      { label: "Status when project 42 doesn't exist", options: CODES, answer: "404 Not Found" },
      {
        label: "Why not let the frontend GET it and POST /projects with the same values?",
        options: [
          "The client doesn't know everything \"clone\" means on the server (tasks, notifications, lineage)",
          "POST /projects can't accept a name",
          "GET responses can't be reused in a POST",
          "It would be idempotent",
        ],
        answer: "The client doesn't know everything \"clone\" means on the server (tasks, notifications, lineage)",
      },
    ],
    explanation:
      "The status describes what happened: clone created a resource, so 201, even though it's a custom action (archive returned 200). The cloning rules belong in the backend so every client gets the same behaviour.",
    lessonAnchor: "clone",
  },
  {
    id: "rest-patch-vs-put",
    lectures: [11],
    tags: ["methods"],
    type: "mcq",
    prompt:
      "A mobile client calls PUT /projects/42 with { \"name\": \"Relaunch\" } to rename a project. Afterwards the project's description and status are blank. What happened, and what should it use?",
    options: [
      "A server bug; PUT should merge fields. Keep using PUT",
      "PUT replaces the whole resource, so omitted fields were reset; use PATCH to send only the name",
      "The client should have used POST /projects/42/rename",
      "PUT isn't idempotent, so it ran twice; add an idempotency key",
    ],
    answer: "PUT replaces the whole resource, so omitted fields were reset; use PATCH to send only the name",
    explanation:
      "PUT means \"here is the complete new representation\", so missing fields are dropped. PATCH is for partial updates, which is what an edit form almost always does. PUT is idempotent; that isn't the issue here.",
    lessonAnchor: "put-vs-patch",
  },
  {
    id: "rest-idempotent-retry",
    lectures: [11],
    tags: ["idempotency", "methods"],
    type: "scenario",
    prompt:
      "Your HTTP client library retries automatically on timeouts, but only for requests that are safe to repeat. Decide for each request.",
    fields: [
      { label: "DELETE /tasks/7", options: ["Safe to retry", "Not safe to retry"], answer: "Safe to retry" },
      { label: "POST /tasks { title }", options: ["Safe to retry", "Not safe to retry"], answer: "Not safe to retry" },
      { label: "PATCH /tasks/7 { \"status\": \"done\" }", options: ["Safe to retry", "Not safe to retry"], answer: "Safe to retry" },
      { label: "PATCH /tasks/7 { \"op\": \"incrementEstimate\", \"by\": 1 }", options: ["Safe to retry", "Not safe to retry"], answer: "Not safe to retry" },
    ],
    explanation:
      "DELETE is idempotent: a repeat may 404 but changes nothing. POST creates another task each time. PATCH is only idempotent when it sets values; a relative change like \"increment\" adds up on every retry.",
    lessonAnchor: "methods-and-idempotency",
  },
  {
    id: "rest-feed-duplicates",
    lectures: [11],
    tags: ["pagination"],
    type: "scenario",
    prompt:
      "Production incident: in the activity feed (infinite scroll, ~2M rows, very busy), users see the same item twice while scrolling, and page 4,000 takes 3 seconds to load. The API uses ?page=N&limit=20 with LIMIT/OFFSET.",
    fields: [
      {
        label: "Why the duplicates?",
        options: [
          "New items inserted at the top shift every row down, so the next offset re-reads one",
          "The database returns duplicate rows under load",
          "limit=20 is too small",
          "The client sends the same page twice",
        ],
        answer: "New items inserted at the top shift every row down, so the next offset re-reads one",
      },
      { label: "Fix", options: ["Cursor (keyset) pagination", "Increase limit to 1000", "Remove sorting", "Cache page 1"], answer: "Cursor (keyset) pagination" },
    ],
    explanation:
      "Offsets count positions, and positions move when rows are inserted, while large offsets force the database to skip millions of rows. A cursor (\"items older than this one\") is stable under inserts and uses an index to jump straight to the next page.",
    lessonAnchor: "offset-vs-cursor-pagination",
  },
  {
    id: "rest-default-sort",
    lectures: [11],
    tags: ["sorting", "defaults"],
    type: "mcq",
    prompt:
      "QA reports that GET /organizations?page=2&limit=10 sometimes contains organizations already shown on page 1, even when nobody is creating new ones. The query has no ORDER BY because the client didn't send sortBy. What's the fix?",
    options: [
      "Require clients to always send sortBy, and return 400 otherwise",
      "Always apply a default sort (createdAt desc) with an id tie-breaker",
      "Switch the table to a clustered index",
      "Return all organizations so pagination isn't needed",
    ],
    answer: "Always apply a default sort (createdAt desc) with an id tie-breaker",
    explanation:
      "Without ORDER BY, a database doesn't guarantee row order between queries, so pages can overlap or skip. A sane default sort (newest first), plus a unique tie-breaker, makes pagination deterministic without burdening the client.",
    lessonAnchor: "sorting",
  },
  {
    id: "rest-consistency-review",
    lectures: [11],
    tags: ["naming", "consistency"],
    type: "scenario",
    prompt:
      "Reviewing a new endpoint: POST /project with body { \"name\": \"…\", \"desc\": \"…\", \"org_id\": \"5b1e9f\" }. Existing endpoints use /organizations and { name, description }, with camelCase keys.",
    fields: [
      { label: "Route", options: ["/project", "/projects", "/Projects", "/project-list"], answer: "/projects" },
      { label: "Description field", options: ["desc", "dsc", "description", "projectDesc"], answer: "description" },
      { label: "Organization field", options: ["org_id", "orgId", "organizationId", "organization_id"], answer: "organizationId" },
    ],
    explanation:
      "Integrators assume every resource works like the last one they used. Plural routes, the same field names across resources, camelCase JSON keys and no abbreviations keep that assumption true.",
    lessonAnchor: "consistency-above-all",
  },
  {
    id: "rest-design-order",
    lectures: [11],
    tags: ["design-first"],
    type: "order",
    prompt: "You've been handed Figma wireframes for a new \"tags\" feature. Put the design-first workflow in order.",
    steps: [
      "Find the nouns in the wireframes and requirements (tags, tasks)",
      "Design the database schema for the new resources",
      "List the actions each screen needs, starting from CRUD",
      "Design routes, methods, payloads and status codes in an OpenAPI editor",
      "Review the spec with the frontend engineers",
      "Implement the handlers, services and repositories",
    ],
    explanation:
      "Resources come from the product's nouns; the schema and actions follow; the interface is designed and reviewed as a spec before any code, because changing a design is far cheaper than changing a shipped API.",
    lessonAnchor: "from-resources-to-actions",
  },
  {
    id: "rest-stateless-constraint",
    lectures: [11],
    tags: ["rest", "history"],
    type: "mcq",
    prompt:
      "The API runs on 6 servers behind a round-robin load balancer. A developer stores each user's current \"selected project\" in server memory after a request, and later requests that omit the project ID fail randomly. Which REST constraint was broken?",
    options: ["Cacheable", "Stateless", "Layered system", "Code on demand"],
    answer: "Stateless",
    explanation:
      "Statelessness means every request carries everything needed to process it. Server-side session state only lives on one machine, so requests routed to the other five fail. Send the project ID on each request (in the path, query or body) instead.",
    lessonAnchor: "fieldings-constraints",
  },
];
