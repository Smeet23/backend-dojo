import type { Question } from "@/lib/types";

const KINDS = ["Type", "Syntactic", "Semantic", "Complex (cross-field)"];

export const quiz: Question[] = [
  {
    id: "validation-500-on-bad-name",
    lectures: [9],
    tags: ["validation", "status-codes"],
    type: "scenario",
    prompt:
      "Production incident: the shop's POST /products endpoint returns 500 Internal Server Error whenever a client sends { \"name\": 0 }. Logs show the error comes from the database driver during the INSERT.\nWhat's the fix, and what should the client receive afterwards?",
    fields: [
      {
        label: "Fix",
        options: [
          "Validate the body against a schema in the controller, before calling the service",
          "Catch the database error in the repository and retry the insert",
          "Change the name column to a type that accepts numbers",
          "Validate the name inside the repository just before the INSERT",
        ],
        answer: "Validate the body against a schema in the controller, before calling the service",
      },
      { label: "Status for that request", options: ["200 OK", "400 Bad Request", "404 Not Found", "500 Internal Server Error"], answer: "400 Bad Request" },
    ],
    explanation:
      "Bad input should be stopped at the edge, after routing and before any business logic, and reported as a client error (400). Checking in the repository is too late: services may already have done work, and the database is not where input rules belong.",
    lessonAnchor: "what-happens-without-it",
  },
  {
    id: "validation-query-param-cast",
    lectures: [9],
    tags: ["transformation", "query-params"],
    type: "mcq",
    prompt:
      "Users report that GET /products?page=2&limit=20 always fails with \"page: expected number, received string\". The client is sending exactly what the docs say. What's wrong?",
    options: [
      "The client should send page and limit in the JSON body instead",
      "The server validates before casting; query params always arrive as strings, so it must convert them to numbers first",
      "The client should quote the numbers: page=\"2\"",
      "Query params can't carry numbers, so the endpoint should use POST",
    ],
    answer: "The server validates before casting; query params always arrive as strings, so it must convert them to numbers first",
    explanation:
      "There are no numbers in a URL, only text. Casting \"2\" to 2 is the server's job, done as a transformation before the numeric rules run. A GET has no body, so moving the params there isn't the answer.",
    lessonAnchor: "casting-query-params",
  },
  {
    id: "validation-classify-rules",
    lectures: [9],
    tags: ["validation"],
    type: "scenario",
    prompt:
      "You're writing the schema for the shop's sign-up endpoint. Classify each rule.",
    fields: [
      { label: "dateOfBirth must not be in the future", options: KINDS, answer: "Semantic" },
      { label: "email must look like local@domain.tld", options: KINDS, answer: "Syntactic" },
      { label: "address is required when shippingMethod is \"delivery\"", options: KINDS, answer: "Complex (cross-field)" },
      { label: "every element of tags must be a string", options: KINDS, answer: "Type" },
    ],
    explanation:
      "Syntactic checks structure (the email shape), semantic checks whether a well-formed value makes sense (a future birth date), complex rules depend on other fields, and type rules apply all the way down to array elements.",
    lessonAnchor: "kinds-of-validation",
  },
  {
    id: "validation-frontend-enough",
    lectures: [9],
    tags: ["validation", "security"],
    type: "mcq",
    prompt:
      "A teammate says: \"Our React sign-up form already validates email and password length, so the API can skip those checks and save some code.\" What's the best response?",
    options: [
      "Agreed, as long as the frontend uses the same rules",
      "Agreed for internal APIs; only public APIs need server-side checks",
      "No: anyone can call the API directly with curl or a script, so the server must enforce every rule itself",
      "No: but only because the frontend may run an old version",
    ],
    answer: "No: anyone can call the API directly with curl or a script, so the server must enforce every rule itself",
    explanation:
      "Frontend validation is for user experience and is trivially bypassed. Backend validation is the contract that protects data integrity and security, for every client, including ones that never load your form.",
    lessonAnchor: "frontend-vs-backend-validation",
  },
  {
    id: "validation-normalize-email",
    lectures: [9],
    tags: ["transformation"],
    type: "scenario",
    prompt:
      "Customers keep creating duplicate accounts: \"Ada@Example.com\" and \"ada@example.com \" both succeed, even though emails are meant to be unique. Where and how do you fix it?",
    fields: [
      {
        label: "Fix",
        options: [
          "Trim and lowercase the email in the validation and transformation pipeline",
          "Ask the frontend to lowercase emails before sending",
          "Lowercase the email in the service when sending the welcome mail",
          "Reject any email that contains uppercase letters",
        ],
        answer: "Trim and lowercase the email in the validation and transformation pipeline",
      },
      { label: "This step is called", options: ["Casting", "Normalization", "Serialization", "Sanitizing the database"], answer: "Normalization" },
    ],
    explanation:
      "Normalizing equivalent inputs into one canonical form at the edge means uniqueness checks and logins compare like with like. Relying on the frontend fails for other clients, and rejecting uppercase is hostile to users who did nothing wrong.",
    lessonAnchor: "normalizing-values",
  },
  {
    id: "validation-error-shape",
    lectures: [9],
    tags: ["validation", "errors"],
    type: "mcq",
    prompt:
      "Support complains that users submitting the checkout form fix one error, resubmit, and get a different error, sometimes three times in a row. The API returns { \"error\": \"email is invalid\" }. What change helps most?",
    options: [
      "Return 500 so the frontend shows a generic message",
      "Return all validation errors at once, each with its field path and message",
      "Return only the first error but include a stack trace",
      "Remove server-side validation for checkout",
    ],
    answer: "Return all validation errors at once, each with its field path and message",
    explanation:
      "Aggregating every problem into one response lets the user fix everything in one go, and field paths let the frontend highlight the right inputs. Stack traces leak internals and don't help the user.",
    lessonAnchor: "good-error-responses",
  },
  {
    id: "validation-pipeline-order",
    lectures: [9],
    tags: ["validation", "transformation"],
    type: "order",
    prompt: "Put the handling of GET /products?page=2&limit=20 in order.",
    steps: [
      "Router matches the path and picks the list-products controller",
      "Pipeline casts page and limit from strings to numbers",
      "Pipeline validates the ranges (page 1–500, limit 1–100)",
      "Controller calls the service with the clean values",
      "Controller returns 200 with the products",
    ],
    explanation:
      "Validation runs after routing (which decides which rules apply) and before any business logic. Casting comes before the numeric checks, because query params arrive as strings.",
    lessonAnchor: "where-validation-runs",
  },
];
