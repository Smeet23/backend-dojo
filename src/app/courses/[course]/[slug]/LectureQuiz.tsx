"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";
import { Quiz } from "@/components/quiz/Quiz";

type Props = { questions: Question[]; courseId: string; lectureId: number; lectureSlugs: Record<string, string> };

export function LectureQuiz({ questions, courseId, lectureId, lectureSlugs }: Props) {
  // Bumping the key remounts the quiz cleanly on restart.
  const [round, setRound] = useState(0);
  return (
    <Quiz
      key={round}
      questions={questions}
      courseId={courseId}
      lectureId={lectureId}
      lectureSlugs={lectureSlugs}
      title={`Lecture ${lectureId} quiz`}
      onRestart={() => setRound((r) => r + 1)}
    />
  );
}
