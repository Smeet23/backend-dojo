import type { Question } from "@/lib/types";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const CODES_2XX_4XX = ["200 OK", "201 Created", "204 No Content", "400 Bad Request", "401 Unauthorized", "403 Forbidden", "404 Not Found", "409 Conflict"];

export const quiz: Question[] = [
  {
    id: "http-create-folder",
    lectures: [5],
    tags: ["methods", "status-codes"],
    type: "scenario",
    prompt:
      "You're building a notes app. A user creates a new folder called \"Work\".\nDesign the request and the success response.",
    fields: [
      { label: "Method", options: METHODS, answer: "POST" },
      { label: "Route", options: ["/folders", "/folders/create", "/createFolder", "/folders/Work"], answer: "/folders" },
      { label: "Success status", options: CODES_2XX_4XX, answer: "201 Created" },
    ],
    explanation:
      "Creating a resource is POST to the collection (/folders), not a verb in the URL. Success is 201 Created, ideally with a Location header pointing to the new folder.",
    lessonAnchor: "methods",
  },
  {
    id: "http-duplicate-folder",
    lectures: [5],
    tags: ["status-codes"],
    type: "mcq",
    prompt:
      "Folder names must be unique per user. The user submits \"Work\" again, and the request body is perfectly valid JSON. What should the API return?",
    options: ["400 Bad Request", "409 Conflict", "403 Forbidden", "200 OK with the existing folder"],
    answer: "409 Conflict",
    explanation:
      "The data is well-formed, so it's not 400. It conflicts with the current state of the server (a folder with that name already exists), which is exactly what 409 Conflict means.",
    lessonAnchor: "status-codes",
  },
  {
    id: "http-401-vs-403",
    lectures: [5],
    tags: ["status-codes", "auth"],
    type: "scenario",
    prompt:
      "Two support tickets come in for DELETE /notes/42:\n• Ticket A: the user's JWT expired an hour ago.\n• Ticket B: the user is logged in fine, but note 42 belongs to someone else.\nWhat should each request return?",
    fields: [
      { label: "Ticket A (expired token)", options: ["400 Bad Request", "401 Unauthorized", "403 Forbidden", "404 Not Found"], answer: "401 Unauthorized" },
      { label: "Ticket B (someone else's note)", options: ["400 Bad Request", "401 Unauthorized", "403 Forbidden", "409 Conflict"], answer: "403 Forbidden" },
    ],
    explanation:
      "401 means \"I can't tell who you are\" (missing, expired or invalid credentials), so the client should send the user to login. 403 means \"I know who you are, and you're not allowed\". Some APIs return 404 for other people's resources to avoid revealing they exist; that's a valid hardening choice, but 403 is the textbook answer.",
    lessonAnchor: "status-codes",
  },
  {
    id: "http-preflight-why",
    lectures: [5],
    tags: ["cors"],
    type: "mcq",
    prompt:
      "Your React app on app.notes.dev calls POST https://api.notes.dev/notes with a JSON body and an Authorization header. In DevTools you see an OPTIONS request before the POST. Why?",
    options: [
      "The server is misconfigured and sends OPTIONS by mistake",
      "It's cross-origin and uses a non-simple header/content type, so the browser preflights it",
      "POST always triggers a preflight",
      "OPTIONS is how the browser fetches the JWT",
    ],
    answer: "It's cross-origin and uses a non-simple header/content type, so the browser preflights it",
    explanation:
      "Different origin (app vs api subdomain), plus Authorization (non-simple header) and application/json (non-simple content type). Either one alone would trigger the preflight. POST by itself is a simple method.",
    lessonAnchor: "cors",
  },
  {
    id: "http-preflight-response",
    lectures: [5],
    tags: ["cors", "headers"],
    type: "scenario",
    prompt:
      "Your API must answer that preflight so the browser lets a PUT with an Authorization header through from https://app.notes.dev, and the browser shouldn't preflight again for a day. Fill in the preflight response.",
    fields: [
      { label: "Status", options: ["200 OK", "201 Created", "204 No Content", "304 Not Modified"], answer: "204 No Content" },
      { label: "Access-Control-Allow-Origin", options: ["*.notes.dev", "https://app.notes.dev", "https://api.notes.dev", "true"], answer: "https://app.notes.dev" },
      { label: "Access-Control-Allow-Headers", options: ["Origin", "Authorization", "Cookie", "Host"], answer: "Authorization" },
      { label: "Access-Control-Max-Age", options: ["0", "60", "3600", "86400"], answer: "86400" },
    ],
    explanation:
      "Preflights carry no body, hence 204. Allow-Origin must be the exact caller origin (or *); wildcard subdomains aren't valid. Allow-Headers must list the non-simple header (Authorization). Max-Age is in seconds, and 86400 is 24 hours.",
    lessonAnchor: "cors",
  },
  {
    id: "http-cors-flow-order",
    lectures: [5],
    tags: ["cors"],
    type: "order",
    prompt: "Put the preflighted CORS flow in order, for a PUT from app.notes.dev to api.notes.dev.",
    steps: [
      "Browser sends OPTIONS with Origin and Access-Control-Request-Method: PUT",
      "Server replies 204 with Access-Control-Allow-Origin/Methods/Headers",
      "Browser checks the allowed origin, methods and headers",
      "Browser sends the actual PUT request",
      "Server processes the PUT and responds with Access-Control-Allow-Origin",
      "Browser hands the response to your JavaScript",
    ],
    explanation:
      "Preflight first (OPTIONS → 204 with the allow headers), then the browser validates it, then the real request goes out, and the browser still checks Allow-Origin on the real response before exposing it.",
    lessonAnchor: "cors",
  },
  {
    id: "http-patch-vs-put",
    lectures: [5],
    tags: ["methods"],
    type: "scenario",
    prompt:
      "On the profile page, a user changes only their display name. The profile also has email, bio and avatar. Which method fits best, and is it idempotent?",
    fields: [
      { label: "Method", options: METHODS, answer: "PATCH" },
      { label: "Body contains", options: ["Only the display name", "The entire profile", "Nothing", "Only the user id"], answer: "Only the display name" },
    ],
    explanation:
      "PATCH updates just the fields you send. PUT would require sending the whole profile, because it replaces the resource, and a missing field could wipe the bio or avatar.",
    lessonAnchor: "methods",
  },
  {
    id: "http-double-submit",
    lectures: [5],
    tags: ["idempotency", "methods"],
    type: "mcq",
    prompt:
      "Users report duplicate notes when they double-click \"Save\" on a slow connection. Which statement explains it?",
    options: [
      "POST is not idempotent: each request creates another resource",
      "The browser caches POST responses",
      "PUT requests are being retried by the proxy",
      "CORS preflight sent the request twice",
    ],
    answer: "POST is not idempotent: each request creates another resource",
    explanation:
      "Two identical POSTs mean two creations. Fixes: disable the button while saving, add a unique constraint, or accept an idempotency key so the server can recognise the repeat.",
    lessonAnchor: "idempotency",
  },
  {
    id: "http-etag-304",
    lectures: [5],
    tags: ["caching", "status-codes"],
    type: "scenario",
    prompt:
      "The browser has a cached copy of GET /api/profile with ETag \"v7\". It requests the profile again, and the profile hasn't changed. Fill in the exchange.",
    fields: [
      { label: "Header the browser sends", options: ["If-None-Match: \"v7\"", "If-Match: \"v7\"", "ETag: \"v7\"", "Cache-Control: v7"], answer: "If-None-Match: \"v7\"" },
      { label: "Server status", options: ["200 OK", "204 No Content", "304 Not Modified", "412 Precondition Failed"], answer: "304 Not Modified" },
      { label: "Response body", options: ["The full profile", "Empty", "Just the ETag", "An error message"], answer: "Empty" },
    ],
    explanation:
      "Conditional GET: the browser sends its ETag in If-None-Match. If it still matches, the server answers 304 with no body and the browser reuses its cache. That saves bandwidth.",
    lessonAnchor: "caching",
  },
  {
    id: "http-gateway-codes",
    lectures: [5],
    tags: ["status-codes"],
    type: "scenario",
    prompt:
      "Your app runs behind Nginx. Two incidents:\n• Incident 1: your app hangs on a slow DB query and never replies; Nginx gives up after 60s.\n• Incident 2: your app crashes mid-response and Nginx receives a malformed reply.\nWhat does the client see in each?",
    fields: [
      { label: "Incident 1", options: ["500 Internal Server Error", "502 Bad Gateway", "503 Service Unavailable", "504 Gateway Timeout"], answer: "504 Gateway Timeout" },
      { label: "Incident 2", options: ["500 Internal Server Error", "502 Bad Gateway", "503 Service Unavailable", "504 Gateway Timeout"], answer: "502 Bad Gateway" },
    ],
    explanation:
      "Both come from the proxy, not your code. 504 means the upstream didn't answer in time; 502 means the upstream answered with something invalid.",
    lessonAnchor: "status-codes",
  },
  {
    id: "http-upload-file",
    lectures: [5],
    tags: ["large-payloads", "headers"],
    type: "mcq",
    prompt: "Users attach a 20 MB PDF to a note through an HTML form. Which Content-Type should the upload request use?",
    options: ["application/json", "multipart/form-data", "text/event-stream", "application/x-www-form-urlencoded"],
    answer: "multipart/form-data",
    explanation:
      "Multipart sends the file bytes (and other form fields) as separate parts divided by a boundary string. JSON would need base64, which inflates the size by about a third, and text/event-stream is for server-to-client streaming.",
    lessonAnchor: "large-uploads-and-downloads",
  },
  {
    id: "http-stateless-auth",
    lectures: [5],
    tags: ["statelessness"],
    type: "mcq",
    prompt:
      "A teammate asks: \"The user logged in on the first request. Why does the frontend have to send the token on every request after that?\" Best answer?",
    options: [
      "Because HTTP is stateless: each request must carry everything the server needs",
      "Because tokens expire after every request",
      "Because of CORS",
      "It doesn't; the server remembers the TCP connection",
    ],
    answer: "Because HTTP is stateless: each request must carry everything the server needs",
    explanation:
      "The server keeps no memory between requests, which is also what lets any server behind a load balancer handle any request. Login state is added on top of HTTP with tokens or cookies sent each time.",
    lessonAnchor: "statelessness",
  },
];
