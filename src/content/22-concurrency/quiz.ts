import type { Question } from "@/lib/types";

const KINDS = ["IO-bound", "CPU-bound"];

export const quiz: Question[] = [
  {
    id: "concurrency-classify-work",
    lectures: [22],
    tags: ["io-bound", "cpu-bound"],
    type: "scenario",
    prompt:
      "You're profiling a SaaS backend. Classify each piece of work.",
    fields: [
      { label: "Fetching a user's notes from Postgres", options: KINDS, answer: "IO-bound" },
      { label: "Hashing a password with bcrypt at signup", options: KINDS, answer: "CPU-bound" },
      { label: "Calling the email provider's API", options: KINDS, answer: "IO-bound" },
      { label: "Generating thumbnails from an uploaded photo", options: KINDS, answer: "CPU-bound" },
    ],
    explanation:
      "Database and HTTP calls spend their time waiting on something outside the CPU, so concurrency helps. Password hashing and image processing keep a core busy computing, so only more cores (parallelism) make them faster.",
    lessonAnchor: "io-bound-vs-cpu-bound",
  },
  {
    id: "concurrency-single-core",
    lectures: [22],
    tags: ["concurrency", "parallelism"],
    type: "mcq",
    prompt:
      "Your notes API runs on a single-vCPU container. A teammate says: \"With one core we can only handle one request at a time, so there's no point using async.\" What's wrong with that?",
    options: [
      "Nothing; one core means strictly one request at a time",
      "Concurrency interleaves requests on one core: while one waits on the database, another uses the CPU",
      "Async code secretly uses extra cores",
      "A single vCPU is actually two physical cores",
    ],
    answer: "Concurrency interleaves requests on one core: while one waits on the database, another uses the CPU",
    explanation:
      "One core rules out parallelism, not concurrency. Since most of a request's time is waiting on IO, interleaving lets one core keep dozens of requests in progress and stay busy with real work.",
    lessonAnchor: "concurrency-vs-parallelism",
  },
  {
    id: "concurrency-blocked-loop",
    lectures: [22],
    tags: ["event-loop", "nodejs"],
    type: "scenario",
    prompt:
      "Production incident: in your Node.js API, p99 latency for every endpoint (even GET /health) spikes to about 400 ms whenever users upload avatars. The upload handler calls resizeImageSync() on the request thread.\nWhat's happening, and what's the fix?",
    fields: [
      { label: "Cause", options: ["CPU work is blocking the event loop", "The database is overloaded", "Too many threads are context switching", "The health check is too frequent"], answer: "CPU work is blocking the event loop" },
      { label: "Fix", options: ["Move resizing to a worker thread or background job", "Add await before resizeImageSync()", "Increase the DB pool size", "Add more indexes"], answer: "Move resizing to a worker thread or background job" },
    ],
    explanation:
      "While synchronous CPU work runs, the single event-loop thread can't run anything else, so every request queues behind it. Putting await in front of a synchronous function doesn't make it yield; the work has to move off the loop.",
    lessonAnchor: "never-block-the-loop",
  },
  {
    id: "concurrency-pick-model",
    lectures: [22],
    tags: ["architecture", "models"],
    type: "scenario",
    prompt:
      "You're designing two services for a shop:\n• An API gateway that holds 20,000 concurrent connections, each mostly waiting on downstream services.\n• A service that generates PDF invoices with charts, using lots of CPU per request.\nPick the best-fitting approach for each.",
    fields: [
      { label: "API gateway", options: ["One OS thread per connection", "Event loop or goroutines", "A single thread with blocking IO", "One process per request"], answer: "Event loop or goroutines" },
      { label: "PDF service", options: ["A single event-loop thread", "Parallel workers across all cores", "More async/await", "One thread total"], answer: "Parallel workers across all cores" },
    ],
    explanation:
      "Massive IO-bound concurrency wants cheap waiting tasks, which event loops and goroutines provide without a heavy OS thread each. CPU-heavy rendering only speeds up with more cores working in parallel.",
    lessonAnchor: "choosing-a-model",
  },
  {
    id: "concurrency-thread-per-request",
    lectures: [22],
    tags: ["threads"],
    type: "mcq",
    prompt:
      "An old Java service creates a new OS thread for every request. Under a spike of 10,000 concurrent slow requests it grinds to a halt even though CPU work per request is tiny. What's the main reason?",
    options: [
      "Thousands of threads cost memory and kernel bookkeeping, and the CPU burns time context switching between them",
      "Java can't run more than 100 threads",
      "Threads can't do IO",
      "Each thread needs its own database",
    ],
    answer: "Thousands of threads cost memory and kernel bookkeeping, and the CPU burns time context switching between them",
    explanation:
      "Each OS thread has a stack, a creation cost and scheduling overhead. With thousands mostly waiting, the machine spends more effort juggling them than working. Thread pools, event loops or virtual threads avoid this.",
    lessonAnchor: "what-threads-cost",
  },
  {
    id: "concurrency-await-meaning",
    lectures: [22],
    tags: ["async-await", "event-loop"],
    type: "mcq",
    prompt:
      "In an async handler you write: const user = await db.getUser(id); What happens at the await while the query runs?",
    options: [
      "The whole server pauses until the query finishes",
      "The function pauses and gives control back to the event loop, which runs other work until the result arrives",
      "A new OS thread is created for the query",
      "The query runs in parallel on another core and the function keeps going",
    ],
    answer: "The function pauses and gives control back to the event loop, which runs other work until the result arrives",
    explanation:
      "await is a pause point in the function's state machine. The rest of the function becomes the continuation that runs when the promise resolves; meanwhile the loop serves other requests on the same thread.",
    lessonAnchor: "from-callbacks-to-async-and-await",
  },
  {
    id: "concurrency-go-scheduler",
    lectures: [22],
    tags: ["go", "goroutines"],
    type: "scenario",
    prompt:
      "A Go service runs on an 8-core machine. net/http has 50,000 goroutines alive, most waiting on Postgres.\nAnswer two questions about it.",
    fields: [
      { label: "OS threads running Go code at once (default)", options: ["1", "8", "50,000", "Unlimited"], answer: "8" },
      { label: "Who switches between goroutines", options: ["The OS scheduler", "The Go runtime scheduler", "The database driver", "The load balancer"], answer: "The Go runtime scheduler" },
    ],
    explanation:
      "GOMAXPROCS defaults to the number of cores, so 8 OS threads run Go code, multiplexing many goroutines each (M:N). The Go runtime parks waiting goroutines and switches between them in user space, which is far cheaper than OS context switches.",
    lessonAnchor: "the-go-scheduler",
  },
  {
    id: "concurrency-async-race",
    lectures: [22],
    tags: ["race-conditions", "async-await"],
    type: "scenario",
    prompt:
      "Users report that double-clicking \"Redeem\" sometimes applies a single-use coupon twice. Your Node.js handler does:\nif (!coupon.used) { await payments.applyDiscount(order); coupon.used = true; await coupon.save(); }\nThe API runs as four instances behind a load balancer.\nName the bug and the most robust fix.",
    fields: [
      { label: "Bug", options: ["Race condition: check and act are separated by an await", "Event loop blocked", "N+1 queries", "Deadlock"], answer: "Race condition: check and act are separated by an await" },
      { label: "Fix", options: ["An atomic conditional update: UPDATE coupons SET used = true WHERE id = $1 AND used = false, and proceed only if 1 row changed", "An in-memory mutex in the Node process", "Switch to Go", "Add a longer await before saving"], answer: "An atomic conditional update: UPDATE coupons SET used = true WHERE id = $1 AND used = false, and proceed only if 1 row changed" },
    ],
    explanation:
      "Both clicks pass the check before either sets used, because the await lets the second request run in the gap. An in-process mutex can't help when the two clicks hit different instances; making check-and-set one database operation does.",
    lessonAnchor: "fixing-races",
  },
  {
    id: "concurrency-lost-update-order",
    lectures: [22],
    tags: ["race-conditions", "threads"],
    type: "order",
    prompt:
      "Two threads increment a shared page-view counter that starts at 10, and the final value is 11. Put the interleaving that produces this lost update in order.",
    steps: [
      "Thread A reads the counter (10) into a register",
      "Thread B reads the counter (10) into a register",
      "Thread A adds 1 and writes 11",
      "Thread B adds 1 to its stale value and writes 11",
    ],
    explanation:
      "counter++ is read, add, write. Because B read before A wrote, B's write is based on a stale value and overwrites A's update. A lock or an atomic increment makes the three steps indivisible.",
    lessonAnchor: "the-lost-update",
  },
  {
    id: "concurrency-python-gil",
    lectures: [22],
    tags: ["threads", "python", "cpu-bound"],
    type: "mcq",
    prompt:
      "A Python (CPython) service resizes images in a ThreadPoolExecutor with 8 threads on an 8-core machine, but CPU usage never goes above roughly one core. Why, and what helps?",
    options: [
      "The GIL lets only one thread run Python code at a time; use a process pool for CPU-bound work",
      "The machine needs more threads; use 64",
      "Image resizing is IO-bound; use async/await",
      "Threads in Python can't share memory; use a database",
    ],
    answer: "The GIL lets only one thread run Python code at a time; use a process pool for CPU-bound work",
    explanation:
      "Python threads are fine for IO-bound work, but the Global Interpreter Lock blocks CPU parallelism in pure Python code. Separate processes each get their own interpreter and core.",
    lessonAnchor: "shared-memory",
  },
];
