import type { Question } from "@/lib/types";

const WHEN = ["Inspecting this step's output", "Only the final score", "Neither would show it"];

export const quiz: Question[] = [
  {
    id: "ev-solve-where-caught",
    lectures: [24],
    tags: ["small-steps", "inspection"],
    type: "scenario",
    prompt:
      "You are building a multiple-choice eval (photo plus five species options) and have planted bugs along the way. For each, what would reveal it?",
    fields: [
      {
        label: "Distractors are sampled with random.choices, so some questions list the same wrong species twice",
        options: WHEN,
        answer: "Inspecting this step's output",
      },
      {
        label: "The correct species is sometimes drawn as one of its own distractors",
        options: WHEN,
        answer: "Inspecting this step's output",
      },
      {
        label: "The answer check is case-sensitive, so \"ghost pipe\" is scored wrong against \"Ghost pipe\"",
        options: WHEN,
        answer: "Inspecting this step's output",
      },
    ],
    explanation:
      "None of these crash, and each nudges the score up or down by a few points, so the final accuracy still looks plausible. Printing the distractor list, the built prompt, or the parsed answer next to the key shows each one immediately, at the step where it was introduced.",
    lessonAnchor: "worked-demo-an-eval-for-species-identification",
  },
  {
    id: "ev-solve-one-example",
    lectures: [24],
    tags: ["small-steps"],
    type: "mcq",
    prompt:
      "You have 20,000 support tickets to run through a new extraction pipeline. A teammate says the look-at-every-output rule cannot apply at this scale. What does the method actually recommend?",
    options: [
      "Take one ticket, run each step on it in its own cell and check every output, then wrap the working lines into a function and try it on several more before the full set",
      "Run the full set and ask an LLM to summarize anything unusual in the outputs",
      "Skip inspection and rely on unit tests written after the pipeline is complete",
      "Sample 1,000 tickets and only inspect the final aggregated metrics",
    ],
    answer:
      "Take one ticket, run each step on it in its own cell and check every output, then wrap the working lines into a function and try it on several more before the full set",
    explanation:
      "Jeremy's pattern is `x = sample[0]`, then line by line on x with every result shown. Once those few lines work, merge them into a function and test it on other examples. Scale comes last, after you trust each step.",
    lessonAnchor: "small-steps-and-look-at-every-output",
  },
  {
    id: "ev-solve-edit-not-scold",
    lectures: [24],
    tags: ["steering", "autoregressive"],
    type: "mcq",
    prompt:
      "The assistant keeps writing verbose, dictionary-heavy request code. You have told it three times, with growing frustration, to be concise, and it keeps doing it. What does the talk suggest?",
    options: [
      "Edit one of its earlier responses so it contains the concise code you want, then re-run the prompt",
      "Add a fourth, firmer message listing every way the previous answers were wrong",
      "Switch to a reasoning mode with a larger thinking budget",
      "Start a fresh dialogue with no examples so it has no bad habits to copy",
    ],
    answer: "Edit one of its earlier responses so it contains the concise code you want, then re-run the prompt",
    explanation:
      "Models are autoregressive: the model's own previous turns are the strongest example of what its next turn should look like. A transcript full of mistakes and complaints makes another mistake the likely continuation. Editing a response into the pattern you want makes good behavior the pattern to follow. A fresh dialogue throws away useful context and still has no example of your style.",
    lessonAnchor: "steering-the-model-edit-dont-scold",
  },
  {
    id: "ev-solve-polya-order",
    lectures: [24],
    tags: ["polya", "method"],
    type: "order",
    prompt: "Put the problem-solving loop from the talk in order, as you would use it with an AI collaborator.",
    steps: [
      "Read the problem yourself and restate it in your own words",
      "Ask the AI whether your restatement missed anything",
      "Come up with several strategies, then ask the AI for more",
      "Carry out the chosen strategy one small, checked step at a time",
      "Look back at what worked and what to reuse next time",
    ],
    explanation:
      "Polya's four steps (understand, plan, carry out, look back) with the human going first at each one and the AI as a checker. Looking back is the step most people skip, and it is what makes the work compound.",
    lessonAnchor: "polyas-loop-at-every-scale",
  },
  {
    id: "ev-solve-unfamiliar-api",
    lectures: [24],
    tags: ["read-the-docs"],
    type: "scenario",
    prompt: "The AI hands you code for your eval harness. Decide what to do with each piece.",
    fields: [
      {
        label: "It calls a structured-output parameter in an LLM SDK you have never used",
        options: ["Stop, read its docs and try a few inputs first", "Run it and move on if it doesn't error"],
        answer: "Stop, read its docs and try a few inputs first",
      },
      {
        label: "It writes json.dump for a cache file, a function you use every week",
        options: ["Stop, read its docs and try a few inputs first", "Run it and move on if it doesn't error"],
        answer: "Run it and move on if it doesn't error",
      },
      {
        label: "It proposes an rg command with flags you don't recognize to search API docs",
        options: ["Read the command and check the flags before running it", "Run it; search commands are harmless"],
        answer: "Read the command and check the flags before running it",
      },
    ],
    explanation:
      "The rule of thumb: whenever the AI shows you a function, library or API you are not familiar with, stop and learn it before moving on, because otherwise you cannot tell whether it is being used wrongly. Familiar boilerplate is fine to accept. In the talk, reading the AI's rg commands caught silly flags and taught Jeremy the useful -C option.",
    lessonAnchor: "read-what-the-ai-hands-you",
  },
  {
    id: "ev-solve-take-your-eval",
    lectures: [24],
    tags: ["human-baseline", "error-analysis"],
    type: "scenario",
    prompt:
      "Your species-ID eval reports 58% for a vision model. You build a quick quiz app and answer all 50 questions yourself. What does each observation tell you?",
    fields: [
      {
        label: "Two questions show the same species as two of the five options",
        options: ["The eval has a bug", "The model is weak", "The question lacks information"],
        answer: "The eval has a bug",
      },
      {
        label: "You could only answer one fish question because you remember it was in a fast stream; the photo doesn't show that",
        options: ["The eval has a bug", "The model is weak", "The question lacks information"],
        answer: "The question lacks information",
      },
      {
        label: "You get a clear, well-lit mushroom right instantly; the model picked a species from a different genus",
        options: ["The eval has a bug", "The model is weak", "The question lacks information"],
        answer: "The model is weak",
      },
    ],
    explanation:
      "Taking your own eval checks items for bugs, gives a human baseline, and separates fair misses from unfair ones. Johno found that the model's misses were the genuinely hard questions, some only answerable with context outside the photo. That is error analysis applied to the eval itself.",
    lessonAnchor: "look-at-your-data-then-build-a-tool-to-look-faster",
  },
  {
    id: "ev-solve-shared-context",
    lectures: [24],
    tags: ["context"],
    type: "mcq",
    prompt:
      "You let the AI explore a large, badly documented API with search tools. It made eight tool calls and found what it needed. You now want it to help write the functions. What should you do first?",
    options: [
      "Ask it to write a detailed summary of everything it found into the dialogue",
      "Ask for the functions immediately while the results are fresh",
      "Paste the full API reference file into a note so nothing is lost",
      "Delete the tool calls to save context and restate the task",
    ],
    answer: "Ask it to write a detailed summary of everything it found into the dialogue",
    explanation:
      "Tool results are truncated or hidden in later context, so what the model 'learned' may not be visible to it next turn. A written summary puts the findings in the shared dialogue for both of you. Pasting the whole reference floods the context window, which the talk warns against.",
    lessonAnchor: "keep-shared-context-in-the-dialogue",
  },
  {
    id: "ev-solve-throwaway-tool",
    lectures: [24],
    tags: ["review-tools", "vibe-coding"],
    type: "scenario",
    prompt: "Where does the talk's advice put each task: work through it yourself in small steps, or let the AI generate most of it?",
    fields: [
      {
        label: "The scoring code that decides whether the model's answer matches the key",
        options: ["Small steps, understand every line", "Fine to let the AI generate most of it"],
        answer: "Small steps, understand every line",
      },
      {
        label: "A throwaway quiz page so you can take your own eval once",
        options: ["Small steps, understand every line", "Fine to let the AI generate most of it"],
        answer: "Fine to let the AI generate most of it",
      },
      {
        label: "A data-loading helper your team will build every future eval on",
        options: ["Small steps, understand every line", "Fine to let the AI generate most of it"],
        answer: "Small steps, understand every line",
      },
    ],
    explanation:
      "The eval itself and anything you will build on later are foundations: bugs there silently corrupt every number, and understanding them is what makes the next project faster. Johno leaned on the AI for his one-off quiz app because it was ancillary, and any bug in it would be visible the moment he used it.",
    lessonAnchor: "the-cost-of-handing-over-the-whole-task",
  },
];
