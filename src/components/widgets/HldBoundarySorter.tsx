"use client";

import { useState } from "react";
import { Widget } from "./Widget";

const SERVICES = ["Catalogue", "Orders", "Payments", "Inventory"] as const;
type Service = (typeof SERVICES)[number];

type Item = { text: string; answer: Service; why: string };

const ITEMS: Item[] = [
  { text: "Product titles, images and search attributes", answer: "Catalogue", why: "Describing products for browsing is the catalogue's model of a product." },
  { text: "Stock count per warehouse", answer: "Inventory", why: "Quantities change with every reservation and must be updated atomically in one place." },
  { text: "Reserve stock when an order is placed", answer: "Inventory", why: "Only the owner of stock data should change it. Orders asks; inventory decides." },
  { text: "Order state machine (placed, paid, shipped)", answer: "Orders", why: "The lifecycle of an order is the orders capability itself." },
  { text: "Refunds and payment provider webhooks", answer: "Payments", why: "Provider integrations and the money ledger belong together, inside a compliance boundary." },
  { text: "Product name stored on each order line", answer: "Orders", why: "A local copy taken at purchase time: the order must show what was bought even if the catalogue later renames it." },
  { text: "Captured amount and ledger entries", answer: "Payments", why: "Balance and ledger must be strongly consistent, so they live in one service's database." },
  { text: "Category tree and product descriptions", answer: "Catalogue", why: "Changes for merchandising reasons, driven by a different team from checkout." },
];

export function HldBoundarySorter() {
  const [picks, setPicks] = useState<Record<number, Service>>({});
  const [checked, setChecked] = useState(false);

  const score = ITEMS.filter((it, i) => picks[i] === it.answer).length;
  const done = Object.keys(picks).length === ITEMS.length;

  return (
    <Widget title="Draw the boundaries" hint="Assign each responsibility or piece of data to the service that should own it, then check.">
      <ul className="space-y-3">
        {ITEMS.map((it, i) => {
          const picked = picks[i];
          const right = picked === it.answer;
          return (
            <li key={it.text} className="rounded-lg border border-border bg-surface-2 p-3">
              <p className="text-sm font-medium">{it.text}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SERVICES.map((s) => {
                  const active = picked === s;
                  let cls = "border-border bg-surface";
                  if (active && !checked) cls = "border-accent bg-accent text-white dark:text-bg";
                  if (checked && active) cls = right ? "border-good bg-good-soft" : "border-bad bg-bad-soft";
                  if (checked && !active && s === it.answer) cls = "border-good bg-surface";
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setPicks((p) => ({ ...p, [i]: s }));
                        setChecked(false);
                      }}
                      className={`min-h-10 min-w-0 rounded-lg border px-2 text-sm ${cls}`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              {checked && picked && <p className={`mt-2 text-sm ${right ? "text-good" : "text-bad"}`}>{right ? "Right. " : `Owner: ${it.answer}. `}<span className="text-text">{it.why}</span></p>}
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!done}
          onClick={() => setChecked(true)}
          className="min-h-10 rounded-lg bg-accent px-4 text-sm text-white disabled:opacity-40 dark:text-bg"
        >
          Check
        </button>
        <button
          type="button"
          onClick={() => {
            setPicks({});
            setChecked(false);
          }}
          className="min-h-10 rounded-lg border border-border px-4 text-sm"
        >
          Reset
        </button>
        {checked && (
          <p className="text-sm">
            {score} of {ITEMS.length} correct.{" "}
            {score === ITEMS.length ? "Every piece of data has exactly one owner." : "Look for which team changes it and where it must be consistent."}
          </p>
        )}
        {!done && <p className="text-sm text-muted">{Object.keys(picks).length} of {ITEMS.length} assigned</p>}
      </div>
    </Widget>
  );
}
