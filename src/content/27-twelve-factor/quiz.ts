import type { Question } from "@/lib/types";

const FACTORS = [
  "I. Codebase",
  "II. Dependencies",
  "III. Config",
  "IV. Backing services",
  "V. Build, release, run",
  "VI. Processes",
  "VII. Port binding",
  "VIII. Concurrency",
  "IX. Disposability",
  "X. Dev/prod parity",
  "XI. Logs",
  "XII. Admin processes",
];

export const quiz: Question[] = [
  {
    id: "twelve-factor-random-logout",
    lectures: [27],
    tags: ["processes", "sessions"],
    type: "scenario",
    prompt:
      "Your notes SaaS just scaled from 1 to 3 instances behind a load balancer. Users report being logged out at random. Sessions are stored in a Map inside the server process. A teammate proposes turning on sticky sessions.",
    fields: [
      { label: "Factor being violated", options: FACTORS, answer: "VI. Processes" },
      {
        label: "Fix",
        options: ["Enable sticky sessions", "Store sessions in Redis or Postgres", "Go back to one larger instance", "Copy sessions between instances every minute"],
        answer: "Store sessions in Redis or Postgres",
      },
    ],
    explanation:
      "Processes must be stateless and share nothing, so session state belongs in a backing service. Sticky sessions hide the problem: killing an instance still logs out its users, and new instances receive no existing users.",
    lessonAnchor: "vi-processes",
  },
  {
    id: "twelve-factor-config-secrets",
    lectures: [27],
    tags: ["config", "secrets"],
    type: "scenario",
    prompt:
      "You're cleaning up config for the notes API. The repo has config/staging.yml and config/production.yml, both containing the database host, a feature flag and the Stripe secret key. A PR branch needs \"staging, but with its own database\".",
    fields: [
      {
        label: "Database host and feature flag",
        options: ["Granular environment variables", "A new config/pr-123.yml", "Hard-coded constants per branch", "A shared .env committed to the repo"],
        answer: "Granular environment variables",
      },
      {
        label: "Stripe secret key, as the team grows",
        options: ["An env var in the Dockerfile", "A secret manager fetched at boot", "A committed, encrypted YAML file", "A comment in the code"],
        answer: "A secret manager fetched at boot",
      },
      {
        label: "Quick check that config has left the code",
        options: [
          "Could we open-source the repo today without leaking credentials?",
          "Do all tests pass?",
          "Does staging match production?",
          "Is every value in YAML?",
        ],
        answer: "Could we open-source the repo today without leaking credentials?",
      },
    ],
    explanation:
      "Named environment files don't scale: every new combination is more code. Independent env vars let you compose a deploy by setting values. Secrets are better in a secret manager, because the environment leaks through child processes, crash dumps and /proc.",
    lessonAnchor: "iii-config",
  },
  {
    id: "twelve-factor-rollback",
    lectures: [27],
    tags: ["build-release-run"],
    type: "mcq",
    prompt:
      "Release 102 (a new build) went out 10 minutes ago and 5xx errors are spiking. Release 101 was the previous build with a rotated database password. What's the fastest safe recovery?",
    options: [
      "SSH into the servers and revert the changed files",
      "Run release 101 again",
      "Revert the commit, rebuild, and deploy",
      "Rebuild release 100 from its commit with today's config",
    ],
    answer: "Run release 101 again",
    explanation:
      "Releases are immutable snapshots of build plus config, so 101 still means exactly what it did before and can be live in seconds. Reverting and rebuilding works but is slower; release 100 would bring back the old, rotated-away password.",
    lessonAnchor: "v-build-release-run",
  },
  {
    id: "twelve-factor-formation",
    lectures: [27],
    tags: ["concurrency"],
    type: "scenario",
    prompt:
      "A food-delivery API runs HTTP handling and video encoding for restaurant clips in one process type. At lunch it needs 10x the HTTP capacity but encoding load is flat. Each web or worker process needs about 500 MB.",
    fields: [
      { label: "Factor to apply", options: FACTORS, answer: "VIII. Concurrency" },
      {
        label: "Process formation at lunch",
        options: ["web=10 (combined)", "web=10 worker=2", "web=1 with 10x the RAM", "web=2 worker=10"],
        answer: "web=10 worker=2",
      },
      {
        label: "How the app should run",
        options: ["In the foreground, managed by the platform", "As a daemon that writes a PID file", "Inside a shared Tomcat", "Under nohup on each VM"],
        answer: "In the foreground, managed by the platform",
      },
    ],
    explanation:
      "Separate process types scale independently, roughly 6 GB instead of 10 GB here. The app should never daemonise itself; the platform or orchestrator owns the process lifecycle.",
    lessonAnchor: "viii-concurrency",
  },
  {
    id: "twelve-factor-sigterm",
    lectures: [27],
    tags: ["disposability"],
    type: "scenario",
    prompt:
      "Every deploy of the notes app causes a burst of failed requests, and some export jobs end up half-written. The web process takes 75 seconds to boot. Design the fix.",
    fields: [
      {
        label: "Web process on SIGTERM",
        options: ["Exit immediately", "Stop accepting, finish in-flight requests, exit", "Ignore it and wait for SIGKILL", "Restart itself"],
        answer: "Stop accepting, finish in-flight requests, exit",
      },
      {
        label: "Worker on SIGTERM",
        options: ["Drop the current job", "Return the current job to the queue", "Finish all queued jobs first", "Delete the queue"],
        answer: "Return the current job to the queue",
      },
      {
        label: "What makes re-running a job safe",
        options: ["A longer grace period", "Idempotent or transactional job logic", "Sticky sessions", "Bigger instances"],
        answer: "Idempotent or transactional job logic",
      },
      {
        label: "Boot time target",
        options: ["A few seconds", "Under 2 minutes", "Doesn't matter", "Exactly 30 seconds"],
        answer: "A few seconds",
      },
    ],
    explanation:
      "Disposability means processes can stop and start at any moment harmlessly. Drain web traffic, requeue unfinished jobs, and make jobs re-entrant so a rerun leaves no half-written state. Slow boots make rolling deploys and autoscaling lag.",
    lessonAnchor: "ix-disposability",
  },
  {
    id: "twelve-factor-sqlite-like",
    lectures: [27],
    tags: ["dev-prod-parity"],
    type: "mcq",
    prompt:
      "Note search works perfectly on every developer laptop: typing \"groceries\" finds \"Groceries\". In production, users get no results for the same search. No errors are logged. Laptops use SQLite through the ORM; production uses Postgres. What's going on?",
    options: [
      "Production's search index is stale",
      "LIKE is case-insensitive in SQLite (for ASCII) but case-sensitive in Postgres; the tools gap broke parity",
      "The ORM has a bug that only appears under load",
      "Postgres doesn't support LIKE",
    ],
    answer: "LIKE is case-insensitive in SQLite (for ASCII) but case-sensitive in Postgres; the tools gap broke parity",
    explanation:
      "Different backing services behave differently, often silently. Dev/prod parity says use the same database everywhere; a Postgres container is one command away.",
    lessonAnchor: "x-devprod-parity",
  },
  {
    id: "twelve-factor-diagnose",
    lectures: [27],
    tags: ["audit"],
    type: "scenario",
    prompt:
      "Audit findings from an inherited app. Which factor does each break?\n• Logs are written to /var/log/app.log, rotated by the app itself.\n• A data fix was done by pasting an UPDATE into psql on the production server.\n• The app is deployed as a WAR into a Tomcat that other teams also configure.\n• Thumbnailing relies on whatever ImageMagick version the host has.",
    fields: [
      { label: "Log file", options: FACTORS, answer: "XI. Logs" },
      { label: "Manual UPDATE", options: FACTORS, answer: "XII. Admin processes" },
      { label: "Shared Tomcat", options: FACTORS, answer: "VII. Port binding" },
      { label: "Host ImageMagick", options: FACTORS, answer: "II. Dependencies" },
    ],
    explanation:
      "Logs belong on stdout as a stream; admin tasks run as one-off processes from the same code and config; the app should bring its own server and bind a port; system tools must be declared and isolated like libraries.",
    lessonAnchor: "the-factors-together",
  },
  {
    id: "twelve-factor-monorepo",
    lectures: [27],
    tags: ["codebase"],
    type: "mcq",
    prompt:
      "Your company keeps the notes API, the billing worker and the admin dashboard in one monorepo. A new hire says this violates twelve-factor's \"one codebase\" rule. Meanwhile, the API and dashboard each contain a copy-pasted dateUtils folder. Which statement is right?",
    options: [
      "The monorepo is the violation; split it into three repos",
      "The monorepo is fine; the copy-pasted folder is the violation and should become a shared library",
      "Both are fine as long as tests pass",
      "Both are violations",
    ],
    answer: "The monorepo is fine; the copy-pasted folder is the violation and should become a shared library",
    explanation:
      "The rule is one codebase per app, and a monorepo can hold several apps' codebases. What's banned is the same code living in two places; shared code should be a library pulled in through the dependency manager.",
    lessonAnchor: "i-codebase",
  },
  {
    id: "twelve-factor-backing-swap",
    lectures: [27],
    tags: ["backing-services", "config"],
    type: "scenario",
    prompt:
      "You're moving the notes app's database from a Postgres container on the same VM to a managed Postgres. The app reads one env var, NOTES_DATABASE_URL.",
    fields: [
      {
        label: "What changes",
        options: ["Only the value of NOTES_DATABASE_URL", "The repository code", "The ORM", "The build"],
        answer: "Only the value of NOTES_DATABASE_URL",
      },
      {
        label: "Part of postgres://app:pw@db.example.com:5432/notes that is the host",
        options: ["db.example.com", "app", "5432", "notes"],
        answer: "db.example.com",
      },
      {
        label: "What this produces in build, release, run",
        options: ["A new release of the same build", "A new build", "A modified existing release", "Nothing; it's live immediately"],
        answer: "A new release of the same build",
      },
    ],
    explanation:
      "Backing services are attached resources reached by a handle in config, so swapping them is a config change. A config change creates a new release from the same build; existing releases are never edited.",
    lessonAnchor: "iv-backing-services",
  },
  {
    id: "twelve-factor-build-stages-order",
    lectures: [27],
    tags: ["build-release-run"],
    type: "order",
    prompt: "Put the path from a merged PR to running code in order.",
    steps: [
      "A commit lands on the main branch",
      "CI builds an image from that commit with its locked dependencies",
      "The image is combined with production config into a new release ID",
      "The platform starts processes from that release",
      "Logs stream to stdout and the platform collects them",
    ],
    explanation:
      "Code enters only at build; config joins at release; run just starts processes from a release. Keeping the stages separate is what makes releases immutable and rollbacks instant.",
    lessonAnchor: "v-build-release-run",
  },
];
