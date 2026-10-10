import type { Question } from "@/lib/types";

const SOURCES = ["Code defaults", "config.yaml", "Environment variable from a secret manager", "Feature flag service", "Hard-coded constant"];

export const quiz: Question[] = [
  {
    id: "config-where-to-store",
    lectures: [17],
    tags: ["storage", "secrets", "feature-flags"],
    type: "scenario",
    prompt: "You're setting up configuration for a shop's backend. Where should each setting come from?",
    fields: [
      { label: "Production Stripe secret key", options: SOURCES, answer: "Environment variable from a secret manager" },
      { label: "New checkout flow, on for 10% of users, toggled during the day", options: SOURCES, answer: "Feature flag service" },
      { label: "Per-environment log level and pool size, with comments explaining them", options: SOURCES, answer: "config.yaml" },
      { label: "Fallback port 8080 if nothing else sets it", options: SOURCES, answer: "Code defaults" },
    ],
    explanation:
      "Secrets live in a secret manager and reach the app as injected env vars. Runtime flags need a service the app checks per request, since env vars are read once at startup. Non-secret, structured settings fit a commented YAML file, and safe fallbacks belong in code defaults.",
    lessonAnchor: "where-configuration-lives",
  },
  {
    id: "config-missing-key-runtime",
    lectures: [17],
    tags: ["validation", "fail-fast"],
    type: "mcq",
    prompt:
      "Production incident: two hours after a deploy, every refund request returns 500 with \"Cannot read properties of undefined\". The new REFUND_WEBHOOK_SECRET env var was never set in production. What would have prevented the user impact?",
    options: [
      "Validating all config against a schema at startup, so the new version refuses to start",
      "Reading process.env.REFUND_WEBHOOK_SECRET inside the refund handler",
      "Defaulting the secret to an empty string",
      "Logging the full environment at startup",
    ],
    answer: "Validating all config against a schema at startup, so the new version refuses to start",
    explanation:
      "Startup validation turns a missing required value into a failed deploy, and the old version keeps serving. An empty-string default hides the problem, and logging the whole environment leaks secrets.",
    lessonAnchor: "validate-at-startup",
  },
  {
    id: "config-precedence",
    lectures: [17],
    tags: ["precedence"],
    type: "scenario",
    prompt:
      "Your loader merges, lowest to highest priority: code defaults, config.yaml, env vars, CLI flags. Defaults set LOG_LEVEL=info, config.yaml sets LOG_LEVEL=warn, the container sets LOG_LEVEL=error, and an operator starts the process with --log-level=debug.",
    fields: [
      { label: "Effective log level", options: ["info", "warn", "error", "debug"], answer: "debug" },
      { label: "Effective log level if the flag is removed", options: ["info", "warn", "error", "debug"], answer: "error" },
    ],
    explanation:
      "Later layers override earlier ones, so the CLI flag wins. Without it, the env var beats the file and the default. What matters is that the order is fixed and documented, so anyone can trace where a value came from.",
    lessonAnchor: "combining-sources",
  },
  {
    id: "config-timeout-504",
    lectures: [17],
    tags: ["timeouts", "application-settings"],
    type: "mcq",
    prompt:
      "Users of your AI image feature see 504 Gateway Timeout. Generation takes about 80 s; the load balancer's request timeout is 60 s. What's the best fix?",
    options: [
      "Move generation to a background job and let the client poll or get notified",
      "Lower the timeout to 30 s",
      "Return 200 before the image exists and hope it finishes",
      "Increase the database pool size",
    ],
    answer: "Move generation to a background job and let the client poll or get notified",
    explanation:
      "The proxy gives up at 60 s, before the 80 s job finishes. Raising that timeout for one route can work, but long work doesn't belong on the request path; a background job keeps requests short. Pool size has nothing to do with it.",
    lessonAnchor: "application-settings",
  },
  {
    id: "config-pool-per-env",
    lectures: [17],
    tags: ["environments", "tuning"],
    type: "scenario",
    prompt: "Pick a sensible DB pool size for each environment of a busy shop.",
    fields: [
      { label: "Developer laptop", options: ["2", "10", "50", "500"], answer: "10" },
      { label: "Staging (used by the team only, cost-sensitive)", options: ["2", "10", "50", "500"], answer: "2" },
      { label: "Production instance", options: ["2", "10", "50", "500"], answer: "50" },
    ],
    explanation:
      "Same code, different config: dev just needs enough, staging trades a little waiting for lower cost, and production is sized for real traffic within the database's connection limit. 500 per instance would quickly exceed what Postgres allows across several instances.",
    lessonAnchor: "configuration-per-environment",
  },
  {
    id: "config-leaked-key",
    lectures: [17],
    tags: ["secrets", "security"],
    type: "order",
    prompt: "A developer committed the live Stripe key in a .env file and pushed it to a shared repo. Put the response in order.",
    steps: [
      "Rotate the key in Stripe, issuing a new one",
      "Store the new key in the secret manager and redeploy so services use it",
      "Revoke the old, leaked key",
      "Check Stripe's logs for misuse while the old key was exposed",
      "Add .env to .gitignore and enable secret scanning in CI",
    ],
    explanation:
      "Removing the commit isn't enough, because git history and clones keep the key. Rotate first, roll the new key out, then revoke the old one so nothing breaks in between. Check for abuse, then fix the process so it can't happen again.",
    lessonAnchor: "keeping-secrets-safe",
  },
  {
    id: "config-least-privilege",
    lectures: [17],
    tags: ["access-control", "secrets"],
    type: "mcq",
    prompt:
      "A team stores every secret in one shared vault path that all developers and all services can read. Which change best follows least privilege?",
    options: [
      "Scope secrets per service and role, so the search service and frontend devs can't read the Stripe key or production DB password",
      "Encrypt the vault path with one shared password",
      "Move all secrets into the repository's config.yaml",
      "Rotate all secrets daily but keep the shared access",
    ],
    answer: "Scope secrets per service and role, so the search service and frontend devs can't read the Stripe key or production DB password",
    explanation:
      "Least privilege means each person and service reads only what it needs, which limits the blast radius of any one leak. Rotation helps, but doesn't fix overly broad access, and committing secrets makes things worse.",
    lessonAnchor: "keeping-secrets-safe",
  },
  {
    id: "config-hardcoded-chaos",
    lectures: [17],
    tags: ["config-chaos", "environments"],
    type: "mcq",
    prompt:
      "The codebase has if (env === \"production\") checks in 40 files to pick URLs, timeouts and keys. Staging keeps behaving differently from production in ways nobody can explain. What's the underlying fix?",
    options: [
      "Move those values into per-environment configuration loaded and validated in one place",
      "Add more if checks for staging",
      "Run staging with NODE_ENV=production and production keys",
      "Delete the staging environment",
    ],
    answer: "Move those values into per-environment configuration loaded and validated in one place",
    explanation:
      "Code should be identical everywhere, with only configuration varying. Scattered environment checks are configuration chaos. Pointing staging at production keys risks real charges and real customer data.",
    lessonAnchor: "why-it-matters",
  },
];
