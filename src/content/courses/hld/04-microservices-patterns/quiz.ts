import type { Question } from "@/lib/types";

const PATTERNS = [
  "API gateway",
  "Saga",
  "CQRS read model",
  "Event sourcing",
  "Strangler fig",
  "Sidecar",
  "Service discovery",
  "Database per service",
];

export const quiz: Question[] = [
  {
    id: "hld-msp-distributed-monolith",
    lectures: [4],
    tags: ["microservices", "decomposition"],
    type: "scenario",
    prompt:
      "A team split their app into Users, Addresses, Carts and CartItems services. Rendering checkout takes 22 synchronous calls, and any change to the cart needs coordinated releases of Carts and CartItems. Carts and CartItems also read each other's tables.",
    fields: [
      {
        label: "Diagnosis",
        options: ["A distributed monolith from splitting by entity", "Too few services", "Missing a service mesh", "The database is too slow"],
        answer: "A distributed monolith from splitting by entity",
      },
      {
        label: "Fix",
        options: [
          "Merge them along business capabilities (one Cart service owning its data)",
          "Add a cache in front of every service",
          "Split CartItems further",
          "Add an API gateway to hide the calls",
        ],
        answer: "Merge them along business capabilities (one Cart service owning its data)",
      },
    ],
    explanation:
      "Chatty calls, lockstep deploys and shared tables mean the boundaries cut through one capability. A cart and its items change together, so they belong in one service with one database. A gateway would hide the chatter from clients but leave the coupling in place.",
    lessonAnchor: "signs-of-a-bad-split",
  },
  {
    id: "hld-msp-shared-db",
    lectures: [4],
    tags: ["data", "microservices"],
    type: "mcq",
    prompt:
      "The Reporting service runs nightly SQL joins directly against the Orders and Payments databases. The Orders team wants to rename a column and split a table, but every change breaks reports. What's the pattern-level fix?",
    options: [
      "Orders and Payments publish events; Reporting builds its own read store from them",
      "Give Reporting read-only credentials so it can't break anything",
      "Freeze the Orders schema",
      "Move Reporting's queries into the Orders service",
    ],
    answer: "Orders and Payments publish events; Reporting builds its own read store from them",
    explanation:
      "Database per service means only the owner touches its tables; others get data through APIs or events. A CQRS-style read store for reporting decouples schemas. Read-only credentials still couple Reporting to the Orders schema, which is the actual problem.",
    lessonAnchor: "database-per-service",
  },
  {
    id: "hld-msp-gateway",
    lectures: [4],
    tags: ["api-gateway"],
    type: "scenario",
    prompt:
      "Your mobile app calls six services directly to render its home screen, each validating JWTs with slightly different code. Two services recently shipped auth bugs. Mobile users on slow networks complain about load time.",
    fields: [
      { label: "Pattern", options: PATTERNS, answer: "API gateway" },
      {
        label: "What it should take on",
        options: [
          "Token validation, routing and aggregating the home screen calls",
          "Order pricing and discount rules",
          "Storing the user's cart",
          "Running the saga compensations",
        ],
        answer: "Token validation, routing and aggregating the home screen calls",
      },
    ],
    explanation:
      "A gateway (or a mobile BFF) validates auth once, routes, and aggregates six calls into one round trip for the phone. Business rules like pricing don't belong there; a gateway full of domain logic becomes a new monolith at the edge.",
    lessonAnchor: "api-gateway",
  },
  {
    id: "hld-msp-saga-compensate",
    lectures: [4],
    tags: ["saga", "transactions"],
    type: "order",
    prompt:
      "An order saga runs CreateOrder, ReserveStock, ChargeCard, ScheduleDelivery. ScheduleDelivery fails because no courier is available. Order what happens next.",
    steps: [
      "Shipping reports the failure",
      "Payments runs RefundCard",
      "Inventory runs ReleaseStock",
      "Orders runs CancelOrder and marks the order CANCELLED",
    ],
    explanation:
      "Compensations undo completed steps in reverse order: the most recent completed step (the charge) first, back to the first. Each is a new local transaction, a semantic undo, not a database rollback.",
    lessonAnchor: "saga",
  },
  {
    id: "hld-msp-orch-vs-choreo",
    lectures: [4],
    tags: ["saga"],
    type: "scenario",
    prompt:
      "A loan application flow has 11 steps across 7 services, with branches for manual review and regulatory checks. Ops needs to answer \"which applications are stuck, and at which step?\" daily. A separate 2-step flow sends a welcome email after sign-up.",
    fields: [
      { label: "Loan flow", options: ["Orchestration", "Choreography", "Two-phase commit"], answer: "Orchestration" },
      { label: "Welcome email", options: ["Orchestration", "Choreography", "Two-phase commit"], answer: "Choreography" },
    ],
    explanation:
      "A long, branching flow that must be monitored wants an orchestrator that stores the saga's state in one place. A simple reaction to a UserSignedUp event is perfectly served by choreography. 2PC would hold locks across seven services and stall on any failure.",
    lessonAnchor: "orchestration",
  },
  {
    id: "hld-msp-saga-idempotent",
    lectures: [4],
    tags: ["saga", "idempotency"],
    type: "scenario",
    prompt:
      "After a broker failover, some customers were charged twice for one order. Logs show the ChargeCard command for those orders was delivered to Payments twice. Separately, for a few orders, stock was reserved but no command ever reached Payments, even though Inventory's database committed.",
    fields: [
      {
        label: "Fix for double charges",
        options: ["Make ChargeCard idempotent with a key per saga step", "Switch the broker to at-most-once delivery", "Add a second payment provider", "Retry compensations"],
        answer: "Make ChargeCard idempotent with a key per saga step",
      },
      {
        label: "Fix for the missing commands",
        options: ["Transactional outbox in Inventory", "Bigger broker cluster", "Synchronous HTTP instead of events", "Longer timeouts"],
        answer: "Transactional outbox in Inventory",
      },
    ],
    explanation:
      "Brokers deliver at least once, so steps must ignore duplicates; at-most-once would lose commands instead. The missing messages are the dual write problem: Inventory committed but crashed before publishing. Writing the message to an outbox in the same transaction guarantees it gets sent.",
    lessonAnchor: "making-sagas-safe",
  },
  {
    id: "hld-msp-cqrs",
    lectures: [4],
    tags: ["cqrs"],
    type: "scenario",
    prompt:
      "The \"My orders\" page shows each order with product images, current shipping status and whether the user reviewed it. Building it calls Orders, Catalogue, Shipping and Reviews and takes 900 ms at p95. It's read 200 times more often than orders are placed.",
    fields: [
      { label: "Pattern", options: PATTERNS, answer: "CQRS read model" },
      {
        label: "Trade-off to design for",
        options: [
          "A just-placed order may appear a moment late",
          "Orders can no longer be cancelled",
          "Writes become strongly consistent across services",
          "The Catalogue service must be merged into Orders",
        ],
        answer: "A just-placed order may appear a moment late",
      },
    ],
    explanation:
      "A query service subscribing to events from the four services can keep a ready-made order history view, turning four calls into one read. The view is updated asynchronously, so it lags slightly; show the new order from the command's response to hide that.",
    lessonAnchor: "cqrs",
  },
  {
    id: "hld-msp-event-sourcing",
    lectures: [4],
    tags: ["event-sourcing"],
    type: "scenario",
    prompt:
      "A wallet service must let auditors see exactly how any balance was reached and what it was at any past date. After a year, some accounts have 400,000 events and loading them is slow.",
    fields: [
      { label: "Storage pattern", options: PATTERNS, answer: "Event sourcing" },
      {
        label: "Fix for slow loads",
        options: ["Periodic snapshots, replay only later events", "Delete old events", "Store only the current balance", "Move events to a cache"],
        answer: "Periodic snapshots, replay only later events",
      },
    ],
    explanation:
      "An append-only event log gives a full audit trail and lets you rebuild state as of any moment. Snapshots bound replay time without losing history; deleting events or keeping only the balance throws away exactly what auditors need.",
    lessonAnchor: "event-sourcing",
  },
  {
    id: "hld-msp-strangler",
    lectures: [4],
    tags: ["migration", "strangler-fig"],
    type: "scenario",
    prompt:
      "A 10-year-old monolith must move to services. Leadership proposes freezing features for 18 months to rewrite it all. Search is the most painful part: it changes weekly and needs very different scaling.",
    fields: [
      { label: "Approach", options: PATTERNS, answer: "Strangler fig" },
      {
        label: "First step",
        options: [
          "Put a routing facade in front of the monolith, then move search behind it",
          "Rewrite the checkout flow first",
          "Split the database into eight schemas",
          "Freeze features and start the rewrite",
        ],
        answer: "Put a routing facade in front of the monolith, then move search behind it",
      },
    ],
    explanation:
      "The strangler fig moves one capability at a time behind a facade, so each step is small, reversible and delivers value. Search has clear boundaries and real pain, making it a good first extraction. A big-bang rewrite delays all value and carries the most risk.",
    lessonAnchor: "strangler-fig",
  },
  {
    id: "hld-msp-sidecar",
    lectures: [4],
    tags: ["sidecar", "service-mesh"],
    type: "scenario",
    prompt:
      "Your 40 services are written in Go, Java, Python and Node. Security requires mutual TLS for every internal call, and SRE wants identical retry, timeout and metrics behaviour everywhere. Each language's library does it slightly differently.",
    fields: [
      { label: "Pattern", options: PATTERNS, answer: "Sidecar" },
      {
        label: "Main cost",
        options: ["Extra CPU, memory and a local hop per instance", "Services must be rewritten in one language", "No more independent deploys", "Loss of service discovery"],
        answer: "Extra CPU, memory and a local hop per instance",
      },
    ],
    explanation:
      "A proxy sidecar next to every instance handles mTLS, retries and metrics identically, regardless of language, and is upgraded independently. The price is resources and a little latency on every call; services don't need rewriting.",
    lessonAnchor: "sidecar",
  },
  {
    id: "hld-msp-discovery",
    lectures: [4],
    tags: ["service-discovery"],
    type: "mcq",
    prompt:
      "Your services run on Kubernetes with pods autoscaling between 3 and 60 replicas. A teammate proposes keeping a config file of pod IP addresses for each service. What's the better approach?",
    options: [
      "Call the service by its Kubernetes Service DNS name, which tracks healthy pods",
      "Update the config file from a cron job every hour",
      "Pin each service to fixed IP addresses",
      "Route all internal calls through the public API gateway",
    ],
    answer: "Call the service by its Kubernetes Service DNS name, which tracks healthy pods",
    explanation:
      "Pods come and go with new IPs; Kubernetes registers healthy pods behind a stable Service name, which is server-side discovery. A cron-updated file is stale between runs, and sending internal traffic out through the public gateway adds a hop and exposure for nothing.",
    lessonAnchor: "service-discovery",
  },
];
