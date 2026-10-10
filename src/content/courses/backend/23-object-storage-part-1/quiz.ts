import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "object-storage-part-1-avatars-404",
    lectures: [23],
    tags: ["local-disk", "scaling"],
    type: "scenario",
    prompt:
      "Your notes app saves avatars to /var/app/uploads on the API server. You scale from 1 to 4 instances behind a round-robin load balancer, and support reports avatars \"randomly\" failing to load.\nDiagnose it.",
    fields: [
      { label: "Roughly how many avatar requests 404", options: ["About 3 in 4", "About 1 in 4", "All of them", "None; it's a CDN issue"], answer: "About 3 in 4" },
      { label: "Property you broke", options: ["Statelessness", "Idempotency", "Durability", "Strong consistency"], answer: "Statelessness" },
      { label: "Real fix", options: ["Sticky sessions", "A persistent volume per instance", "Store files in object storage, keys in the DB", "Bigger disks"], answer: "Store files in object storage, keys in the DB" },
    ],
    explanation:
      "Each file exists only on the instance that received it, so a request only succeeds when it happens to hit that one instance out of four. Instances holding unique state breaks statelessness. A persistent volume survives restarts but is still per-instance, so it doesn't fix this.",
    lessonAnchor: "horizontal-scaling",
  },
  {
    id: "object-storage-part-1-folder-rename",
    lectures: [23],
    tags: ["keys", "folders"],
    type: "mcq",
    prompt:
      "A product manager asks you to \"just rename the folder\" uploads/2024/ to archive/2024/ in the bucket. It contains 40,000 objects. What does this actually involve?",
    options: [
      "One metadata update; folders are entries in the index",
      "Copying all 40,000 objects to new keys and deleting the originals",
      "Renaming the bucket",
      "Nothing; S3 supports atomic directory rename since 2020",
    ],
    answer: "Copying all 40,000 objects to new keys and deleting the originals",
    explanation:
      "There is no folder object; uploads/2024/ is just a shared prefix of 40,000 independent keys. Each must be copied to its new key and deleted, costing time, requests and the transfer of every byte.",
    lessonAnchor: "folders-are-an-illusion",
  },
  {
    id: "object-storage-part-1-key-design",
    lectures: [23],
    tags: ["keys"],
    type: "scenario",
    prompt:
      "You're designing object keys for a multi-tenant SaaS where users upload attachments. You want no collisions, cheap ownership checks in middleware, and no hot partitions.\nPick the key format and what to do with the user's file name.",
    fields: [
      {
        label: "Key format",
        options: ["uploads/{timestamp}/{filename}", "{filename}", "{tenant_id}/{user_id}/{uuid}.pdf", "{yyyy}/{mm}/{dd}/{uuid}.pdf"],
        answer: "{tenant_id}/{user_id}/{uuid}.pdf",
      },
      {
        label: "Original file name",
        options: ["Use it as the key", "Store it in the DB (and optionally user metadata)", "Discard it", "Put it in the bucket name"],
        answer: "Store it in the DB (and optionally user metadata)",
      },
    ],
    explanation:
      "A server-generated UUID avoids collisions and hostile characters, and the tenant/user prefix lets middleware authorize with a string prefix check. Date or timestamp prefixes funnel all current writes into one key range, the classic hot-partition shape.",
    lessonAnchor: "designing-object-keys",
  },
  {
    id: "object-storage-part-1-resume-overwrite",
    lectures: [23],
    tags: ["keys", "conditional-writes"],
    type: "mcq",
    prompt:
      "Users report their uploaded resume was replaced by a stranger's. Keys are built as uploads/{original file name}. Both users uploaded \"resume.pdf\". Why was there no error?",
    options: [
      "PUT replaces whatever is at a key, silently",
      "The bucket has versioning disabled, which makes PUT append",
      "S3 is eventually consistent, so the first write was lost",
      "Erasure coding merged the two objects",
    ],
    answer: "PUT replaces whatever is at a key, silently",
    explanation:
      "Like HTTP PUT, an object-store PUT means \"replace\". Same key, second write wins, no warning. Generate keys yourself, and if you need a hard guarantee use If-None-Match: * so a duplicate key fails with 412.",
    lessonAnchor: "never-use-the-uploaded-file-name",
  },
  {
    id: "object-storage-part-1-durability-vs-backup",
    lectures: [23],
    tags: ["durability", "backups"],
    type: "scenario",
    prompt:
      "Production incident: a cleanup script had a bug and deleted every object under t_81/ in the uploads bucket. The CTO says \"S3 has eleven nines of durability, just restore it.\"",
    fields: [
      { label: "Can S3's durability bring it back?", options: ["Yes, durability keeps deleted data for 30 days", "No, durability only protects against hardware failure", "Yes, via erasure-coded parity shards", "Only if the bucket is in us-east-1"], answer: "No, durability only protects against hardware failure" },
      { label: "What should have been enabled", options: ["Versioning plus replication to another account", "A bigger erasure code", "Strong consistency", "A CDN in front of the bucket"], answer: "Versioning plus replication to another account" },
    ],
    explanation:
      "Durability means the store faithfully keeps what you told it to, including your deletes. Versioning turns deletes and overwrites into recoverable versions, and replication to a separate account protects against leaked credentials too.",
    lessonAnchor: "durability-is-not-a-backup",
  },
  {
    id: "object-storage-part-1-list-in-request",
    lectures: [23],
    tags: ["metadata", "performance"],
    type: "mcq",
    prompt:
      "The \"My files\" page calls ListObjectsV2 with prefix t_81/u_42/ on every page load. It was fast in testing; at scale p99 latency is terrible. What's the right design?",
    options: [
      "Query your database's uploads table for the user's files",
      "Cache the LIST result in the browser for 24 hours",
      "Switch to a delimiter so S3 returns folders only",
      "Use HeadObject on every possible key",
    ],
    answer: "Query your database's uploads table for the user's files",
    explanation:
      "LIST is a range scan over a distributed index, much slower than a point lookup. Your database is the index of which files exist and who owns them; the bucket is for fetching bytes by a known key.",
    lessonAnchor: "the-metadata-index",
  },
  {
    id: "object-storage-part-1-conditional-cas",
    lectures: [23],
    tags: ["conditional-writes", "concurrency"],
    type: "scenario",
    prompt:
      "Two workers update the same settings.json object. Worker A reads it (ETag \"a1\"), and while A is editing, worker B writes a new version. A now writes its edit.\nHow should A write, and what happens?",
    fields: [
      { label: "Header A should send", options: ["If-None-Match: *", "If-Match: \"a1\"", "Cache-Control: no-store", "Content-MD5"], answer: "If-Match: \"a1\"" },
      { label: "Result", options: ["200 OK, B's change lost", "412 Precondition Failed", "409 Conflict", "304 Not Modified"], answer: "412 Precondition Failed" },
    ],
    explanation:
      "If-Match turns the PUT into compare-and-swap: it commits only if the ETag is still the one A read. B changed it, so A gets 412 and can re-read and retry instead of silently erasing B's work. If-None-Match: * is for create-only-if-absent.",
    lessonAnchor: "conditional-writes",
  },
  {
    id: "object-storage-part-1-oom-uploads",
    lectures: [23],
    tags: ["uploads", "streaming"],
    type: "scenario",
    prompt:
      "Your Go API accepts CSV imports through the server and calls r.ParseMultipartForm before uploading to S3. Containers have 2 GB of RAM. During a busy hour, 20 users import 100 MB files and containers start getting OOM-killed.",
    fields: [
      { label: "Root cause", options: ["Buffering whole bodies in memory", "S3 rate limiting", "Missing CORS config", "Hot partition on the key prefix"], answer: "Buffering whole bodies in memory" },
      { label: "Fix in this architecture", options: ["Stream parts to S3 with a body size cap", "Increase the LB idle timeout", "Raise the container limit to 4 GB", "Retry failed uploads"], answer: "Stream parts to S3 with a body size cap" },
    ],
    explanation:
      "20 concurrent 100 MB bodies is about 2 GB held at once. Streaming with MultipartReader keeps memory at a small buffer per upload regardless of file size, and MaxBytesReader stops oversized bodies early. A bigger container just moves the cliff.",
    lessonAnchor: "buffering-versus-streaming",
  },
  {
    id: "object-storage-part-1-presigned-errors",
    lectures: [23],
    tags: ["presigned-urls"],
    type: "scenario",
    prompt:
      "Your API issues presigned PUT URLs valid for 5 minutes. Three bug reports arrive. What does the bucket return in each case?",
    fields: [
      { label: "User leaves the tab open 20 minutes, then uploads", options: ["200 OK", "403 Forbidden", "404 Not Found", "412 Precondition Failed"], answer: "403 Forbidden" },
      { label: "Attacker edits the key in the URL to another user's prefix", options: ["200 OK", "403 Forbidden", "409 Conflict", "412 Precondition Failed"], answer: "403 Forbidden" },
      { label: "User uploads a 2 GB file to a URL meant for an avatar", options: ["200 OK", "400 EntityTooLarge", "403 Forbidden", "413 Content Too Large"], answer: "200 OK" },
    ],
    explanation:
      "Expiry and key are part of the signed string, so expired or edited URLs fail signature checks with 403. Size isn't signed in a plain PUT URL, so the 2 GB upload succeeds. That's exactly why you use a presigned POST with content-length-range.",
    lessonAnchor: "limiting-size-with-a-post-policy",
  },
  {
    id: "object-storage-part-1-two-phase-order",
    lectures: [23],
    tags: ["uploads", "two-phase"],
    type: "order",
    prompt: "Put the two-phase direct upload for an avatar in the right order.",
    steps: [
      "Browser asks the API to upload, sending size and type",
      "API generates the key and inserts a pending row",
      "API returns a presigned POST and an upload ID",
      "Browser uploads the bytes directly to the bucket",
      "Browser calls the completion endpoint with the upload ID",
      "API checks the object with HeadObject",
      "API marks the row ready",
    ],
    explanation:
      "Recording intent before any bytes move means the database always knows the key. HeadObject verifies the object really exists with the promised size and type before it becomes visible. Rows left pending are expired by a background job.",
    lessonAnchor: "the-two-phase-upload",
  },
  {
    id: "object-storage-part-1-cors-curl",
    lectures: [23],
    tags: ["cors", "uploads"],
    type: "scenario",
    prompt:
      "Direct uploads to the bucket work perfectly from curl, but from https://app.notes.dev the browser console shows an error and your JS can't read the response headers it needs.\nWhat do you change?",
    fields: [
      { label: "Where to look", options: ["Bucket CORS configuration", "The presigned URL expiry", "Your API's CORS middleware", "The bucket's lifecycle rules"], answer: "Bucket CORS configuration" },
      { label: "Header to expose for upcoming multipart uploads", options: ["ETag", "Authorization", "Origin", "Set-Cookie"], answer: "ETag" },
    ],
    explanation:
      "The browser is talking to the bucket's origin, not your API, so the bucket's CORS rules must allow your origin and methods. curl doesn't enforce CORS, which is why it works there. Exposing ETag lets JavaScript read part ETags for multipart uploads.",
    lessonAnchor: "cors-for-direct-uploads",
  },
];
