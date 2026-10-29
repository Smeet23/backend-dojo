import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "ev-agent-trajectory-metrics",
    lectures: [22],
    tags: ["trajectory"],
    type: "scenario",
    prompt:
      "Expected path for \"book me a flight to SF on Friday under $400\": search_flights → filter_price → book_flight → send_confirmation. The agent actually called: search_flights, search_hotels, search_flights, filter_price, book_flight, send_confirmation.",
    fields: [
      { label: "In-order match", options: ["Pass", "Fail"], answer: "Pass" },
      { label: "Path length ratio", options: ["0.67", "1.00", "1.25", "1.50"], answer: "1.50" },
      { label: "Redundant steps", options: ["0", "1", "2", "3"], answer: "2" },
      { label: "Tool precision", options: ["67%", "83%", "100%", "50%"], answer: "83%" },
    ],
    explanation:
      "All four expected steps appear in order, so in-order match passes even though exact match fails. 6 steps over 4 expected gives a ratio of 1.50. Two calls (the hotel search and the second flight search) are outside the in-order match, so 2 redundant steps. 5 of the 6 calls use an expected tool, so precision is 5/6 ≈ 83%: the repeated search_flights is an expected tool, only the hotel search is stray. The answer may be right, but the run cost 50% more steps than needed.",
    lessonAnchor: "trace-level-the-decision-path",
  },
  {
    id: "ev-agent-convergence-calc",
    lectures: [22],
    tags: ["trajectory", "convergence"],
    type: "scenario",
    prompt:
      "You run the same query 4 times. Three runs complete the expected path in order, taking 4, 5 and 8 steps. The fourth run takes 3 steps but skips the price filter, so it fails the in-order check. Convergence = mean over all runs of (optimal steps ÷ steps taken), where optimal is the shortest successful run and failed runs score 0.",
    fields: [
      { label: "Optimal path length", options: ["3", "4", "5", "8"], answer: "4" },
      { label: "Convergence", options: ["0.58", "0.77", "0.83", "0.65"], answer: "0.58" },
    ],
    explanation:
      "The 3-step run did not reach the goal, so it cannot define the optimal path: optimal is 4. Scores are 4/4 = 1, 4/5 = 0.8, 4/8 = 0.5 and 0 for the failed run. (1 + 0.8 + 0.5 + 0) / 4 = 0.575 ≈ 0.58. Averaging only the successful runs (0.77) would hide the reliability problem; letting the failed short run set the optimum would reward skipping steps.",
    lessonAnchor: "trace-level-the-decision-path",
  },
  {
    id: "ev-agent-which-level",
    lectures: [22],
    tags: ["eval-levels"],
    type: "mcq",
    prompt:
      "A user asks your trip planner for flights to San Francisco and gets a list of Los Angeles hotels. Your router-correctness and per-tool span evals all passed on this trace: each tool call was well formed and returned valid results. Which eval should have caught it?",
    options: [
      "A trace-level decision path (trajectory) eval",
      "A stricter JSON schema check on tool arguments",
      "A session-level tone consistency eval",
      "A higher temperature on the router to explore more tools",
    ],
    answer: "A trace-level decision path (trajectory) eval",
    explanation:
      "Span evals check single units of work, and each unit can look fine while the overall route is wrong. The decision path eval looks at the whole run and asks whether this sequence of steps answers this request. Schema checks catch malformed calls, not wrong journeys, and tone is a session concern.",
    lessonAnchor: "trace-level-the-decision-path",
  },
  {
    id: "ev-agent-weakest-tool",
    lectures: [22],
    tags: ["tool-evals"],
    type: "scenario",
    prompt:
      "Your travel agent's span evals show a 91% overall tool pass rate across 2,000 tool calls. Users still complain that bookings fail. Grouped by tool: search_flights 97%, filter_price 95%, send_confirmation 99%, book_flight 62%.",
    fields: [
      {
        label: "What the aggregate hid",
        options: [
          "One tool fails often and caps the whole agent",
          "The judge is too strict on every tool",
          "The router picks the wrong tool most of the time",
          "Nothing: 91% is good enough to ship",
        ],
        answer: "One tool fails often and caps the whole agent",
      },
      {
        label: "Next step",
        options: [
          "Read failing book_flight spans and write a check specific to that tool",
          "Raise the overall pass-rate threshold to 95%",
          "Replace the router model",
          "Add a session-level tone judge",
        ],
        answer: "Read failing book_flight spans and write a check specific to that tool",
      },
    ],
    explanation:
      "An agent is only as strong as its weakest tool, and booking is on the critical path of every successful trip. The overall number averages it away. Track each tool with its own criteria, then do error analysis on the failing tool's spans to find out why it fails.",
    lessonAnchor: "span-level-router-and-tools",
  },
  {
    id: "ev-agent-session-memory",
    lectures: [22],
    tags: ["session-evals"],
    type: "mcq",
    prompt:
      "Your support agent's per-turn relevance judge passes 96% of turns, yet long conversations get poor ratings. Users say the agent asks for their order number again late in the chat. What is the best eval to add?",
    options: [
      "A session-level memory judge (did it re-ask for information already given?), with results sliced by turn number",
      "More per-turn relevance checks with a stronger judge model",
      "A router-correctness eval on the first turn",
      "An exact-match trajectory eval on each turn",
    ],
    answer:
      "A session-level memory judge (did it re-ask for information already given?), with results sliced by turn number",
    explanation:
      "Repeated questions are a context or memory failure that only shows across turns, so a per-turn judge can't see it. Slicing by turn position shows where it starts (for example fine through turn 5, forgetting from turn 6), which points at context management.",
    lessonAnchor: "session-level-the-whole-conversation",
  },
  {
    id: "ev-agent-explanation-vs-annotation",
    lectures: [22],
    tags: ["prompt-learning"],
    type: "mcq",
    prompt:
      "You are preparing a batch of failed traces for a prompt-learning optimizer. Which description of the two text fields is correct?",
    options: [
      "The explanation comes from the LLM judge and says why it gave the label; the annotation comes from a human and says what was wrong or what the right answer is",
      "The explanation comes from a human expert; the annotation is the judge's label",
      "Both come from the LLM judge, at different temperatures",
      "The annotation is the agent's own reasoning trace; the explanation is the final answer",
    ],
    answer:
      "The explanation comes from the LLM judge and says why it gave the label; the annotation comes from a human and says what was wrong or what the right answer is",
    explanation:
      "Explanations are cheap because the judge writes them alongside its label, so they are the minimum. Annotations carry human context (often the reference output) and add the most value. Ideally the optimizer gets both.",
    lessonAnchor: "from-evals-to-better-prompts-prompt-learning",
  },
  {
    id: "ev-agent-dspy-difference",
    lectures: [22],
    tags: ["prompt-learning"],
    type: "mcq",
    prompt: "What is the main difference between a metric-driven optimizer like DSPy's MIPRO and the prompt-learning approach described in the talk?",
    options: [
      "Prompt learning feeds the optimizer LLM textual feedback (explanations and annotations), not just a numeric score",
      "Prompt learning needs no evals at all",
      "DSPy can only optimize few-shot examples, never instructions",
      "Prompt learning fine-tunes model weights instead of changing the prompt",
    ],
    answer: "Prompt learning feeds the optimizer LLM textual feedback (explanations and annotations), not just a numeric score",
    explanation:
      "DSPy searches over instructions and examples to maximize a metric you define. A bare score says little about what went wrong and needs many data points. Giving the LLM the reasons in text, its own modality, is the bet behind prompt learning. Both still depend on evals you trust.",
    lessonAnchor: "from-evals-to-better-prompts-prompt-learning",
  },
  {
    id: "ev-agent-co-evolving-loops",
    lectures: [22],
    tags: ["prompt-learning", "feedback-loop"],
    type: "order",
    prompt: "Put the steps of the feedback loop from the talk in order.",
    steps: [
      "Collect production traces",
      "Run evals on them, online or in batch",
      "Queue the failures for human annotation",
      "Optimize the agent prompt from failures, explanations and annotations",
      "Test the new prompt as an experiment against your dataset and evals",
    ],
    explanation:
      "Evals turn traces into labeled failures, humans add annotations, the optimizer rewrites the prompt, and you check the new prompt before shipping. In parallel the same annotations are used to improve the eval prompts, because the agent loop is only as good as the judges steering it.",
    lessonAnchor: "two-co-evolving-loops",
  },
  {
    id: "ev-agent-bad-judge-optimizer",
    lectures: [22],
    tags: ["feedback-loop"],
    type: "mcq",
    prompt:
      "Your team grabbed an off-the-shelf hallucination judge, never checked it against human labels, and ran prompt learning on its failures. The optimized prompt scores much better on that judge, but experts say answers got worse. What went wrong?",
    options: [
      "The agent loop ran without the eval loop: an unaligned judge steered the optimizer toward the wrong target",
      "Prompt learning only works with numeric metrics",
      "They needed more few-shot examples in the meta-prompt",
      "Hallucination should be evaluated at the session level only",
    ],
    answer: "The agent loop ran without the eval loop: an unaligned judge steered the optimizer toward the wrong target",
    explanation:
      "Optimizing against a judge you haven't validated teaches the agent to please the judge. Align the judge with human labels first, and keep improving it with annotations, so the two loops evolve together.",
    lessonAnchor: "two-co-evolving-loops",
  },
];
