import type { Question } from "@/lib/types";

const PATTERNS = ["Action approval", "Output review and edit", "Ambiguity clarification", "Escalation"];

export const quiz: Question[] = [
  {
    id: "lg-hitl-pattern-pick",
    lectures: [20],
    tags: ["hitl", "patterns"],
    type: "scenario",
    prompt:
      "Match each situation to the HITL pattern it needs:\n• A: an agent is about to wire ₹50,000 to a vendor.\n• B: a marketing agent has drafted a LinkedIn post.\n• C: the user says \"book it for next Friday\" on a Monday.\n• D: after several turns, a support bot can't resolve a damaged-order complaint.",
    fields: [
      { label: "A", options: PATTERNS, answer: "Action approval" },
      { label: "B", options: PATTERNS, answer: "Output review and edit" },
      { label: "C", options: PATTERNS, answer: "Ambiguity clarification" },
      { label: "D", options: PATTERNS, answer: "Escalation" },
    ],
    explanation:
      "Consequential actions get approval, drafts get review or edits, unclear requests get a clarifying question, and cases beyond the agent's ability get handed to a person.",
    lessonAnchor: "common-hitl-patterns",
  },
  {
    id: "lg-hitl-why-accountability",
    lectures: [20],
    tags: ["hitl"],
    type: "mcq",
    prompt:
      "Your email assistant's replies are accurate 99% of the time. Product still wants a human to press Send on every reply. Which argument justifies that even if accuracy reached 100%?",
    options: [
      "Accountability: the person who approves owns the outcome, and an AI can't be held responsible",
      "Interrupts make the model more accurate",
      "Checkpointers require a human step",
      "It reduces token usage",
    ],
    answer: "Accountability: the person who approves owns the outcome, and an AI can't be held responsible",
    explanation:
      "Model imperfection is one reason for HITL; accountability is the other, and it doesn't go away as models improve. Someone has to own consequential actions like sending email on a user's behalf.",
    lessonAnchor: "someone-has-to-be-accountable",
  },
  {
    id: "lg-hitl-interrupt-resume-order",
    lectures: [20],
    tags: ["interrupt", "command"],
    type: "order",
    prompt: "Put an approval flow with interrupt() in order.",
    steps: [
      "Frontend calls graph.invoke(input, config) with thread_id t-1",
      "The node reaches interrupt(payload) and the run pauses",
      "State and the pending node are saved by the checkpointer",
      "invoke returns the payload under __interrupt__ and the frontend shows it",
      "The human clicks Approve",
      "Frontend calls graph.invoke(Command(resume=...), config) on thread t-1",
      "The node re-runs and interrupt() returns the human's answer",
    ],
    explanation:
      "The first invoke runs until the interrupt, saves the paused state and returns the payload. The resume call on the same thread re-enters the node, where interrupt returns the resume value.",
    lessonAnchor: "how-interrupts-work-in-langgraph",
  },
  {
    id: "lg-hitl-no-checkpointer",
    lectures: [20],
    tags: ["interrupt", "persistence"],
    type: "scenario",
    prompt:
      "You add interrupt() to a node, compile with builder.compile(), and call graph.invoke(input) with no config. It fails as soon as the interrupt is reached.",
    fields: [
      {
        label: "Missing piece 1",
        options: ["A checkpointer, e.g. compile(checkpointer=InMemorySaver())", "A ToolNode", "A reducer on messages", "stream_mode=\"updates\""],
        answer: "A checkpointer, e.g. compile(checkpointer=InMemorySaver())",
      },
      {
        label: "Missing piece 2",
        options: ["config={\"configurable\": {\"thread_id\": ...}}", "A recursion_limit", "A second START edge", "A LangSmith project"],
        answer: "config={\"configurable\": {\"thread_id\": ...}}",
      },
    ],
    explanation:
      "Pausing means saving the run so it can be resumed later. That needs a checkpointer to store it and a thread id to file it under.",
    lessonAnchor: "how-interrupts-work-in-langgraph",
  },
  {
    id: "lg-hitl-read-payload",
    lectures: [20],
    tags: ["interrupt"],
    type: "mcq",
    prompt:
      "result = graph.invoke(input, config) paused at interrupt({\"question\": \"Send?\", \"draft\": ...}). How does your frontend get the dict to display?",
    options: [
      "result[\"__interrupt__\"][0].value",
      "result[\"messages\"][-1].content",
      "graph.get_state(config).values[\"question\"]",
      "result[\"interrupt\"]",
    ],
    answer: "result[\"__interrupt__\"][0].value",
    explanation:
      "Interrupts come back under the __interrupt__ key as a list of Interrupt objects whose value is the payload. The payload isn't written into state or messages.",
    lessonAnchor: "reading-the-interrupt",
  },
  {
    id: "lg-hitl-resume-contract",
    lectures: [20],
    tags: ["command"],
    type: "scenario",
    prompt:
      "The node does:\ndecision = interrupt({...})\nif decision[\"approved\"] != \"yes\": return rejected\nThe frontend resumes with graph.invoke(Command(resume=\"yes\"), config) and the node raises a TypeError.",
    fields: [
      {
        label: "Cause",
        options: [
          "The resume value is a string, but the node expects a dict with an approved key",
          "Command can't carry strings",
          "The thread id changed",
          "interrupt was called twice",
        ],
        answer: "The resume value is a string, but the node expects a dict with an approved key",
      },
      {
        label: "Fix in the frontend",
        options: [
          "Command(resume={\"approved\": \"yes\"})",
          "Command(goto=\"yes\")",
          "Command(update={\"approved\": \"yes\"})",
          "graph.invoke({\"approved\": \"yes\"}, config)",
        ],
        answer: "Command(resume={\"approved\": \"yes\"})",
      },
    ],
    explanation:
      "Whatever goes in resume is exactly what interrupt() returns, so its shape is a contract between node and frontend. goto and update are other Command features, and passing a plain dict would start a new input instead of resuming.",
    lessonAnchor: "resuming-with-command",
  },
  {
    id: "lg-hitl-side-effect",
    lectures: [20],
    tags: ["interrupt", "idempotency"],
    type: "scenario",
    prompt:
      "A node sends a Slack notification \"Approval requested\" and then calls interrupt(). Approvers report getting every notification twice: once when the request appears and again when they approve.",
    fields: [
      {
        label: "Why",
        options: [
          "On resume the node re-runs from its first line, so the notification is sent again",
          "Slack retries every message",
          "The checkpointer stores two copies",
          "interrupt() sends its own notification",
        ],
        answer: "On resume the node re-runs from its first line, so the notification is sent again",
      },
      {
        label: "Fix",
        options: [
          "Move the notification to a separate node before this one, or make it idempotent",
          "Wrap interrupt() in try/except Exception",
          "Resume on a new thread",
          "Call interrupt() twice",
        ],
        answer: "Move the notification to a separate node before this one, or make it idempotent",
      },
    ],
    explanation:
      "Code before interrupt() runs again on resume. Side effects belong in their own node, after the interrupt, or must be safe to repeat. A broad try/except would swallow the interrupt itself.",
    lessonAnchor: "rules-for-writing-interrupt-nodes",
  },
  {
    id: "lg-hitl-wrong-thread",
    lectures: [20],
    tags: ["command", "threads"],
    type: "mcq",
    prompt:
      "Your web app pauses for approval on thread \"order-81\". The approve button handler builds a new config with a freshly generated thread_id and calls invoke(Command(resume=True), config). The order never completes. Why?",
    options: [
      "The paused run lives under order-81; the new thread has nothing to resume",
      "Command(resume=True) must be a string",
      "Approvals expire after one minute",
      "The checkpointer deletes paused runs",
    ],
    answer: "The paused run lives under order-81; the new thread has nothing to resume",
    explanation:
      "Resume targets a paused run by thread id. Store the thread id alongside the pending approval and reuse it when the human answers.",
    lessonAnchor: "rules-for-writing-interrupt-nodes",
  },
  {
    id: "lg-hitl-tool-placement",
    lectures: [20],
    tags: ["hitl", "tools"],
    type: "scenario",
    prompt:
      "Your stock chatbot has get_stock_price and purchase_stock. You want approval only for purchases, not for price lookups, and the user should be told clearly when a purchase is declined.",
    fields: [
      {
        label: "Where to call interrupt()",
        options: ["Inside purchase_stock", "At the top of chat_node", "In a node before START", "Inside get_stock_price"],
        answer: "Inside purchase_stock",
      },
      {
        label: "On \"no\", the tool should",
        options: [
          "Return a cancelled status message so the model can relay it",
          "Raise an exception to stop the graph",
          "Return nothing",
          "Call interrupt() again until the answer is yes",
        ],
        answer: "Return a cancelled status message so the model can relay it",
      },
    ],
    explanation:
      "Putting the interrupt in the risky tool gates just that action. Returning a clear cancelled result gives the model a ToolMessage to explain the outcome. An interrupt in chat_node would ask for approval on every message.",
    lessonAnchor: "approval-inside-a-tool",
  },
  {
    id: "lg-hitl-goto-vs-resume",
    lectures: [20],
    tags: ["command"],
    type: "mcq",
    prompt: "In an approve/reject flow, which statement about Command is correct?",
    options: [
      "Command(resume=...) is passed to invoke by the caller; Command(goto=...) is returned by a node to choose the next node",
      "Both are returned by nodes",
      "Both are passed to invoke",
      "Command(goto=...) resumes a paused run on a new thread",
    ],
    answer: "Command(resume=...) is passed to invoke by the caller; Command(goto=...) is returned by a node to choose the next node",
    explanation:
      "resume carries the human's answer into the paused run. A node can then return Command(goto=...) to route on that answer, for example to send_email or cancelled.",
    lessonAnchor: "approve-reject-or-edit",
  },
  {
    id: "lg-hitl-web-durable",
    lectures: [20],
    tags: ["hitl", "persistence", "web"],
    type: "scenario",
    prompt:
      "Your FastAPI app runs three worker processes with InMemorySaver. Approvals often fail: the approver clicks Approve an hour later and the server says there's nothing to resume.",
    fields: [
      {
        label: "Cause",
        options: [
          "The paused run lives in one process's memory; another worker (or a restart) can't see it",
          "Interrupts expire after an hour",
          "Command(resume=...) only works in notebooks",
          "The payload wasn't JSON-serialisable",
        ],
        answer: "The paused run lives in one process's memory; another worker (or a restart) can't see it",
      },
      {
        label: "Fix",
        options: [
          "A durable shared checkpointer such as Postgres, keyed by the same thread_id",
          "Sticky sessions and a longer timeout",
          "Store the payload in a cookie",
          "Remove the interrupt and auto-approve",
        ],
        answer: "A durable shared checkpointer such as Postgres, keyed by the same thread_id",
      },
    ],
    explanation:
      "The resume request can land on any worker, at any time. Only a checkpointer that every process can read, and that survives restarts, makes pending approvals reliable.",
    lessonAnchor: "hitl-in-a-web-app",
  },
  {
    id: "lg-hitl-approval-fatigue",
    lectures: [20],
    tags: ["hitl", "design"],
    type: "mcq",
    prompt:
      "Your agent asks for approval before every tool call, including searches and price lookups. After a week, logs show users approve 100% of requests within a second. What's the best change?",
    options: [
      "Gate only irreversible, costly, external or ambiguous actions, and auto-run read-only tools",
      "Add a second approval step for every tool",
      "Remove HITL entirely since users always approve",
      "Make the approval dialog smaller",
    ],
    answer: "Gate only irreversible, costly, external or ambiguous actions, and auto-run read-only tools",
    explanation:
      "Too many checkpoints train people to click approve without reading, which looks safe but isn't. Keep approval for actions where a mistake matters, so each request gets real attention.",
    lessonAnchor: "designing-the-approval-step",
  },
];
