import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "routing-design-note-routes",
    lectures: [6],
    tags: ["path-params", "query-params"],
    type: "scenario",
    prompt:
      "You're designing the notes API. The mobile team needs two screens:\n• A detail view for a single note.\n• A list view showing page 3 of the user's notes tagged \"work\", newest first.\nPick the URL for each.",
    fields: [
      {
        label: "Detail view",
        options: ["GET /notes/42", "GET /notes?id=42", "GET /getNote/42", "POST /notes/42"],
        answer: "GET /notes/42",
      },
      {
        label: "List view",
        options: [
          "GET /notes?tag=work&page=3&sort=-createdAt",
          "GET /notes/work/3/newest",
          "GET /notes/tag/work/page/3",
          "POST /notes/search with a JSON body",
        ],
        answer: "GET /notes?tag=work&page=3&sort=-createdAt",
      },
    ],
    explanation:
      "A single note is identified by its ID, so the ID belongs in the path. Tag, page and sort describe how you want the collection, which is exactly what query parameters are for; baking them into the path makes every combination look like a different resource.",
    lessonAnchor: "query-parameters",
  },
  {
    id: "routing-string-param-bug",
    lectures: [6],
    tags: ["path-params", "validation"],
    type: "mcq",
    prompt:
      "Production bug: GET /notes/42 returns 404 even though note 42 exists. The handler does `notes.find(n => n.id === req.params.id)` and the IDs in the store are numbers. What's going on?",
    options: [
      "req.params.id is the string \"42\", so the strict comparison with the number 42 never matches",
      "The router stripped the ID because it's numeric",
      "Path parameters are only available on POST requests",
      "The route needs to be /notes?id=42 for numeric IDs",
    ],
    answer: "req.params.id is the string \"42\", so the strict comparison with the number 42 never matches",
    explanation:
      "Everything in a URL is text, so path parameters always arrive as strings. Convert (and validate) the value before comparing it, or declare a typed parameter if your framework supports it.",
    lessonAnchor: "parameters-are-strings",
  },
  {
    id: "routing-search-shadowed",
    lectures: [6],
    tags: ["route-order"],
    type: "scenario",
    prompt:
      "Your Express app registers GET /notes/:id, and a teammate later adds GET /notes/search below it. Users report the search page always says \"Note not found\".\nDiagnose it.",
    fields: [
      {
        label: "Which handler actually runs for /notes/search?",
        options: ["getNote with id = \"search\"", "searchNotes", "The catch-all", "None, the server returns 405"],
        answer: "getNote with id = \"search\"",
      },
      {
        label: "Fix",
        options: [
          "Register /notes/search before /notes/:id",
          "Rename the param to :noteId",
          "Change search to POST",
          "Move search into the query string of /notes/:id",
        ],
        answer: "Register /notes/search before /notes/:id",
      },
    ],
    explanation:
      "Express-style routers take the first match in registration order, and \"search\" fits the :id slot. Registering the static route first fixes it. Switching search to POST would dodge the clash but breaks GET semantics for a read.",
    lessonAnchor: "route-order-and-matching",
  },
  {
    id: "routing-404-vs-405",
    lectures: [6],
    tags: ["status-codes", "catch-all"],
    type: "scenario",
    prompt:
      "Your API has GET /api/v1/notes and POST /api/v1/notes, plus a catch-all registered last. What should each request get?",
    fields: [
      {
        label: "DELETE /api/v1/notes",
        options: ["200 OK", "400 Bad Request", "404 Not Found", "405 Method Not Allowed"],
        answer: "405 Method Not Allowed",
      },
      {
        label: "GET /api/v3/notes",
        options: ["200 OK", "400 Bad Request", "404 Not Found", "405 Method Not Allowed"],
        answer: "404 Not Found",
      },
    ],
    explanation:
      "The first path exists but not for DELETE, so 405 (with an Allow: GET, POST header) tells the client its method is the problem. Nothing is registered under /api/v3, so it falls through to the catch-all, which returns a clean 404.",
    lessonAnchor: "method-plus-path-is-the-key",
  },
  {
    id: "routing-breaking-change",
    lectures: [6],
    tags: ["versioning"],
    type: "mcq",
    prompt:
      "The new mobile app needs GET /api/v1/notes to return `title` instead of `name`. Older web and mobile clients that read `name` are still in use. What do you do?",
    options: [
      "Ship /api/v2/notes with the new shape, mark v1 deprecated with a sunset date, and remove it after clients migrate",
      "Rename the field in v1; clients should always be on the latest version",
      "Add a new route /api/new-notes",
      "Return both fields forever from v1 and never version",
    ],
    answer: "Ship /api/v2/notes with the new shape, mark v1 deprecated with a sunset date, and remove it after clients migrate",
    explanation:
      "Renaming a field is a breaking change, and installed mobile apps can't be forced to update instantly. A new version runs alongside the old one and gives clients a migration window. An ad-hoc name like /new-notes doesn't scale past the second change.",
    lessonAnchor: "versioning-and-deprecation",
  },
  {
    id: "routing-nested-ownership",
    lectures: [6],
    tags: ["nested-routes", "security"],
    type: "mcq",
    prompt:
      "You add GET /users/:userId/notes/:noteId. A security review finds that GET /users/7/notes/99 returns note 99 even though it belongs to user 12. What's the right fix?",
    options: [
      "In the handler, load the note by both noteId and userId (and check the caller may view user 7's notes)",
      "Remove nested routes; they're inherently insecure",
      "Move noteId into the query string",
      "Rely on the router: nested routes already guarantee ownership",
    ],
    answer: "In the handler, load the note by both noteId and userId (and check the caller may view user 7's notes)",
    explanation:
      "A nested path only describes the relationship; it enforces nothing. The handler must query with both IDs and check permissions, otherwise anyone can swap IDs in the URL.",
    lessonAnchor: "nested-routes",
  },
  {
    id: "routing-request-walk",
    lectures: [6],
    tags: ["routing", "catch-all"],
    type: "order",
    prompt: "Put the steps in order for how a first-match router handles GET /api/v1/notes?page=2.",
    steps: [
      "Split the URL into the path /api/v1/notes and the query string page=2",
      "Walk the route table in registration order, comparing method and path pattern",
      "Stop at the first route whose method and pattern both match",
      "Call its handler with params and query (page = \"2\", a string)",
      "The handler converts page to a number, fetches that page and returns JSON",
    ],
    explanation:
      "The query string is separated out first because it plays no part in matching. Routes are checked in order and the first full match wins. The handler gets raw strings, so it converts page itself.",
    lessonAnchor: "route-order-and-matching",
  },
];
