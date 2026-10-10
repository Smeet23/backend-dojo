import type { Metadata } from "next";
import { allQuestions } from "@/content/registry";
import { MixedPractice } from "./MixedPractice";

export const metadata: Metadata = { title: "Mixed practice · Backend Dojo" };

export default function PracticePage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Mixed practice</h1>
      <p className="mt-2 text-muted">
        Up to 10 scenarios from every lecture you&apos;ve finished. Questions you&apos;ve missed show up more often until you get them right.
      </p>
      <div className="mt-6">
        <MixedPractice pool={allQuestions} />
      </div>
    </div>
  );
}
