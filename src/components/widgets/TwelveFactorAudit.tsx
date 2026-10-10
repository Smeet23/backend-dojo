"use client";

import { useState } from "react";
import { Widget } from "./Widget";

const FACTORS = [
  "I. Codebase",
  "II. Dependencies",
  "III. Config",
  "IV. Backing services",
  "V. Build, release, run",
  "VI. Processes",
  "VII. Port binding",
  "VIII. Concurrency",
  "IX. Disposability",
  "X. Dev/prod parity",
  "XI. Logs",
  "XII. Admin processes",
];

type Finding = { text: string; answer: string; fix: string };

const FINDINGS: Finding[] = [
  {
    text: "The production database password lives in config/production.yml, committed to the repo.",
    answer: "III. Config",
    fix: "Move it out of code: env vars for ordinary config, a secret manager for secrets.",
  },
  {
    text: "Logged-in sessions are kept in an in-memory map, so the load balancer uses sticky sessions.",
    answer: "VI. Processes",
    fix: "Store sessions in Redis or Postgres so any process can serve any request.",
  },
  {
    text: "Thumbnails are made by calling whatever ImageMagick happens to be installed on the host.",
    answer: "II. Dependencies",
    fix: "Declare and pin the tool, typically by baking it into the container image.",
  },
  {
    text: "Urgent fixes are made by SSH-ing into the server and editing files in place.",
    answer: "V. Build, release, run",
    fix: "Code only enters at the build stage; ship a new immutable release instead.",
  },
  {
    text: "The app writes to /var/log/notes/app.log and rotates the file itself.",
    answer: "XI. Logs",
    fix: "Write events unbuffered to stdout and let the platform route them.",
  },
  {
    text: "Developers run SQLite locally; production runs Postgres.",
    answer: "X. Dev/prod parity",
    fix: "Run the same backing services everywhere; a Postgres container is one command.",
  },
  {
    text: "The API and the marketing site each keep a copy-pasted utils folder that drifts apart.",
    answer: "I. Codebase",
    fix: "Extract the shared code into a library consumed through the dependency manager.",
  },
  {
    text: "On SIGTERM, workers drop the job they're running, and the web process takes 90 seconds to boot.",
    answer: "IX. Disposability",
    fix: "Boot in seconds, drain on SIGTERM and return unfinished jobs to the queue.",
  },
  {
    text: "Data fixes are done by pasting SQL into a psql session on the production box.",
    answer: "XII. Admin processes",
    fix: "Commit the script and run it as a one-off process with the same code and config.",
  },
  {
    text: "The app is a WAR file dropped into a shared Tomcat that other teams also configure.",
    answer: "VII. Port binding",
    fix: "Bundle the HTTP server as a library and have the app bind its own port.",
  },
  {
    text: "Code calls smtp.internal:25 directly for email, hard-coded, while every other service comes from a URL in config.",
    answer: "IV. Backing services",
    fix: "Treat email like any attached resource: a handle in config, swappable without code changes.",
  },
  {
    text: "Web requests and video encoding run in one process type, so scaling web for lunch also scales encoders.",
    answer: "VIII. Concurrency",
    fix: "Split into web and worker process types and scale each independently.",
  },
];

export function TwelveFactorAudit() {
  const [picks, setPicks] = useState<string[]>(() => FINDINGS.map(() => ""));
  const [checked, setChecked] = useState(false);
  const score = picks.filter((p, i) => p === FINDINGS[i].answer).length;

  return (
    <Widget
      title="Twelve-factor audit"
      hint="You've inherited a notes SaaS. Each finding breaks exactly one factor. Diagnose them all, then check."
    >
      <ol className="space-y-3">
        {FINDINGS.map((f, i) => {
          const right = picks[i] === f.answer;
          const tone = !checked ? "border-border" : right ? "border-good bg-good-soft" : "border-bad bg-bad-soft";
          return (
            <li key={i} className={`rounded-lg border p-3 text-sm ${tone}`}>
              <p className="mb-2 leading-6">
                <span className="font-semibold text-muted">{i + 1}. </span>
                {f.text}
              </p>
              <select
                aria-label={`Factor violated by finding ${i + 1}`}
                value={picks[i]}
                onChange={(e) => {
                  const v = e.target.value;
                  setPicks((prev) => prev.map((p, k) => (k === i ? v : p)));
                }}
                className="min-h-10 w-full rounded-lg border border-border bg-surface px-2 sm:w-auto"
              >
                <option value="">Which factor?</option>
                {FACTORS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
              {checked && (
                <p className="mt-2 leading-6">
                  {right ? "Right. " : `It's ${f.answer}. `}
                  <span className="text-muted">{f.fix}</span>
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setChecked(true)}
          className="min-h-10 flex-1 rounded-lg bg-accent px-4 text-sm font-medium text-white dark:text-bg"
        >
          Check my audit
        </button>
        <button
          type="button"
          onClick={() => {
            setPicks(FINDINGS.map(() => ""));
            setChecked(false);
          }}
          className="min-h-10 rounded-lg border border-border px-4 text-sm"
        >
          Reset
        </button>
        {checked && (
          <span className="w-full text-sm font-semibold sm:w-auto">
            {score}/{FINDINGS.length} correct
          </span>
        )}
      </div>
    </Widget>
  );
}
