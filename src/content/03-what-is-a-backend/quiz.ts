import type { Question } from "@/lib/types";

export const backendQuiz: Question[] = [
  {
    id: "backend-request-hops",
    lectures: [3],
    tags: ["networking"],
    type: "order",
    prompt: "A browser requests https://api.notes.dev/users. Put the hops in order.",
    steps: [
      "DNS resolves api.notes.dev to the server's IP",
      "Cloud firewall allows traffic on port 443",
      "Nginx receives it and forwards to localhost:3001",
      "The app process handles GET /users",
    ],
    explanation:
      "Name → address (DNS), then the network gate (firewall/security group), then the reverse proxy on the machine, then your process.",
    lessonAnchor: "the-journey-of-a-request",
  },
  {
    id: "backend-debug-timeout",
    lectures: [3],
    tags: ["networking", "debugging"],
    type: "scenario",
    prompt:
      "You deployed a new API to a fresh VM. From your laptop the request just hangs and eventually times out. On the VM, curl localhost:3001/health returns 200, and your app logs show no incoming requests.",
    fields: [
      { label: "Most likely culprit", options: ["DNS record", "Firewall / security group", "Nginx config", "App crash"], answer: "Firewall / security group" },
      { label: "What to check", options: ["Port 443 is allowed inbound", "The A record's TTL", "Increase app memory", "Restart the database"], answer: "Port 443 is allowed inbound" },
    ],
    explanation:
      "The app works locally and receives nothing, and the client times out instead of getting an error. Packets are being dropped before they reach the machine, which is the classic sign of a closed port in the security group.",
    lessonAnchor: "firewall",
  },
  {
    id: "backend-502",
    lectures: [3],
    tags: ["networking", "status-codes"],
    type: "mcq",
    prompt:
      "Users get an instant 502 Bad Gateway from api.notes.dev. DNS resolves fine and the firewall is open. Where do you look first?",
    options: [
      "Whether the app process behind Nginx is running and listening on the right port",
      "The DNS A record",
      "The security group rules",
      "The user's browser cache",
    ],
    answer: "Whether the app process behind Nginx is running and listening on the right port",
    explanation:
      "A 502 comes from the proxy, which means the request got through DNS and the firewall. Nginx is up, but it can't get a valid response from the upstream app. Check PM2/systemd and the proxy_pass port.",
    lessonAnchor: "reverse-proxy",
  },
  {
    id: "backend-dns-records",
    lectures: [3],
    tags: ["networking"],
    type: "scenario",
    prompt: "You're setting up DNS for a new product.",
    fields: [
      { label: "Point api.notes.dev at server IP 54.210.10.7", options: ["A record", "CNAME record"], answer: "A record" },
      { label: "Make www.notes.dev an alias of notes.dev", options: ["A record", "CNAME record"], answer: "CNAME record" },
    ],
    explanation: "A records map a name to an IP address. CNAME records map a name to another name.",
    lessonAnchor: "dns",
  },
  {
    id: "backend-db-from-frontend",
    lectures: [3],
    tags: ["architecture", "security"],
    type: "mcq",
    prompt:
      "A teammate proposes: \"Skip the backend. The React app can connect straight to Postgres, which saves a hop.\" What's the strongest objection?",
    options: [
      "Browsers can't open raw DB connections, and the DB credentials would be shipped to every visitor",
      "React is too slow for SQL",
      "Postgres doesn't support JSON",
      "It would break CORS for images",
    ],
    answer: "Browsers can't open raw DB connections, and the DB credentials would be shipped to every visitor",
    explanation:
      "Browsers lack the socket access and drivers databases need. Even if they had them, every user would hold your credentials and open their own connection, with no pooling and no protection.",
    lessonAnchor: "why-not-put-backend-logic-in-the-frontend",
  },
  {
    id: "backend-secret-placement",
    lectures: [3],
    tags: ["security"],
    type: "scenario",
    prompt: "Where should each of these live?",
    fields: [
      { label: "Stripe secret key", options: ["Frontend code", "Backend environment variable"], answer: "Backend environment variable" },
      { label: "\"Coupon can only be used once per user\" rule", options: ["Frontend only", "Backend (frontend may also hint)"], answer: "Backend (frontend may also hint)" },
      { label: "Button hover colour", options: ["Frontend code", "Backend environment variable"], answer: "Frontend code" },
    ],
    explanation:
      "Anything shipped to the browser is public and can be changed by the user. Secrets and rules that must be enforced live on the server; the frontend can mirror rules for UX but can't be trusted to enforce them.",
    lessonAnchor: "why-not-put-backend-logic-in-the-frontend",
  },
  {
    id: "backend-sandbox",
    lectures: [3],
    tags: ["browser"],
    type: "mcq",
    prompt: "Which of these can JavaScript on a web page do by default?",
    options: [
      "Read and write localStorage for its own origin",
      "Read files from the user's Desktop",
      "Call any third-party API regardless of its headers",
      "Read the server's environment variables",
    ],
    answer: "Read and write localStorage for its own origin",
    explanation:
      "The browser sandbox allows the DOM, origin-scoped storage and cookies, and cross-origin APIs only when they opt in via CORS. File system and process access are blocked to protect users.",
    lessonAnchor: "the-browser-sandbox",
  },
];
