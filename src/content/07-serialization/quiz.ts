import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "serialization-big-id",
    lectures: [7],
    tags: ["json", "numbers"],
    type: "scenario",
    prompt:
      "Users report that clicking an order in the shop's dashboard opens the wrong order. The API returns {\"orderId\": 9007199254740993}, and the browser then requests /orders/9007199254740992.\nDiagnose and fix it.",
    fields: [
      {
        label: "Cause",
        options: [
          "JavaScript numbers lose integer precision above 2^53 − 1",
          "The router rounded the path parameter",
          "JSON doesn't allow numbers over 32 bits",
          "Gzip compression corrupted the digits",
        ],
        answer: "JavaScript numbers lose integer precision above 2^53 − 1",
      },
      {
        label: "Fix",
        options: [
          "Serialize the ID as a string: \"9007199254740993\"",
          "Send the ID as a float",
          "Switch the response to XML",
          "Wrap the ID in an array",
        ],
        answer: "Serialize the ID as a string: \"9007199254740993\"",
      },
    ],
    explanation:
      "JSON itself allows any size of number, but JSON.parse turns it into a 64-bit float, which can't represent every integer past 2^53 − 1. Sending large IDs as strings keeps them exact; a float makes the problem worse, not better.",
    lessonAnchor: "the-pitfalls",
  },
  {
    id: "serialization-date-string",
    lectures: [7],
    tags: ["json", "dates"],
    type: "mcq",
    prompt:
      "Your notes API returns {\"dueAt\": \"2026-03-01T09:30:00Z\"}. On the frontend, note.dueAt.getTime() throws \"getTime is not a function\". Why?",
    options: [
      "JSON has no date type, so after parsing dueAt is just a string and must be converted with new Date(...)",
      "The server should have sent the date without the Z",
      "JSON.parse only creates Date objects for Unix timestamps",
      "The Content-Type header was wrong",
    ],
    answer: "JSON has no date type, so after parsing dueAt is just a string and must be converted with new Date(...)",
    explanation:
      "Dates are serialized as strings (ideally ISO-8601 UTC, which is what the server did correctly). Deserialization never turns them back into dates automatically; the receiver must parse them.",
    lessonAnchor: "the-pitfalls",
  },
  {
    id: "serialization-invalid-body",
    lectures: [7],
    tags: ["json", "status-codes"],
    type: "scenario",
    prompt:
      "A partner integration calls POST /api/v1/notes with this body:\n{ 'title': 'Groceries', }\nYour server currently crashes and returns 500.\nWhat's wrong with the body, and what should the server reply?",
    fields: [
      {
        label: "Problem",
        options: [
          "Single quotes and a trailing comma aren't valid JSON",
          "Nothing, it's valid JSON",
          "The top level must be an array",
          "Keys can't contain lowercase letters",
        ],
        answer: "Single quotes and a trailing comma aren't valid JSON",
      },
      {
        label: "Response",
        options: ["400 Bad Request", "415 Unsupported Media Type", "422 Unprocessable Content", "500 Internal Server Error"],
        answer: "400 Bad Request",
      },
    ],
    explanation:
      "JSON requires double-quoted strings and keys and forbids trailing commas. A body that can't be parsed is the client's fault, so it's 400, not 500. 415 would be for a wrong Content-Type, and 422 is often used for JSON that parses but fails validation.",
    lessonAnchor: "what-strict-json-rejects",
  },
  {
    id: "serialization-patch-null",
    lectures: [7],
    tags: ["json", "null"],
    type: "mcq",
    prompt:
      "In the notes app, users can clear a note's folder. The frontend sends PATCH /notes/7 built from { folderId: undefined }, but the folder never gets cleared. What's happening?",
    options: [
      "JSON.stringify drops undefined keys, so the body is {} and the server sees no change; send folderId: null instead",
      "undefined becomes the string \"undefined\", which isn't a valid folder",
      "PATCH can't change folder fields",
      "The server should treat {} as \"clear every field\"",
    ],
    answer: "JSON.stringify drops undefined keys, so the body is {} and the server sees no change; send folderId: null instead",
    explanation:
      "undefined has no JSON representation, so the key disappears. For PATCH, a missing field means \"leave it alone\" and an explicit null means \"clear it\". Treating {} as \"clear everything\" would be destructive.",
    lessonAnchor: "the-pitfalls",
  },
  {
    id: "serialization-format-choice",
    lectures: [7],
    tags: ["formats", "protobuf"],
    type: "scenario",
    prompt:
      "You're choosing formats for the shop:\n• A public REST API that third-party developers will call from any language and debug with curl.\n• Internal traffic between the pricing and inventory services: millions of small messages per minute, both teams share a schema repo.\n• The Kubernetes deployment config your team edits by hand.",
    fields: [
      { label: "Public API", options: ["JSON", "Protocol Buffers", "YAML", "Python pickle"], answer: "JSON" },
      { label: "Internal service calls", options: ["JSON", "Protocol Buffers", "YAML", "Python pickle"], answer: "Protocol Buffers" },
      { label: "Deployment config", options: ["JSON", "Protocol Buffers", "YAML", "Python pickle"], answer: "YAML" },
    ],
    explanation:
      "JSON is universal and human-readable, ideal for public APIs. Protobuf's compact binary encoding and shared schema pay off for high-volume internal calls. YAML is the usual choice for hand-edited config. Pickle is Python-only and unsafe on untrusted input.",
    lessonAnchor: "text-and-binary-formats",
  },
  {
    id: "serialization-mass-assignment",
    lectures: [7],
    tags: ["security", "deserialization"],
    type: "mcq",
    prompt:
      "Security review of PATCH /me: the handler deserializes the JSON body and passes the whole object to db.users.update(userId, body). A tester sends {\"name\": \"Asha\", \"role\": \"admin\"} and becomes an admin. What's the right fix?",
    options: [
      "Deserialize into a type (or schema) that only allows the editable fields, and reject or drop the rest",
      "Switch the body format from JSON to Protobuf",
      "Return 500 when unknown fields appear",
      "Hide the role field from API responses",
    ],
    answer: "Deserialize into a type (or schema) that only allows the editable fields, and reject or drop the rest",
    explanation:
      "Deserialized input is untrusted. Mapping it onto an explicit allow-list of fields prevents mass assignment. Changing the format doesn't help, and hiding role from responses doesn't stop clients from sending it.",
    lessonAnchor: "deserialization-is-untrusted-input",
  },
  {
    id: "serialization-round-trip",
    lectures: [7],
    tags: ["serialization"],
    type: "order",
    prompt: "A user saves a note in the React app and the Go server responds. Put the steps in order.",
    steps: [
      "The browser serializes the note object to a JSON string",
      "The request body travels to the server as bytes with Content-Type: application/json",
      "The server deserializes the JSON into a Note struct and validates it",
      "The server saves the note and serializes the result to JSON",
      "The browser deserializes the response and renders the saved note",
    ],
    explanation:
      "Each side converts between its own in-memory representation and the shared JSON format: serialize to send, deserialize to receive. Validation happens right after deserialization, before any business logic.",
    lessonAnchor: "serialization-and-deserialization",
  },
];
