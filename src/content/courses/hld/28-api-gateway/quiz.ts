import type { Question } from "@/lib/types";

const COMPONENTS = ["API gateway", "Load balancer", "Service mesh", "CDN"];

export const quiz: Question[] = [
  {
    id: "hld-gw-why",
    lectures: [28],
    tags: ["api-gateway"],
    type: "scenario",
    prompt:
      "A shopping app calls 14 microservices directly by hostname. The team wants to split the orders service in two, but app versions from two years ago still call orders.api.shop.com and can't be force-updated. Each service also validates JWTs with its own library, and two of them got it wrong.\nWhat do you introduce, and what's the main benefit for the split?",
    fields: [
      { label: "Component", options: COMPONENTS, answer: "API gateway" },
      { label: "Benefit for the split", options: ["Routing changes in one place while the public API stays the same", "Faster database queries", "Automatic sharding of orders", "Service-to-service mTLS"], answer: "Routing changes in one place while the public API stays the same" },
    ],
    explanation:
      "A gateway is a stable facade: clients keep calling the same public paths while you re-route them to new services behind it. It also centralises token validation so it's done once, correctly.",
    lessonAnchor: "why-microservices-need-a-front-door",
  },
  {
    id: "hld-gw-forged-header",
    lectures: [28],
    tags: ["api-gateway", "auth"],
    type: "scenario",
    prompt:
      "The gateway validates JWTs and passes the user id downstream as X-User-Id. A pentester sends a request with no JWT to a route where auth was accidentally disabled, adds X-User-Id: 1, and reads the admin's orders.\nWhat two fixes close this?",
    fields: [
      { label: "At the gateway", options: ["Strip identity headers from all incoming requests before auth runs", "Cache the response", "Raise the rate limit", "Terminate TLS earlier"], answer: "Strip identity headers from all incoming requests before auth runs" },
      { label: "At the services", options: ["Only trust identity from a signed internal token or verified mTLS caller", "Trust X-User-Id only on GET requests", "Log the header", "Nothing; the gateway is enough"], answer: "Only trust identity from a signed internal token or verified mTLS caller" },
    ],
    explanation:
      "Clients must never be able to set the headers the gateway uses to convey identity. And defence in depth means services verify that identity came from the gateway, so one misconfigured route isn't a full bypass.",
    lessonAnchor: "authentication-and-authorization",
  },
  {
    id: "hld-gw-fine-authz",
    lectures: [28],
    tags: ["api-gateway", "auth"],
    type: "mcq",
    prompt:
      "Where should the check 'user 42 may cancel order 9001 only if they placed it' live?",
    options: [
      "In the orders service, which owns the data about who placed order 9001",
      "In the API gateway, as a route rule",
      "In the load balancer",
      "In the client app",
    ],
    answer: "In the orders service, which owns the data about who placed order 9001",
    explanation:
      "The gateway handles coarse checks: valid token, required scope for the route. Ownership rules need the order's data, so they belong in the service; putting them in the gateway drags business logic and data access into it.",
    lessonAnchor: "authentication-and-authorization",
  },
  {
    id: "hld-gw-mobile-home",
    lectures: [28],
    tags: ["api-gateway", "bff"],
    type: "scenario",
    prompt:
      "The mobile home screen makes 6 API calls to different services and downloads 300 KB, of which it displays maybe 20 KB. On 4G it takes 2 seconds. The web team needs a different, richer shape from the same services.\nWhat pattern fits and who should own it?",
    fields: [
      { label: "Pattern", options: ["Backend for Frontend with aggregation", "Client-side caching only", "Service mesh retries", "Bigger load balancer"], answer: "Backend for Frontend with aggregation" },
      { label: "Owner", options: ["The mobile team, with a separate BFF for web", "One shared gateway team for all clients", "The orders service team", "The DBA team"], answer: "The mobile team, with a separate BFF for web" },
    ],
    explanation:
      "A BFF fans out over the fast internal network and returns one trimmed response, turning six slow round trips into one. Giving each client its own BFF owned by its team avoids one shared layer that every team must coordinate changes on.",
    lessonAnchor: "request-aggregation-and-bff",
  },
  {
    id: "hld-gw-grpc",
    lectures: [28],
    tags: ["api-gateway", "protocols"],
    type: "mcq",
    prompt:
      "Internal services were rewritten to gRPC for efficiency, but browsers and partners must keep using REST with JSON. What's the cleanest approach?",
    options: [
      "Protocol translation at the gateway (gRPC-JSON transcoding)",
      "Make every service serve both REST and gRPC by hand",
      "Force partners to use gRPC",
      "Put a CDN in front of the services",
    ],
    answer: "Protocol translation at the gateway (gRPC-JSON transcoding)",
    explanation:
      "The gateway maps REST routes and JSON bodies onto gRPC methods and Protobuf, so internal teams get the efficient protocol and clients keep the familiar one. Hand-maintaining two interfaces per service duplicates work.",
    lessonAnchor: "protocol-translation",
  },
  {
    id: "hld-gw-which-component",
    lectures: [28],
    tags: ["api-gateway", "service-mesh", "load-balancer"],
    type: "scenario",
    prompt:
      "Match each requirement to the component that should own it:\n1) Third-party developers get API keys with 10,000 calls a month on the free plan.\n2) Calls from payments-svc to ledger-svc must use mutual TLS, retries and per-call metrics.\n3) Spread incoming TCP connections across six gateway instances in two zones.",
    fields: [
      { label: "1) Keys and quotas", options: COMPONENTS, answer: "API gateway" },
      { label: "2) Service-to-service mTLS", options: COMPONENTS, answer: "Service mesh" },
      { label: "3) Spread connections", options: COMPONENTS, answer: "Load balancer" },
    ],
    explanation:
      "Consumers, keys and plans are API-management concepts for north-south traffic. East-west calls between services are the mesh's job. Distributing connections across identical instances is what a load balancer does, including in front of the gateway itself.",
    lessonAnchor: "gateway-load-balancer-and-service-mesh",
  },
  {
    id: "hld-gw-spof",
    lectures: [28],
    tags: ["api-gateway", "availability"],
    type: "scenario",
    prompt:
      "Your self-hosted gateway runs as one VM and keeps rate-limit counters in its own memory. An interviewer points out it is a single point of failure.\nHow do you redesign it?",
    fields: [
      { label: "Deployment", options: ["Many stateless instances across zones behind a load balancer", "One bigger VM", "A standby VM started manually on failure", "Run it on the database server"], answer: "Many stateless instances across zones behind a load balancer" },
      { label: "Rate-limit state", options: ["Shared store such as Redis, with local limits as fallback", "Keep it in each instance's memory only", "Store it in the JWT", "Drop rate limiting"], answer: "Shared store such as Redis, with local limits as fallback" },
    ],
    explanation:
      "Stateless instances let any node serve any request, so losing one or a zone is survivable. Moving counters to a shared store keeps limits correct across instances, and a local fallback avoids failing closed if that store is down.",
    lessonAnchor: "availability",
  },
  {
    id: "hld-gw-slow-backend",
    lectures: [28],
    tags: ["api-gateway", "resilience"],
    type: "scenario",
    prompt:
      "The reviews service starts taking 30 seconds per request. Within minutes, every route through the gateway (login, checkout, search) times out, although those services are healthy.\nWhy, and what should the gateway have had?",
    fields: [
      { label: "Why everything failed", options: ["Requests to reviews held all the gateway's workers and connections", "The gateway's TLS certificate expired", "The load balancer removed all gateway instances", "JWT validation is slow"], answer: "Requests to reviews held all the gateway's workers and connections" },
      { label: "Missing protection", options: ["Per-route timeouts, circuit breaker and isolated pools per backend", "A longer global timeout", "More caching of checkout", "Rigorous 2PL"], answer: "Per-route timeouts, circuit breaker and isolated pools per backend" },
    ],
    explanation:
      "Shared resources let one slow backend starve the rest. Tight per-route timeouts, a breaker that fails fast, and bulkheaded connection pools keep the blast radius to the reviews route.",
    lessonAnchor: "bottleneck-and-blast-radius",
  },
  {
    id: "hld-gw-god",
    lectures: [28],
    tags: ["api-gateway", "anti-patterns"],
    type: "mcq",
    prompt:
      "Over two years, the gateway gained plugins that compute loyalty discounts, pick a warehouse based on stock, and branch on whether a user is premium. Every release now needs four teams to sign off. What's the diagnosis?",
    options: [
      "God-gateway anti-pattern: business logic leaked into the gateway; move it into services or client-owned BFFs",
      "The gateway needs more instances",
      "The gateway should be replaced by a service mesh",
      "The plugins should be rewritten in a faster language",
    ],
    answer: "God-gateway anti-pattern: business logic leaked into the gateway; move it into services or client-owned BFFs",
    explanation:
      "A gateway should be smart about traffic and dumb about business. Business rules belong to the services that own the data; more instances or a mesh don't fix the organisational coupling.",
    lessonAnchor: "the-god-gateway-anti-pattern",
  },
  {
    id: "hld-gw-product",
    lectures: [28],
    tags: ["api-gateway", "products"],
    type: "scenario",
    prompt:
      "Pick a gateway for each team:\n1) A three-person startup running everything on AWS Lambda, wanting JWT auth and throttling with no servers to manage.\n2) A platform team on Kubernetes that already runs an Envoy-based mesh and wants an open, programmable edge proxy with gRPC support.",
    fields: [
      { label: "1) Serverless startup", options: ["AWS API Gateway", "Envoy", "Self-hosted Kong cluster", "HAProxy"], answer: "AWS API Gateway" },
      { label: "2) Kubernetes platform team", options: ["Envoy-based gateway", "AWS API Gateway", "A CDN", "Apigee"], answer: "Envoy-based gateway" },
    ],
    explanation:
      "AWS API Gateway is managed, integrates natively with Lambda and has built-in authorizers and throttling. A team already operating Envoy gets a consistent data plane, xDS configuration and first-class gRPC by using an Envoy-based gateway at the edge.",
    lessonAnchor: "real-world-gateways",
  },
  {
    id: "hld-gw-order",
    lectures: [28],
    tags: ["api-gateway"],
    type: "order",
    prompt: "Order the stages a typical request passes through on its way from a client to a service.",
    steps: [
      "DNS resolves the public API hostname",
      "Load balancer picks a gateway instance",
      "Gateway terminates TLS",
      "Gateway validates the JWT and applies the rate limit",
      "Gateway routes to a healthy instance of the target service",
    ],
    explanation:
      "The load balancer sits in front of the gateway cluster. TLS must be decrypted before the gateway can read headers to authenticate, and cheap rejections (auth, limits) happen before spending a backend call.",
    lessonAnchor: "gateway-load-balancer-and-service-mesh",
  },
];
