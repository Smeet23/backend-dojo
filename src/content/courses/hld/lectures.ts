import type { Course, Lecture } from "@/lib/types";

export const course: Course = {
  id: "hld",
  title: "High Level Design",
  summary: "From CAP and scaling to microservices, distributed transactions and fault tolerance, plus classic designs like TinyURL and WhatsApp.",
  author: "Concept && Coding",
  playlistUrl: "https://www.youtube.com/playlist?list=PL6W8uoQQ2c63W58rpNFDwdrBnq5G3EfT7",
};

const yt = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/**
 * Every HLD lesson is written from the topic. Members-only videos have videoUrl null;
 * public ones are linked as a related video (writtenFromTopic).
 */
export const lectures: Lecture[] = [
  { id: 1, slug: "roadmap", title: "The LLD and HLD roadmap", summary: "What low-level and high-level design cover, and the order to learn them in.", videoUrl: yt("rliSgjoOFTs"), writtenFromTopic: true, minutes: 0, available: true },
  { id: 2, slug: "network-protocols", title: "Network protocols", summary: "TCP vs UDP, HTTP/1.1 to HTTP/3, WebSockets, gRPC and WebRTC: which protocol fits which job.", videoUrl: yt("JwTiZ9ENquI"), writtenFromTopic: true, minutes: 0, available: true },
  { id: 3, slug: "cap-theorem", title: "CAP theorem", summary: "Consistency, availability and partition tolerance: what you can and can't have together.", videoUrl: yt("3qRBeZsUa18"), writtenFromTopic: true, minutes: 0, available: true },
  { id: 4, slug: "microservices-patterns", title: "Microservices design patterns", summary: "Decomposing a system into services, and the patterns that hold them together.", videoUrl: yt("l1OCmsBnQ3g"), writtenFromTopic: true, minutes: 0, available: true },
  { id: 5, slug: "saga-pattern", title: "SAGA pattern", summary: "Long-running transactions across services with compensating steps, orchestrated or choreographed.", videoUrl: yt("qGlUKtjqaEQ"), writtenFromTopic: true, minutes: 0, available: true },
  { id: 6, slug: "scale-to-millions", title: "Scale from zero to millions of users", summary: "How a single-server app grows: load balancers, replicas, caches, CDNs, sharding and queues.", videoUrl: yt("rExh5cPMZcI"), writtenFromTopic: true, minutes: 0, available: true },
  { id: 7, slug: "consistent-hashing", title: "Consistent hashing", summary: "Placing keys on a ring so adding or removing servers moves as little data as possible.", videoUrl: yt("jqUNbqfsnuw"), writtenFromTopic: true, minutes: 0, available: true },
  { id: 8, slug: "design-tinyurl", title: "Design a URL shortener", summary: "Short codes, base62, key generation, redirects, caching and analytics for a TinyURL-style service.", videoUrl: null, minutes: 0, available: true },
  { id: 9, slug: "back-of-the-envelope", title: "Back-of-the-envelope estimation", summary: "Quick capacity math: QPS, storage, bandwidth and memory from a handful of assumptions.", videoUrl: null, minutes: 0, available: true },
  { id: 10, slug: "design-key-value-store", title: "Design a key-value store", summary: "Partitioning, replication, quorums, versioning and failure handling in a distributed KV store.", videoUrl: null, minutes: 0, available: true },
  { id: 11, slug: "sql-vs-nosql", title: "SQL vs NoSQL", summary: "Relational vs document, key-value, wide-column and graph stores, and how to choose.", videoUrl: null, minutes: 0, available: true },
  { id: 12, slug: "design-whatsapp", title: "Design WhatsApp", summary: "One-to-one and group messaging, delivery receipts, presence, offline delivery and media.", videoUrl: null, minutes: 0, available: true },
  { id: 13, slug: "design-rate-limiter", title: "Design a rate limiter", summary: "Algorithms, where the limiter lives, distributed counters and the response a client sees.", videoUrl: null, minutes: 0, available: true },
  { id: 14, slug: "idempotent-post-api", title: "Design an idempotent POST API", summary: "Idempotency keys, safe retries and exactly-once effects for create and payment endpoints.", videoUrl: null, minutes: 0, available: true },
  { id: 15, slug: "high-availability", title: "High availability and resilience", summary: "Redundancy, failover, health checks, multi-AZ and multi-region designs, and measuring uptime.", videoUrl: null, minutes: 0, available: true },
  { id: 16, slug: "distributed-message-queue", title: "Distributed messaging queue", summary: "Producers, brokers, partitions, consumer groups, ordering and delivery guarantees.", videoUrl: yt("oVZtzZVe9Dg"), writtenFromTopic: true, minutes: 0, available: true },
  { id: 17, slug: "proxy-vs-reverse-proxy", title: "Proxy vs reverse proxy", summary: "Forward proxies, reverse proxies and what each is used for.", videoUrl: null, minutes: 0, available: true },
  { id: 18, slug: "load-balancing", title: "Load balancers and algorithms", summary: "L4 vs L7 balancing, round robin, least connections, hashing and health checks.", videoUrl: null, minutes: 0, available: true },
  { id: 19, slug: "distributed-cache", title: "Distributed cache and caching strategies", summary: "Cache-aside, read/write-through, write-back, eviction and keeping a distributed cache consistent.", videoUrl: null, minutes: 0, available: true },
  { id: 20, slug: "distributed-transactions", title: "Distributed transactions", summary: "Two-phase commit, three-phase commit and SAGA: keeping data consistent across services.", videoUrl: null, minutes: 0, available: true },
  { id: 21, slug: "database-indexing", title: "Database indexing", summary: "How B+ trees and other indexes speed up queries, composite and covering indexes, and what they cost.", videoUrl: yt("6ZquiVH8AGU"), writtenFromTopic: true, minutes: 0, available: true },
  { id: 22, slug: "concurrency-control", title: "Concurrency control in distributed systems", summary: "Optimistic vs pessimistic locking, isolation levels and distributed locking.", videoUrl: yt("D3XhDu--uoI"), writtenFromTopic: true, minutes: 0, available: true },
  { id: 23, slug: "two-phase-locking", title: "Two-phase locking (2PL)", summary: "Basic, strict and rigorous 2PL, deadlocks and how databases avoid them.", videoUrl: yt("lceenm34m-w"), writtenFromTopic: true, minutes: 0, available: true },
  { id: 24, slug: "oauth2", title: "OAuth 2.0", summary: "Delegated authorization: roles, grant types, tokens and the authorization code flow with PKCE.", videoUrl: null, minutes: 0, available: true },
  { id: 25, slug: "encryption", title: "Symmetric and asymmetric encryption", summary: "AES, RSA, Diffie-Hellman key exchange and digital signatures, and how TLS combines them.", videoUrl: null, minutes: 0, available: true },
  { id: 26, slug: "jwt", title: "JWT", summary: "Structure, signing, validation, expiry and revocation of JSON Web Tokens.", videoUrl: null, minutes: 0, available: true },
  { id: 27, slug: "thundering-herd", title: "Thundering herd", summary: "When many clients hit the same thing at once: cache stampedes, ticket drops and the fixes.", videoUrl: null, minutes: 0, available: true },
  { id: 28, slug: "api-gateway", title: "API gateway and microservices", summary: "What a gateway does: routing, auth, rate limits, aggregation, and how it differs from a load balancer.", videoUrl: yt("dkgxvnk8cWw"), writtenFromTopic: true, minutes: 0, available: true },
  { id: 29, slug: "service-mesh", title: "Service mesh", summary: "Sidecar proxies, the control plane, mTLS, retries and observability between services.", videoUrl: null, minutes: 0, available: true },
  { id: 30, slug: "how-dns-works", title: "How DNS works", summary: "Resolvers, root, TLD and authoritative servers, record types, caching and TTLs.", videoUrl: null, minutes: 0, available: true },
  { id: 31, slug: "splitting-a-monolith", title: "How many microservices?", summary: "Deciding service boundaries when splitting a monolith, and the cost of splitting too far.", videoUrl: null, minutes: 0, available: true },
  { id: 32, slug: "web-attacks", title: "Web attacks: CSRF, XSS, CORS and SQL injection", summary: "How each attack works and the defenses that stop it.", videoUrl: null, minutes: 0, available: true },
  { id: 33, slug: "dual-write-problem", title: "Dual write problem", summary: "Why writing to a database and a queue separately breaks, and the outbox and CDC fixes.", videoUrl: null, minutes: 0, available: true },
  { id: 34, slug: "service-discovery", title: "Service discovery", summary: "Client-side vs server-side discovery, registries, health checks and DNS-based discovery.", videoUrl: null, minutes: 0, available: true },
  { id: 35, slug: "fault-tolerance-rate-limiter", title: "Fault tolerance: rate limiting", summary: "Using rate limits and load shedding to protect services from overload and cascading failure.", videoUrl: null, minutes: 0, available: true },
  { id: 36, slug: "bulkhead-pattern", title: "Bulkhead pattern", summary: "Isolating resources so one failing dependency can't sink the whole service.", videoUrl: null, minutes: 0, available: true },
  { id: 37, slug: "retry-pattern", title: "Retry pattern", summary: "When and how to retry: backoff, jitter, budgets and idempotency.", videoUrl: null, minutes: 0, available: true },
  { id: 38, slug: "circuit-breaker", title: "Circuit breaker pattern", summary: "Closed, open and half-open states, and failing fast when a dependency is down.", videoUrl: null, minutes: 0, available: true },
];
