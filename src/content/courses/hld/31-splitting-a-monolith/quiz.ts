import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-split-early-startup",
    lectures: [31],
    tags: ["monolith", "when-to-split"],
    type: "mcq",
    prompt:
      "A 4-person startup is building its first product and still pivoting every few weeks. The CTO wants to start with 12 microservices 'so we won't have to migrate later'. What do you recommend?",
    options: [
      "A modular monolith with clean internal module boundaries, extracting services later when a real need appears",
      "12 microservices with a shared database to keep it simple",
      "One service per database table",
      "Microservices, but all written in different languages to stay flexible",
    ],
    answer: "A modular monolith with clean internal module boundaries, extracting services later when a real need appears",
    explanation:
      "Early on, boundaries are guesses and the team has none of the problems microservices solve. A modular monolith keeps refactoring cheap and leaves seams for extraction later; a shared database would give all the costs with none of the independence.",
    lessonAnchor: "start-with-a-monolith",
  },
  {
    id: "hld-split-good-reasons",
    lectures: [31],
    tags: ["when-to-split"],
    type: "scenario",
    prompt:
      "A 70-engineer company has one monolith. Which of these complaints is the strongest case for extracting a service, and which is the weakest?",
    fields: [
      {
        label: "Strongest reason",
        options: [
          "Video transcoding needs GPU machines and its spikes slow down checkout",
          "Microservices are the industry standard",
          "The code is messy and hard to read",
          "We might need to scale someday",
        ],
        answer: "Video transcoding needs GPU machines and its spikes slow down checkout",
      },
      {
        label: "Weakest reason",
        options: [
          "Video transcoding needs GPU machines and its spikes slow down checkout",
          "Microservices are the industry standard",
          "Card data must be isolated for PCI compliance",
          "Three teams are blocked on one weekly release train",
        ],
        answer: "Microservices are the industry standard",
      },
    ],
    explanation:
      "Different hardware and scaling needs, plus protecting checkout from its spikes, are a concrete pain that a separate service fixes. Fashion is not a reason; and messy code split into services just becomes a messy distributed system.",
    lessonAnchor: "when-to-split",
  },
  {
    id: "hld-split-bounded-context",
    lectures: [31],
    tags: ["ddd", "bounded-context"],
    type: "mcq",
    prompt:
      "Your Product table has 85 columns: SEO text, images, weight, dimensions, hazardous flag, base price, tax class, warehouse quantities. Five teams edit it and every migration needs sign-off from all of them. What's the DDD-style fix?",
    options: [
      "Give each bounded context (catalogue, shipping, pricing, inventory) its own product model, sharing only the product ID",
      "Create a Product service that all teams call for every field",
      "Split the table into 85 single-column tables",
      "Add a lock so only one team migrates at a time",
    ],
    answer: "Give each bounded context (catalogue, shipping, pricing, inventory) its own product model, sharing only the product ID",
    explanation:
      "'Product' means different things in different contexts. Letting each context own only the fields it needs removes the shared bottleneck. A central Product service just moves the 85-column coupling behind an API.",
    lessonAnchor: "bounded-contexts",
  },
  {
    id: "hld-split-layer-services",
    lectures: [31],
    tags: ["service-boundaries", "distributed-monolith"],
    type: "mcq",
    prompt:
      "A team split their app into a Validation service, a Business Logic service and a Data Access service. Now every new feature needs changes and a coordinated deploy of all three. What went wrong?",
    options: [
      "They split by technical layer instead of business capability, creating a distributed monolith",
      "They didn't use enough services; each layer should be split further",
      "They should have used gRPC instead of REST",
      "Layers should be split, but deployed in a single pod",
    ],
    answer: "They split by technical layer instead of business capability, creating a distributed monolith",
    explanation:
      "Every feature cuts through all layers, so layer-based services must always change together. Splitting by capability (orders, payments) lets one team ship a feature in one service.",
    lessonAnchor: "single-responsibility-per-service",
  },
  {
    id: "hld-split-shared-db",
    lectures: [31],
    tags: ["data-ownership", "saga"],
    type: "scenario",
    prompt:
      "The new orders service reads the inventory service's stock table directly with SQL to check availability, and inside the same database transaction decrements stock and inserts the order. The inventory team now can't rename a column without breaking orders.\nFix the design.",
    fields: [
      {
        label: "How orders gets stock",
        options: ["Keep the direct SQL read", "Call the inventory API or react to its events", "Copy the inventory DB nightly", "Merge both into one table"],
        answer: "Call the inventory API or react to its events",
      },
      {
        label: "Placing order plus reserving stock",
        options: ["One cross-service ACID transaction", "A saga with a compensating 'release stock' step", "Two-phase commit across every service", "Skip the reservation"],
        answer: "A saga with a compensating 'release stock' step",
      },
    ],
    explanation:
      "Each service must own its data; direct table access couples schemas and defeats the split. Without shared transactions, a saga runs local steps and undoes earlier ones with compensating actions if a later step fails.",
    lessonAnchor: "data-ownership",
  },
  {
    id: "hld-split-conway",
    lectures: [31],
    tags: ["conways-law", "teams"],
    type: "scenario",
    prompt:
      "An org has 5 product teams of about 7 engineers and runs 90 microservices. Engineers complain they spend most of their time on dependency upgrades, pipelines and on-call for services they barely know.\nWhat's the diagnosis and the fix?",
    fields: [
      {
        label: "Diagnosis",
        options: ["Too few services per team", "Too many services per team; boundaries finer than the org", "Not enough Kubernetes clusters", "The teams are too large"],
        answer: "Too many services per team; boundaries finer than the org",
      },
      {
        label: "Fix",
        options: ["Split further so each service is tinier", "Merge services along business capabilities so each team owns a few", "Hire a separate team for each service", "Move everything to serverless"],
        answer: "Merge services along business capabilities so each team owns a few",
      },
    ],
    explanation:
      "18 services per team means the operational cost of each boundary swamps feature work. Conway's law suggests aligning services with teams, so merging along real capabilities gives each team a handful it can actually own.",
    lessonAnchor: "teams-and-conways-law",
  },
  {
    id: "hld-split-availability-math",
    lectures: [31],
    tags: ["nanoservices", "availability"],
    type: "mcq",
    prompt:
      "Rendering the checkout page synchronously calls 12 services in a chain, each 99.9% available. Roughly what availability should you expect for the page, ignoring retries?",
    options: ["About 98.8%", "99.9%", "99.99%", "About 88%"],
    answer: "About 98.8%",
    explanation:
      "Availability multiplies along a synchronous chain: 0.999 to the 12th power is about 0.988, roughly twelve times the downtime of a single service. That's one of the hidden costs of splitting too finely.",
    lessonAnchor: "the-cost-of-splitting-too-far",
  },
  {
    id: "hld-split-strangler",
    lectures: [31],
    tags: ["strangler-fig", "migration"],
    type: "order",
    prompt: "You're extracting notifications out of a large monolith using the strangler fig pattern. Put the steps in order.",
    steps: [
      "Put a routing facade in front of the monolith",
      "Build the notification service with its own data store",
      "Backfill and sync notification data from the monolith",
      "Route a small share of notification traffic to the new service",
      "Cut over fully and make the service the source of truth",
      "Delete the old notification code from the monolith",
    ],
    explanation:
      "The facade makes redirection possible without touching clients; the service needs its own data before taking traffic; traffic shifts gradually; and deleting old code is the step teams most often skip, leaving two systems doing one job.",
    lessonAnchor: "the-strangler-fig-migration",
  },
  {
    id: "hld-split-first-extraction",
    lectures: [31],
    tags: ["strangler-fig"],
    type: "mcq",
    prompt:
      "Your team is about to extract its first service from the monolith and has no microservice platform yet (no service template, pipeline or tracing). Which module should go first?",
    options: [
      "Email notifications: clear boundary, few dependencies, low risk",
      "Billing: the most tangled and business-critical module",
      "The user table, since everything depends on it",
      "All modules at once in a rewrite",
    ],
    answer: "Email notifications: clear boundary, few dependencies, low risk",
    explanation:
      "The first extraction is where you build the platform and learn, so choose something well-bounded and low-risk. Starting with billing or the user table risks a long, failing migration of the most coupled code.",
    lessonAnchor: "step-by-step",
  },
];
