import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-roadmap-which-round",
    lectures: [1],
    tags: ["interviews", "lld", "hld"],
    type: "scenario",
    prompt:
      "Two prompts arrive for next week's loop. Prompt 1: \"Design a library management system; we'll want to see your classes and some code.\" Prompt 2: \"Design a news feed for 200 million daily users.\" Classify each and pick the main thing it is graded on.",
    fields: [
      { label: "Prompt 1 is", options: ["LLD", "HLD"], answer: "LLD" },
      { label: "Prompt 2 is", options: ["LLD", "HLD"], answer: "HLD" },
      {
        label: "Prompt 2 is mainly graded on",
        options: ["Reasoning about trade-offs at scale", "Number of design patterns used", "Working code for every endpoint", "Naming the most technologies"],
        answer: "Reasoning about trade-offs at scale",
      },
    ],
    explanation:
      "Classes plus code inside one program is LLD. A feed for hundreds of millions of users is about services, storage, caching and fan-out: HLD, judged on how well you reason about trade-offs, not on how many tools you can name.",
    lessonAnchor: "two-kinds-of-design",
  },
  {
    id: "hld-roadmap-interview-order",
    lectures: [1],
    tags: ["interviews", "hld"],
    type: "order",
    prompt: "Put the phases of a well-run HLD interview in order.",
    steps: [
      "Clarify functional and non-functional requirements",
      "Estimate QPS, storage and bandwidth",
      "Sketch the API and data model",
      "Draw the high-level architecture for the core flows",
      "Deep dive into two or three hard parts",
      "Discuss bottlenecks, failure modes and 10x scale",
    ],
    explanation:
      "Requirements and numbers come first because every later choice depends on them. Deep dives only make sense once the overall shape exists, and bottlenecks are judged against that finished shape.",
    lessonAnchor: "the-hld-round",
  },
  {
    id: "hld-roadmap-overkill",
    lectures: [1],
    tags: ["interviews", "estimation"],
    type: "mcq",
    prompt:
      "Asked to design an internal tool for a 300-person company, a candidate draws Kafka, five microservices, a sharded Cassandra cluster and a Redis cache. The estimate they skipped would have shown about 5 requests per second. What's the main problem?",
    options: [
      "The design is not sized to the requirements",
      "Cassandra should have been MongoDB",
      "They should have added a CDN",
      "They forgot a service mesh",
    ],
    answer: "The design is not sized to the requirements",
    explanation:
      "At a few requests per second, one relational database and a simple service is the strong answer. Swapping one heavy component for another doesn't fix the real mistake: designing for scale the numbers don't call for.",
    lessonAnchor: "common-mistakes",
  },
  {
    id: "hld-roadmap-order-topics",
    lectures: [1],
    tags: ["learning-path"],
    type: "order",
    prompt: "You have six weeks before interviews. Order these topics so each builds on the previous one.",
    steps: [
      "TCP, UDP and HTTP",
      "Load balancers and back-of-the-envelope estimation",
      "Replication, CAP and consistent hashing",
      "Caching and message queues",
      "Circuit breakers, retries and rate limiting",
      "Full case study: design WhatsApp",
    ],
    explanation:
      "Networking underlies everything; distribution concepts like CAP and sharding are needed before caches and queues make sense; resilience patterns assume you know what can fail; a full case study combines all of them.",
    lessonAnchor: "a-learning-order",
  },
  {
    id: "hld-roadmap-practice",
    lectures: [1],
    tags: ["practice"],
    type: "scenario",
    prompt:
      "You've read about every HLD topic but freeze in mock interviews: you spend 25 minutes on requirements, then run out of time before any deep dive. Your diagrams also include a cache you can't explain.",
    fields: [
      {
        label: "Best practice habit",
        options: ["Timed design sessions out loud", "Read more case studies", "Memorise reference architectures", "Learn another database"],
        answer: "Timed design sessions out loud",
      },
      {
        label: "For the unexplained cache",
        options: ["Justify it or remove it", "Keep it; caches always help", "Replace it with a CDN", "Add a second cache layer"],
        answer: "Justify it or remove it",
      },
    ],
    explanation:
      "Running out of time is a pacing problem, fixed by rehearsing the full sequence against a clock, not by more reading. Every box should have a reason and a cost you can state; a cache added out of habit invites questions about invalidation you can't answer.",
    lessonAnchor: "how-to-practise",
  },
  {
    id: "hld-roadmap-lld-signal",
    lectures: [1],
    tags: ["lld", "interviews"],
    type: "mcq",
    prompt:
      "In an LLD round for a payment module, the candidate's code has a `switch (provider)` in five places. The interviewer asks how they'd add a new provider. What change best shows LLD skill?",
    options: [
      "Introduce a PaymentProvider interface with one class per provider",
      "Add a sixth case to each switch",
      "Move the switch statements into a single utility file",
      "Put each provider behind its own microservice",
    ],
    answer: "Introduce a PaymentProvider interface with one class per provider",
    explanation:
      "Programming to an interface (a strategy per provider) means adding a provider is adding a class, with no edits to existing code. Splitting into microservices is an HLD move that doesn't answer an in-process design question.",
    lessonAnchor: "the-lld-round",
  },
];
