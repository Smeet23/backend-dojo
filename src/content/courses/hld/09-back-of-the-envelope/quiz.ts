import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-bote-qps",
    lectures: [9],
    tags: ["qps", "estimation"],
    type: "scenario",
    prompt:
      "A notification service sends 2 billion push notifications per day. Traffic peaks at about 4× the average during the evening.\nEstimate the average and peak send rate.",
    fields: [
      { label: "Average", options: ["About 2,300/s", "About 23,000/s", "About 230,000/s", "About 2.3M/s"], answer: "About 23,000/s" },
      { label: "Peak", options: ["About 9,000/s", "About 50,000/s", "About 90,000/s", "About 900,000/s"], answer: "About 90,000/s" },
    ],
    explanation:
      "1 billion per day is about 12,000 per second, so 2 billion is about 23,000/s on average; 4× gives about 90,000/s at peak. Design for the peak, not the average.",
    lessonAnchor: "traffic-and-qps",
  },
  {
    id: "hld-bote-storage-decision",
    lectures: [9],
    tags: ["storage", "estimation"],
    type: "scenario",
    prompt:
      "A document-scanning app receives 4 million uploads per day. Each scan is about 2 MB, plus about 2 KB of metadata (owner, OCR status, tags). Everything is kept for 3 years.\nEstimate the blob storage and say where each kind of data should live.",
    fields: [
      { label: "Blob storage over 3 years", options: ["About 9 TB", "About 90 TB", "About 9 PB", "About 90 PB"], answer: "About 9 PB" },
      { label: "Scans go in", options: ["Object storage (S3-style)", "The primary Postgres database as BYTEA", "Redis", "The search index"], answer: "Object storage (S3-style)" },
      { label: "Metadata goes in", options: ["A (sharded) database", "Object storage file names", "A CDN", "Browser local storage"], answer: "A (sharded) database" },
    ],
    explanation:
      "4M × 2 MB = 8 TB/day; × about 1,100 days ≈ 9 PB. That belongs in object storage. Metadata is only 8 GB/day (about 9 TB total) and needs queries, so it goes in a database. Splitting blobs from metadata is the decision the estimate forces.",
    lessonAnchor: "storage",
  },
  {
    id: "hld-bote-bits-bytes",
    lectures: [9],
    tags: ["bandwidth", "units"],
    type: "mcq",
    prompt:
      "A live-streaming platform expects 200,000 concurrent viewers at 4 Mbps each. A colleague says \"that's 800 GB/s of egress\". What is the correct figure?",
    options: ["About 800 Gbps, which is about 100 GB/s", "800 GB/s, as stated", "About 8 Gbps", "About 6.4 Tbps"],
    answer: "About 800 Gbps, which is about 100 GB/s",
    explanation:
      "200,000 × 4 Mbps = 800,000 Mbps = 800 Gbps. Network rates are bits; divide by 8 for bytes, giving about 100 GB/s. The colleague mixed bits and bytes. Either way, this requires a CDN.",
    lessonAnchor: "bandwidth",
  },
  {
    id: "hld-bote-cache-size",
    lectures: [9],
    tags: ["cache", "memory"],
    type: "scenario",
    prompt:
      "A product-catalogue API serves 500 million reads per day. Each product record is about 2 KB, and popularity is heavily skewed.\nUsing the 80/20 rule as an upper bound, how big should the cache be, and what does that imply?",
    fields: [
      { label: "Cache size", options: ["About 2 GB", "About 200 GB", "About 2 TB", "About 20 TB"], answer: "About 200 GB" },
      { label: "Implication", options: ["A small Redis cluster (a handful of nodes) holds it", "It cannot be cached; read the database directly", "It needs a CDN for every request", "Use a single 8 GB cache instance"], answer: "A small Redis cluster (a handful of nodes) holds it" },
    ],
    explanation:
      "0.2 × 500M × 2 KB = 200 GB, which is a few 64 GB nodes plus replicas. Because the daily read volume counts popular items many times, the real distinct hot set is smaller still.",
    lessonAnchor: "memory-and-cache-sizing",
  },
  {
    id: "hld-bote-latency-ladder",
    lectures: [9],
    tags: ["latency"],
    type: "order",
    prompt: "Order these from fastest to slowest.",
    steps: [
      "Read a value from main memory",
      "Random 4 KB read from an SSD",
      "Round trip between two servers in the same data centre",
      "Seek on a spinning hard disk",
      "Round trip from Mumbai to California",
    ],
    explanation:
      "About 100 ns, then tens to about 150 µs, then about 0.5 ms, then about 10 ms, then about 200+ ms. Each step is roughly one or more orders of magnitude slower than the one before.",
    lessonAnchor: "latency-numbers-every-engineer-should-know",
  },
  {
    id: "hld-bote-cross-region",
    lectures: [9],
    tags: ["latency", "design"],
    type: "mcq",
    prompt:
      "Your checkout page in Europe calls a US-hosted pricing service 8 times in sequence, about 90 ms round trip each. Engineers are profiling the Java code to make the page faster. What should they do first?",
    options: [
      "Batch the 8 calls into one, or move/cache pricing in the European region",
      "Rewrite the pricing service in a faster language",
      "Add more pricing servers in the US",
      "Increase the JVM heap",
    ],
    answer: "Batch the 8 calls into one, or move/cache pricing in the European region",
    explanation:
      "8 × 90 ms = 720 ms of pure network wait, which dwarfs any CPU work. Cross-region round trips are the most expensive thing a request can do; cutting their number or distance is the fix. More US servers don't change the speed of light.",
    lessonAnchor: "latency-numbers-every-engineer-should-know",
  },
  {
    id: "hld-bote-nines",
    lectures: [9],
    tags: ["availability"],
    type: "scenario",
    prompt:
      "A payments API has an SLA of 99.99% per month. Its request path calls three internal services in series, each currently at 99.95%.\nAnswer both parts.",
    fields: [
      { label: "Allowed downtime per month", options: ["About 4.4 minutes", "About 43 minutes", "About 7 hours", "About 26 seconds"], answer: "About 4.4 minutes" },
      { label: "Can the chain meet it as-is?", options: ["No: 0.9995³ ≈ 99.85%, below 99.99%", "Yes: the weakest link is 99.95%, above 99.99%", "Yes: availabilities add up", "Only if traffic is low"], answer: "No: 0.9995³ ≈ 99.85%, below 99.99%" },
    ],
    explanation:
      "Four nines is about 4.4 minutes a month. Serial dependencies multiply, so the chain is at most about 99.85% and each dependency would need far better availability, redundancy, or removal from the critical path.",
    lessonAnchor: "availability-numbers",
  },
  {
    id: "hld-bote-shards",
    lectures: [9],
    tags: ["servers", "database"],
    type: "scenario",
    prompt:
      "An IoT platform ingests 1.5 billion sensor readings per day, peaking at 3× average. One database shard sustains about 5,000 writes per second with headroom.\nHow many shards do you plan for?",
    fields: [
      { label: "Peak write rate", options: ["About 17,000/s", "About 52,000/s", "About 520,000/s", "About 5,200/s"], answer: "About 52,000/s" },
      { label: "Shard plan", options: ["2 shards", "About 11, so plan 16 to grow into", "100 shards", "1 shard with a bigger machine"], answer: "About 11, so plan 16 to grow into" },
    ],
    explanation:
      "1.5B/day ≈ 17,000/s average; × 3 ≈ 52,000/s peak. 52,000 ÷ 5,000 ≈ 11 shards; rounding up to a power of two leaves room for growth and makes splitting easier.",
    lessonAnchor: "server-count",
  },
  {
    id: "hld-bote-mistake",
    lectures: [9],
    tags: ["estimation"],
    type: "mcq",
    prompt:
      "In an interview a candidate computes \"11,574.07 QPS average\" and \"4.3 PB of storage\", then moves on to draw the architecture. What is the biggest weakness?",
    options: [
      "They never said what the numbers imply for the design (sharding, object storage, caching)",
      "They should have used 2^10 instead of 1,000",
      "They should have computed to more decimal places",
      "QPS should be computed per minute",
    ],
    answer: "They never said what the numbers imply for the design (sharding, object storage, caching)",
    explanation:
      "Estimates exist to drive decisions. The false precision is a minor smell, but the real gap is not connecting 4.3 PB to object storage or 12K QPS to a cache and server count.",
    lessonAnchor: "common-mistakes",
  },
];
