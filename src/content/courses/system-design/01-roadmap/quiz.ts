import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "sd-roadmap-small-scale",
    lectures: [1],
    tags: ["requirements", "architecture"],
    type: "scenario",
    prompt:
      "An interviewer asks you to design an internal expense tool. You ask about scale: about 1,000 employees in one country, a few dozen submissions a day.\nWhat do you propose?",
    fields: [
      { label: "Architecture", options: ["A single monolith", "Microservices per feature", "Event-driven services on Kafka", "Serverless functions per endpoint"], answer: "A single monolith" },
      { label: "Database", options: ["One relational database", "Sharded NoSQL cluster", "Multi-region replicated store", "One database per service"], answer: "One relational database" },
    ],
    explanation:
      "At this scale one server and one database handle the load with room to spare. Microservices or sharding would add network hops, deployments and failure modes without solving any problem the requirements actually have.",
    lessonAnchor: "week-9-design-thinking",
  },
  {
    id: "sd-roadmap-global-users",
    lectures: [1],
    tags: ["requirements", "latency"],
    type: "mcq",
    prompt:
      "Your photo-sharing app runs in one region in the US. Requirements change: half the users will now be in India and Brazil, and they complain pages feel sluggish. Which requirement changed the design most?",
    options: [
      "Geographic distribution of users",
      "The number of database tables",
      "The programming language of the backend",
      "Whether the API uses JSON",
    ],
    answer: "Geographic distribution of users",
    explanation:
      "Distance adds round-trip latency that no amount of server power fixes. Global users push you toward CDNs for static content and app servers or data closer to each region.",
    lessonAnchor: "week-9-design-thinking",
  },
  {
    id: "sd-roadmap-transport",
    lectures: [1],
    tags: ["networking", "tcp", "udp"],
    type: "scenario",
    prompt:
      "Pick the transport for each feature.",
    fields: [
      { label: "A 1-on-1 video call", options: ["UDP", "TCP"], answer: "UDP" },
      { label: "Downloading a 2 GB game patch", options: ["UDP", "TCP"], answer: "TCP" },
      { label: "Watching a recorded lecture on a video site", options: ["UDP", "TCP"], answer: "TCP" },
    ],
    explanation:
      "A video call can't wait for retransmissions; a late frame is useless, so UDP wins. A download must arrive complete and in order, so TCP. Recorded (and most live) streaming tolerates a few seconds of buffering and runs over TCP or QUIC.",
    lessonAnchor: "networking",
  },
  {
    id: "sd-roadmap-status-codes",
    lectures: [1],
    tags: ["networking", "status-codes", "microservices"],
    type: "mcq",
    prompt:
      "The inventory service is overloaded and briefly can't serve requests, but it returns 404 Not Found. The order service calling it treats 404 as \"item doesn't exist\" and cancels orders. What should inventory have returned?",
    options: ["503 Service Unavailable", "400 Bad Request", "200 OK with an empty body", "409 Conflict"],
    answer: "503 Service Unavailable",
    explanation:
      "Callers decide whether to retry, give up or cancel based on the status code. 503 says \"temporary, try again later\"; 404 claims the item doesn't exist, which is false and triggers the wrong action.",
    lessonAnchor: "networking",
  },
  {
    id: "sd-roadmap-dlq",
    lectures: [1],
    tags: ["queues", "dead-letter-queue"],
    type: "mcq",
    prompt:
      "One malformed order message crashes your consumer every time it's processed. It gets redelivered forever, and the 50,000 valid messages behind it pile up. What's the standard fix?",
    options: [
      "After a few failed attempts, move it to a dead-letter queue and continue",
      "Switch the broker from Kafka to RabbitMQ",
      "Make the consumer synchronous",
      "Delete the whole queue and replay from the database",
    ],
    answer: "After a few failed attempts, move it to a dead-letter queue and continue",
    explanation:
      "A dead-letter queue parks poison messages after a retry limit so they stop blocking healthy traffic, and engineers can inspect them later. Changing brokers doesn't fix a message that can't be processed.",
    lessonAnchor: "week-8-queues-and-messaging",
  },
  {
    id: "sd-roadmap-consistency",
    lectures: [1],
    tags: ["consistency", "cap"],
    type: "scenario",
    prompt: "Choose the consistency model each feature needs.",
    fields: [
      { label: "Like count on a viral post", options: ["Strong consistency", "Eventual consistency"], answer: "Eventual consistency" },
      { label: "Wallet balance before approving a payment", options: ["Strong consistency", "Eventual consistency"], answer: "Strong consistency" },
      { label: "Follower count on a profile", options: ["Strong consistency", "Eventual consistency"], answer: "Eventual consistency" },
    ],
    explanation:
      "Counters that are briefly behind harm no one and converge later, so they favour availability. A payment approved against a stale balance can overdraw an account, so money needs strong consistency.",
    lessonAnchor: "week-7-databases-in-depth",
  },
  {
    id: "sd-roadmap-archetype",
    lectures: [1],
    tags: ["architectures"],
    type: "scenario",
    prompt: "You're asked to design these products. Which archetype is the closest starting point for each?",
    fields: [
      { label: "A bike-taxi booking app", options: ["Ride sharing", "Social feed", "Short video", "URL shortener"], answer: "Ride sharing" },
      { label: "A professional network's home timeline", options: ["Ride sharing", "Social feed", "Short video", "URL shortener"], answer: "Social feed" },
      { label: "A service that turns long links into 7-character codes", options: ["Ride sharing", "Social feed", "Short video", "URL shortener"], answer: "URL shortener" },
    ],
    explanation:
      "Products in the same family share the same core problems: live location matching, feed fan-out, or key-to-value lookups. Learn the archetype once and adapt the details.",
    lessonAnchor: "week-11-real-architectures",
  },
];
