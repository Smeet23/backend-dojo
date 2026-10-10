import type { Course, Lecture } from "@/lib/types";

export const course: Course = {
  id: "system-design",
  title: "System Design",
  summary: "How large systems are built: the core building blocks, then real designs like Redis, Google Docs, Uber and Instagram Reels.",
  author: "Mayank Joshi",
  playlistUrl: "https://www.youtube.com/playlist?list=PLtUBJBQF5VJgSzegWtlFiNTWehra8eSHU",
};

const yt = (id: string) => `https://www.youtube.com/watch?v=${id}`;

export const lectures: Lecture[] = [
  { id: 1, slug: "roadmap", title: "The system design roadmap", summary: "What to learn, in what order, to design large systems and handle design interviews.", videoUrl: yt("yCzyTijM97Q"), minutes: 16, available: true },
  { id: 2, slug: "fundamentals", title: "System design fundamentals", summary: "The big ideas behind every large system: scaling, storage, caching, queues and trade-offs.", videoUrl: yt("iG5MiPFdk-o"), minutes: 50, available: true },
  { id: 3, slug: "crash-course", title: "System design crash course", summary: "A fast tour of the building blocks: load balancers, databases, caches, CDNs, queues and more.", videoUrl: yt("3O2k54JqkLY"), minutes: 73, available: true },
  { id: 4, slug: "design-redis", title: "Design Redis", summary: "How an in-memory key-value store works: data structures, persistence, replication and clustering.", videoUrl: yt("XJVl6BsV0_0"), minutes: 37, available: true },
  { id: 5, slug: "design-google-docs", title: "Design Google Docs", summary: "Real-time collaborative editing: conflicts, operational transforms, CRDTs and presence.", videoUrl: yt("nePAYwfniOY"), minutes: 31, available: true },
  { id: 6, slug: "design-uber", title: "Design Uber", summary: "Ride matching at scale: live locations, geo indexing, dispatch and trip state.", videoUrl: yt("Tq72Pq0entg"), minutes: 24, available: true },
  { id: 7, slug: "design-instagram-reels", title: "Design Instagram Reels", summary: "Short-video upload, processing, storage, feeds and delivery at massive scale.", videoUrl: yt("l_ame7Nmm1U"), minutes: 35, available: true },
  { id: 8, slug: "event-driven-architecture", title: "Event-driven architecture", summary: "Services that talk through events: brokers, pub/sub, delivery guarantees and pitfalls.", videoUrl: yt("ub7Sp6vC_j8"), minutes: 28, available: true },
  { id: 9, slug: "database-replication", title: "Database replication", summary: "Copies of your data: leader/follower, sync vs async, replication lag and failover.", videoUrl: yt("fsZA4K0E3kQ"), minutes: 19, available: true },
  { id: 10, slug: "rate-limiting", title: "Rate limiting", summary: "Protecting systems from overload: token bucket, sliding window and where to enforce limits.", videoUrl: yt("COQNpbNGFJU"), minutes: 14, available: true },
  { id: 11, slug: "polling-sse-websockets", title: "Polling vs SSE vs WebSockets", summary: "Getting fresh data to clients: polling, long polling, server-sent events and WebSockets.", videoUrl: yt("IIhXKoomoNY"), minutes: 24, available: true },
  { id: 12, slug: "leader-election", title: "Leader election", summary: "Picking one leader among many nodes: the bully and ring algorithms, and failure handling.", videoUrl: yt("OV6-u5Jyog0"), minutes: 22, available: true },
  { id: 13, slug: "consistent-hashing", title: "Consistent hashing", summary: "Spreading keys across nodes so adding or removing one moves as little data as possible.", videoUrl: yt("glShRZhRszA"), minutes: 16, available: true },
  { id: 14, slug: "distributed-locks", title: "Distributed locks", summary: "Mutual exclusion across machines: Redis locks, leases, fencing tokens and their limits.", videoUrl: yt("PO0Jf5R4MK4"), minutes: 28, available: true },
];
