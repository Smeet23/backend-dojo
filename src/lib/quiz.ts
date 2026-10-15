import type { Question, Response } from "./types";

/** Score between 0 and 1. Scenario and order questions earn partial credit. */
export function grade(question: Question, response: Response): number {
  switch (question.type) {
    case "mcq":
      return response.type === "mcq" && response.value === question.answer ? 1 : 0;
    case "scenario": {
      if (response.type !== "scenario") return 0;
      const correct = question.fields.filter((f, i) => response.values[i] === f.answer).length;
      return correct / question.fields.length;
    }
    case "order": {
      if (response.type !== "order") return 0;
      const correct = question.steps.filter((s, i) => response.sequence[i] === s).length;
      return correct / question.steps.length;
    }
  }
}

/** Fisher–Yates shuffle; `random` is injectable for tests. */
export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Questions whose lectures are all completed. */
export function eligibleQuestions(pool: Question[], completed: Set<number>): Question[] {
  return pool.filter((q) => q.lectures.every((l) => completed.has(l)));
}

/**
 * Weighted sample without replacement: each past miss makes a question
 * three times more likely than one never missed (weight = 1 + 2 * misses).
 */
export function pickWeighted(
  pool: Question[],
  misses: Record<string, number>,
  count: number,
  random = Math.random,
): Question[] {
  const remaining = [...pool];
  const picked: Question[] = [];
  while (picked.length < count && remaining.length > 0) {
    const weights = remaining.map((q) => 1 + 2 * (misses[q.id] ?? 0));
    let roll = random() * weights.reduce((a, b) => a + b, 0);
    let index = 0;
    while (roll >= weights[index] && index < weights.length - 1) {
      roll -= weights[index];
      index++;
    }
    picked.push(remaining.splice(index, 1)[0]);
  }
  return picked;
}

/** The correct answer of a question, written out (for the AI grader and the answer-key panel). */
export function answerKey(q: Question): string {
  switch (q.type) {
    case "scenario":
      return q.fields.map((f) => `${f.label}: ${f.answer}`).join("\n");
    case "mcq":
      return q.answer;
    case "order":
      return q.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  }
}

/** The question as the learner sees it, including its choices. */
export function questionText(q: Question): string {
  switch (q.type) {
    case "scenario":
      return `${q.prompt}\n\n${q.fields.map((f) => `${f.label} — options: ${f.options.join(" | ")}`).join("\n")}`;
    case "mcq":
      return `${q.prompt}\n\nOptions:\n${q.options.map((o) => `- ${o}`).join("\n")}`;
    case "order":
      return `${q.prompt}\n\nSteps to put in order:\n${q.steps.map((s) => `- ${s}`).join("\n")}`;
  }
}

/** What the learner submitted, written out for reading. */
export function responseText(q: Question, r: Response): string {
  if (q.type === "scenario" && r.type === "scenario") return q.fields.map((f, i) => `${f.label}: ${r.values[i] || "(blank)"}`).join("\n");
  if (q.type === "mcq" && r.type === "mcq") return r.value;
  if (q.type === "order" && r.type === "order") return r.sequence.map((s, i) => `${i + 1}. ${s}`).join("\n");
  return "";
}
