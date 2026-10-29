import type { Question } from "@/lib/types";

const OBJECTS = ["Trace", "Span", "Session", "Score", "Dataset"];
const INSTR = ["Auto-instrumentation covers it", "Needs a manual span"];
const WHERE = ["In the application's request path", "Platform online evaluator or automation"];
const LOCK = ["Reduces lock-in", "Adds lock-in or runtime risk"];

export const quiz: Question[] = [
  {
    id: "ev-plat-vocabulary",
    lectures: [14],
    tags: ["data-model"],
    type: "scenario",
    prompt:
      "Your team is moving from LangSmith to a tool that uses generic observability terms. Map each LangSmith word to the shared concept.",
    fields: [
      { label: "A run (for example, one retriever call inside a request)", options: OBJECTS, answer: "Span" },
      { label: "A thread (several traces from one conversation)", options: OBJECTS, answer: "Session" },
      { label: "Feedback (a groundedness value of 0 attached to a run)", options: OBJECTS, answer: "Score" },
    ],
    explanation:
      "The three platforms name the same objects differently. A LangSmith run is one step in a trace, which other tools call a span. Threads group traces from one conversation (Phoenix calls them sessions). Feedback is any score or label attached to a run, from a judge, a human or user thumbs.",
    lessonAnchor: "the-shared-data-model",
  },
  {
    id: "ev-plat-auto-vs-manual",
    lectures: [14],
    tags: ["tracing"],
    type: "scenario",
    prompt:
      "You turn on Phoenix's auto-instrumentation for a text-to-SQL movie bot built with the OpenAI SDK and LangGraph. For each step, will it appear as a useful span on its own?",
    fields: [
      { label: "The chat completion that writes the SQL", options: INSTR, answer: "Auto-instrumentation covers it" },
      { label: "Your function that runs the SQL against DuckDB and returns rows", options: INSTR, answer: "Needs a manual span" },
      { label: "The LangGraph nodes the agent moves through", options: INSTR, answer: "Auto-instrumentation covers it" },
      { label: "Your own keyword retriever over a local index", options: INSTR, answer: "Needs a manual span" },
    ],
    explanation:
      "Auto-instrumentation patches known SDKs and frameworks: model calls and framework steps show up with prompts, parameters and tokens. Your own code is invisible to it. The SQL execution step is exactly where the demo's zero-row failure showed up, so it needs a manual span (a decorator or context manager).",
    lessonAnchor: "auto-instrumentation-versus-manual-spans",
  },
  {
    id: "ev-plat-first-experiment",
    lectures: [14],
    tags: ["experiments", "datasets"],
    type: "mcq",
    prompt:
      "Your first routing experiment on 55 hand-written support requests scores 76%. Most failures are requests labeled \"general\" that the bot sent to a specific department. What should you do first?",
    options: [
      "Open the failing rows and check whether the expected labels are right",
      "Add few-shot examples of \"general\" requests to the routing prompt",
      "Switch to a stronger model and rerun",
      "Add an LLM judge for routing quality",
    ],
    answer: "Open the failing rows and check whether the expected labels are right",
    explanation:
      "In the Braintrust demo, reading the failures showed the hand-coded labels were wrong for several rows (a Parks and Rec request labeled \"general\"). Fixing the dataset alone took the score from 76% to 85.45%. Changing the prompt or model first would have tuned the bot toward bad labels.",
    lessonAnchor: "datasets",
  },
  {
    id: "ev-plat-align-evals",
    lectures: [14],
    tags: ["judges"],
    type: "mcq",
    prompt:
      "Using an align-evals flow, you label 8 sampled runs pass or fail for \"the answer hallucinates an API that doesn't exist\" and tweak the judge prompt until it matches all 8. What is the right conclusion?",
    options: [
      "It's a useful sanity check; you still need more labels, a held-out test split and TPR/TNR before trusting the judge's rates",
      "The judge is validated, since 100% agreement is the target",
      "The judge is overfit and should be thrown away",
      "Switch to a 1 to 10 scale so the judge can express partial hallucinations",
    ],
    answer:
      "It's a useful sanity check; you still need more labels, a held-out test split and TPR/TNR before trusting the judge's rates",
    explanation:
      "Matching a handful of examples you iterated on is agreement on the training data. For a real failure mode you need enough labels to hold out a test set and measure TPR and TNR, as in lesson 5. Binary labels are what the flow (and the course) recommends, so moving to a 1 to 10 scale goes the wrong way.",
    lessonAnchor: "scorers-and-evaluators",
  },
  {
    id: "ev-plat-where-checks-run",
    lectures: [14],
    tags: ["online-evals", "guardrails"],
    type: "scenario",
    prompt: "Decide where each check belongs.",
    fields: [
      { label: "Block replies that echo the internal user ID from the system prompt", options: WHERE, answer: "In the application's request path" },
      { label: "Estimate the groundedness failure rate on a 20% sample of last week's traffic", options: WHERE, answer: "Platform online evaluator or automation" },
      { label: "Send any trace whose groundedness score is 0 to a review queue", options: WHERE, answer: "Platform online evaluator or automation" },
      { label: "Re-run the agent with feedback when its generated code fails type-checking", options: WHERE, answer: "In the application's request path" },
    ],
    explanation:
      "Anything that must change the response before the user sees it (blocking, retrying with feedback) is a guardrail or in-the-loop check and lives in your app, as Harrison Chase put it: LangSmith is a logging platform. Measuring rates on sampled traffic and routing failures to reviewers are exactly what online evaluators and automation rules are for.",
    lessonAnchor: "online-evals-and-production-monitoring",
  },
  {
    id: "ev-plat-debug-loop",
    lectures: [14],
    tags: ["experiments", "tracing"],
    type: "order",
    prompt: "Put the Phoenix demo's debugging loop for the movie text-to-SQL bot in order.",
    steps: [
      "Instrument the pipeline so every LLM call and the SQL step are traced",
      "Run a handful of questions and annotate the root spans while reading traces",
      "Upload the questions as a dataset and run a baseline experiment with a \"has results\" check",
      "Filter to rows that scored 0 and open their traces",
      "Add example table rows to the text-to-SQL prompt so the model sees real genre values",
      "Rerun the experiment and compare it with the baseline",
    ],
    explanation:
      "Trace first so you can see the steps, read and annotate to form hypotheses, then freeze the questions as a dataset and measure a baseline with a cheap code check. Reading the failing traces revealed 'anime' and 'sci-fi' versus Animation and Science Fiction; the prompt fix came after that, and the rerun confirmed it against the baseline.",
    lessonAnchor: "experiments",
  },
  {
    id: "ev-plat-constraint",
    lectures: [14],
    tags: ["choosing"],
    type: "mcq",
    prompt:
      "A hospital team's traces contain patient data that may not leave their network. Which statement fits what the tutorials said?",
    options: [
      "Settle deployment first: self-hosted open-source Phoenix or a vendor's self-hosted or hybrid plan, then compare features among those",
      "Pick the platform with the most features shown and ask legal for an exception",
      "Use any hosted free tier, since free tiers behave the same as paid ones",
      "Skip tracing entirely and evaluate final outputs only",
    ],
    answer:
      "Settle deployment first: self-hosted open-source Phoenix or a vendor's self-hosted or hybrid plan, then compare features among those",
    explanation:
      "Data residency is a constraint, not a feature. Phoenix is open source and runs anywhere; Braintrust described self-hosted and hybrid (remote evals) options on paid plans. The free hosted tier was explicitly cloud-based, and dropping tracing throws away the main debugging tool.",
    lessonAnchor: "avoiding-lock-in",
  },
  {
    id: "ev-plat-lock-in",
    lectures: [14],
    tags: ["lock-in"],
    type: "scenario",
    prompt: "For each practice, does it reduce lock-in or add lock-in and runtime risk?",
    fields: [
      { label: "Export labeled datasets and judge prompts to JSONL in the repo after each labeling session", options: LOCK, answer: "Reduces lock-in" },
      { label: "Write scorers as plain Python functions of (output, expected)", options: LOCK, answer: "Reduces lock-in" },
      { label: "Fetch the production prompt from the platform's hub on every request, with no fallback", options: LOCK, answer: "Adds lock-in or runtime risk" },
      { label: "Instrument with OpenTelemetry and point the exporter at the platform", options: LOCK, answer: "Reduces lock-in" },
      { label: "Run your safety guardrails inside the eval platform", options: LOCK, answer: "Adds lock-in or runtime risk" },
    ],
    explanation:
      "Labels, datasets and scorers are the durable asset, so keep them vendor-neutral. OTel lets you swap backends by changing an exporter. A prompt fetched at request time or a guardrail hosted in the platform puts the vendor in your request path, so an outage or migration becomes a production incident.",
    lessonAnchor: "avoiding-lock-in",
  },
  {
    id: "ev-plat-custom-ui",
    lectures: [14],
    tags: ["human-review"],
    type: "mcq",
    prompt:
      "Leasing agents will label 300 tour-booking traces a week. To judge a trace they need the calendar entry the agent created, which lives in another system. Your traces are already in an eval platform. What fits best?",
    options: [
      "Build a thin custom review UI that reads traces from the platform's API, shows the calendar entry beside each, and writes labels back",
      "Have reviewers keep the calendar open in a second window while using the platform's annotation view",
      "Export traces to a spreadsheet with one row per trace",
      "Skip human review and rely on an LLM judge",
    ],
    answer:
      "Build a thin custom review UI that reads traces from the platform's API, shows the calendar entry beside each, and writes labels back",
    explanation:
      "Lesson 8's advice, echoed by the Phoenix presenter: start with the platform's annotation view, and when reviewers need domain context the generic layout can't show, build a small UI on the platform's API and keep the platform as the database. Window switching breaks flow, spreadsheets break on long traces, and judges need human labels to be aligned.",
    lessonAnchor: "when-a-platform-helps-and-when-it-doesnt",
  },
];
