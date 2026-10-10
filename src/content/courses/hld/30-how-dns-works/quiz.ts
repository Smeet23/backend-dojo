import type { Question } from "@/lib/types";

const RECORDS = ["A", "AAAA", "CNAME", "MX", "TXT", "NS"];

export const quiz: Question[] = [
  {
    id: "hld-dns-resolution-order",
    lectures: [30],
    tags: ["resolution"],
    type: "order",
    prompt:
      "A user opens docs.acme.io for the first time ever, on a fresh laptop, using a recursive resolver that has never seen any .io name. Order the places the lookup goes.",
    steps: [
      "Browser cache",
      "Operating system cache and hosts file",
      "Recursive resolver",
      "Root server",
      ".io TLD server",
      "acme.io authoritative name server",
    ],
    explanation:
      "Local caches are checked first; on a miss the stub resolver hands off to the recursive resolver, which walks root, then TLD, then the authoritative server, following referrals at each step.",
    lessonAnchor: "resolving-a-name-step-by-step",
  },
  {
    id: "hld-dns-record-picks",
    lectures: [30],
    tags: ["records"],
    type: "scenario",
    prompt:
      "You're setting up DNS for startup.dev:\n• www.startup.dev must point to your CDN's hostname, startup.cdnprovider.net, whose IPs change often.\n• Google Workspace asks you to prove you own the domain.\n• Email to @startup.dev must go to Google's mail servers.\nWhich record type for each?",
    fields: [
      { label: "www to the CDN", options: RECORDS, answer: "CNAME" },
      { label: "Ownership proof", options: RECORDS, answer: "TXT" },
      { label: "Email delivery", options: RECORDS, answer: "MX" },
    ],
    explanation:
      "A CNAME aliases www to the CDN's name, so you follow their IP changes automatically; hard-coding an A record would break when they move. Verification tokens go in TXT, and MX says where mail is delivered.",
    lessonAnchor: "record-types",
  },
  {
    id: "hld-dns-apex-cname",
    lectures: [30],
    tags: ["records", "cname"],
    type: "mcq",
    prompt:
      "You try to add a CNAME on the bare domain startup.dev pointing to your load balancer's hostname, and your DNS provider refuses. Why, and what's the usual fix?",
    options: [
      "The apex must hold NS and SOA records, and a CNAME can't coexist with other records; use the provider's ALIAS or flattened record",
      "CNAMEs only work for IPv6; use AAAA",
      "CNAMEs need a TTL over one day; raise the TTL",
      "Load balancers don't support DNS; use an IP instead",
    ],
    answer: "The apex must hold NS and SOA records, and a CNAME can't coexist with other records; use the provider's ALIAS or flattened record",
    explanation:
      "A CNAME means the name is purely an alias, so it can't have other records, but the zone apex always has NS and SOA. ALIAS/ANAME or CNAME flattening resolve the target server-side and return plain A records.",
    lessonAnchor: "cname-rules-worth-knowing",
  },
  {
    id: "hld-dns-migration-ttl",
    lectures: [30],
    tags: ["ttl", "migration"],
    type: "scenario",
    prompt:
      "api.shop.com has an A record with TTL 86400 (one day). On Saturday at 02:00 you must move it to a new server's IP with minimal disruption.\nPlan it.",
    fields: [
      {
        label: "On Thursday",
        options: ["Change the IP now", "Lower the TTL to 60 seconds", "Raise the TTL to a week", "Delete the record"],
        answer: "Lower the TTL to 60 seconds",
      },
      {
        label: "After switching on Saturday",
        options: ["Shut the old server down immediately", "Keep the old server running for a while", "Flush the root servers", "Change the NS records too"],
        answer: "Keep the old server running for a while",
      },
    ],
    explanation:
      "Caches hold the old answer for up to the old TTL, so lower the TTL at least a day before; then the switch takes effect in about a minute. Some clients cache past the TTL, so the old server should keep serving until traffic drains.",
    lessonAnchor: "planning-a-migration",
  },
  {
    id: "hld-dns-nxdomain",
    lectures: [30],
    tags: ["ttl", "caching"],
    type: "mcq",
    prompt:
      "A developer ran curl beta.shop.com, got 'could not resolve host', then created the beta A record. Ten minutes later, their machine still can't resolve it, but a colleague on a different network can. What's the most likely cause?",
    options: [
      "Their resolver cached the NXDOMAIN answer and is waiting for the negative-caching TTL",
      "DNS changes take 48 hours to propagate to the root servers",
      "The record needs to be added to the .com TLD as well",
      "Their browser blocks new subdomains",
    ],
    answer: "Their resolver cached the NXDOMAIN answer and is waiting for the negative-caching TTL",
    explanation:
      "'Not found' is cached too, for the duration set in the zone's SOA. The colleague's resolver never cached the miss. Nothing is pushed to the root or TLD for a new subdomain; it lives only in your zone.",
    lessonAnchor: "negative-caching",
  },
  {
    id: "hld-dns-geo-wrong-region",
    lectures: [30],
    tags: ["geo-dns", "load-balancing"],
    type: "mcq",
    prompt:
      "You use geo DNS to send Indian users to your Mumbai region. Some users in Delhi on a public resolver are being sent to Singapore. Why?",
    options: [
      "Geo DNS sees the resolver's location, not the user's; without EDNS Client Subnet it guesses from the resolver",
      "Anycast always routes to Singapore",
      "Their browser cache is corrupted",
      "Geo DNS only works for IPv6",
    ],
    answer: "Geo DNS sees the resolver's location, not the user's; without EDNS Client Subnet it guesses from the resolver",
    explanation:
      "The authoritative server only sees who asked it, which is the recursive resolver. EDNS Client Subnet passes along part of the user's IP so the answer can reflect the user's real location.",
    lessonAnchor: "geo-dns-and-latency-based-routing",
  },
  {
    id: "hld-dns-failover-design",
    lectures: [30],
    tags: ["load-balancing", "anycast"],
    type: "scenario",
    prompt:
      "You run two regions behind api.example.com. Requirements: if a whole region goes down, move traffic within a few minutes; and within a region, a dead app server should stop receiving traffic within seconds.\nWhat handles each?",
    fields: [
      {
        label: "Region outage",
        options: ["Health-checked DNS failover with a short TTL", "Round-robin DNS with a one-day TTL", "Editing the hosts file", "MX priorities"],
        answer: "Health-checked DNS failover with a short TTL",
      },
      {
        label: "Dead app server in a region",
        options: ["Health-checked DNS failover with a short TTL", "The region's load balancer health checks", "Negative caching", "A CNAME chain"],
        answer: "The region's load balancer health checks",
      },
    ],
    explanation:
      "DNS failover is coarse and bounded by TTLs and misbehaving caches, which is fine for region-level moves. Per-server health needs to react in seconds, which is a load balancer's job.",
    lessonAnchor: "dns-for-load-balancing",
  },
  {
    id: "hld-dns-anycast",
    lectures: [30],
    tags: ["anycast"],
    type: "mcq",
    prompt:
      "Your public resolver service has a single IP address. Users worldwide should reach a nearby node, with no client configuration, and keep working if a site goes offline. What makes this work?",
    options: [
      "Anycast: announce the same IP from many sites via BGP so routers pick the nearest",
      "Geo DNS on the resolver's own A record",
      "Round-robin DNS across all sites",
      "A CNAME per country",
    ],
    answer: "Anycast: announce the same IP from many sites via BGP so routers pick the nearest",
    explanation:
      "Users configure an IP, not a name, so DNS-based routing can't help. Anycast lets the network route each packet to the closest site, and a failed site simply stops announcing the route.",
    lessonAnchor: "anycast",
  },
];
