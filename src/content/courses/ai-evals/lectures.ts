import type { Course, Lecture } from "@/lib/types";

export const course: Course = {
  id: "ai-evals",
  title: "AI Evals",
  summary: "Evaluating LLM applications: error analysis, LLM-as-judge, RAG and agent evals, CI/CD and monitoring, review interfaces and cost.",
  author: "Hamel Husain and Shreya Shankar",
  playlistUrl: "https://drive.google.com/drive/folders/1fr0vFxh66_a9u8aapNE8y_eS2HufgZS9",
  sourceKind: "course",
  private: true,
};

const drive = (id: string) => `https://drive.google.com/file/d/${id}/view`;

export const lectures: Lecture[] = [
  { id: 1, slug: "evals-fundamentals", title: "Evals fundamentals and the lifecycle", summary: "Why LLM apps need evals, the three gulfs, the analyze-measure-improve loop, and what a good prompt and a good metric look like.", videoUrl: drive("1iKxY-3ZhQU-BkGQGo2FEIryBIIm_UeYf"), minutes: 57, available: true },
  { id: 2, slug: "error-analysis", title: "Systematic error analysis", summary: "Build a starting dataset, read traces, open-code failures, group them with axial coding, and count what's actually broken.", videoUrl: drive("1ELSJXhz5us9b6P7s58Uq-kQXBU2mDS--"), minutes: 61, available: true },
  { id: 3, slug: "collaborative-evaluation", title: "Multi-turn traces and collaborative evaluation", summary: "Error analysis on conversations, benevolent dictators, rubrics, and measuring annotator agreement with Cohen's kappa.", videoUrl: drive("1NdQIfNpLlzA7onxMRTITBuiAwADyLJFV"), minutes: 60, available: true },
  { id: 4, slug: "automated-evaluators", title: "Automated evaluators", summary: "Choosing what to measure, code-based checks, writing LLM-as-judge prompts, and splitting labeled data to build a judge you can trust.", videoUrl: drive("1A6GwNKZSGgrQsalW2_YXPhMVWtXhjNMy"), minutes: 60, available: true },
  { id: 5, slug: "trusting-your-judge", title: "Trusting your judge", summary: "Refining a judge against human labels, TPR and TNR, correcting a biased judge's success rate, and confidence intervals.", videoUrl: drive("1MtuYcaSNzlpfi6nU9FB3XFA3zrVa7_vF"), minutes: 56, available: true },
  { id: 6, slug: "rag-and-agents", title: "Evaluating RAG, tools and agents", summary: "Retrieval metrics, synthetic queries, generation quality, tool calls, failure funnels and non-text inputs.", videoUrl: drive("1wcAe8mNVRK7p2ZgoNRy3sgJrp5I30wE2"), minutes: 59, available: true },
  { id: 7, slug: "ci-cd-and-monitoring", title: "CI, CD and online monitoring", summary: "Regression suites in CI, async evals and guardrails in production, and keeping your judges accurate over time.", videoUrl: drive("1wcAe8mNVRK7p2ZgoNRy3sgJrp5I30wE2"), minutes: 59, available: true },
  { id: 8, slug: "human-review-interfaces", title: "Interfaces for human review", summary: "Why custom review tools beat spreadsheets, what makes them fast, and how to pick which traces humans should read.", videoUrl: drive("13-HLlE5hhfwr2iqt0PyV0jq32hyR940l"), minutes: 59, available: true },
  { id: 9, slug: "improvement-and-cost", title: "Improving accuracy and cutting cost", summary: "Fixes from quick wins to structural changes, prompt caching, and model cascades tuned with logprobs.", videoUrl: drive("1T9aO2DnmKWGp4joWJulfGJeiJ0n9iEW7"), minutes: 63, available: false },
];
