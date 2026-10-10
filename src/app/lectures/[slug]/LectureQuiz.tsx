"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";
import { Quiz } from "@/components/quiz/Quiz";

export function LectureQuiz({ questions, lectureId }: { questions: Question[]; lectureId: number }) {
  // Bumping the key remounts the quiz cleanly on restart.
  const [round, setRound] = useState(0);
  return (
    <Quiz
      key={round}
      questions={questions}
      lectureId={lectureId}
      title={`Lecture ${lectureId} quiz`}
      onRestart={() => setRound((r) => r + 1)}
    />
  );
}
