"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const KINDS = ["Dummy", "Stub", "Spy", "Mock", "Fake", "Real dependency"] as const;
type Kind = (typeof KINDS)[number];

type Case = { situation: string; answer: Kind; why: string };

const CASES: Case[] = [
  {
    situation:
      "new OrderService(repo, logger) requires a logger. Your test checks the order total and never looks at log output.",
    answer: "Dummy",
    why: "The logger only exists to satisfy the constructor. Nothing reads it, so a no-op object is enough.",
  },
  {
    situation:
      "Checkout converts prices with an exchange-rate client. Your test checks the final total in euros, so it needs the rate to always be 0.9.",
    answer: "Stub",
    why: "You need a canned answer and you don't care how often it is asked. A stub returns 0.9 every time.",
  },
  {
    situation:
      "After signup runs, your test inspects the list of emails the mailer was asked to send and asserts there is exactly one, to the new user.",
    answer: "Spy",
    why: "A spy behaves like a stub but records its calls, so the test can look at them afterwards.",
  },
  {
    situation:
      "Before running the code, you configure the double: save() must be called exactly once with order 42. The double itself fails the test if that doesn't happen.",
    answer: "Mock",
    why: "Expectations set up front and verified by the double is what makes it a mock, rather than a spy you inspect afterwards.",
  },
  {
    situation:
      "Twenty service tests create users and then read them back. You want something that behaves like the user repository but keeps rows in a Map.",
    answer: "Fake",
    why: "A fake is a working, simplified implementation. Writes are really stored, so reads see them.",
  },
  {
    situation:
      "You're testing that inserting two customers with the same email fails because of the UNIQUE constraint in your migration.",
    answer: "Real dependency",
    why: "The behaviour you're testing lives in the database itself. Any double would only echo your own assumption, so use a real Postgres.",
  },
];

export function TestDoublePicker() {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<(Kind | null)[]>(() => CASES.map(() => null));

  const c = CASES[i];
  const choice = picked[i];
  const score = picked.filter((p, k) => p === CASES[k].answer).length;
  const answered = picked.filter((p) => p !== null).length;

  function pick(k: Kind) {
    setPicked((prev) => prev.map((p, idx) => (idx === i ? k : p)));
  }

  return (
    <Widget title="Test double picker" hint="Read each situation and choose the double you'd reach for.">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {CASES.map((_, k) => {
          const p = picked[k];
          const tone = p === null ? "" : p === CASES[k].answer ? "border-good bg-good-soft" : "border-bad bg-bad-soft";
          return (
            <button
              key={k}
              type="button"
              onClick={() => setI(k)}
              aria-label={`Situation ${k + 1}`}
              className={`min-h-10 min-w-10 rounded-lg border px-2 ${k === i ? "border-accent font-semibold text-accent" : "border-border"} ${tone}`}
            >
              {k + 1}
            </button>
          );
        })}
        <span className="ml-auto text-muted">
          {score}/{CASES.length} right · {answered} answered
        </span>
      </div>

      <p className="mt-4 rounded-lg bg-surface-2 px-3 py-3 text-sm leading-6">{c.situation}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <Pill key={k} active={choice === k} onClick={() => pick(k)}>
            {k}
          </Pill>
        ))}
      </div>

      {choice && (
        <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${choice === c.answer ? "bg-good-soft" : "bg-bad-soft"}`}>
          <strong>{choice === c.answer ? "Right." : `Not quite, it's a ${c.answer.toLowerCase()}.`}</strong> {c.why}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setI((i + CASES.length - 1) % CASES.length)}
          className="min-h-10 rounded-lg border border-border px-4 text-sm"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => setI((i + 1) % CASES.length)}
          className="min-h-10 flex-1 rounded-lg bg-accent px-4 text-sm font-medium text-white dark:text-bg"
        >
          Next situation
        </button>
      </div>
    </Widget>
  );
}
