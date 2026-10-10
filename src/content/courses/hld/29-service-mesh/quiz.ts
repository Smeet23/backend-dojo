import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-mesh-polyglot-retries",
    lectures: [29],
    tags: ["service-mesh", "sidecar"],
    type: "mcq",
    prompt:
      "You run 70 services in Java, Go, Python and Node, owned by 15 teams. Each team implemented timeouts, retries and TLS slightly differently, and a security audit now requires encrypted, authenticated traffic between all services within a quarter. What's the most practical approach?",
    options: [
      "Adopt a service mesh so sidecar proxies enforce mTLS, timeouts and retries uniformly",
      "Write one shared networking library and ask every team to adopt it",
      "Put an API gateway in front of every service",
      "Move all services onto one VPC subnet and trust the network",
    ],
    answer: "Adopt a service mesh so sidecar proxies enforce mTLS, timeouts and retries uniformly",
    explanation:
      "A mesh moves these concerns out of app code, so it works across languages without 70 redeploys of library changes. A shared library needs four implementations and every team's cooperation; trusting the network is exactly what the audit forbids.",
    lessonAnchor: "the-problem-a-mesh-solves",
  },
  {
    id: "hld-mesh-control-plane-down",
    lectures: [29],
    tags: ["control-plane", "data-plane"],
    type: "scenario",
    prompt:
      "During an incident, all replicas of your mesh's control plane (istiod) crash for 20 minutes. Pods that were already running stay up.\nWhat happens?",
    fields: [
      {
        label: "Existing service-to-service traffic",
        options: ["Stops immediately", "Keeps flowing on the proxies' last config", "Flows but unencrypted", "Is routed through the control plane"],
        answer: "Keeps flowing on the proxies' last config",
      },
      {
        label: "What breaks",
        options: ["Nothing at all", "New policy changes and config or certs for new pods", "All mTLS connections", "DNS resolution"],
        answer: "New policy changes and config or certs for new pods",
      },
    ],
    explanation:
      "The control plane never sits on the request path; proxies keep using their cached config and certificates. What stalls is anything that needs new config: policy changes, newly started pods, and certificate renewal if the outage outlasts cert lifetimes.",
    lessonAnchor: "data-plane-and-control-plane",
  },
  {
    id: "hld-mesh-mtls-authz",
    lectures: [29],
    tags: ["mtls", "zero-trust"],
    type: "scenario",
    prompt:
      "Only the orders service should be able to call POST /charge on payments. Today payments checks the caller's source IP against an allowlist, but pods get new IPs on every deploy and the list is always out of date.\nWhat should the mesh check instead, and where?",
    fields: [
      {
        label: "Identity used",
        options: ["Source IP address", "Workload identity from the mTLS certificate", "A shared API key in a header", "The Host header"],
        answer: "Workload identity from the mTLS certificate",
      },
      {
        label: "Enforced at",
        options: ["The payments app code", "The payments sidecar (inbound)", "The orders sidecar (outbound)", "The external load balancer"],
        answer: "The payments sidecar (inbound)",
      },
    ],
    explanation:
      "mTLS gives each workload a certificate-backed identity (for example a SPIFFE ID from its service account) that survives IP changes and can't be forged without the private key. The receiving side's proxy enforces it, since the caller can't be trusted to police itself.",
    lessonAnchor: "mtls-and-service-identity",
  },
  {
    id: "hld-mesh-canary",
    lectures: [29],
    tags: ["traffic-management", "canary"],
    type: "scenario",
    prompt:
      "You're releasing payments v2. You want internal staff (who send header x-user-group: staff) to always hit v2, and 5% of everyone else too, with no app code changes.\nWhich mesh features do you use?",
    fields: [
      { label: "For staff", options: ["Header-based routing", "Traffic mirroring", "Fault injection", "Outlier detection"], answer: "Header-based routing" },
      { label: "For the 5%", options: ["Weighted traffic splitting", "Traffic mirroring", "Round-robin DNS", "Circuit breaking"], answer: "Weighted traffic splitting" },
    ],
    explanation:
      "Proxies understand L7, so a route can match a header and send it to the v2 subset, then split the remaining traffic 95/5 by weight. Mirroring is tempting but users never see mirrored responses, so it can't serve the 5%.",
    lessonAnchor: "traffic-management",
  },
  {
    id: "hld-mesh-retry-amplification",
    lectures: [29],
    tags: ["retries", "resilience"],
    type: "mcq",
    prompt:
      "The gateway retries 3 times, the orders sidecar retries calls to inventory 3 times, and the inventory sidecar retries its database proxy 3 times. During a database slowdown, the DB sees a huge load spike. What's the best fix?",
    options: [
      "Retry at a single layer with a retry budget and jittered backoff",
      "Increase retries to 5 at each layer so more requests succeed",
      "Remove all timeouts",
      "Add a fourth layer of retries in the app",
    ],
    answer: "Retry at a single layer with a retry budget and jittered backoff",
    explanation:
      "Retries multiply across layers: 3 x 3 x 3 means one user request can become 27 database attempts exactly when the database is struggling. Retry in one place, cap the extra load with a budget, and back off with jitter.",
    lessonAnchor: "retries-timeouts-and-circuit-breaking",
  },
  {
    id: "hld-mesh-retry-charge",
    lectures: [29],
    tags: ["retries", "idempotency"],
    type: "mcq",
    prompt:
      "A teammate adds a mesh rule: retry every request to payments up to 3 times on any 5xx or timeout. Customers start reporting duplicate charges. Why?",
    options: [
      "POST /charge isn't idempotent, so a timed-out charge that actually succeeded was sent again",
      "mTLS handshakes duplicate the request body",
      "The control plane replays requests during config pushes",
      "Outlier detection sends each request to two pods",
    ],
    answer: "POST /charge isn't idempotent, so a timed-out charge that actually succeeded was sent again",
    explanation:
      "A timeout doesn't mean the server failed; the charge may have gone through. Only retry idempotent calls or ones protected by an idempotency key, and only on errors that are safe to retry.",
    lessonAnchor: "retries-timeouts-and-circuit-breaking",
  },
  {
    id: "hld-mesh-broken-traces",
    lectures: [29],
    tags: ["observability", "tracing"],
    type: "mcq",
    prompt:
      "After installing the mesh, Jaeger shows spans for every hop, but each hop appears as its own separate trace instead of one end-to-end trace for the user request. What's missing?",
    options: [
      "The apps aren't propagating trace headers from incoming to outgoing requests",
      "The sidecars need more memory",
      "mTLS strips tracing data",
      "The control plane must be restarted",
    ],
    answer: "The apps aren't propagating trace headers from incoming to outgoing requests",
    explanation:
      "A proxy sees an inbound request and, separately, outbound requests, but can't know which outbound call was caused by which inbound one. The app must copy headers like traceparent onto the calls it makes.",
    lessonAnchor: "observability",
  },
  {
    id: "hld-mesh-skip-it",
    lectures: [29],
    tags: ["trade-offs"],
    type: "scenario",
    prompt:
      "Two teams ask whether to adopt a service mesh.\n• Team A: a 5-person startup with a Rails monolith and two small Go workers.\n• Team B: 200 engineers, 120 services, regulated industry needing mTLS everywhere, and a platform team.\nWhat do you recommend for each?",
    fields: [
      {
        label: "Team A",
        options: ["Full Istio with sidecars", "Skip the mesh; use good client timeouts and retries", "Write their own mesh", "Linkerd plus Istio together"],
        answer: "Skip the mesh; use good client timeouts and retries",
      },
      {
        label: "Team B",
        options: ["Skip the mesh; use good client timeouts and retries", "Adopt a mesh, run by the platform team", "Rewrite everything in one language", "Only an API gateway"],
        answer: "Adopt a mesh, run by the platform team",
      },
    ],
    explanation:
      "A mesh trades per-request latency, resource cost and operational complexity for consistency across many services. That's a bad trade for three services and no platform team, and a good one for 120 services with compliance requirements.",
    lessonAnchor: "costs-and-when-not-to-use-one",
  },
];
