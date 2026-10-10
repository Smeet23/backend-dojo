import type { Metadata } from "next";
import { UnlockForm } from "./UnlockForm";

export const metadata: Metadata = { title: "Sync · Backend Dojo" };

export default function UnlockPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-semibold tracking-tight">Progress sync</h1>
      <p className="mt-2 mb-6 text-muted-foreground">Your progress is saved to the database and shared between your phone and laptop.</p>
      <UnlockForm />
    </div>
  );
}
