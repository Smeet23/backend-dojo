import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "object-storage-part-2-part-size-cap",
    lectures: [24],
    tags: ["multipart", "part-size"],
    type: "scenario",
    prompt:
      "Your video-notes uploader uses a fixed 5 MB part size. A user uploads a 60 GB recording and it fails after almost an hour with a part-number error.\nDiagnose and fix it.",
    fields: [
      { label: "Limit hit", options: ["10,000 parts per upload", "5 GB per single PUT", "5 MB minimum part size", "Presigned URL expiry"], answer: "10,000 parts per upload" },
      { label: "How much was uploaded before failing", options: ["About 5 GB", "About 50 GB", "About 60 GB", "Nothing"], answer: "About 50 GB" },
      { label: "Part size rule", options: ["Always 5 MB", "Always 500 MB", "max(16 MB, fileSize / 10,000)", "fileSize / 4"], answer: "max(16 MB, fileSize / 10,000)" },
    ],
    explanation:
      "5 MB times 10,000 parts is 50 GB, so part 10,001 is rejected after 50 GB has already been sent. Computing the part size from the file size with a floor keeps every file under the cap while keeping retries cheap. Huge fixed parts would make each retry expensive.",
    lessonAnchor: "choosing-the-part-size",
  },
  {
    id: "object-storage-part-2-why-multipart",
    lectures: [24],
    tags: ["multipart", "throughput"],
    type: "mcq",
    prompt:
      "A user on a 300 Mbps connection complains a 3 GB upload via a single PUT runs at about 30 Mbps and restarts from zero whenever their Wi-Fi blips. Which change addresses both problems?",
    options: [
      "Multipart upload with parts sent in parallel and retried individually",
      "Raise the presigned URL expiry to 24 hours",
      "Gzip the video before uploading",
      "Route the upload through your API so it can retry",
    ],
    answer: "Multipart upload with parts sent in parallel and retried individually",
    explanation:
      "Parallel parts each get their own TCP congestion window, so together they fill the link, and a failed part is retried alone instead of restarting the whole file. Longer expiry and routing through your API fix neither problem, and video barely compresses.",
    lessonAnchor: "multipart-upload",
  },
  {
    id: "object-storage-part-2-etag-integrity",
    lectures: [24],
    tags: ["multipart", "integrity"],
    type: "scenario",
    prompt:
      "After moving large uploads to multipart, your integrity check (MD5 the file in the browser, compare with the object's ETag) fails on every file over 100 MB. Small files still pass. The ETags look like \"9b2c...e1-42\".",
    fields: [
      { label: "Cause", options: ["The files are corrupted", "Multipart ETags are an MD5 of part MD5s plus a part count", "S3 is eventually consistent", "CORS hides the real ETag"], answer: "Multipart ETags are an MD5 of part MD5s plus a part count" },
      { label: "Better integrity check", options: ["Compare only the first 8 characters", "Use SDK checksums (CRC32C or SHA-256) or your own SHA-256 in metadata", "Disable multipart", "Re-download and compare sizes"], answer: "Use SDK checksums (CRC32C or SHA-256) or your own SHA-256 in metadata" },
    ],
    explanation:
      "The -42 suffix means 42 parts; the ETag is derived from the parts' MD5s, not the whole file. Use the storage checksum feature or a client-computed SHA-256, which also enables deduplication.",
    lessonAnchor: "multipart-etags-are-not-checksums",
  },
  {
    id: "object-storage-part-2-invisible-bill",
    lectures: [24],
    tags: ["multipart", "cost", "lifecycle"],
    type: "mcq",
    prompt:
      "Finance asks why the storage bill is far higher than the total size of objects shown in the bucket console. You use multipart uploads, and many users close the tab mid-upload. What's the fix?",
    options: [
      "A lifecycle rule that aborts incomplete multipart uploads after 7 days",
      "Enable versioning",
      "Run LIST nightly and delete small objects",
      "Switch to a single PUT for all files",
    ],
    answer: "A lifecycle rule that aborts incomplete multipart uploads after 7 days",
    explanation:
      "Parts of uploads that were never completed or aborted are billed but don't appear as objects in listings. The abort-incomplete lifecycle rule cleans them up automatically. Versioning would increase storage, not reduce it.",
    lessonAnchor: "the-hidden-multipart-leak",
  },
  {
    id: "object-storage-part-2-etag-cors",
    lectures: [24],
    tags: ["multipart", "cors"],
    type: "scenario",
    prompt:
      "Browser multipart uploads succeed part by part (every PUT is 200 in DevTools), but your client code gets null for each part's ETag, so it can't call complete.",
    fields: [
      { label: "Fix location", options: ["Bucket CORS configuration", "Your API's auth middleware", "Presigned URL expiry", "Bucket lifecycle rules"], answer: "Bucket CORS configuration" },
      { label: "Setting to add", options: ["ExposeHeaders: ETag", "AllowedMethods: OPTIONS", "AllowedOrigins: *", "MaxAgeSeconds: 0"], answer: "ExposeHeaders: ETag" },
    ],
    explanation:
      "Browsers only let JavaScript read a small set of safe response headers from cross-origin responses unless the server exposes more. ETag must be listed in the bucket's ExposeHeaders, or the client can't collect the part ETags it needs.",
    lessonAnchor: "practical-details",
  },
  {
    id: "object-storage-part-2-resume-order",
    lectures: [24],
    tags: ["multipart", "resumable"],
    type: "order",
    prompt: "A user refreshes the page halfway through a 20 GB multipart upload. Order the steps to resume without re-sending finished parts.",
    steps: [
      "Client asks the API if this file has an upload in progress",
      "API finds the pending row and its upload ID",
      "API calls ListParts to see which parts the bucket already has",
      "API presigns URLs only for the missing parts",
      "Client uploads the missing parts directly to the bucket",
      "Client calls complete with every part number and ETag",
    ],
    explanation:
      "The pending row (recorded at init) holds the upload ID, and ListParts reports what's already staged. Only the missing parts need new URLs, so the upload resumes mid-file rather than from zero.",
    lessonAnchor: "resumable-uploads",
  },
  {
    id: "object-storage-part-2-download-pattern",
    lectures: [24],
    tags: ["downloads", "cdn"],
    type: "scenario",
    prompt:
      "Pick the download pattern for each kind of file in your notes SaaS.",
    fields: [
      { label: "The app's logo and JS bundles", options: ["Proxy through the API", "Private bucket + CDN + content-addressed keys", "Presigned GET per request", "Public-write bucket"], answer: "Private bucket + CDN + content-addressed keys" },
      { label: "A user's private PDF attachment, low traffic", options: ["Proxy through the API", "Private bucket + CDN + content-addressed keys", "Presigned GET per request", "Public-read bucket"], answer: "Presigned GET per request" },
      { label: "Paid course videos watched by thousands", options: ["Proxy through the API", "Presigned GET with a fresh signature per segment", "CDN signed cookies", "Public-read bucket"], answer: "CDN signed cookies" },
    ],
    explanation:
      "Public assets cache forever behind a CDN when keys change with content. Private files need authorization, and presigned GETs are fine at low volume. For heavy private video, CDN signed cookies authorize at the edge and keep caching intact across hundreds of segments.",
    lessonAnchor: "serving-downloads",
  },
  {
    id: "object-storage-part-2-cdn-zero-hits",
    lectures: [24],
    tags: ["downloads", "cdn", "presigned-urls"],
    type: "mcq",
    prompt:
      "You put a CDN in front of private files served by presigned GET URLs. The CDN dashboard shows a 0% cache hit rate even for the most popular file. Cheapest fix without new infrastructure?",
    options: [
      "Round the signing time so everyone gets the same URL within each hour",
      "Increase the CDN's TTL to one year",
      "Make the bucket public-read",
      "Proxy downloads through the API instead",
    ],
    answer: "Round the signing time so everyone gets the same URL within each hour",
    explanation:
      "Each presigned URL has a unique timestamp and signature, so the CDN sees every request as a new resource and a longer TTL doesn't help. Rounding the signing window makes URLs identical for a period, trading expiry precision for cache hits. Making the bucket public throws away authorization.",
    lessonAnchor: "presigned-get-urls",
  },
  {
    id: "object-storage-part-2-range",
    lectures: [24],
    tags: ["range-requests", "http"],
    type: "scenario",
    prompt:
      "A 700 MB lecture video is stored in the bucket. Fill in what the storage service returns for each request.",
    fields: [
      { label: "Range: bytes=0-7", options: ["200 OK", "206 Partial Content", "304 Not Modified", "416 Range Not Satisfiable"], answer: "206 Partial Content" },
      { label: "Range: bytes=900000000-", options: ["200 OK", "206 Partial Content", "404 Not Found", "416 Range Not Satisfiable"], answer: "416 Range Not Satisfiable" },
      { label: "Header telling the client which bytes it got", options: ["Content-Range", "Accept-Ranges", "Range", "Content-Location"], answer: "Content-Range" },
    ],
    explanation:
      "A satisfiable range returns 206 with Content-Range describing the slice and the total size. A start beyond the 700 MB object can't be satisfied, so 416. Range is the request header; Accept-Ranges only advertises support.",
    lessonAnchor: "range-requests",
  },
  {
    id: "object-storage-part-2-abr",
    lectures: [24],
    tags: ["video", "streaming"],
    type: "mcq",
    prompt:
      "Users on trains complain that video notes constantly buffer, while users on fibre are fine. Videos are stored as one 1080p MP4 and played with range requests. What's the standard fix?",
    options: [
      "Transcode to several qualities, segment them (HLS or DASH), and let the player adapt",
      "Enable multipart upload for videos",
      "Raise the presigned GET expiry",
      "Serve the MP4 through your API so it can throttle",
    ],
    answer: "Transcode to several qualities, segment them (HLS or DASH), and let the player adapt",
    explanation:
      "Progressive download has one version of the file. Segmented streaming lets the player measure each segment's download speed and switch quality per segment. Storage-wise, segments and manifests are just more objects behind the CDN.",
    lessonAnchor: "video-streaming",
  },
];
