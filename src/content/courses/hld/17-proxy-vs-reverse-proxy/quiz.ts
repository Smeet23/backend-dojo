import type { Question } from "@/lib/types";

const KIND = ["Forward proxy", "Reverse proxy", "Neither (direct connection)"];

export const quiz: Question[] = [
  {
    id: "hld-proxy-classify",
    lectures: [17],
    tags: ["proxy"],
    type: "scenario",
    prompt: "Classify each setup.",
    fields: [
      { label: "Company IT routes all employee browsing through a gateway that blocks gambling sites", options: KIND, answer: "Forward proxy" },
      { label: "api.shop.com resolves to Nginx, which routes /orders and /users to private services", options: KIND, answer: "Reverse proxy" },
      { label: "Backend pods may only call the internet through an allow-listed egress gateway", options: KIND, answer: "Forward proxy" },
    ],
    explanation:
      "A forward proxy works for the clients making requests, including servers acting as clients in the egress case. A reverse proxy is set up by the service owner and fronts the servers, invisible to clients.",
    lessonAnchor: "side-by-side",
  },
  {
    id: "hld-proxy-tls-certs",
    lectures: [17],
    tags: ["reverse-proxy", "tls"],
    type: "mcq",
    prompt:
      "You have 40 microservices, each managing its own public TLS certificate. Two outages this year came from certificates expiring on forgotten services. What change fixes this structurally?",
    options: [
      "Terminate TLS at a reverse proxy in front of all services",
      "Put a forward proxy in front of the clients",
      "Use longer-lived certificates on each service",
      "Switch the services to HTTP/1.0",
    ],
    answer: "Terminate TLS at a reverse proxy in front of all services",
    explanation:
      "With TLS termination at the edge, public certificates live and renew in one place. Longer-lived certificates only delay the same problem, and a forward proxy serves clients, not your services.",
    lessonAnchor: "tls-termination",
  },
  {
    id: "hld-proxy-client-ip",
    lectures: [17],
    tags: ["reverse-proxy", "headers"],
    type: "scenario",
    prompt:
      "After putting Nginx in front of your app, every request in the app's logs comes from 10.0.0.5, and per-IP rate limiting now blocks everyone at once.",
    fields: [
      { label: "Why", options: ["The app sees the proxy as its client", "Nginx is caching responses", "TLS termination hides IPs", "DNS is misconfigured"], answer: "The app sees the proxy as its client" },
      { label: "Fix", options: ["Have the proxy set X-Forwarded-For and trust it only from the proxy", "Trust X-Forwarded-For from any request", "Disable keep-alive to the backend", "Move rate limiting to the client"], answer: "Have the proxy set X-Forwarded-For and trust it only from the proxy" },
    ],
    explanation:
      "The backend's TCP peer is the proxy, so it needs the original IP from a forwarded header. Trusting that header from anyone lets attackers spoof their IP and dodge limits.",
    lessonAnchor: "how-a-reverse-proxy-works",
  },
  {
    id: "hld-proxy-features",
    lectures: [17],
    tags: ["reverse-proxy"],
    type: "scenario",
    prompt: "Match each problem to the reverse proxy feature that addresses it.",
    fields: [
      { label: "Mobile users on slow networks download 300 KB JSON responses", options: ["Compression", "WAF", "Caching", "Load balancing"], answer: "Compression" },
      { label: "Bots probe endpoints with SQL injection payloads", options: ["Compression", "WAF", "Caching", "Load balancing"], answer: "WAF" },
      { label: "The same product page is rendered 5,000 times a minute with identical output", options: ["Compression", "WAF", "Caching", "Load balancing"], answer: "Caching" },
    ],
    explanation:
      "Gzip or Brotli shrink payloads; a WAF blocks attack patterns before the app; a proxy cache serves identical responses without touching the backend.",
    lessonAnchor: "reverse-proxy-uses",
  },
  {
    id: "hld-proxy-pick-tool",
    lectures: [17],
    tags: ["reverse-proxy", "tools"],
    type: "scenario",
    prompt: "Pick the best-fitting proxy for each job.",
    fields: [
      { label: "Load balance a pool of MySQL replicas over raw TCP", options: ["HAProxy", "Envoy", "Squid", "Tor"], answer: "HAProxy" },
      { label: "Sidecar in a service mesh with config pushed dynamically via API", options: ["HAProxy", "Envoy", "Squid", "Tor"], answer: "Envoy" },
      { label: "Office-wide caching forward proxy for employee web traffic", options: ["HAProxy", "Envoy", "Squid", "Tor"], answer: "Squid" },
    ],
    explanation:
      "HAProxy is strong at layer 4 TCP balancing; Envoy is built for dynamic xDS configuration and sidecars; Squid is a classic forward caching proxy. Tor is for anonymity, not for any of these.",
    lessonAnchor: "common-reverse-proxies",
  },
  {
    id: "hld-proxy-504",
    lectures: [17],
    tags: ["reverse-proxy", "status-codes"],
    type: "mcq",
    prompt:
      "Your report export takes about 90 seconds. Users see a 504 Gateway Timeout after exactly 60 seconds, but the app logs show the report finishing successfully at 90 s. What's happening?",
    options: [
      "The reverse proxy's upstream read timeout (60 s) is shorter than the endpoint's run time",
      "The backend crashed and returned an invalid response",
      "The client's DNS cache expired",
      "The WAF blocked the response",
    ],
    answer: "The reverse proxy's upstream read timeout (60 s) is shorter than the endpoint's run time",
    explanation:
      "504 is the proxy giving up waiting on the backend. 502 would mean a bad or missing response. Better than raising the timeout: make the export asynchronous (return 202 and a job id).",
    lessonAnchor: "trade-offs",
  },
  {
    id: "hld-proxy-spof",
    lectures: [17],
    tags: ["reverse-proxy", "availability"],
    type: "mcq",
    prompt:
      "All traffic to your 12 app servers flows through one Nginx VM. What's the main risk, and the usual fix?",
    options: [
      "It's a single point of failure; run two or more proxies behind a floating IP or managed load balancer",
      "It adds too much latency; remove it and expose the app servers directly",
      "It can't do TLS; move certificates to the app servers",
      "It hides client IPs; switch to a forward proxy",
    ],
    answer: "It's a single point of failure; run two or more proxies behind a floating IP or managed load balancer",
    explanation:
      "Twelve redundant app servers don't help if the one proxy in front of them dies. The extra hop costs well under a millisecond, so removing the proxy throws away its benefits for little gain.",
    lessonAnchor: "trade-offs",
  },
];
