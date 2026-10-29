import type { Question } from "@/lib/types";

const PLAN = ["Keep as written", "Rewrite in the plan", "Cut from the plan"];

export const quiz: Question[] = [
  {
    id: "ev-tools-order",
    lectures: [18],
    tags: ["workflow"],
    type: "order",
    prompt: "Put Isaac's agent-first workflow for the annotation app in order.",
    steps: [
      "Write framework and UI conventions into context files the agent reads",
      "Describe the app and have the agent write a plan as a markdown file",
      "Read the plan line by line and edit what is wrong",
      "Have the agent generate the code from the edited plan",
      "Test the running app in a browser, then label real data yourself",
    ],
    explanation:
      "Context first so the agent writes code in your style, then a plan you can edit while changes are cheap, then generation, then verification. Testing comes last but is not optional: the agent's own checks don't prove your labels are saved correctly.",
    lessonAnchor: "what-this-workshop-is-about",
  },
  {
    id: "ev-tools-plan-lines",
    lectures: [18],
    tags: ["plan", "spec"],
    type: "scenario",
    prompt:
      "The agent's draft plan.md for a relevance annotator (one query, about 400 documents to judge) contains these lines. What do you do with each before generating code?",
    fields: [
      {
        label: "Add a separate 'selected label' panel that displays which label the reviewer picked",
        options: PLAN,
        answer: "Rewrite in the plan",
      },
      {
        label: "Pre-label every document with an LLM and let reviewers accept all suggestions in one click",
        options: PLAN,
        answer: "Cut from the plan",
      },
      {
        label: "Save one judgment row per (query, document), with an optional note",
        options: PLAN,
        answer: "Keep as written",
      },
    ],
    explanation:
      "The selected label belongs on the button itself (highlight the active one), which is exactly the edit Isaac made to his plan. Bulk-accepting model guesses contaminates the ground truth you'll measure retrieval against. One row per pair with a note is the right data model: relabeling overwrites, and notes capture borderline reasoning.",
    lessonAnchor: "step-3-edit-the-plan-before-any-code-exists",
  },
  {
    id: "ev-tools-why-file",
    lectures: [18],
    tags: ["plan"],
    type: "mcq",
    prompt:
      "Your coding agent already shows an internal to-do list before it starts. A teammate asks why you bother having it write plan.md first. What is the best answer?",
    options: [
      "A file is something you can read and edit line by line before any code exists, which keeps results consistent",
      "Agents produce better code when the plan is stored in markdown rather than in memory",
      "The agent's internal to-do list is discarded before code generation starts",
      "A plan file lets you skip testing because the code follows the spec exactly",
    ],
    answer: "A file is something you can read and edit line by line before any code exists, which keeps results consistent",
    explanation:
      "Isaac was explicit that the plan isn't magic. The value is that you can edit it: delete unwanted concepts, fix the stack, add what's missing. Doing that every time makes the agent's behavior consistent enough that you learn what it handles well. It never replaces testing.",
    lessonAnchor: "step-2-get-a-written-plan",
  },
  {
    id: "ev-tools-ruler",
    lectures: [18],
    tags: ["context", "ruler"],
    type: "scenario",
    prompt:
      "Your eval team of four uses Claude Code, Cursor and Gemini CLI. Each has its own rules file, and they have drifted apart. Decide for each situation.",
    fields: [
      {
        label: "Where should the FastHTML and UI component conventions live?",
        options: [
          "One shared folder of markdown compiled into each tool's native config",
          "Only in the Cursor rules, with the other tools told to read them",
          "In each person's prompt, typed at the start of every session",
        ],
        answer: "One shared folder of markdown compiled into each tool's native config",
      },
      {
        label: "You want to trial a fourth agent this week. What makes the trial fair?",
        options: [
          "Run it with the same context files on a real task you need done",
          "Run it on a to-do app demo on the free tier",
          "Compare its first answer against your usual tool's best session",
        ],
        answer: "Run it with the same context files on a real task you need done",
      },
    ],
    explanation:
      "Ruler-style shared context keeps one source of truth and writes each tool's native format, which worked better than pointing one tool at another's files. For trials, same context plus a real task means you're testing the tool, not a missing config, a weaker free-tier model or a toy problem.",
    lessonAnchor: "step-1-put-your-context-in-files",
  },
  {
    id: "ev-tools-verify",
    lectures: [18],
    tags: ["verification"],
    type: "scenario",
    prompt:
      "The agent says the annotator is done and its browser test passed. Which of these checks should you still do yourself?",
    fields: [
      {
        label: "Label five documents, restart the app, reload the page",
        options: ["Do it yourself", "Safe to skip"],
        answer: "Do it yourself",
      },
      {
        label: "Switch a document from Relevant to Not relevant and inspect the stored rows",
        options: ["Do it yourself", "Safe to skip"],
        answer: "Do it yourself",
      },
      {
        label: "Read every generated template for style before using the tool",
        options: ["Do it yourself", "Safe to skip"],
        answer: "Safe to skip",
      },
      {
        label: "Judge 20 real documents in a row, including the longest PDF",
        options: ["Do it yourself", "Safe to skip"],
        answer: "Do it yourself",
      },
    ],
    explanation:
      "The checks that matter protect your labels (persistence, relabeling overwrites instead of duplicating) and reveal friction you only feel at volume. Template styling is low risk; read the save path instead, because a bug there silently corrupts every downstream metric.",
    lessonAnchor: "step-4-generate-then-verify-in-a-browser",
  },
  {
    id: "ev-tools-consistency",
    lectures: [18],
    tags: ["consistency"],
    type: "mcq",
    prompt:
      "A colleague says AI coding hasn't made them faster: some sessions go great, others are a mess, and they can't predict which. According to Isaac, what is the most likely root cause?",
    options: [
      "Ad hoc prompting each time, so results vary for reasons they can't see and they never build intuition",
      "They are using the wrong model; switching to the strongest one fixes the variance",
      "AI coding only helps on greenfield projects, not existing codebases",
      "They review the agent's plans too carefully, which slows them down",
    ],
    answer: "Ad hoc prompting each time, so results vary for reasons they can't see and they never build intuition",
    explanation:
      "Isaac's main argument: careful context and reviewed plans make the workflow consistent, and consistency is what lets you learn which requests the agent handles well. It mirrors the course's point about evals: fix the inputs so variation becomes explainable.",
    lessonAnchor: "consistency-is-the-real-goal",
  },
  {
    id: "ev-tools-agent-review",
    lectures: [18],
    tags: ["tool-evaluation"],
    type: "scenario",
    prompt:
      "You compare two coding agents on the same real deployment task. Classify each finding the way Isaac's reviews do.",
    fields: [
      {
        label: "Both deployments work, but one gives the app far more memory than it needs",
        options: ["Broken result", "Works, worse judgment or cost", "No difference worth noting"],
        answer: "Works, worse judgment or cost",
      },
      {
        label: "One agent's health-check route always returns OK, even when the app is down",
        options: ["Broken result", "Works, worse judgment or cost", "No difference worth noting"],
        answer: "Broken result",
      },
      {
        label: "One puts 20 lines of CSS inline in a template, the other in a separate file",
        options: ["Broken result", "Works, worse judgment or cost", "No difference worth noting"],
        answer: "Works, worse judgment or cost",
      },
    ],
    explanation:
      "Treat a coding agent like any AI system under evaluation: real inputs, read the outputs (the diffs), and categorize. Functional is only the first bar; organization and cost are real differences even when everything runs. A health check that can't detect failure is broken, whatever the deployment log says.",
    lessonAnchor: "evaluating-the-coding-agents-themselves",
  },
  {
    id: "ev-tools-console-loop",
    lectures: [18],
    tags: ["mcp", "testing"],
    type: "mcq",
    prompt:
      "Your agent built the annotator and reads the server log from a file. Clicking Relevant does nothing, and the server log shows no error. You keep pasting errors from the browser dev tools into the chat. What is the best fix?",
    options: [
      "Give the agent a browser tool (for example a small Playwright MCP server) that can run the app, click, and read the browser console",
      "Increase the server log level to debug so the client-side error shows up there",
      "Add a sentence to the context file asking the agent to be more careful with HTMX",
      "Keep pasting, but batch several errors into one message",
    ],
    answer: "Give the agent a browser tool (for example a small Playwright MCP server) that can run the app, click, and read the browser console",
    explanation:
      "HTMX and JavaScript errors happen in the browser and never reach the server log, whatever its level. Isaac's rule: pasting the same kind of thing into the model more than once means you need better context or a tool. His project-specific Playwright MCP server took five to ten minutes and let the agent find and fix a 404 on its own.",
    lessonAnchor: "step-4-generate-then-verify-in-a-browser",
  },
  {
    id: "ev-tools-context-levels",
    lectures: [18],
    tags: ["context"],
    type: "scenario",
    prompt: "Match the context effort to the situation, following Isaac's levels.",
    fields: [
      {
        label: "You might script against a new eval vendor's SDK once, to see if it fits",
        options: ["Automated docs tool or 'go read the docs'", "Vendor MCP or llms.txt", "Hours of personalized markdown context"],
        answer: "Automated docs tool or 'go read the docs'",
      },
      {
        label: "Your team will build review tools in a young web framework for the next year",
        options: ["Automated docs tool or 'go read the docs'", "Vendor MCP or llms.txt", "Hours of personalized markdown context"],
        answer: "Hours of personalized markdown context",
      },
      {
        label: "You use an observability platform weekly and it publishes an llms.txt file",
        options: ["Automated docs tool or 'go read the docs'", "Vendor MCP or llms.txt", "Hours of personalized markdown context"],
        answer: "Vendor MCP or llms.txt",
      },
    ],
    explanation:
      "Spend nothing on a library you may drop. Use what the vendor already publishes for agents when you use it often. When you'll live in a library for months, two to four hours of docs in markdown, edited to say what your project actually does, pays back like learning to type faster.",
    lessonAnchor: "context-for-libraries-the-model-barely-knows",
  },
];
