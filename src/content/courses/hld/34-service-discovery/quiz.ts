import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-discovery-hardcoded-ip",
    lectures: [34],
    tags: ["discovery"],
    type: "mcq",
    prompt:
      "Your checkout service reads INVENTORY_URL=http://10.0.3.8:8080 from config. It worked for months. After the inventory team enabled autoscaling and rolling deploys, checkout fails after every inventory deploy. Why?",
    options: [
      "Autoscaling makes inventory slower",
      "Instance addresses change on every deploy and scale event, so a fixed IP goes stale",
      "Config files can't hold URLs with ports",
      "Rolling deploys change the inventory API contract",
    ],
    answer: "Instance addresses change on every deploy and scale event, so a fixed IP goes stale",
    explanation:
      "New instances come up on new IPs and old ones disappear. The caller needs a runtime lookup (a registry, DNS name or load balancer), not a hard-coded address.",
    lessonAnchor: "why-discovery-is-needed",
  },
  {
    id: "hld-discovery-client-vs-server",
    lectures: [34],
    tags: ["client-side", "server-side"],
    type: "scenario",
    prompt:
      "Your company has services in Java, Go, Python and Node. The platform team doesn't want to maintain registry client libraries in four languages, and an extra millisecond per call is acceptable.",
    fields: [
      { label: "Discovery style", options: ["Client-side discovery", "Server-side discovery", "Hard-coded IPs", "Static DNS records edited by hand"], answer: "Server-side discovery" },
      { label: "Example implementation", options: ["Eureka client with Spring Cloud LoadBalancer", "A load balancer in front of each service, fed by the registry", "Each service polling etcd directly", "Peer-to-peer gossip in every client"], answer: "A load balancer in front of each service, fed by the registry" },
    ],
    explanation:
      "Server-side discovery keeps clients dumb: they call one stable address and the load balancer picks an instance. Client-side discovery would need lookup and balancing logic in all four languages.",
    lessonAnchor: "server-side-discovery",
  },
  {
    id: "hld-discovery-readiness-db",
    lectures: [34],
    tags: ["health-checks"],
    type: "scenario",
    prompt:
      "Your API's readiness probe runs SELECT 1 against the shared Postgres. During a 20-second database failover, Kubernetes removes all 30 API pods from the Service, and even cached endpoints that don't need the DB return errors.",
    fields: [
      { label: "What went wrong", options: ["Readiness depended on a shared downstream, so every pod failed at once", "Liveness and readiness intervals were too long", "kube-proxy crashed", "The Service selector was wrong"], answer: "Readiness depended on a shared downstream, so every pod failed at once" },
      { label: "Better readiness check", options: ["Check the pod's own state (started, not draining, not overloaded)", "Run a heavier query against the DB", "Use the same check for liveness too", "Remove the readiness probe entirely"], answer: "Check the pod's own state (started, not draining, not overloaded)" },
    ],
    explanation:
      "A dependency shared by every instance turns one blip into a full outage of discovery. Readiness should reflect whether this instance can take traffic; handle downstream failures with timeouts, fallbacks and breakers.",
    lessonAnchor: "liveness-vs-readiness",
  },
  {
    id: "hld-discovery-registration",
    lectures: [34],
    tags: ["registration"],
    type: "scenario",
    prompt:
      "Match the setup to its registration style.\nA: A Spring Boot app includes the Eureka client, registers itself and sends a heartbeat every 30 seconds.\nB: Pods on Kubernetes only expose /ready; the control plane adds their IPs to EndpointSlices.",
    fields: [
      { label: "Setup A", options: ["Self-registration", "Third-party registration", "DNS-based registration", "Static registration"], answer: "Self-registration" },
      { label: "Setup B", options: ["Self-registration", "Third-party registration", "DNS-based registration", "Static registration"], answer: "Third-party registration" },
    ],
    explanation:
      "In A the instance writes to the registry itself. In B the platform acts as registrar on the pod's behalf, using the readiness signal; the app has no registry code.",
    lessonAnchor: "registration",
  },
  {
    id: "hld-discovery-dns-stale",
    lectures: [34],
    tags: ["dns"],
    type: "mcq",
    prompt:
      "You use Consul DNS with a 5-second TTL. After an instance dies, one legacy Java service keeps calling its IP for hours, while other services move on within seconds. Most likely cause?",
    options: [
      "Consul ignores TTLs for Java clients",
      "The runtime is caching DNS answers far longer than the TTL",
      "SRV records don't support Java",
      "The dead instance is still passing health checks",
    ],
    answer: "The runtime is caching DNS answers far longer than the TTL",
    explanation:
      "Only one client is affected, so the registry is fine. Some runtimes (notably older JVM settings) cache DNS beyond the TTL; configure the cache TTL to honour short values.",
    lessonAnchor: "dns-based-discovery",
  },
  {
    id: "hld-discovery-grpc-k8s",
    lectures: [34],
    tags: ["kubernetes"],
    type: "scenario",
    prompt:
      "A gRPC client calls a Kubernetes ClusterIP Service backed by 6 pods. After scaling to 6, one pod still gets nearly all the traffic.",
    fields: [
      { label: "Cause", options: ["kube-proxy balances connections, and gRPC reuses one long-lived HTTP/2 connection", "CoreDNS is returning only one IP", "The readiness probe is failing on 5 pods", "ClusterIPs only support HTTP/1.1"], answer: "kube-proxy balances connections, and gRPC reuses one long-lived HTTP/2 connection" },
      { label: "Fix", options: ["Headless Service with client-side load balancing, or a service mesh", "Lower the DNS TTL", "Use a NodePort Service", "Add more replicas"], answer: "Headless Service with client-side load balancing, or a service mesh" },
    ],
    explanation:
      "Connection-level balancing pins a multiplexed HTTP/2 connection to one pod. Request-level balancing needs the client (via a headless Service) or a sidecar proxy to spread individual calls.",
    lessonAnchor: "kubernetes-services",
  },
  {
    id: "hld-discovery-ap-registry",
    lectures: [34],
    tags: ["registry", "cap"],
    type: "mcq",
    prompt:
      "A network partition cuts off a third of your registry nodes from the rest. For service discovery, which behaviour is usually preferable?",
    options: [
      "Refuse all lookups until the partition heals, to avoid stale data",
      "Keep answering with possibly stale instance lists; callers retry on failures",
      "Evict every instance that the minority side can't see",
      "Fall back to hard-coded IPs in each service",
    ],
    answer: "Keep answering with possibly stale instance lists; callers retry on failures",
    explanation:
      "A slightly stale list is mostly correct, and callers already need timeouts and retries. Refusing lookups turns a registry partition into a system-wide outage, which is why Eureka is AP and why clients cache registry data.",
    lessonAnchor: "the-service-registry",
  },
  {
    id: "hld-discovery-shutdown-order",
    lectures: [34],
    tags: ["deploys"],
    type: "order",
    prompt: "An instance receives SIGTERM during a rolling deploy. Put a graceful shutdown in order so no caller gets connection errors.",
    steps: [
      "Start failing readiness (or deregister from the registry)",
      "Wait for registries, load balancers and client caches to stop routing to it",
      "Stop accepting new connections",
      "Finish in-flight requests",
      "Exit the process",
    ],
    explanation:
      "Discovery lags reality, so the instance must leave discovery first and wait out the propagation delay before it stops listening; otherwise callers still holding its address get refused connections.",
    lessonAnchor: "graceful-registration-and-deregistration",
  },
  {
    id: "hld-discovery-mesh",
    lectures: [34],
    tags: ["service-mesh"],
    type: "mcq",
    prompt:
      "You want zone-aware, per-request load balancing, automatic retries on another instance and mTLS for 40 services in 4 languages, without changing application code. Which fits best?",
    options: ["A service mesh with sidecar proxies", "DNS A records with short TTLs", "A shared registry client library", "One central NGINX for all traffic"],
    answer: "A service mesh with sidecar proxies",
    explanation:
      "A mesh gives client-side discovery smarts (per-request balancing, retries, mTLS) inside a sidecar, so no per-language libraries are needed. DNS can't do per-request decisions, and one central proxy is a bottleneck.",
    lessonAnchor: "service-mesh",
  },
];
