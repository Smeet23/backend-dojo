import type { Question } from "@/lib/types";

const UPGRADES = ["Connect it to a company knowledge base (RAG)", "Give it tools (APIs it can call)", "Make it agentic (goal, plan, memory, loop)", "Switch to a bigger LLM"];

export const quiz: Question[] = [
  {
    id: "lg-genai-vs-traditional-task",
    lectures: [1],
    tags: ["generative-ai", "foundations"],
    type: "scenario",
    prompt:
      "A bank has three AI projects:\n• A: flag each card transaction as fraud or not fraud.\n• B: write a personalised explanation letter for each declined loan.\n• C: predict next month's call-centre volume.\nWhich kind of model fits each?",
    fields: [
      { label: "A (fraud flag)", options: ["Traditional (discriminative) model", "Generative model"], answer: "Traditional (discriminative) model" },
      { label: "B (explanation letters)", options: ["Traditional (discriminative) model", "Generative model"], answer: "Generative model" },
      { label: "C (call volume)", options: ["Traditional (discriminative) model", "Generative model"], answer: "Traditional (discriminative) model" },
    ],
    explanation:
      "A is classification and C is regression: both map an input to a label or a number. Only B asks for new content, which is the job of a generative model. Using an LLM to classify fraud is possible, but a trained classifier is cheaper, faster and easier to evaluate.",
    lessonAnchor: "traditional-ai-vs-generative-ai",
  },
  {
    id: "lg-which-upgrade-generic-jd",
    lectures: [1],
    tags: ["rag", "evolution"],
    type: "scenario",
    prompt:
      "Your recruiting chatbot writes fluent JDs, but they never mention your stack (Go and Postgres), your salary bands or your house style. The recruiters are happy to post them by hand. What's the smallest upgrade that fixes this?",
    fields: [{ label: "Upgrade", options: UPGRADES, answer: "Connect it to a company knowledge base (RAG)" }],
    explanation:
      "The problem is missing company knowledge, not missing actions or initiative. Retrieval over past JDs and the hiring playbook grounds the output in your facts. A bigger model still doesn't know your salary bands.",
    lessonAnchor: "level-2-a-rag-chatbot",
  },
  {
    id: "lg-which-upgrade-copy-paste",
    lectures: [1],
    tags: ["tools", "evolution"],
    type: "scenario",
    prompt:
      "Recruiters love the company-specific drafts, but they spend their day copying emails into the mail client, posting JDs on three boards and checking calendars. They're fine telling the bot what to do next. What do you add?",
    fields: [{ label: "Upgrade", options: UPGRADES, answer: "Give it tools (APIs it can call)" }],
    explanation:
      "The bot knows what to write but can't act. Tools (email, job board, calendar APIs) let it carry out the actions when asked. Full agency isn't needed, because the humans are happy to drive the sequence.",
    lessonAnchor: "level-3-a-tool-augmented-chatbot",
  },
  {
    id: "lg-which-upgrade-nobody-noticed",
    lectures: [1],
    tags: ["agentic", "evolution"],
    type: "scenario",
    prompt:
      "Your tool-augmented bot can post jobs and read application counts. A role sat for two weeks with one applicant because the recruiter went on leave and nobody asked the bot to check. What capability was missing, and which upgrade provides it?",
    fields: [
      { label: "Missing capability", options: ["Proactivity: acting and monitoring without being asked", "Grounding in company documents", "Fluent writing", "Access to the job board API"], answer: "Proactivity: acting and monitoring without being asked" },
      { label: "Upgrade", options: UPGRADES, answer: "Make it agentic (goal, plan, memory, loop)" },
    ],
    explanation:
      "The bot already had the tool to read the count; it just never used it unprompted. An agent that holds the goal and a plan monitors applications on its own, notices the shortfall and proposes a fix.",
    lessonAnchor: "level-4-an-agentic-system",
  },
  {
    id: "lg-chatbot-forgot-jd",
    lectures: [1],
    tags: ["memory", "llm"],
    type: "mcq",
    prompt:
      "On Monday a recruiter generated a JD with a plain LLM API integration. On Thursday they ask the same integration \"how many people applied to that JD?\" and it has no idea what they mean. What is the root cause?",
    options: [
      "The LLM is stateless: each call sees only the messages sent in that call",
      "The model's context window is too small for a JD",
      "The model was retrained between Monday and Thursday",
      "LLMs delete conversations after 24 hours",
    ],
    answer: "The LLM is stateless: each call sees only the messages sent in that call",
    explanation:
      "Nothing from Monday is in Thursday's request, so the model can't know about it. Memory has to be engineered around the model (stored history, task state). And even with memory, it couldn't count applicants without a tool.",
    lessonAnchor: "what-still-goes-wrong",
  },
  {
    id: "lg-genai-vs-agentic-table",
    lectures: [1],
    tags: ["agentic", "generative-ai"],
    type: "scenario",
    prompt: "Classify each product description as generative AI (a capability you prompt) or agentic AI (a system that pursues a goal).",
    fields: [
      { label: "\"Paste your notes, get a polished summary\"", options: ["Generative AI", "Agentic AI"], answer: "Generative AI" },
      { label: "\"Tell it your budget and dates; it books flights and a hotel, and rebooks if a flight is cancelled\"", options: ["Generative AI", "Agentic AI"], answer: "Agentic AI" },
      { label: "\"Describe a logo; get four images\"", options: ["Generative AI", "Agentic AI"], answer: "Generative AI" },
      { label: "\"Give it a failing test; it edits code, reruns tests and keeps going until they pass\"", options: ["Generative AI", "Agentic AI"], answer: "Agentic AI" },
    ],
    explanation:
      "The summariser and logo tool return content for a prompt. The travel and coding systems take a goal, act through tools over several steps, observe results (a cancellation, a test failure) and adapt until the goal is met.",
    lessonAnchor: "generative-ai-vs-agentic-ai",
  },
  {
    id: "lg-building-block",
    lectures: [1],
    tags: ["agentic", "generative-ai"],
    type: "mcq",
    prompt: "A teammate says: \"Now that we're building agents, we don't need generative AI any more.\" What's the best response?",
    options: [
      "Agents use an LLM as their reasoning engine, so generative AI is a building block inside them",
      "Correct: agents replace LLMs with planning algorithms",
      "Correct: agents only need tools and memory",
      "Agents and generative AI are unrelated technologies",
    ],
    answer: "Agents use an LLM as their reasoning engine, so generative AI is a building block inside them",
    explanation:
      "Interpreting the goal, planning, choosing tools and writing messages are all done by an LLM. Agentic AI wraps that capability with tools, memory and control logic; it doesn't replace it.",
    lessonAnchor: "generative-ai-vs-agentic-ai",
  },
  {
    id: "lg-approval-points",
    lectures: [1],
    tags: ["human-in-the-loop", "agentic"],
    type: "scenario",
    prompt:
      "You're deciding which actions your hiring agent may take on its own and which need the recruiter's OK first.",
    fields: [
      { label: "Parse and score resumes", options: ["Agent acts alone", "Ask the human first"], answer: "Agent acts alone" },
      { label: "Spend $300 boosting the job post", options: ["Agent acts alone", "Ask the human first"], answer: "Ask the human first" },
      { label: "Send the offer letter", options: ["Agent acts alone", "Ask the human first"], answer: "Ask the human first" },
      { label: "Send the recruiter an interview-day reminder", options: ["Agent acts alone", "Ask the human first"], answer: "Agent acts alone" },
    ],
    explanation:
      "Reading and reminding are cheap and reversible. Spending money and making offers cost money, are hard to undo and carry legal weight, so they go through an approval point. Autonomy doesn't mean no supervision.",
    lessonAnchor: "agentic-doesnt-mean-unsupervised",
  },
  {
    id: "lg-evolution-order",
    lectures: [1],
    tags: ["evolution"],
    type: "order",
    prompt: "Order the assistants from least to most capable, as in the hiring example.",
    steps: [
      "Plain LLM chatbot: drafts content on request",
      "RAG chatbot: drafts grounded in company documents",
      "Tool-augmented chatbot: also performs actions when asked",
      "Agentic system: takes a goal, plans, acts, monitors and adapts",
    ],
    explanation:
      "Each level keeps everything below it and adds one thing: grounding, then actions, then a goal-driven loop with memory and adaptation.",
    lessonAnchor: "how-the-problems-disappear",
  },
  {
    id: "lg-dont-need-agent",
    lectures: [1],
    tags: ["workflows", "design"],
    type: "mcq",
    prompt:
      "Every night you need to take the day's support tickets, summarise each one, and post the summaries to a channel. The steps never change. A colleague proposes a fully autonomous agent. What's the better call?",
    options: [
      "A fixed workflow that calls an LLM for each summary: the steps are known in advance",
      "An autonomous agent, because anything with an LLM should be agentic",
      "A RAG chatbot the team can ask about tickets",
      "No LLM at all; summaries can't be automated",
    ],
    answer: "A fixed workflow that calls an LLM for each summary: the steps are known in advance",
    explanation:
      "When the sequence is fixed, an agent adds cost, latency and unpredictability without benefit. Agents earn their keep when the steps depend on what happens along the way.",
    lessonAnchor: "not-every-problem-needs-an-agent",
  },
];
