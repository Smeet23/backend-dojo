import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "ev-review-spreadsheet-pain",
    lectures: [8],
    tags: ["custom-interfaces"],
    type: "scenario",
    prompt:
      "Your team exports leasing-assistant traces to a spreadsheet: one row per conversation, often 30+ turns with tool calls, plus a 2,400-word system prompt column. After a week, the PM has labeled 25 traces and says reviewing is exhausting. Checking whether a tour was actually booked means opening the CRM in another tab.",
    fields: [
      { label: "Best next step", options: ["Build a small custom review UI on top of your trace store", "Hire contractors to label in the spreadsheet", "Skip human review and rely on an LLM judge", "Shrink each cell's font so more fits on screen"], answer: "Build a small custom review UI on top of your trace store" },
      { label: "What it should show next to the conversation", options: ["The caller's bookings from the CRM", "The full system prompt, expanded", "Every trace from the same day", "Token counts per turn"], answer: "The caller's bookings from the CRM" },
    ],
    explanation:
      "Long multi-turn traces don't fit in rows, and context switching between windows breaks flow. A custom UI can render one trace at a time and pull side effects (bookings) onto the same screen. The unchanging system prompt should be collapsed, not expanded. Outsourcing or skipping review loses the domain judgment you need.",
    lessonAnchor: "why-human-review-needs-its-own-tool",
  },
  {
    id: "ev-review-when-spreadsheet",
    lectures: [8],
    tags: ["custom-interfaces"],
    type: "mcq",
    prompt: "In which situation is a plain spreadsheet a reasonable review tool?",
    options: [
      "A tweet classifier: one short input, one label output, no tools",
      "A multi-turn support agent with a dozen tools",
      "A RAG assistant where reviewers must check retrieved passages",
      "An email assistant whose outputs should be judged as the recipient sees them",
    ],
    answer: "A tweet classifier: one short input, one label output, no tools",
    explanation:
      "Spreadsheets are fine for simple single-turn interactions. Multi-turn traces, tool calls, retrieved context and outputs that need native rendering are exactly where they break down.",
    lessonAnchor: "spreadsheets-observability-tools-or-your-own",
  },
  {
    id: "ev-review-principles",
    lectures: [8],
    tags: ["hci-principles"],
    type: "scenario",
    prompt: "Match each change to a review app with the usability principle it applies.",
    fields: [
      { label: "Render generated emails with sender, subject and body instead of a JSON string", options: ["Match the real world", "Visibility of status", "Recognition over recall", "User control and freedom"], answer: "Match the real world" },
      { label: "Show \"reviewed 34 of 100\" and a progress bar", options: ["Match the real world", "Visibility of status", "Recognition over recall", "User control and freedom"], answer: "Visibility of status" },
      { label: "Offer your six known failure modes as clickable tags", options: ["Match the real world", "Visibility of status", "Recognition over recall", "User control and freedom"], answer: "Recognition over recall" },
      { label: "Let reviewers go back and change an earlier label", options: ["Match the real world", "Visibility of status", "Recognition over recall", "User control and freedom"], answer: "User control and freedom" },
    ],
    explanation:
      "Native rendering matches what users see, progress makes status visible, tags let reviewers recognize instead of remembering, and back navigation gives control. All of them serve one goal: reducing friction.",
    lessonAnchor: "principles-of-effective-review-interfaces",
  },
  {
    id: "ev-review-progress-bar",
    lectures: [8],
    tags: ["flow"],
    type: "mcq",
    prompt:
      "Domain experts using your new review tool click \"I'm done\" after about seven traces, far too few to align a judge. The UI shows one trace at a time with pass and fail buttons and nothing else. Which small change did the EvalGen studies find made people label roughly three times as many?",
    options: ["A progress bar", "A 1 to 5 rating scale", "Showing five traces per screen", "Requiring a note on every pass"],
    answer: "A progress bar",
    explanation:
      "Without a progress bar people stopped after six or seven examples; with one they kept going to around 20. Multi-trace screens split attention, and extra required input adds friction.",
    lessonAnchor: "show-progress",
  },
  {
    id: "ev-review-criteria-drift",
    lectures: [8],
    tags: ["evalgen", "criteria-drift"],
    type: "scenario",
    prompt:
      "Reviewers grading a tweet entity extractor started by failing every output that extracted a hashtag, as the prompt instructed. After 40 outputs, two of them argue that a hashtag naming a notable entity also mentioned in the tweet is fine if the # is stripped, and want to revisit earlier labels.",
    fields: [
      { label: "What is happening", options: ["Criteria drift: the definition is being refined by seeing data", "Reviewer fatigue that should be ignored", "The LLM judge is miscalibrated", "Label leakage between splits"], answer: "Criteria drift: the definition is being refined by seeing data" },
      { label: "What the review tool should allow", options: ["Editing past labels and adding new tags on the fly", "Locking labels once submitted for consistency", "Only the original rubric's tags", "Averaging the two interpretations"], answer: "Editing past labels and adding new tags on the fly" },
    ],
    explanation:
      "EvalGen's main finding was that people's criteria change as they grade. Criteria must be defined iteratively alongside labeling, so tools should support relabeling and new failure modes rather than locking in a rubric written before anyone looked.",
    lessonAnchor: "the-insight-criteria-drift",
  },
  {
    id: "ev-review-sampling",
    lectures: [8],
    tags: ["sampling"],
    type: "scenario",
    prompt:
      "Your leasing assistant handles 20,000 conversations a week and you can review 150. You already have error analysis done, two LLM judges, user thumbs-down data and guardrail logs.",
    fields: [
      { label: "To surface traces that improve your judges most", options: ["Traces where the two judges disagree", "Only traces with a thumbs down", "The 150 most recent traces", "Traces the judges both passed"], answer: "Traces where the two judges disagree" },
      { label: "To fix known, obvious failures fast", options: ["Traces where the two judges disagree", "Thumbs-down and guardrail-hit traces", "A random sample", "Traces from the longest conversations"], answer: "Thumbs-down and guardrail-hit traces" },
      { label: "What you must keep in every batch", options: ["A random slice", "Only traces that failed before", "Traces from your most valuable customer", "Nothing; targeted is strictly better"], answer: "A random slice" },
    ],
    explanation:
      "Uncertainty sampling (judge disagreement) is the most informative per label. Failure-driven sampling is high precision but low recall. A random slice is the only way to find failure modes nobody has a signal for and to estimate an honest failure rate.",
    lessonAnchor: "selecting-traces-from-the-firehose",
  },
  {
    id: "ev-review-biased-rate",
    lectures: [8],
    tags: ["sampling"],
    type: "mcq",
    prompt:
      "A teammate reviewed 100 traces chosen because users gave them a thumbs down. 62 failed. They propose reporting \"our assistant fails 62% of the time\" to leadership. What's wrong?",
    options: [
      "The sample was selected for failure signals, so it overstates the overall failure rate; use a random sample for the rate",
      "100 traces is too few to compute any percentage",
      "Thumbs-down traces understate the failure rate",
      "Nothing; any 100 traces give an unbiased estimate",
    ],
    answer: "The sample was selected for failure signals, so it overstates the overall failure rate; use a random sample for the rate",
    explanation:
      "Targeted samples are great for finding and fixing problems but are biased by construction. Prevalence estimates need a uniform random sample (or a judge, corrected for its error rates, run on all traffic).",
    lessonAnchor: "selecting-traces-from-the-firehose",
  },
  {
    id: "ev-review-batch-label",
    lectures: [8],
    tags: ["batch-labeling"],
    type: "mcq",
    prompt:
      "A new engineer on a two-week-old project clusters 300 traces and wants to bulk-label whole clusters to speed up the first round of error analysis. What's the best advice?",
    options: [
      "Don't yet: review traces one at a time until you know the failure modes well; bulk actions come later",
      "Great idea: bulk labeling is always the fastest path",
      "Bulk-label, but only the clusters with the most traces",
      "Ask an LLM to bulk-label instead",
    ],
    answer: "Don't yet: review traces one at a time until you know the failure modes well; bulk actions come later",
    explanation:
      "Batch labeling trades care for speed. It is appropriate once you're expert in the system's failure modes and confident a cluster really is one problem; early on it hides the variety you are trying to discover.",
    lessonAnchor: "batch-labeling-only-once-youre-an-expert",
  },
  {
    id: "ev-review-docwrangler",
    lectures: [8],
    tags: ["docwrangler", "gulf-of-specification"],
    type: "order",
    prompt: "Order the DocWrangler-style loop for refining a document-extraction prompt.",
    steps: [
      "Run the prompt over a batch of documents",
      "Review outputs beside their source documents and write open-coded notes",
      "Have an LLM group the notes into axial codes",
      "Generate a proposed prompt revision from those codes",
      "Give feedback on the proposal and iterate before accepting",
    ],
    explanation:
      "Light notes capture unexpected issues; many turn out to be specification gaps the prompt never mentioned. The tool turns them into a suggested revision, which the human refines. Judges come later, for failures that persist once the prompt says what you want.",
    lessonAnchor: "case-study-docwrangler-for-prompt-refinement",
  },
  {
    id: "ev-review-workflow",
    lectures: [8],
    tags: ["workflow"],
    type: "scenario",
    prompt:
      "Your review app works well, but usage has dropped to almost nothing after a month, and reviewers' findings rarely reach the code.",
    fields: [
      { label: "Fix for low usage", options: ["Scheduled daily batches with a notification, and less friction in the app", "A quarterly review marathon", "Make review optional", "Send reviewers the raw logs"], answer: "Scheduled daily batches with a notification, and less friction in the app" },
      { label: "Fix for findings not reaching the code", options: ["One-click \"add to golden set\" and prefilled bug reports", "A longer notes field", "Hide the judge's verdict", "Export labels to a spreadsheet monthly"], answer: "One-click \"add to golden set\" and prefilled bug reports" },
    ],
    explanation:
      "If people don't use a review tool, the friction is still too high. Embedding it in the routine (scheduled batches, alerts) and making follow-through one click (golden set, bug reports, judge monitoring) turns labels into engineering changes.",
    lessonAnchor: "integrating-human-review-into-the-engineering-workflow",
  },
];
