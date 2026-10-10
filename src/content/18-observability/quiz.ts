import type { Question } from "@/lib/types";

const LEVELS = ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"];

export const quiz: Question[] = [
  {
    id: "observability-pick-levels",
    lectures: [18],
    tags: ["logging", "log-levels"],
    type: "scenario",
    prompt:
      "You're adding logs to a shop's API. Pick the level for each event.",
    fields: [
      { label: "A customer places an order successfully", options: LEVELS, answer: "INFO" },
      { label: "A customer types the wrong password", options: LEVELS, answer: "WARN" },
      { label: "INSERT into orders fails with \"connection refused\"", options: LEVELS, answer: "ERROR" },
      { label: "DATABASE_URL is missing at startup, so the app exits", options: LEVELS, answer: "FATAL" },
    ],
    explanation:
      "Successful business events are INFO. A wrong password is unusual but not a failure of your system, so WARN, not ERROR. A failed operation is ERROR, and a problem that stops the app from running at all is FATAL.",
    lessonAnchor: "log-levels",
  },
  {
    id: "observability-prod-config",
    lectures: [18],
    tags: ["logging", "structured-logs"],
    type: "scenario",
    prompt:
      "Your notes app is moving from a laptop to production, where logs are shipped to Loki and searched in Grafana. Configure the production logger.",
    fields: [
      { label: "Minimum level", options: LEVELS, answer: "INFO" },
      { label: "Format", options: ["Coloured console text", "JSON, one object per line", "Plain text with timestamps", "CSV"], answer: "JSON, one object per line" },
      { label: "Field on every line", options: ["The user's session ID", "A request or trace ID", "The raw SQL query", "The full request body"], answer: "A request or trace ID" },
    ],
    explanation:
      "Production runs at INFO so DEBUG noise and internal detail stay out. JSON lets log tools query fields instead of parsing free text. A request or trace ID ties every line of one request together and links logs to traces; session IDs, raw SQL and bodies are sensitive or bulky and don't belong in every line.",
    lessonAnchor: "structured-vs-unstructured-logs",
  },
  {
    id: "observability-debug-flow",
    lectures: [18],
    tags: ["observability", "debugging"],
    type: "order",
    prompt:
      "Production incident: checkout errors spike at 14:00. Put the investigation steps in the order an observable system lets you take them.",
    steps: [
      "Alert fires in Slack: checkout error rate above 5%",
      "Metrics dashboard shows errors only on POST /orders in one region",
      "Filter logs for that route and time window",
      "Open the trace of one failing request",
      "Spot the payment API span timing out and fix it",
    ],
    explanation:
      "Alerts tell you that something is wrong, metrics narrow down when and where, logs show what happened, and a trace shows which component inside the request was responsible.",
    lessonAnchor: "the-three-pillars-together",
  },
  {
    id: "observability-which-pillar",
    lectures: [18],
    tags: ["observability", "pillars"],
    type: "scenario",
    prompt:
      "For each question about your SaaS product, which pillar answers it best?",
    fields: [
      { label: "Has p95 latency been creeping up all week?", options: ["Logs", "Metrics", "Traces"], answer: "Metrics" },
      { label: "Exactly which error did request req_9f2c hit?", options: ["Logs", "Metrics", "Traces"], answer: "Logs" },
      { label: "Which downstream call made this one request take 4 seconds?", options: ["Logs", "Metrics", "Traces"], answer: "Traces" },
    ],
    explanation:
      "Metrics are numbers over time, ideal for trends. Logs record the details of individual events. Traces break one request into spans across components, so they show where the time went.",
    lessonAnchor: "logging-monitoring-and-observability",
  },
  {
    id: "observability-error-rate",
    lectures: [18],
    tags: ["metrics", "alerts"],
    type: "mcq",
    prompt:
      "Your error-rate alert counts every response that isn't 200 OK. It pages the on-call engineer every night, but each time the system is fine. What's the best fix?",
    options: [
      "Raise the alert threshold to 50%",
      "Count 5xx responses as failures and track 4xx in a separate metric",
      "Stop returning 404 and 401 so they don't count",
      "Switch the logs from console format to JSON",
    ],
    answer: "Count 5xx responses as failures and track 4xx in a separate metric",
    explanation:
      "201s, 304s, 401s for expired logins and 404s are normal traffic, not your server failing. 5xx is the signal that you are broken. Raising the threshold would hide real outages too.",
    lessonAnchor: "the-three-pillars-together",
  },
  {
    id: "observability-monitoring-gap",
    lectures: [18],
    tags: ["observability", "tracing"],
    type: "mcq",
    prompt:
      "Your dashboard shows that GET /notes got slow, but logs are plain text on each server and there's no tracing. Which statement best describes your situation?",
    options: [
      "You have observability, because a dashboard exists",
      "You have monitoring: you know that something is wrong, but finding what and where will be slow",
      "You have tracing, because latency is a time measurement",
      "Nothing is wrong; slow endpoints don't need investigation",
    ],
    answer: "You have monitoring: you know that something is wrong, but finding what and where will be slow",
    explanation:
      "Monitoring detects the symptom. Observability needs connected logs, metrics and traces so you can go from the symptom to the cause without guessing.",
    lessonAnchor: "monitoring-vs-observability",
  },
  {
    id: "observability-otel",
    lectures: [18],
    tags: ["instrumentation", "opentelemetry"],
    type: "mcq",
    prompt:
      "Your team uses a hosted APM vendor today but may move to Grafana + Tempo next year. How should you instrument the services now?",
    options: [
      "With the vendor's proprietary SDK only, since it's easiest",
      "With OpenTelemetry SDKs, sending to a collector that exports to the vendor",
      "Don't instrument until the final tool is chosen",
      "Only with log lines, and reconstruct traces from timestamps later",
    ],
    answer: "With OpenTelemetry SDKs, sending to a collector that exports to the vendor",
    explanation:
      "OpenTelemetry is a vendor-neutral standard. Instrument once, and changing backends becomes a collector config change instead of a code rewrite.",
    lessonAnchor: "opentelemetry",
  },
];
