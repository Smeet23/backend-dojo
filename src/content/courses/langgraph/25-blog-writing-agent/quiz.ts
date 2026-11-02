import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "lg-blog-dynamic-workers",
    lectures: [25],
    tags: ["send", "orchestrator-worker"],
    type: "scenario",
    prompt:
      "Your planner node returns a Plan whose number of sections varies between 4 and 8 depending on the topic. You want one writer run per section, all in parallel.\nHow do you wire it?",
    fields: [
      {
        label: "Fan-out mechanism",
        options: [
          "Add 8 static edges to 8 writer nodes",
          "A conditional-edge function returning one Send per task",
          "A loop inside the planner node calling the LLM per section",
          "A conditional edge that returns the string \"worker\"",
        ],
        answer: "A conditional-edge function returning one Send per task",
      },
      {
        label: "What each worker receives as input",
        options: ["The Send payload (its task plus the plan)", "The full graph state only", "Nothing; it reads a global variable", "The previous worker's output"],
        answer: "The Send payload (its task plus the plan)",
      },
    ],
    explanation:
      "Send lets a routing function schedule N runs of a node, with N decided at run time, each with its own private payload. Static edges fix the count at compile time, and a loop inside one node gives up parallelism and per-section visibility in the graph.",
    lessonAnchor: "fanning-out-with-send",
  },
  {
    id: "lg-blog-invalid-update",
    lectures: [25],
    tags: ["reducers", "send"],
    type: "scenario",
    prompt:
      "You fan out six writer runs with Send. Each returns {\"sections\": [text]}. The state declares `sections: list[str]`. The run crashes as soon as the writers finish.\nWhat happened and what's the fix?",
    fields: [
      {
        label: "Error",
        options: ["InvalidUpdateError: several writes to one key in a step", "GraphRecursionError", "A Pydantic validation error", "KeyError: 'sections'"],
        answer: "InvalidUpdateError: several writes to one key in a step",
      },
      {
        label: "Fix",
        options: [
          "Annotate sections with operator.add",
          "Raise the recursion limit",
          "Run the writers sequentially",
          "Return a string instead of a list",
        ],
        answer: "Annotate sections with operator.add",
      },
    ],
    explanation:
      "A key without a reducer can take one value per superstep, so six concurrent writes are rejected. Annotated[list[str], operator.add] concatenates every writer's list. Running sequentially would also work but throws away the parallelism.",
    lessonAnchor: "state-and-the-sections-reducer",
  },
  {
    id: "lg-blog-section-order",
    lectures: [25],
    tags: ["reducers", "failure-modes"],
    type: "mcq",
    prompt:
      "Most of the time your blogs come out in plan order, but occasionally the conclusion appears third. The assembler does \"\\n\\n\".join(state[\"sections\"]). What's the robust fix?",
    options: [
      "Have each worker return (task_id, text) and sort by task_id when assembling",
      "Add time.sleep(task.id) in each worker so they finish in order",
      "Lower the model temperature",
      "Switch the reducer from operator.add to a plain overwrite",
    ],
    answer: "Have each worker return (task_id, text) and sort by task_id when assembling",
    explanation:
      "LangGraph doesn't guarantee the order in which parallel updates are applied to a reducer key. Carrying the id and sorting makes assembly independent of timing. Sleeping is fragile and slow, and an overwrite would lose sections.",
    lessonAnchor: "assembling-the-blog",
  },
  {
    id: "lg-blog-assemble-runs-once",
    lectures: [25],
    tags: ["supersteps", "send"],
    type: "mcq",
    prompt:
      "There is a single edge worker → assemble, and the orchestrator fanned out 7 workers. How many times does assemble run, and when?",
    options: [
      "Once, after all 7 workers have finished",
      "7 times, once per worker as each finishes",
      "Once, as soon as the first worker finishes",
      "Never, unless you add 7 edges",
    ],
    answer: "Once, after all 7 workers have finished",
    explanation:
      "All Sends run in the same superstep, and the next superstep starts only when every task in the current one is done. assemble then sees all seven sections already merged by the reducer.",
    lessonAnchor: "wiring-the-graph",
  },
  {
    id: "lg-blog-thread-reuse",
    lectures: [25],
    tags: ["checkpointer", "reducers"],
    type: "scenario",
    prompt:
      "You add InMemorySaver to the blog agent and your UI always uses thread_id=\"user-42\". The second blog a user generates contains sections from their first blog.\nWhy, and what's the cleanest fix?",
    fields: [
      {
        label: "Cause",
        options: [
          "operator.add keeps appending to the sections already saved on that thread",
          "The checkpointer caches LLM responses",
          "Send reuses old payloads",
          "The planner remembers previous topics",
        ],
        answer: "operator.add keeps appending to the sections already saved on that thread",
      },
      {
        label: "Fix",
        options: ["Use a new thread_id per blog", "Remove the checkpointer's thread_id", "Set temperature to 0", "Call compile() before every run"],
        answer: "Use a new thread_id per blog",
      },
    ],
    explanation:
      "Accumulating reducers keep everything for the life of a thread. One thread per article is the natural model; a resettable reducer is the alternative if you must reuse the thread.",
    lessonAnchor: "a-trap-when-you-add-memory",
  },
  {
    id: "lg-blog-router-mode",
    lectures: [25],
    tags: ["routing", "research"],
    type: "scenario",
    prompt:
      "Classify each topic the way the research router should.",
    fields: [
      { label: "\"How gradient descent works\"", options: ["closed_book", "hybrid", "open_book"], answer: "closed_book" },
      { label: "\"Vector databases explained, with today's popular options\"", options: ["closed_book", "hybrid", "open_book"], answer: "hybrid" },
      { label: "\"What shipped in AI this week\"", options: ["closed_book", "hybrid", "open_book"], answer: "open_book" },
    ],
    explanation:
      "Closed book is evergreen and needs no search. Hybrid is conceptual but needs current examples or tools. Open book is volatile, and recent facts are the whole point, so the time constraint should also appear in the queries.",
    lessonAnchor: "the-router-and-its-three-modes",
  },
  {
    id: "lg-blog-fake-citations",
    lectures: [25],
    tags: ["research", "failure-modes"],
    type: "mcq",
    prompt:
      "Reviewers find that some sections cite official-looking URLs that don't exist. Workers were given the evidence pack and told to cite. What's the best safeguard?",
    options: [
      "Allow citations only to evidence URLs, and check the links in code before saving",
      "Ask the worker to double-check its links",
      "Increase max_results so there are more URLs to choose from",
      "Remove the evidence from the worker prompt",
    ],
    answer: "Allow citations only to evidence URLs, and check the links in code before saving",
    explanation:
      "A set difference between the links used and the evidence URLs catches invented sources for free. Asking the model to self-check is unreliable, and more results don't stop invention.",
    lessonAnchor: "workers-that-cite",
  },
  {
    id: "lg-blog-dedupe-in-code",
    lectures: [25],
    tags: ["research"],
    type: "mcq",
    prompt:
      "The research synthesizer prompt already says \"deduplicate by URL\", yet the evidence pack sometimes has the same article twice. What should you do?",
    options: [
      "Also de-duplicate by URL in Python after the model returns",
      "Repeat the instruction in capital letters",
      "Use a bigger model for the synthesizer",
      "Drop the synthesizer and pass raw results to the planner",
    ],
    answer: "Also de-duplicate by URL in Python after the model returns",
    explanation:
      "Let the model do the fuzzy work (relevance, trimming) and enforce deterministic rules in code, which is free and never forgets. Raw results would push noise and duplicates into planning.",
    lessonAnchor: "the-research-node",
  },
  {
    id: "lg-blog-image-placeholders",
    lectures: [25],
    tags: ["images", "subgraphs", "failure-modes"],
    type: "scenario",
    prompt:
      "Your decide_images node asks the model to return the entire 3,000-word article with [[IMAGE_n]] placeholders inserted. Readers notice paragraphs that differ from what the workers wrote.\nWhat's going on and how do you redesign it?",
    fields: [
      {
        label: "Cause",
        options: [
          "Re-emitting the whole article lets the model shorten or reword it",
          "The image model edits the Markdown",
          "The subgraph has a different state schema",
          "Placeholders break Markdown rendering",
        ],
        answer: "Re-emitting the whole article lets the model shorten or reword it",
      },
      {
        label: "Redesign",
        options: [
          "Model returns the heading each image goes under; code inserts the placeholder",
          "Ask the model to be careful not to change text",
          "Generate images inside each worker instead",
          "Lower max tokens",
        ],
        answer: "Model returns the heading each image goes under; code inserts the placeholder",
      },
    ],
    explanation:
      "Keep the article text out of the model's output path. The model makes the decision (where and what), and code performs the edit deterministically.",
    lessonAnchor: "deciding-where-images-go",
  },
  {
    id: "lg-blog-image-failure",
    lectures: [25],
    tags: ["images", "failure-modes"],
    type: "mcq",
    prompt:
      "Occasionally the image API times out and the whole run fails, losing seven finished sections. What's the right change in generate_and_place?",
    options: [
      "Catch errors per image, drop that placeholder, and still save the post",
      "Retry the whole graph from START",
      "Generate images before planning",
      "Move image generation into the router",
    ],
    answer: "Catch errors per image, drop that placeholder, and still save the post",
    explanation:
      "A missing diagram is a small loss; a crashed run is a big one. Late, optional steps should degrade gracefully instead of failing the graph.",
    lessonAnchor: "generating-and-placing-images",
  },
  {
    id: "lg-blog-ui-progress",
    lectures: [25],
    tags: ["streaming", "ui"],
    type: "scenario",
    prompt:
      "Your Streamlit app calls app.invoke(...) and users stare at a spinner for 70 seconds. You want to show each node finishing, plus the plan as soon as it exists.",
    fields: [
      { label: "Call", options: ["app.stream(...)", "app.invoke(...) in a thread", "app.get_state(...)", "app.batch(...)"], answer: "app.stream(...)" },
      { label: "stream_mode", options: ["updates", "messages", "debug", "custom"], answer: "updates" },
    ],
    explanation:
      "stream_mode=\"updates\" yields after every node with just that node's update, so you can print \"orchestrator done\" and render the plan right away. \"messages\" streams LLM tokens, which is a different need.",
    lessonAnchor: "stage-four-a-user-interface",
  },
  {
    id: "lg-blog-build-order",
    lectures: [25],
    tags: ["orchestrator-worker"],
    type: "order",
    prompt: "Put one run of the full blog agent (with research and images) in execution order.",
    steps: [
      "Router decides the topic needs research and writes queries",
      "Research node searches and builds the evidence pack",
      "Orchestrator produces the plan using the evidence",
      "fan_out returns one Send per task and the workers write in parallel",
      "Assembly merges sections in task order",
      "Images are planned, generated and placed, and the file is saved",
    ],
    explanation:
      "Routing comes first so research only happens when needed; the planner benefits from evidence; workers run in one superstep; assembly is a subgraph that merges, then handles images.",
    lessonAnchor: "the-project-at-a-glance",
  },
];
