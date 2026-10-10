"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const languages = ["Node.js", "Go", "Python", "Rust"] as const;
type Language = (typeof languages)[number];

type Concept = { name: string; idea: string; tools: Record<Language, string> };

const concepts: Concept[] = [
  {
    name: "Routing",
    idea: "Map method + path to a handler function.",
    tools: { "Node.js": "Express / Hono", Go: "net/http ServeMux / chi", Python: "FastAPI / Django URLs", Rust: "Axum" },
  },
  {
    name: "Validation",
    idea: "Reject bad input at the edge, before business logic runs.",
    tools: { "Node.js": "Zod", Go: "go-playground/validator", Python: "Pydantic", Rust: "serde + validator / garde" },
  },
  {
    name: "Middleware",
    idea: "Wrap every request with cross-cutting logic (logging, auth).",
    tools: { "Node.js": "app.use(fn)", Go: "func(http.Handler) http.Handler", Python: "FastAPI middleware / dependencies", Rust: "tower layers" },
  },
  {
    name: "Database access",
    idea: "Talk to Postgres over a pooled connection; run migrations.",
    tools: { "Node.js": "postgres.js / pg / Drizzle", Go: "pgx", Python: "SQLAlchemy / asyncpg", Rust: "sqlx / Diesel" },
  },
  {
    name: "Async I/O",
    idea: "Don't block a thread while waiting on the network or disk.",
    tools: { "Node.js": "event loop + async/await", Go: "goroutines", Python: "asyncio", Rust: "Tokio + async/await" },
  },
];

export function ConceptTranslator() {
  const [lang, setLang] = useState<Language>("Go");
  return (
    <Widget title="Same concept, different syntax" hint="Pick a language. The concepts on the left never change; only the tool names do.">
      <div className="flex flex-wrap gap-2">
        {languages.map((l) => <Pill key={l} active={lang === l} onClick={() => setLang(l)}>{l}</Pill>)}
      </div>
      <ul className="mt-4 space-y-2">
        {concepts.map((c) => (
          <li key={c.name} className="grid gap-1 rounded-lg border border-border p-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">
            <div>
              <p className="font-semibold">{c.name}</p>
              <p className="text-muted-foreground">{c.idea}</p>
            </div>
            <p className="rounded-md bg-primary/10 px-2 py-1 font-mono text-[0.8rem] text-primary sm:text-right">{c.tools[lang]}</p>
          </li>
        ))}
      </ul>
    </Widget>
  );
}
