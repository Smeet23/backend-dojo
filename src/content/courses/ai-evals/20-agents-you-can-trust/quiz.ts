import type { Question } from "@/lib/types";

const BAR = ["Can be lower", "Must be high"];
const SIGNAL = ["Explicit feedback", "Implicit feedback", "Not user feedback"];
const SOURCE = ["Buy from a vendor", "Build your own layer"];

export const quiz: Question[] = [
  {
    id: "ev-trust-compounding-steps",
    lectures: [20],
    tags: ["agents", "tracing"],
    type: "scenario",
    prompt:
      "A travel agent handles \"book me a trip to San Francisco\" in 4 steps: choose a tool, build the flight search, use the results, write the reply. Each step independently succeeds 95% of the time. A user reports a booking to San Diego.",
    fields: [
      { label: "Approximate end-to-end success rate", options: ["95%", "90%", "81%", "62%"], answer: "81%" },
      {
        label: "What tells you which step failed?",
        options: ["The final response", "A trace with one span per step", "A higher-temperature rerun", "The overall pass rate"],
        answer: "A trace with one span per step",
      },
    ],
    explanation:
      "0.95^4 is about 0.81, so roughly one request in five fails somewhere even though every step looks reliable on its own. The final response only shows that something went wrong. A trace whose spans mirror the agent's real steps shows whether the search was built wrong, the results were misread, or the reply ignored correct context. That is why tracing comes before any eval in the playbook.",
    lessonAnchor: "why-agents-are-hard-to-trust",
  },
  {
    id: "ev-trust-threshold-cost",
    lectures: [20],
    tags: ["north-star", "thresholds"],
    type: "scenario",
    prompt:
      "Each agent below has a single North Star metric. Based on the cost of one error, decide how strict its pass threshold should be.",
    fields: [
      { label: "IDE coding agent whose suggestions the developer reviews and edits", options: BAR, answer: "Can be lower" },
      { label: "Customer support chatbot answering billing questions directly to customers", options: BAR, answer: "Must be high" },
      { label: "Agent that drafts sales emails a rep edits before sending", options: BAR, answer: "Can be lower" },
      { label: "Agent that submits tax filings on the user's behalf", options: BAR, answer: "Must be high" },
    ],
    explanation:
      "The threshold should follow the cost of an error. When a human checks the output and fixing it takes seconds (code suggestions, draft emails), a lower bar is acceptable. When the output reaches a customer directly or acts irreversibly, one made-up answer can destroy trust or cause real harm, so the bar must be high. Agree the number with product and business owners up front and revisit it.",
    lessonAnchor: "pick-one-north-star-with-a-threshold",
  },
  {
    id: "ev-trust-judge-design",
    lectures: [20],
    tags: ["llm-judge", "alignment"],
    type: "mcq",
    prompt:
      "A team's judge rates \"overall helpfulness\" from 1 to 10. Experts and the judge disagree constantly, and nobody can say what a 6 means. The team wants to start using the judge in CI next week. What does the playbook recommend?",
    options: [
      "Split it into single-criterion pass/fail judges with critiques, set a minimum expert alignment target, and hold off until each judge meets it",
      "Keep the 1 to 10 scale but average three judge runs to reduce noise",
      "Ship it to CI now and tune the prompt later using the production scores",
      "Replace the judge with a larger model, since disagreement means the model is too weak",
    ],
    answer:
      "Split it into single-criterion pass/fail judges with critiques, set a minimum expert alignment target, and hold off until each judge meets it",
    explanation:
      "Udi saw scaled judges turn into a mess. Each judge should check one criterion, return pass or fail, and explain itself. The alignment target is a gate: until the judge agrees with experts well enough, you investigate why and refine its instructions rather than relying on it. Averaging or a bigger model does not fix an undefined criterion.",
    lessonAnchor: "foundation-2-the-right-evaluator-for-each-component",
  },
  {
    id: "ev-trust-feedback-types",
    lectures: [20],
    tags: ["feedback", "production"],
    type: "scenario",
    prompt: "You are deciding which production signals to log as feedback events joined to your agent's traces. Classify each.",
    fields: [
      { label: "User clicks thumbs down on an answer", options: SIGNAL, answer: "Explicit feedback" },
      { label: "User copies the answer into another tool and rewrites half of it", options: SIGNAL, answer: "Implicit feedback" },
      { label: "User asks the same question again in different words", options: SIGNAL, answer: "Implicit feedback" },
      { label: "User types a complaint into a feedback button", options: SIGNAL, answer: "Explicit feedback" },
      { label: "The agent's p95 latency rises from 3 s to 5 s", options: SIGNAL, answer: "Not user feedback" },
    ],
    explanation:
      "Explicit feedback is something the user deliberately gives: ratings and feedback buttons. Implicit feedback is behavior that reveals the agent fell short, such as copying an answer out to fix it or re-asking. Latency matters for monitoring, but it is a system metric, not a signal from the user about quality. Decide on these signals before launch: retrofitting them onto a live agent is much harder.",
    lessonAnchor: "close-the-loop-with-production",
  },
  {
    id: "ev-trust-playbook-order",
    lectures: [20],
    tags: ["playbook"],
    type: "order",
    prompt: "Put the playbook steps for a new agent in the order the talk recommends.",
    steps: [
      "Instrument tracing so every agent step is visible",
      "Write a one-page list of scenarios, expected behavior and edge cases",
      "Generate a golden dataset from the one-pager and PRD (or real data)",
      "Measure the dataset's coverage against the PRD and fill the gaps",
      "Pick one North Star metric and agree its threshold with business owners",
      "Monitor the same metrics in production and feed new failures back into the dataset",
    ],
    explanation:
      "Visibility comes first, since without traces you are flying blind. Then think before generating: the one-pager shapes the dataset, coverage tells you what the dataset misses, and only then does a North Star score mean something. Closing the loop with production comes last but should be designed early, especially feedback capture.",
    lessonAnchor: "foundation-1-strategy-and-visibility",
  },
  {
    id: "ev-trust-coverage-gap",
    lectures: [20],
    tags: ["dataset", "coverage"],
    type: "mcq",
    prompt:
      "A sales outreach agent scores 94% on its 200-example golden dataset. A semantic coverage check shows 150 examples are first-contact emails, and the PRD's \"lead says unsubscribe\" scenario has just one example. What is the right reading?",
    options: [
      "The 94% says little about unsubscribe handling; add examples for that scenario before trusting the score there",
      "94% clears a 0.9 threshold, so the agent is ready to launch",
      "Drop the unsubscribe example so the dataset is more consistent",
      "Coverage only matters for statistical diversity, so the semantic gap can be ignored",
    ],
    answer: "The 94% says little about unsubscribe handling; add examples for that scenario before trusting the score there",
    explanation:
      "An aggregate score is only as good as what the dataset covers. With one example, the unsubscribe scenario (a high-stakes one for a sales agent) is effectively untested. The point of a semantic coverage report is to compare the dataset against the PRD and flag gaps like this, ideally with suggested examples to add.",
    lessonAnchor: "measure-coverage",
  },
  {
    id: "ev-trust-personas",
    lectures: [20],
    tags: ["error-analysis", "review"],
    type: "mcq",
    prompt:
      "A tax expert is joining error analysis for a tax-help agent. The developers already review full traces with every tool call and intermediate prompt. What view should the expert get?",
    options: [
      "The user's input, the agent's output and the context it happened in",
      "The same full trace view the developers use, so everyone sees the same data",
      "Only the aggregate pass rate per failure category",
      "Raw JSON logs exported to a spreadsheet",
    ],
    answer: "The user's input, the agent's output and the context it happened in",
    explanation:
      "Root cause analysis depends on the persona. The expert judges whether the answer is right for the customer, which needs the input, output and surrounding context. The developer needs every step to locate the broken component. Different jobs, different data views, sometimes different tools.",
    lessonAnchor: "foundation-3-insight-not-just-scores",
  },
  {
    id: "ev-trust-build-buy",
    lectures: [20],
    tags: ["platform", "build-vs-buy"],
    type: "scenario",
    prompt: "Following Intuit's build-versus-buy rule, decide where each capability should come from.",
    fields: [
      { label: "Automatic trace capture and observability dashboards", options: SOURCE, answer: "Buy from a vendor" },
      { label: "Statistics for judge-to-human alignment and surfacing the worst disagreements", options: SOURCE, answer: "Build your own layer" },
      { label: "Company standards for what dataset coverage and feedback collection mean", options: SOURCE, answer: "Build your own layer" },
    ],
    explanation:
      "Buy where vendors are already ahead, like observability. Build where you have an opinionated method, layered on top of the vendors: Intuit's judge-alignment analysis and its AI standards (good datasets, coverage, feedback, alignment) are that layer. Vendors were only starting to ship alignment features at the time of the talk.",
    lessonAnchor: "how-intuit-organizes-it",
  },
  {
    id: "ev-trust-cookbooks",
    lectures: [20],
    tags: ["automation", "playbook"],
    type: "mcq",
    prompt:
      "Your platform team wants to copy Intuit's idea of eval cookbooks that a coding agent can read. Which version matches what Udi described?",
    options: [
      "Guides on how to write a binary judge with explanations and run it on production traces, where each team defines what criteria like completeness mean for its product",
      "A fixed library of rubrics (completeness, tone, accuracy) that every team uses unchanged",
      "A coding agent that picks metrics, writes judges and ships them without human review",
      "A single dashboard that replaces error analysis with automatically clustered scores",
    ],
    answer:
      "Guides on how to write a binary judge with explanations and run it on production traces, where each team defines what criteria like completeness mean for its product",
    explanation:
      "Udi called the cookbooks containers: they teach the method (binary, explained, connected to the platform) but the team supplies the content. The agent-driven demo was a concept, not current practice, and he does not think models can automate evals end to end. Humans define good and supervise.",
    lessonAnchor: "where-it-is-heading-agents-that-run-evals-humans-who-supervise",
  },
];
