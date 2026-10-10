import type { Metadata } from "next";
import { UnlockForm } from "./UnlockForm";

export const metadata: Metadata = { title: "Sync · Backend Dojo" };

export default function UnlockPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-semibold tracking-tight">Progress sync</h1>
      <p className="mt-2 text-muted">
        Enter your passcode once on each device. Your progress is then saved to the database and shared between your phone and laptop.
      </p>
      <div className="mt-6">
        <UnlockForm />
      </div>
    </div>
  );
}
