import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "sd-uber-ping-estimate",
    lectures: [6],
    tags: ["estimation", "location"],
    type: "scenario",
    prompt:
      "A ride-hailing app in one country has 300,000 drivers online at peak. Each sends a 50-byte location ping every 3 seconds. Estimate the load on the ingestion tier.",
    fields: [
      { label: "Pings per second", options: ["10,000", "100,000", "900,000", "1,000,000"], answer: "100,000" },
      { label: "Ingress bandwidth (payload only)", options: ["About 5 MB/s", "About 50 MB/s", "About 500 KB/s", "About 15 MB/s"], answer: "About 5 MB/s" },
      { label: "Memory for every driver's latest ping", options: ["About 15 MB", "About 150 MB", "About 1.5 GB", "About 15 GB"], answer: "About 15 MB" },
    ],
    explanation:
      "300,000 / 3 s = 100,000 pings/s; × 50 B = 5 MB/s (about 40 Mbit/s). The latest position per driver is 300,000 × 50 B = 15 MB, which fits easily in memory; you shard it for write throughput and availability, not size.",
    lessonAnchor: "location-updates",
  },
  {
    id: "sd-uber-nearby-query",
    lectures: [6],
    tags: ["geospatial", "indexing"],
    type: "mcq",
    prompt:
      "The first version finds nearby drivers with SELECT ... WHERE distance(lat, lng, :rider) < 2 km on a Postgres table that is updated on every ping. At 50,000 pings per second, matching queries take seconds. What is the core fix?",
    options: [
      "Index drivers by geo cell in memory and look up the rider's cell plus neighbouring rings",
      "Add a B-tree index on the lat column",
      "Cache the query results for 10 minutes",
      "Run the distance query on a read replica",
    ],
    answer: "Index drivers by geo cell in memory and look up the rider's cell plus neighbouring rings",
    explanation:
      "A cell index turns a distance scan into a few set lookups, and an in-memory store absorbs constant overwrites. A B-tree on latitude alone still scans a whole band of the planet; a 10-minute cache would offer drivers who left long ago; a replica is just as slow and also lags.",
    lessonAnchor: "why-not-just-query-by-distance",
  },
  {
    id: "sd-uber-hex-vs-square",
    lectures: [6],
    tags: ["geospatial", "h3"],
    type: "mcq",
    prompt:
      "Your team uses square geohash cells and expands searches one ring of neighbours at a time. Riders complain that the \"nearest\" driver offered is sometimes farther than another one that was skipped. Why would hexagonal cells (H3) help?",
    options: [
      "All six neighbours of a hexagon are the same distance from its centre, so each ring approximates a circle",
      "Hexagons are smaller than squares at every resolution",
      "Hexagon IDs are strings, so prefix queries are faster",
      "Hexagons never have boundary problems, so neighbours need not be checked",
    ],
    answer: "All six neighbours of a hexagon are the same distance from its centre, so each ring approximates a circle",
    explanation:
      "With squares, diagonal neighbours are farther than edge neighbours, so a ring covers a lumpy area. Hexagon rings expand evenly in every direction. You still check neighbouring cells with any scheme, and H3 IDs are 64-bit integers.",
    lessonAnchor: "divide-the-map-into-cells",
  },
  {
    id: "sd-uber-kring",
    lectures: [6],
    tags: ["geospatial", "k-ring"],
    type: "scenario",
    prompt:
      "A rider's pickup cell has no free drivers. The dispatcher expands the search with k-ring until it finds candidates and finds the first free drivers at k = 2.",
    fields: [
      { label: "Cells examined at k = 2", options: ["3", "7", "13", "19"], answer: "19" },
      { label: "How to pick among the candidates", options: ["Lowest road ETA to the pickup", "Lowest driver ID", "Fewest rings away, ignore roads", "Random"], answer: "Lowest road ETA to the pickup" },
    ],
    explanation:
      "k is a radius: the cells within 2 steps are 3·2·3 + 1 = 19. Ring distance only gathers candidates; a driver across a river may be close in rings and far in minutes, so ranking uses road ETA.",
    lessonAnchor: "k-ring-search",
  },
  {
    id: "sd-uber-stale-driver",
    lectures: [6],
    tags: ["location", "redis"],
    type: "scenario",
    prompt:
      "Drivers whose phones die mid-shift keep receiving offers for 20 minutes, and riders wait for drivers who never respond. Driver entries in the geo index are only removed when the driver taps \"go offline\".",
    fields: [
      { label: "Fix", options: ["Give each driver record a short TTL refreshed by every ping", "Poll every phone once a minute", "Store driver locations in Postgres", "Increase the offer timeout"], answer: "Give each driver record a short TTL refreshed by every ping" },
      { label: "Reasonable TTL with 4-second pings", options: ["About 1 second", "About 30 seconds", "About 1 hour", "No expiry"], answer: "About 30 seconds" },
    ],
    explanation:
      "If pings refresh a TTL, a silent driver disappears from search automatically. About 30 seconds tolerates a few lost pings without keeping ghosts around; 1 second would drop drivers between normal pings.",
    lessonAnchor: "location-ingestion",
  },
  {
    id: "sd-uber-double-booking",
    lectures: [6],
    tags: ["dispatch", "locks"],
    type: "scenario",
    prompt:
      "Two dispatch workers occasionally send offers for the same driver to two different riders at the same moment. You want exactly one worker to win, and the driver to become free again automatically if the offer is ignored or the worker crashes.",
    fields: [
      { label: "Reservation command", options: ["SET driver:101:lock trip:77 NX EX 15", "SET driver:101:lock trip:77", "GET driver:101:lock then SET it", "INCR driver:101:lock"], answer: "SET driver:101:lock trip:77 NX EX 15" },
      { label: "Extra safety on the final assignment", options: ["Make the state change conditional on the trip still being OFFERED to this trip", "Retry the SET until it succeeds", "Remove the expiry", "Lock all drivers in the cell"], answer: "Make the state change conditional on the trip still being OFFERED to this trip" },
    ],
    explanation:
      "NX makes the reservation atomic (only one SET succeeds) and EX makes it expire by itself. GET-then-SET is a race. Because a paused worker can outlive its lease, the final write should also be conditional so a stale worker cannot overwrite a newer assignment.",
    lessonAnchor: "reserving-a-driver",
  },
  {
    id: "sd-uber-batch",
    lectures: [6],
    tags: ["dispatch", "matching"],
    type: "mcq",
    prompt:
      "Product asks why the dispatcher waits about two seconds before matching instead of instantly giving each request the nearest free driver. What's the best answer?",
    options: [
      "Batching lets it solve one assignment across many riders and drivers, lowering total wait time compared with greedy first-come matching",
      "Two seconds is the time Kafka needs to commit a message",
      "It gives Redis time to replicate the driver index",
      "Drivers can only receive one push notification every two seconds",
    ],
    answer: "Batching lets it solve one assignment across many riders and drivers, lowering total wait time compared with greedy first-come matching",
    explanation:
      "Greedy matching can give the first rider a driver that a later rider needed far more. Matching a batch as a weighted bipartite assignment minimises total pickup time. The other options aren't real constraints.",
    lessonAnchor: "batch-matching",
  },
  {
    id: "sd-uber-trip-states",
    lectures: [6],
    tags: ["trip", "state-machine"],
    type: "order",
    prompt: "Put the states of a successful trip in order.",
    steps: ["REQUESTED", "MATCHING", "OFFERED", "ACCEPTED", "ARRIVED", "IN_PROGRESS", "COMPLETED"],
    explanation:
      "A request is matched, offered to a reserved driver, accepted, the driver arrives at pickup, the trip starts and finally completes. A declined or timed-out offer goes back from OFFERED to MATCHING.",
    lessonAnchor: "the-trip-state-machine",
  },
  {
    id: "sd-uber-double-charge",
    lectures: [6],
    tags: ["trip", "idempotency"],
    type: "scenario",
    prompt:
      "A driver taps \"end trip\" in a tunnel. The app retries, and the backend receives two end_trip events for trip 77. Some riders were charged twice.",
    fields: [
      { label: "Trip service behaviour", options: ["Apply the transition only if the trip is still IN_PROGRESS; the duplicate changes nothing", "Process both and refund later", "Lock the rider's account", "Ignore all events after the first second"], answer: "Apply the transition only if the trip is still IN_PROGRESS; the duplicate changes nothing" },
      { label: "Payment call", options: ["Send an idempotency key such as the trip ID", "Retry until two successes", "Charge asynchronously with no key", "Charge on the driver's phone"], answer: "Send an idempotency key such as the trip ID" },
    ],
    explanation:
      "A conditional state transition makes the second end_trip a no-op, and the payment provider deduplicates on the idempotency key if the charge itself is retried. Refunding afterwards still means customers see double charges.",
    lessonAnchor: "the-trip-state-machine",
  },
  {
    id: "sd-uber-storage-choice",
    lectures: [6],
    tags: ["storage", "databases"],
    type: "scenario",
    prompt: "Choose a home for each kind of data.",
    fields: [
      { label: "Live driver positions and status", options: ["Redis", "Relational DB (MySQL/Postgres)", "Cassandra", "S3 / data lake"], answer: "Redis" },
      { label: "Riders' payment methods and driver payouts", options: ["Redis", "Relational DB (MySQL/Postgres)", "Cassandra", "S3 / data lake"], answer: "Relational DB (MySQL/Postgres)" },
      { label: "Trips and location trails from the last week", options: ["Redis", "Relational DB (MySQL/Postgres)", "Cassandra", "S3 / data lake"], answer: "Cassandra" },
      { label: "Location trails from two years ago", options: ["Redis", "Relational DB (MySQL/Postgres)", "Cassandra", "S3 / data lake"], answer: "S3 / data lake" },
    ],
    explanation:
      "Live positions are tiny, hot and disposable: memory. Money needs transactions and strong consistency. Recent trips are a huge, write-heavy, multi-region workload that suits a wide-column store. Old trails are rarely read, so they go to cheap compressed storage.",
    lessonAnchor: "storage",
  },
];
