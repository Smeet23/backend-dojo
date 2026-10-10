import type { Question } from "@/lib/types";

const ALGOS = ["Round robin", "Weighted round robin", "Least connections", "IP hash", "Consistent hashing", "Power of two choices"];

export const quiz: Question[] = [
  {
    id: "hld-lb-l4-l7",
    lectures: [18],
    tags: ["load-balancing", "layers"],
    type: "scenario",
    prompt: "Choose the load balancer layer for each case.",
    fields: [
      { label: "Spread raw TCP connections to a fleet of MQTT brokers", options: ["Layer 4", "Layer 7"], answer: "Layer 4" },
      { label: "Send /api/* to the API service and /images/* to the image service", options: ["Layer 4", "Layer 7"], answer: "Layer 7" },
      { label: "Send 5% of users with a beta cookie to the canary version", options: ["Layer 4", "Layer 7"], answer: "Layer 7" },
    ],
    explanation:
      "Routing by path or cookie requires reading the HTTP request, which only an L7 balancer does. Non-HTTP protocols and raw connection spreading are what L4 is built for.",
    lessonAnchor: "l4-versus-l7",
  },
  {
    id: "hld-lb-grpc-skew",
    lectures: [18],
    tags: ["load-balancing", "grpc"],
    type: "mcq",
    prompt:
      "Your gRPC clients keep one long-lived HTTP/2 connection each. Behind an L4 load balancer, a few backend pods run at 90% CPU while others idle, even though the number of connections per pod is even. Why, and what helps?",
    options: [
      "L4 balances connections, not requests; use an L7 balancer that spreads individual gRPC requests",
      "Round robin is broken; switch to IP hash",
      "Health checks are too slow; shorten the interval",
      "HTTP/2 doesn't support load balancing at all",
    ],
    answer: "L4 balances connections, not requests; use an L7 balancer that spreads individual gRPC requests",
    explanation:
      "A connection carrying many busy clients' requests pins all that work to one pod. An L7 proxy (Envoy, for example) terminates HTTP/2 and balances each request. IP hash would make the skew worse.",
    lessonAnchor: "layer-4",
  },
  {
    id: "hld-lb-pick-algo",
    lectures: [18],
    tags: ["load-balancing", "algorithms"],
    type: "scenario",
    prompt: "Pick the best algorithm for each situation.",
    fields: [
      { label: "API where some calls take 20 ms and report exports take 30 s", options: ALGOS, answer: "Least connections" },
      { label: "Pool of 2 large and 4 small VMs, all short uniform requests", options: ALGOS, answer: "Weighted round robin" },
      { label: "Fleet of distributed cache nodes that scale up and down daily", options: ALGOS, answer: "Consistent hashing" },
    ],
    explanation:
      "Least connections steers new work away from servers stuck on slow requests. Weights match share to capacity. Consistent hashing keeps most keys on the same cache node when nodes come and go, whereas modulo hashing would move almost all of them.",
    lessonAnchor: "choosing",
  },
  {
    id: "hld-lb-modulo",
    lectures: [18],
    tags: ["load-balancing", "hashing"],
    type: "mcq",
    prompt:
      "You route users to 10 cache-heavy servers with hash(user_id) % 10. You add an 11th server, and the cache hit rate collapses to near zero for an hour. What happened?",
    options: [
      "Changing N from 10 to 11 remapped about 90% of users to different servers with cold caches",
      "The new server stole only its fair 1/11 share, which is too much",
      "Hash functions are random, so assignments change every request",
      "The health check on the new server failed",
    ],
    answer: "Changing N from 10 to 11 remapped about 90% of users to different servers with cold caches",
    explanation:
      "With modulo hashing, a key stays put only if hash % 10 equals hash % 11, which is rare. Consistent hashing would have moved only about 1/11 of users.",
    lessonAnchor: "ip-hash",
  },
  {
    id: "hld-lb-sticky",
    lectures: [18],
    tags: ["load-balancing", "sessions"],
    type: "scenario",
    prompt:
      "Your app stores shopping carts in server memory, so you enabled cookie-based sticky sessions. During a deploy, users on the restarted servers lose their carts, and two servers are overloaded by a handful of heavy users.",
    fields: [
      { label: "Root problem", options: ["Session state lives on individual servers", "Cookies are too large", "The LB is layer 4", "Health checks are too frequent"], answer: "Session state lives on individual servers" },
      { label: "Fix", options: ["Move carts to Redis and make servers stateless", "Switch stickiness to IP hash", "Increase the sticky cookie lifetime", "Add more servers but keep stickiness"], answer: "Move carts to Redis and make servers stateless" },
    ],
    explanation:
      "Stickiness ties users to one server's memory, so failures lose state and load can't rebalance. With carts in a shared store, any server can handle any request. IP hash is still sticky, with extra NAT skew.",
    lessonAnchor: "sticky-sessions",
  },
  {
    id: "hld-lb-health",
    lectures: [18],
    tags: ["load-balancing", "health-checks"],
    type: "scenario",
    prompt:
      "A server starts returning 500s on every request but still answers its /healthz probe with 200. Active checks run every 10 s. Meanwhile, newly launched servers get flooded and time out during their 30 s JVM warm-up.",
    fields: [
      { label: "Catch the 500-ing server", options: ["Passive checks / outlier detection on real traffic", "Longer active check interval", "Sticky sessions", "TCP-only health checks"], answer: "Passive checks / outlier detection on real traffic" },
      { label: "Protect warming servers", options: ["Slow start", "Connection draining", "IP hash", "Lower unhealthy threshold"], answer: "Slow start" },
    ],
    explanation:
      "Outlier detection ejects servers based on the errors users actually get, which probes can miss. Slow start ramps a new server's share up gradually. Draining is for removing a server, not adding one.",
    lessonAnchor: "health-checks",
  },
  {
    id: "hld-lb-p2c",
    lectures: [18],
    tags: ["load-balancing", "algorithms"],
    type: "mcq",
    prompt:
      "You have 40 independent L7 proxies in front of 2,000 servers. Each proxy uses least connections based only on its own view, and they all keep piling onto the same few servers that briefly look idle. Which algorithm reduces this herding cheaply?",
    options: ["Power of two choices", "Round robin with no weights", "IP hash", "Least response time with a global lock"],
    answer: "Power of two choices",
    explanation:
      "Sampling two random servers and picking the less loaded one spreads decisions across the fleet, so proxies don't all chase the same 'best' server, and it performs close to full least-connections. A global lock would kill throughput.",
    lessonAnchor: "power-of-two-choices",
  },
  {
    id: "hld-lb-global",
    lectures: [18],
    tags: ["load-balancing", "dns", "global"],
    type: "scenario",
    prompt:
      "Your service runs in Mumbai and Frankfurt. Users should hit the nearer region, and when Mumbai fails, its users must move within seconds, not minutes.",
    fields: [
      { label: "Routing approach", options: ["Anycast IP announced from both regions", "Round robin DNS with a 1-day TTL", "One L4 load balancer in Mumbai", "Client-side hardcoded region list"], answer: "Anycast IP announced from both regions" },
      { label: "Why not plain GeoDNS here", options: ["Resolvers cache DNS answers, delaying failover", "GeoDNS can't pick the nearest region", "DNS doesn't work with HTTPS", "GeoDNS needs sticky sessions"], answer: "Resolvers cache DNS answers, delaying failover" },
    ],
    explanation:
      "Anycast routes to the nearest site, and withdrawing a route shifts traffic within seconds. GeoDNS does choose nearby regions, but cached answers (sometimes ignoring TTLs) keep sending users to a dead region for a while.",
    lessonAnchor: "global-load-balancing",
  },
  {
    id: "hld-lb-ha",
    lectures: [18],
    tags: ["load-balancing", "availability"],
    type: "mcq",
    prompt:
      "You self-host HAProxy on one VM in front of 20 app servers. How do you remove the load balancer as a single point of failure in a classic data centre setup?",
    options: [
      "Run two HAProxy nodes sharing a floating IP via VRRP (keepalived)",
      "Give the HAProxy VM more CPU and memory",
      "Point DNS directly at all 20 app servers",
      "Enable sticky sessions on HAProxy",
    ],
    answer: "Run two HAProxy nodes sharing a floating IP via VRRP (keepalived)",
    explanation:
      "A standby node claims the virtual IP within seconds if the active one fails. A bigger VM is still one machine, and DNS straight to app servers loses health-aware balancing.",
    lessonAnchor: "load-balancer-high-availability",
  },
];
