import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "principles-tool-choice",
    lectures: [4],
    tags: ["architecture"],
    type: "scenario",
    prompt: "Pick the best-fit tool for each requirement.",
    fields: [
      { label: "Rate-limit counters checked on every request", options: ["Redis", "Postgres", "MongoDB", "Kafka"], answer: "Redis" },
      { label: "Orders and payments that must never be half-written", options: ["Redis", "Postgres", "MongoDB", "Kafka"], answer: "Postgres" },
      { label: "Millions of click events streamed to several consumers", options: ["Redis", "Postgres", "MongoDB", "Kafka"], answer: "Kafka" },
      { label: "Product catalog where each item has very different attributes", options: ["Redis", "Postgres", "MongoDB", "Kafka"], answer: "MongoDB" },
    ],
    explanation:
      "Redis is fast in-memory storage for hot counters. Postgres gives transactions for money. Kafka is built for high-volume event streams. A document store suits flexible, varied shapes (Postgres JSONB is also a strong option).",
    lessonAnchor: "benefit-5-choosing-the-right-tool",
  },
  {
    id: "principles-switch-order",
    lectures: [4],
    tags: ["mindset"],
    type: "order",
    prompt: "You're moving from Node.js to Rust for a new service. Order the first-principles approach.",
    steps: [
      "List the building blocks you already know (routing, validation, auth…)",
      "Start from the community-recommended project layout",
      "Implement one block at a time using the idiomatic library",
      "Apply the best practices you already know to each block",
    ],
    explanation:
      "Inventory the concepts, scaffold the idiomatic layout, then translate block by block. The concepts carry over; only the syntax and libraries are new.",
    lessonAnchor: "how-to-switch-languages",
  },
  {
    id: "principles-unfamiliar-bug",
    lectures: [4],
    tags: ["debugging", "mindset"],
    type: "mcq",
    prompt:
      "You're asked to fix \"users can see other people's invoices\" in an unfamiliar Go codebase. Where's the smartest place to start?",
    options: [
      "Find the route for invoices, then the authorization check in its middleware/service",
      "Read the whole codebase top to bottom first",
      "Learn Go syntax for a week before touching it",
      "Rewrite the service in a language you know",
    ],
    answer: "Find the route for invoices, then the authorization check in its middleware/service",
    explanation:
      "Thinking in building blocks narrows the search: this is an authorization bug, so follow the request path (route → middleware → service) to wherever ownership is checked.",
    lessonAnchor: "benefit-1-seeing-the-big-picture",
  },
  {
    id: "principles-validation-translation",
    lectures: [4],
    tags: ["mindset"],
    type: "scenario",
    prompt: "\"Validate request bodies at the edge\" is one concept. Match it to the common library in each ecosystem.",
    fields: [
      { label: "TypeScript", options: ["Zod", "Pydantic", "go-playground/validator"], answer: "Zod" },
      { label: "Python", options: ["Zod", "Pydantic", "go-playground/validator"], answer: "Pydantic" },
      { label: "Go", options: ["Zod", "Pydantic", "go-playground/validator"], answer: "go-playground/validator" },
    ],
    explanation: "The idea (reject bad input before business logic) is identical everywhere; only the library name changes.",
    lessonAnchor: "benefit-4-less-syntax-fatigue",
  },
  {
    id: "principles-burnout",
    lectures: [4],
    tags: ["mindset"],
    type: "mcq",
    prompt: "Why do many people burn out when learning a new backend language?",
    options: [
      "They try to learn the language and the backend concepts at the same time",
      "New languages are always worse",
      "Documentation is never available",
      "Backend work requires memorising syntax",
    ],
    answer: "They try to learn the language and the backend concepts at the same time",
    explanation:
      "If the concepts are already solid, a new language becomes \"what's the idiomatic way to do X?\" for a list of X's you already understand.",
    lessonAnchor: "benefit-4-less-syntax-fatigue",
  },
];
