import type { Metadata } from "next";
import { allQuestions } from "@/content/registry";
import { MixedPractice } from "./MixedPractice";

export const metadata: Metadata = { title: "Mixed practice · Backend Dojo" };

export default function PracticePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">Mixed practice</h1>
      <p className="mt-2 mb-6 text-muted-foreground">
        Up to 10 scenarios from every lecture you&apos;ve finished. Questions you&apos;ve missed come back more often until you get them right.
      </p>
      <MixedPractice pool={allQuestions} />
    </div>
  );
}
