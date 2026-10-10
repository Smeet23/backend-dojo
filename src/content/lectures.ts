import type { Lecture } from "@/lib/types";

const yt = (id: string) => `https://www.youtube.com/watch?v=${id}`;

export const lectures: Lecture[] = [
  { id: 1, slug: "roadmap", title: "The roadmap", summary: "The map of everything a backend engineer needs, and the order to learn it in.", videoUrl: yt("0Rwb4Xmlcwc"), minutes: 31, available: true },
  { id: 2, slug: "path-of-a-backend-engineer", title: "Walk the path of a backend engineer", summary: "Why fundamentals beat frameworks.", videoUrl: yt("3qFjZbFRSAU"), minutes: 4, available: true },
  { id: 3, slug: "what-is-a-backend", title: "What is a backend?", summary: "What a backend is, how a request reaches it, and why we need one.", videoUrl: yt("6Ss4dJD9Kzg"), minutes: 19, available: true },
  { id: 4, slug: "first-principles", title: "Why learn from first principles", summary: "Concepts transfer across languages; syntax doesn't.", videoUrl: yt("6fqZs5Z3k9A"), minutes: 10, available: true },
  { id: 5, slug: "http", title: "HTTP for backend engineers", summary: "Statelessness, messages, headers, methods, CORS, status codes, caching and more.", videoUrl: yt("a3C1DMswClQ"), minutes: 78, available: true },
  { id: 6, slug: "routing", title: "Routing", summary: "How a method and URL find their handler: params, route types, versioning.", videoUrl: yt("SubuU1iOC2s"), minutes: 24, available: false },
  { id: 7, slug: "serialization", title: "Serialization and deserialization", summary: "Turning data into bytes on the wire and back: JSON, Protobuf and the pitfalls.", videoUrl: yt("vzg90tY3uM0"), minutes: 22, available: false },
  { id: 8, slug: "auth", title: "Authentication and authorization", summary: "Who are you and what may you do: sessions, JWTs, OAuth, RBAC.", videoUrl: yt("A95rliroC8Q"), minutes: 96, available: false },
  { id: 9, slug: "validation", title: "Validations and transformations", summary: "Reject bad input early, normalise the rest.", videoUrl: yt("qedj_JjjL-U"), minutes: 43, available: false },
  { id: 10, slug: "layers-and-middleware", title: "Controllers, services, repositories and middleware", summary: "Where each kind of code lives, and what wraps every request.", videoUrl: yt("hyc-7w3pee8"), minutes: 60, available: false },
  { id: 11, slug: "rest-api-design", title: "REST API design", summary: "Resources, URLs, methods, pagination, errors and consistency.", videoUrl: yt("RG6q57DwV8Y"), minutes: 124, available: false },
  { id: 12, slug: "postgres", title: "Databases with Postgres", summary: "Schemas, types, constraints, indexes, joins, transactions and migrations.", videoUrl: yt("F7Vwp2Xo5Do"), minutes: 165, available: false },
  { id: 13, slug: "caching", title: "Caching", summary: "Keeping hot data close: strategies, eviction and invalidation.", videoUrl: yt("estH64OkwxU"), minutes: 64, available: false },
  { id: 14, slug: "task-queues", title: "Task queues and background jobs", summary: "Moving slow work off the request path, reliably.", videoUrl: yt("r-nQsyguU1Y"), minutes: 55, available: false },
  { id: 15, slug: "search", title: "Full-text search with Elasticsearch", summary: "Inverted indexes, relevance and when a database isn't enough.", videoUrl: yt("7_sovzAhRSM"), minutes: 32, available: false },
  { id: 16, slug: "error-handling", title: "Error handling and fault tolerance", summary: "Expecting failure and designing systems that survive it.", videoUrl: yt("8NaM_9aKS24"), minutes: 69, available: false },
  { id: 17, slug: "config", title: "Configuration management", summary: "Separating settings and secrets from code, safely.", videoUrl: yt("GR9NtirPXyc"), minutes: 36, available: false },
  { id: 18, slug: "observability", title: "Logging, monitoring and observability", summary: "Logs, metrics and traces: knowing what your system is doing.", videoUrl: yt("5PEuwgLOQQM"), minutes: 40, available: false },
  { id: 19, slug: "graceful-shutdown", title: "Graceful shutdown", summary: "Stopping without dropping requests or corrupting data.", videoUrl: yt("6rfBgphiCWM"), minutes: 35, available: false },
  { id: 20, slug: "security", title: "Backend security", summary: "Injection, auth flaws, XSS, CSRF and defense in depth.", videoUrl: yt("xB1C1xZZW4k"), minutes: 170, available: false },
  { id: 21.1, slug: "scaling-part-1", title: "Scaling and performance, part 1", summary: "Measuring latency, finding bottlenecks and database performance.", videoUrl: yt("z7kt_p44rjs"), minutes: 107, available: false },
  { id: 21.2, slug: "scaling-part-2", title: "Scaling and performance, part 2", summary: "Caching layers, horizontal scaling, load balancing and beyond.", videoUrl: yt("sOhAopEwjH4"), minutes: 138, available: false },
  { id: 22, slug: "concurrency", title: "Concurrency and parallelism", summary: "I/O-bound vs CPU-bound work, and the models languages use for each.", videoUrl: yt("bs9MEYRTA30"), minutes: 88, available: false },
  { id: 23, slug: "object-storage-part-1", title: "Object storage, part 1", summary: "What object storage is and how it stores files durably.", videoUrl: yt("Ie0TjKI9cDI"), minutes: 89, available: false },
  { id: 24, slug: "object-storage-part-2", title: "Object storage, part 2", summary: "Uploads, presigned URLs, multipart and serving files.", videoUrl: yt("iWrVCxexUWY"), minutes: 50, available: false },
  { id: 25, slug: "real-time", title: "Real-time backends", summary: "Polling, SSE, WebSockets and pub/sub.", videoUrl: yt("wUQryt697cs"), minutes: 52, available: false },
  { id: 26, slug: "testing", title: "Testing for backend engineers", summary: "Unit, integration and end-to-end tests; mocks, TDD and coverage.", videoUrl: yt("HgVrfHX92y4"), minutes: 85, available: false },
  { id: 27, slug: "twelve-factor", title: "The Twelve-Factor App", summary: "Twelve rules for apps that deploy and scale cleanly.", videoUrl: yt("2_fcv3-XfN4"), minutes: 93, available: false },
  { id: 28, slug: "openapi", title: "OpenAPI", summary: "A machine-readable contract between clients and servers.", videoUrl: yt("CwKsU84jIWs"), minutes: 44, available: false },
  { id: 29, slug: "webhooks", title: "Webhooks", summary: "How servers call you: delivery, signatures, retries and idempotency.", videoUrl: yt("eWM0CVReP04"), minutes: 56, available: false },
  { id: 30, slug: "devops", title: "DevOps for backend engineers", summary: "Containers, CI/CD, deployments and running services in production.", videoUrl: yt("_E8X5RIJfQ4"), minutes: 108, available: false },
];

export function getLecture(slug: string): Lecture | undefined {
  return lectures.find((l) => l.slug === slug);
}
