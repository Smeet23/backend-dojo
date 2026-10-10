"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Topic = { name: string; what: string };
type Stage = { label: string; question: string; topics: Topic[] };

const stages: Stage[] = [
  {
    label: "Talking to clients",
    question: "How does a request arrive and get understood?",
    topics: [
      { name: "How a request reaches you", what: "DNS, firewalls, reverse proxies: every hop between a browser and your code." },
      { name: "HTTP", what: "The language of the web: messages, headers, methods, status codes, CORS, caching." },
      { name: "Routing", what: "Mapping method + URL to the right handler; path vs query params; versioning." },
      { name: "Serialization", what: "Turning native objects into JSON/Protobuf on the wire and back again." },
    ],
  },
  {
    label: "Trust & correctness",
    question: "Who is this, may they do it, and is the input sane?",
    topics: [
      { name: "Auth", what: "Authentication (who are you?) vs authorization (are you allowed?): sessions, JWT, OAuth, RBAC." },
      { name: "Validation", what: "Syntactic, semantic and type checks; normalising and sanitising input." },
      { name: "Middleware & context", what: "Code that wraps every request: logging, auth, rate limits, and request-scoped data." },
    ],
  },
  {
    label: "Structure & data",
    question: "Where does logic live, and where does data live?",
    topics: [
      { name: "Handlers, services, repositories", what: "Presentation → business logic → data access: one job per layer." },
      { name: "REST API design", what: "Resources, consistent responses, pagination, filtering, versioning." },
      { name: "Databases", what: "Relational vs NoSQL, ACID, indexes, joins, transactions, migrations, pooling." },
      { name: "Caching", what: "Keep hot data close: strategies, eviction, invalidation." },
    ],
  },
  {
    label: "Work beyond the request",
    question: "What happens off the hot path?",
    topics: [
      { name: "Queues & scheduling", what: "Push slow work (emails, images, cleanups) to background workers; cron jobs." },
      { name: "Search", what: "Full-text search with inverted indexes (e.g. Elasticsearch)." },
      { name: "Webhooks & real-time", what: "Servers pushing to other servers (webhooks) and to clients (WebSockets/SSE)." },
      { name: "Object storage", what: "Files in S3-style storage: multipart uploads, streaming, presigned URLs." },
    ],
  },
  {
    label: "Production",
    question: "How does it survive real traffic and real failures?",
    topics: [
      { name: "Errors & fault tolerance", what: "Fail fast vs fail safe, global error handlers, graceful degradation." },
      { name: "Config", what: "Separate settings and secrets from code; feature flags." },
      { name: "Observability", what: "Logs, metrics and traces, and alerts that matter." },
      { name: "Graceful shutdown", what: "Catch the signal, stop accepting, finish in-flight work, close resources." },
      { name: "Security", what: "Injection, XSS, CSRF, least privilege, defense in depth." },
      { name: "Scaling & concurrency", what: "Find bottlenecks; concurrency for I/O-bound, parallelism for CPU-bound." },
      { name: "Testing, 12-factor, OpenAPI, DevOps", what: "Ship confidently: tests, portable apps, API contracts, CI/CD, containers." },
    ],
  },
];

export function RoadmapExplorer() {
  const [active, setActive] = useState(0);
  const stage = stages[active];
  return (
    <Widget title="The backend map" hint="The whole course in five stages. Tap a stage to see what it covers.">
      <div className="flex flex-wrap gap-2">
        {stages.map((s, i) => (
          <Pill key={s.label} active={active === i} onClick={() => setActive(i)}>{i + 1}. {s.label}</Pill>
        ))}
      </div>
      <p className="mt-4 text-sm font-medium">{stage.question}</p>
      <ul className="mt-2 space-y-2">
        {stage.topics.map((t) => (
          <li key={t.name} className="rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="font-semibold">{t.name}:</span> {t.what}
          </li>
        ))}
      </ul>
    </Widget>
  );
}
