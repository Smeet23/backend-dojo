import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "sd-reels-estimate-cdn",
    lectures: [7],
    tags: ["estimation", "cdn"],
    type: "scenario",
    prompt:
      "Your estimate: 250M daily users, 30 reels each, 7 MB delivered per view, 25M uploads a day. A teammate proposes serving video from the API fleet behind the load balancer \"to keep things simple\".\nWork out the numbers and decide.",
    fields: [
      { label: "Bytes served per day", options: ["About 52 TB", "About 520 TB", "About 52 PB", "About 5 EB"], answer: "About 52 PB" },
      { label: "Read:write ratio (views per upload)", options: ["About 3:1", "About 30:1", "About 300:1", "About 30,000:1"], answer: "About 300:1" },
      { label: "Where the video bytes should come from", options: ["API servers streaming from the DB", "API servers proxying object storage", "CDN edges backed by object storage", "Redis"], answer: "CDN edges backed by object storage" },
    ],
    explanation:
      "7.5B views × 7 MB ≈ 52 PB a day, and 7.5B views ÷ 25M uploads ≈ 300 reads per write. No API fleet can push that; the app decides what to play and CDN edges near viewers deliver the bytes.",
    lessonAnchor: "scale-estimates",
  },
  {
    id: "sd-reels-upload-direct",
    lectures: [7],
    tags: ["upload", "object-storage"],
    type: "mcq",
    prompt:
      "Users on 3G keep failing to upload 60 MB raw reels: the upload restarts from zero on every drop, and your API servers' network cards are saturated. What's the best change?",
    options: [
      "Raise the API's request timeout to 10 minutes",
      "Return pre-signed multipart URLs so the client uploads parts directly to object storage",
      "Compress the video on the API server before saving it",
      "Store the raw video as a BLOB in the metadata database",
    ],
    answer: "Return pre-signed multipart URLs so the client uploads parts directly to object storage",
    explanation:
      "Direct multipart upload takes the bytes off your servers entirely and makes uploads resumable: only the failed part is retried. A longer timeout keeps the restart-from-zero problem and still burns API bandwidth.",
    lessonAnchor: "phase-b-upload-to-object-storage",
  },
  {
    id: "sd-reels-status-feed",
    lectures: [7],
    tags: ["data-model", "consistency"],
    type: "scenario",
    prompt:
      "A reel finished uploading and moderation flagged it. A bug report says it briefly appeared in some feeds while still being transcoded.\nWhat should the status be at each moment, and what rule fixes the bug?",
    fields: [
      { label: "While the worker transcodes", options: ["INIT", "UPLOADED", "PROCESSING", "READY"], answer: "PROCESSING" },
      { label: "After moderation flags it", options: ["FAILED", "BLOCKED", "READY", "INIT"], answer: "BLOCKED" },
      { label: "Rule for every feed and playback query", options: ["Show anything except FAILED", "Only show reels with status READY", "Show anything with segments in storage", "Show anything older than 5 minutes"], answer: "Only show reels with status READY" },
    ],
    explanation:
      "READY is the single gate for playability and feed eligibility; everything else (INIT, UPLOADED, PROCESSING, BLOCKED, FAILED) is invisible. 'Segments exist' is a tempting check, but a blocked reel can have segments.",
    lessonAnchor: "data-model",
  },
  {
    id: "sd-reels-snowflake",
    lectures: [7],
    tags: ["ids"],
    type: "mcq",
    prompt:
      "Reels are created in six regions. You need ids that never collide, need no cross-region coordination, and sort newest-first so 'latest reels by this creator' is a range scan. Which scheme fits?",
    options: [
      "Auto-increment column in one primary database",
      "Random UUIDv4",
      "Snowflake-style: timestamp + region/worker id + per-ms sequence",
      "Hash of the video file",
    ],
    answer: "Snowflake-style: timestamp + region/worker id + per-ms sequence",
    explanation:
      "Snowflake ids are generated locally, unique because of the worker bits, and time-ordered because the timestamp is in the high bits. UUIDv4 is unique but random, so it doesn't sort by time; a single auto-increment is a bottleneck and single point of failure.",
    lessonAnchor: "generating-reel-ids",
  },
  {
    id: "sd-reels-kafka-partition",
    lectures: [7],
    tags: ["kafka", "ordering"],
    type: "scenario",
    prompt:
      "Creators sometimes delete a reel seconds after uploading. Occasionally a worker processes 'reel.deleted' before 'reel.uploaded' for the same reel and the reel resurrects.\nHow do you fix the ordering?",
    fields: [
      { label: "Partition key for reel events", options: ["Random", "creator_id hashed with timestamp", "reel_id", "Event type"], answer: "reel_id" },
      { label: "Ordering guarantee you then rely on", options: ["Global order across the topic", "Order within a partition", "Order by wall-clock timestamp", "No ordering is possible in Kafka"], answer: "Order within a partition" },
    ],
    explanation:
      "Kafka only orders events within a partition. Keying by reel_id puts every event for one reel on the same partition, read by one consumer at a time, so delete can't overtake upload. Partitioning by event type would split them onto different partitions.",
    lessonAnchor: "phase-b-upload-to-object-storage",
  },
  {
    id: "sd-reels-abr",
    lectures: [7],
    tags: ["streaming", "transcoding"],
    type: "scenario",
    prompt:
      "Viewers on trains complain reels freeze when signal drops, then resume at full quality. You currently store one 1080p MP4 per reel.\nRedesign the processed output.",
    fields: [
      { label: "Renditions", options: ["One 1080p file", "A bitrate ladder (240p to 1080p)", "Only 4K", "Only 240p"], answer: "A bitrate ladder (240p to 1080p)" },
      { label: "Segment length", options: ["Whole video as one segment", "About 2 seconds", "About 30 seconds", "100 ms"], answer: "About 2 seconds" },
      { label: "Who chooses the quality per segment", options: ["The transcoder at upload time", "The player, from measured throughput", "The CDN at random", "The ranking model"], answer: "The player, from measured throughput" },
    ],
    explanation:
      "Adaptive bitrate streaming needs several renditions cut at the same short boundaries so the player can switch down when throughput drops. 2 s balances fast start and adaptation against request overhead; 100 ms segments would multiply requests for little gain.",
    lessonAnchor: "phase-c-transcode-and-segment",
  },
  {
    id: "sd-reels-hot-counter",
    lectures: [7],
    tags: ["counters", "hot-key"],
    type: "scenario",
    prompt:
      "A celebrity's reel gets 100k likes a minute. The stats shard holding it shows lock waits, timeouts and replica lag, and other reels on that shard slow down too. Each like runs UPDATE reel_stats SET likes = likes + 1.\nRedesign the like path.",
    fields: [
      { label: "Root cause", options: ["Too many likes-table rows", "Every like contends for one row's lock", "The SQL is unindexed", "Redis is full"], answer: "Every like contends for one row's lock" },
      { label: "What each like still writes synchronously", options: ["Nothing", "An insert of (reel_id, user_id) into the likes table", "The full reel_stats row", "A row in the metadata DB"], answer: "An insert of (reel_id, user_id) into the likes table" },
      { label: "How the count gets updated", options: ["Per-like UPDATE inside a bigger transaction", "Kafka event → aggregator batches → one UPDATE per flush", "Clients send the new total", "A nightly COUNT(*)"], answer: "Kafka event → aggregator batches → one UPDATE per flush" },
      { label: "Where clients read counts from", options: ["reel_stats primary", "The likes table with COUNT(*)", "Redis, refreshed after each flush", "The CDN"], answer: "Redis, refreshed after each flush" },
    ],
    explanation:
      "The hot row is the problem, not write volume as such. Relationship inserts hit distinct keys and spread across shards, so they stay; counting moves to an aggregator that turns thousands of likes into one write, and reads come from Redis. A nightly COUNT(*) would be far too stale.",
    lessonAnchor: "likes-views-and-comments",
  },
  {
    id: "sd-reels-aggregator-dup",
    lectures: [7],
    tags: ["kafka", "idempotency"],
    type: "mcq",
    prompt:
      "After an aggregator restart, a reel's like count jumped by about 8,000 more than the likes table contains. The aggregator flushes to the DB, then commits its Kafka offset. What happened, and what's the robust fix?",
    options: [
      "Kafka lost messages; switch to at-most-once",
      "It crashed after flushing but before committing the offset, so the batch was re-counted; store the last applied offset with the counter in the same transaction",
      "Redis double-counted; disable the cache",
      "Users liked twice; drop the (reel_id, user_id) primary key",
    ],
    answer: "It crashed after flushing but before committing the offset, so the batch was re-counted; store the last applied offset with the counter in the same transaction",
    explanation:
      "At-least-once delivery means a batch can be replayed after a crash. Saving the offset atomically with the counter makes the flush idempotent (skip anything at or below it). At-most-once would trade over-counting for silently lost likes.",
    lessonAnchor: "step-3-aggregate-in-memory-and-flush",
  },
  {
    id: "sd-reels-feed-order",
    lectures: [7],
    tags: ["feed", "ranking"],
    type: "order",
    prompt: "Put the feed request for one user in order.",
    steps: [
      "Gather candidates from follow graph, embedding similarity and regional trending",
      "Filter out watched, blocked, non-READY and muted-creator reels",
      "Fetch user, reel and context features from the feature store",
      "Model predicts watch, completion and like probabilities; combine into a score",
      "Apply diversity and return the top 20 with manifest URLs",
      "Client prefetches the first segments of the next reels",
    ],
    explanation:
      "It's a funnel: cheap candidate sources narrow billions to about a thousand, filters remove ineligible reels before you spend model time on them, ranking scores the rest, and the client prefetches so the next swipe is instant.",
    lessonAnchor: "the-viewing-path",
  },
  {
    id: "sd-reels-swipe-lag",
    lectures: [7],
    tags: ["playback"],
    type: "mcq",
    prompt:
      "Feed responses arrive in 120 ms, but users still see a half-second black frame on every swipe. Which change targets that directly?",
    options: [
      "Rank 5,000 candidates instead of 1,500",
      "Prefetch the first one or two segments of the next reels while the current one plays",
      "Switch segment length to 10 seconds",
      "Move the metadata DB to the same region as the CDN",
    ],
    answer: "Prefetch the first one or two segments of the next reels while the current one plays",
    explanation:
      "The delay is fetching the next reel's first segment after the swipe. Prefetching it in the background makes playback start from local memory. Longer segments would make the first fetch slower, not faster.",
    lessonAnchor: "instant-playback-on-swipe",
  },
  {
    id: "sd-reels-viral-origin",
    lectures: [7],
    tags: ["cdn", "bottlenecks"],
    type: "scenario",
    prompt:
      "A new reel goes viral in 40 countries within ten minutes. Object storage reports a burst of identical GETs for the same segments from hundreds of edge locations.\nWhat do you add, and what does the upload path favour if a region fails mid-upload?",
    fields: [
      { label: "Add", options: ["More transcoding workers", "An origin shield (mid-tier cache) in front of object storage", "A second Kafka cluster", "A bigger metadata DB"], answer: "An origin shield (mid-tier cache) in front of object storage" },
      { label: "Upload path priority", options: ["Availability over durability", "Durability over availability", "Latency over everything", "Neither; it's best effort"], answer: "Durability over availability" },
    ],
    explanation:
      "An origin shield collapses many edge misses into one origin fetch per segment. For uploads it's better to make the creator wait or retry than to acknowledge and lose the video, so durability wins.",
    lessonAnchor: "bottlenecks-and-trade-offs",
  },
];
