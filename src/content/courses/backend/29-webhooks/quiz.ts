import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "webhooks-why-not-browser",
    lectures: [29],
    tags: ["webhooks", "security"],
    type: "mcq",
    prompt:
      "A teammate proposes this flow for the Pro upgrade: after Stripe's checkout redirects back, the frontend calls POST /api/upgrade with { paid: true }, and the backend flips the plan. What's the core problem?",
    options: [
      "The redirect may never happen and the request is trivially forgeable, so the backend must hear from Stripe directly",
      "POST is the wrong method; it should be PUT because upgrading is idempotent",
      "It's fine as long as the API is served over HTTPS",
      "The frontend should poll Stripe's API itself and then call /api/upgrade",
    ],
    answer: "The redirect may never happen and the request is trivially forgeable, so the backend must hear from Stripe directly",
    explanation:
      "The browser is neither reliable (tab closed, network lost) nor trustworthy (anyone can send { paid: true }). The signal has to come server-to-server from Stripe. HTTPS only protects the bytes in transit, not who wrote them.",
    lessonAnchor: "why-the-server-needs-to-call-you",
  },
  {
    id: "webhooks-signature-fails-after-middleware",
    lectures: [29],
    tags: ["webhooks", "hmac"],
    type: "scenario",
    prompt:
      "After adding a global JSON body-parsing middleware, every Stripe delivery to /hooks/stripe gets rejected with 401. The secret hasn't changed. Your handler does verify(JSON.stringify(req.body), header, secret).",
    fields: [
      {
        label: "Root cause",
        options: [
          "Re-serialized JSON has different bytes than what Stripe signed",
          "Stripe rotated the secret",
          "The deliveries are replays older than 5 minutes",
          "HMAC can't be computed over JSON",
        ],
        answer: "Re-serialized JSON has different bytes than what Stripe signed",
      },
      {
        label: "Fix",
        options: [
          "Verify the raw request bytes before parsing",
          "Sort the JSON keys before hashing",
          "Switch the comparison to ==",
          "Disable signature checks for Stripe's IP range",
        ],
        answer: "Verify the raw request bytes before parsing",
      },
    ],
    explanation:
      "An HMAC covers exact bytes. Parsing and re-encoding can change spacing, key order or number formatting, so the fingerprint no longer matches. Keep the raw body for webhook routes: verify it, then parse. Sorting keys still produces different bytes from what was signed.",
    lessonAnchor: "verify-the-raw-bytes",
  },
  {
    id: "webhooks-replay-and-timing",
    lectures: [29],
    tags: ["webhooks", "security"],
    type: "scenario",
    prompt:
      "Security review of your GitHub-style receiver: it computes HMAC-SHA256 over the body and compares it to the header with if (sig === expected). The provider signs only the body. Pick the two hardening changes the reviewer asks for.",
    fields: [
      {
        label: "Against an attacker resending a captured valid request hours later",
        options: [
          "Prefer a scheme that signs a timestamp and reject old ones, plus dedupe on delivery ID",
          "Switch the endpoint to HTTPS",
          "Rotate the secret every week",
          "Rename the endpoint to something unguessable",
        ],
        answer: "Prefer a scheme that signs a timestamp and reject old ones, plus dedupe on delivery ID",
      },
      {
        label: "Against byte-by-byte signature guessing",
        options: [
          "Use a constant-time comparison like crypto.timingSafeEqual",
          "Compare lowercase hex strings",
          "Add a random sleep after a mismatch",
          "Return 404 instead of 401 on mismatch",
        ],
        answer: "Use a constant-time comparison like crypto.timingSafeEqual",
      },
    ],
    explanation:
      "A replayed request carries a genuine signature, so only a signed timestamp with a tolerance (and idempotency on the delivery ID) stops it. Ordinary equality exits at the first differing byte, leaking timing information; constant-time comparison removes that signal. Random sleeps only add noise that averaging can defeat.",
    lessonAnchor: "replay-attacks",
  },
  {
    id: "webhooks-double-pro",
    lectures: [29],
    tags: ["webhooks", "idempotency"],
    type: "scenario",
    prompt:
      "Production incident: a few customers who paid once got 60 days of Pro and two receipts. Logs show the same Stripe event id (evt_9f2) processed twice, 40 seconds apart. Your handler upgrades the plan, commits, then returns 200.",
    fields: [
      {
        label: "Why did it arrive twice",
        options: [
          "At-least-once delivery: the 200 was lost or late, so Stripe retried",
          "Stripe has a bug that sends every event twice",
          "An attacker replayed the request",
          "The customer double-clicked Pay",
        ],
        answer: "At-least-once delivery: the 200 was lost or late, so Stripe retried",
      },
      {
        label: "Fix",
        options: [
          "Insert the event id into a UNIQUE table in the same transaction as the upgrade",
          "Insert the event id after the upgrade commits",
          "Respond 200 before doing anything, then upgrade",
          "Ask Stripe to enable exactly-once delivery",
        ],
        answer: "Insert the event id into a UNIQUE table in the same transaction as the upgrade",
      },
    ],
    explanation:
      "Providers can't promise exactly-once because acknowledgements get lost, so duplicates are normal. Recording the id in the same transaction as the work makes the second attempt fail on the unique constraint and do nothing. Recording it after the commit leaves a crash window where the work happens twice.",
    lessonAnchor: "idempotent-receivers",
  },
  {
    id: "webhooks-out-of-order",
    lectures: [29],
    tags: ["webhooks", "ordering"],
    type: "mcq",
    prompt:
      "You mirror Stripe customers into a local table. A customer was created and deleted a second later, yet the row still exists. Logs show customer.deleted arrived at 10:00:01 and customer.created at 10:05:03 (a retry). What's the most robust change?",
    options: [
      "On any customer event, fetch the customer's current state from Stripe's API and save that",
      "Sort incoming events by their created timestamp before applying them",
      "Hold all events for 10 minutes and apply them in arrival order",
      "Return 500 for customer.deleted so it's retried after created",
    ],
    answer: "On any customer event, fetch the customer's current state from Stripe's API and save that",
    explanation:
      "Treating the event as a signal and refetching current state makes order irrelevant. Timestamps have one-second resolution and retries can arrive minutes late, so sorting and buffering are fragile; deliberately failing deliveries just adds retries.",
    lessonAnchor: "out-of-order-events",
  },
  {
    id: "webhooks-thin-receiver",
    lectures: [29],
    tags: ["webhooks", "performance"],
    type: "order",
    prompt:
      "On the 1st of every month your billing provider sends a burst of renewal webhooks with a 5-second deadline. Order the steps of a receiver that won't fall over.",
    steps: [
      "Read the raw request body",
      "Verify the signature and timestamp",
      "Store the delivery in an inbox table, deduplicated by event id",
      "Respond 202 immediately",
      "A background worker pulls the event from a queue and does the real processing",
    ],
    explanation:
      "Doing the real work inline makes responses slow exactly during bursts; missed deadlines turn into retries, which add even more load. Verify, persist, acknowledge, then process asynchronously.",
    lessonAnchor: "keep-the-receiver-thin",
  },
  {
    id: "webhooks-sender-outbox",
    lectures: [29],
    tags: ["webhooks", "outbox"],
    type: "scenario",
    prompt:
      "You're adding note.published webhooks to your notes app. Today the handler updates the note, then POSTs to the customer's URL inline. During a deploy, some notes were published but customers never got the webhook, and one customer's slow endpoint made publishing take 9 seconds.",
    fields: [
      {
        label: "Pattern",
        options: [
          "Transactional outbox + background dispatcher",
          "POST to the customer first, then update the note",
          "Wrap the POST in a try/catch and retry 3 times inline",
          "Let customers poll GET /notes?published=true",
        ],
        answer: "Transactional outbox + background dispatcher",
      },
      {
        label: "Retry schedule",
        options: [
          "Exponential backoff with jitter, honouring Retry-After",
          "Every 5 seconds until it succeeds",
          "Once, immediately",
          "Exponential backoff, identical delays for every event",
        ],
        answer: "Exponential backoff with jitter, honouring Retry-After",
      },
      {
        label: "One customer's endpoint is dead for days",
        options: [
          "Per-endpoint queues; disable after repeated failures and email the owner",
          "Keep retrying forever in the shared queue",
          "Delete their outbox rows silently",
          "Follow any redirect they return",
        ],
        answer: "Per-endpoint queues; disable after repeated failures and email the owner",
      },
    ],
    explanation:
      "Writing the event to an outbox in the same transaction as the note update means no lost or false events, and the dispatcher decouples your latency from theirs. Backoff gives a struggling receiver room; jitter stops synchronized retry stampedes. Per-endpoint queues stop one dead URL from delaying everyone.",
    lessonAnchor: "the-transactional-outbox",
  },
  {
    id: "webhooks-ssrf",
    lectures: [29],
    tags: ["webhooks", "security", "ssrf"],
    type: "mcq",
    prompt:
      "Your webhook settings page validates that a customer's URL resolves to a public IP when they save it. A pentester still gets your dispatcher to POST to http://169.254.169.254/. How, and what's the fix?",
    options: [
      "DNS was repointed after registration (or a redirect was followed); resolve and check the IP on every send and never follow redirects",
      "They used HTTP instead of HTTPS; require HTTPS URLs only",
      "They guessed the webhook secret; rotate secrets monthly",
      "The IP check needs to run twice at registration",
    ],
    answer: "DNS was repointed after registration (or a redirect was followed); resolve and check the IP on every send and never follow redirects",
    explanation:
      "A registration-time check proves nothing about later sends: DNS can change and a public URL can redirect to a private one. Check the resolved IP at every send, connect to that IP, and treat 3xx as failure. Requiring HTTPS doesn't stop an attacker-controlled hostname from pointing inward.",
    lessonAnchor: "ssrf-on-the-sending-side",
  },
  {
    id: "webhooks-sync-users",
    lectures: [29],
    tags: ["webhooks", "sync"],
    type: "scenario",
    prompt:
      "Your app uses a hosted auth provider. To avoid 500 ms API calls, you keep a local users table, currently built by writing every user.* webhook payload straight into it. It keeps drifting from the provider. You want near-real-time and correct.",
    fields: [
      {
        label: "Source of truth for changes",
        options: ["The provider's ordered event log API", "Raw webhook payloads", "The user's browser session", "A nightly CSV export"],
        answer: "The provider's ordered event log API",
      },
      {
        label: "Role of the webhook",
        options: [
          "A signal to pull events after the last processed event id",
          "The data to write into the table",
          "Not needed at all; poll every second",
          "Only used for deletes",
        ],
        answer: "A signal to pull events after the last processed event id",
      },
    ],
    explanation:
      "Inside the provider, the event log is ordered; separate network deliveries aren't. Using the webhook only as a nudge to pull from your last processed id gives near-real-time sync without depending on delivery order, duplicates or lost events.",
    lessonAnchor: "webhooks-are-notifications-not-sync",
  },
];
