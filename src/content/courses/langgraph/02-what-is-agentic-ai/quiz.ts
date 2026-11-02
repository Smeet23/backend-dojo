import type { Question } from "@/lib/types";

const CONTROLS = ["Permission scope", "Human-in-the-loop checkpoint", "Override control", "Guardrail / policy"];
const COMPONENTS = ["Brain (LLM)", "Orchestrator", "Tools", "Memory", "Supervisor"];
const TRIGGERS = ["Failure", "External feedback", "Goal change"];

export const quiz: Question[] = [
  {
    id: "lg-autonomy-controls",
    lectures: [2],
    tags: ["autonomy", "safety"],
    type: "scenario",
    prompt:
      "You're hardening an expense-approval agent before launch. Match each requirement to the kind of autonomy control it is.",
    fields: [
      { label: "The agent may read receipts and categorise them, but has no tool for issuing refunds", options: CONTROLS, answer: "Permission scope" },
      { label: "Any reimbursement over $1,000 pauses until a finance manager approves it", options: CONTROLS, answer: "Human-in-the-loop checkpoint" },
      { label: "Finance can hit \"stop all processing\" during an audit and resume later", options: CONTROLS, answer: "Override control" },
      { label: "Never reimburse alcohol, whatever the receipt says", options: CONTROLS, answer: "Guardrail / policy" },
    ],
    explanation:
      "Scope limits which actions exist at all; checkpoints pause specific risky steps for approval; overrides let a human halt or redirect at any time; guardrails are hard rules the agent must always follow.",
    lessonAnchor: "controlling-autonomy",
  },
  {
    id: "lg-unbounded-ad-spend",
    lectures: [2],
    tags: ["autonomy", "safety", "human-in-the-loop"],
    type: "scenario",
    prompt:
      "Your recruiting agent had permission to boost job posts. Overnight it boosted five posts and spent $4,000. Nothing malfunctioned: low applications were exactly when it was supposed to boost. What was missing, and what's the fix?",
    fields: [
      { label: "Root cause", options: ["Too much autonomy over an expensive action", "The LLM hallucinated the job board", "The agent had no goal", "The context window overflowed"], answer: "Too much autonomy over an expensive action" },
      { label: "Fix", options: ["Require human approval (and a cap) before any spend", "Use a bigger model", "Remove the monitoring step", "Restart the agent every night"], answer: "Require human approval (and a cap) before any spend" },
    ],
    explanation:
      "The agent did what it was allowed to do. Expensive, irreversible actions need a checkpoint and a hard limit. A bigger model would make the same decision with more confidence.",
    lessonAnchor: "what-goes-wrong-without-controls",
  },
  {
    id: "lg-goal-constraints",
    lectures: [2],
    tags: ["goals"],
    type: "mcq",
    prompt:
      "A user tells a travel agent: \"Book me a trip to Lisbon in May, under $1,500, no layovers.\" The agent finds a great $1,100 deal with one short layover and books it. What went wrong?",
    options: [
      "It treated a constraint as a preference: constraints are part of the goal",
      "Nothing: it stayed under budget, which is the main goal",
      "It should have asked a generative chatbot instead",
      "It planned too many candidate options",
    ],
    answer: "It treated a constraint as a preference: constraints are part of the goal",
    explanation:
      "\"No layovers\" narrows what counts as success. A plan that violates it should be rejected at evaluation, or the agent should ask before relaxing it.",
    lessonAnchor: "goals-with-constraints",
  },
  {
    id: "lg-plan-evaluation-tool",
    lectures: [2],
    tags: ["planning"],
    type: "scenario",
    prompt:
      "A research agent produced two plans to answer a market-sizing question. Plan A: search the web for recent reports, then summarise. Plan B: query the company's internal sales database, then extrapolate. The agent has a SQL tool but no web-search tool. Plan A looks higher quality. What should evaluation conclude?",
    fields: [
      { label: "Plan A", options: ["Rejected: required tool unavailable", "Selected: higher quality wins", "Run both in parallel"], answer: "Rejected: required tool unavailable" },
      { label: "Criterion that decided it", options: ["Tool availability", "Cost", "Speed", "Risk"], answer: "Tool availability" },
    ],
    explanation:
      "A plan the agent can't execute is worthless however good it looks. Tool availability filters plans before softer criteria like quality, cost or speed are compared.",
    lessonAnchor: "evaluate-them",
  },
  {
    id: "lg-planning-order",
    lectures: [2],
    tags: ["planning"],
    type: "order",
    prompt: "Put the agent's planning-and-execution cycle in order.",
    steps: [
      "Interpret the goal and its constraints",
      "Generate several candidate plans",
      "Evaluate them on speed, tools, cost, risk and constraints",
      "Select one (policy, LLM judgement or human choice)",
      "Execute the plan step by step",
      "If a step turns out impossible, return to planning",
    ],
    explanation:
      "Planning is generate, evaluate, select; execution follows; and the two form a loop, because execution can reveal that the plan needs to change.",
    lessonAnchor: "planning",
  },
  {
    id: "lg-adaptation-triggers",
    lectures: [2],
    tags: ["adaptability"],
    type: "scenario",
    prompt: "A delivery-scheduling agent hits three surprises. Classify what triggered each adaptation.",
    fields: [
      { label: "The maps API times out, so it falls back to straight-line distance estimates", options: TRIGGERS, answer: "Failure" },
      { label: "Drivers report a road closure, so it reroutes", options: TRIGGERS, answer: "External feedback" },
      { label: "The manager says \"prioritise same-day orders from now on\"", options: TRIGGERS, answer: "Goal change" },
    ],
    explanation:
      "A tool breaking is a failure; new information from the environment is external feedback; a new instruction about what to optimise is a goal change. In each case the agent re-plans while still serving the (possibly updated) goal.",
    lessonAnchor: "adaptability",
  },
  {
    id: "lg-short-vs-long-memory",
    lectures: [2],
    tags: ["memory", "context"],
    type: "scenario",
    prompt: "Your support agent stores several facts. Which kind of memory should hold each?",
    fields: [
      { label: "The order ID the customer mentioned two messages ago", options: ["Short-term memory", "Long-term memory"], answer: "Short-term memory" },
      { label: "This customer prefers replies in Spanish", options: ["Short-term memory", "Long-term memory"], answer: "Long-term memory" },
      { label: "The refund tool just returned \"refund #881 issued\"", options: ["Short-term memory", "Long-term memory"], answer: "Short-term memory" },
      { label: "Company policy: never promise delivery dates", options: ["Short-term memory", "Long-term memory"], answer: "Long-term memory" },
    ],
    explanation:
      "Details of the current conversation and recent tool results matter for this session. Preferences and standing policies should survive into every future session.",
    lessonAnchor: "short-term-and-long-term-memory",
  },
  {
    id: "lg-component-responsibility",
    lectures: [2],
    tags: ["components"],
    type: "scenario",
    prompt: "Match each responsibility in a coding agent to the component that owns it.",
    fields: [
      { label: "Deciding that the failing test means the parser needs fixing", options: COMPONENTS, answer: "Brain (LLM)" },
      { label: "After tests run: if they pass, finish; if not, loop back to editing", options: COMPONENTS, answer: "Orchestrator" },
      { label: "Running the test suite and reading the output", options: COMPONENTS, answer: "Tools" },
      { label: "Pausing before pushing to main until a developer approves", options: COMPONENTS, answer: "Supervisor" },
    ],
    explanation:
      "Reasoning about what's wrong is the brain; routing and looping based on results is the orchestrator; touching the outside world is tools; human approval is the supervisor.",
    lessonAnchor: "the-five-components",
  },
  {
    id: "lg-escalation-edge-case",
    lectures: [2],
    tags: ["supervisor", "guardrails"],
    type: "mcq",
    prompt:
      "A guardrail says to shortlist only candidates with 3+ years' experience. One applicant has 2.5 years but an exceptional open-source record. What should a well-designed agent do?",
    options: [
      "Escalate: flag the candidate to the human with its reasoning",
      "Silently drop them: rules are rules",
      "Silently shortlist them: the agent knows best",
      "Rewrite the guardrail to 2 years",
    ],
    answer: "Escalate: flag the candidate to the human with its reasoning",
    explanation:
      "Edge cases are what the supervisor component is for. The agent neither breaks the rule on its own authority nor hides a possibly great candidate; it hands the judgement to a person.",
    lessonAnchor: "supervisor",
  },
  {
    id: "lg-is-it-agentic",
    lectures: [2],
    tags: ["traits"],
    type: "mcq",
    prompt:
      "A product watches your inbox, drafts replies and sends them on approval, but only when you click \"draft reply\" on a specific email. It forgets everything when you close the tab. Which traits is it clearly missing?",
    options: [
      "Autonomy and context awareness",
      "Reasoning and tool use",
      "Only planning",
      "None: it's fully agentic",
    ],
    answer: "Autonomy and context awareness",
    explanation:
      "It acts only when you click (not autonomous or proactive) and keeps nothing across sessions (no context awareness). It does reason and uses tools, but that alone makes it a capable assistant, not an agent.",
    lessonAnchor: "is-it-agentic",
  },
  {
    id: "lg-component-langgraph-map",
    lectures: [2],
    tags: ["components", "langgraph"],
    type: "scenario",
    prompt: "Preview: which LangGraph feature implements each component?",
    fields: [
      { label: "Orchestrator", options: ["StateGraph with nodes and edges", "interrupt()", "A checkpointer", "@tool functions"], answer: "StateGraph with nodes and edges" },
      { label: "Supervisor", options: ["StateGraph with nodes and edges", "interrupt()", "A checkpointer", "@tool functions"], answer: "interrupt()" },
      { label: "Short-term memory", options: ["StateGraph with nodes and edges", "interrupt()", "A checkpointer", "@tool functions"], answer: "A checkpointer" },
    ],
    explanation:
      "The graph is the orchestrator; interrupt() pauses a run for a human; a checkpointer saves the graph's state per thread so the conversation and progress persist.",
    lessonAnchor: "how-the-components-map-onto-langgraph",
  },
];
