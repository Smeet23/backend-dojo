"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Op = { kind: "ins"; pos: number; ch: string } | { kind: "del"; pos: number; len: number };

type Case = { label: string; doc: string; a: Op; b: Op };

const CASES: Case[] = [
  { label: "Insert vs insert, same spot", doc: "abcde", a: { kind: "ins", pos: 2, ch: "X" }, b: { kind: "ins", pos: 2, ch: "Y" } },
  { label: "Delete, then insert later", doc: "abcde", a: { kind: "del", pos: 1, len: 1 }, b: { kind: "ins", pos: 3, ch: "X" } },
  { label: "Insert, then delete later", doc: "abcde", a: { kind: "ins", pos: 2, ch: "X" }, b: { kind: "del", pos: 3, len: 1 } },
  { label: "Delete vs delete", doc: "abcde", a: { kind: "del", pos: 1, len: 1 }, b: { kind: "del", pos: 3, len: 1 } },
  { label: "Both delete the same char", doc: "abcde", a: { kind: "del", pos: 2, len: 1 }, b: { kind: "del", pos: 2, len: 1 } },
  { label: "Range delete, insert after it", doc: "abcdefg", a: { kind: "del", pos: 2, len: 3 }, b: { kind: "ins", pos: 6, ch: "X" } },
  { label: "Range delete, insert inside it", doc: "abcdefg", a: { kind: "del", pos: 2, len: 3 }, b: { kind: "ins", pos: 3, ch: "X" } },
];

function show(op: Op): string {
  return op.kind === "ins" ? `insert "${op.ch}" @${op.pos}` : `delete ${op.len} @${op.pos}`;
}
function showAll(ops: Op[]): string {
  return ops.length ? ops.map(show).join(", then ") : "no-op (already done)";
}

function apply(doc: string, ops: Op[]): string {
  let d = doc;
  for (const op of ops) {
    const p = Math.min(Math.max(op.pos, 0), d.length);
    d = op.kind === "ins" ? d.slice(0, p) + op.ch + d.slice(p) : d.slice(0, p) + d.slice(p + op.len);
  }
  return d;
}

/** Rewrite `op` so it means the same thing on a document where `against` already ran. */
function transform(op: Op, against: Op, opWinsTies: boolean): Op[] {
  if (op.kind === "ins" && against.kind === "ins") {
    const shift = against.pos < op.pos || (against.pos === op.pos && !opWinsTies);
    return [{ ...op, pos: shift ? op.pos + 1 : op.pos }];
  }
  if (op.kind === "ins" && against.kind === "del") {
    const end = against.pos + against.len;
    if (op.pos <= against.pos) return [op];
    if (op.pos >= end) return [{ ...op, pos: op.pos - against.len }];
    return [{ ...op, pos: against.pos }]; // landed inside the deleted range: snap to its start
  }
  if (op.kind === "del" && against.kind === "ins") {
    const q = against.pos;
    if (q <= op.pos) return [{ ...op, pos: op.pos + 1 }];
    if (q >= op.pos + op.len) return [op];
    // An insert landed inside our range: delete around it, keep the new character.
    const before = q - op.pos;
    return [
      { kind: "del", pos: op.pos, len: before },
      { kind: "del", pos: op.pos + 1, len: op.len - before },
    ];
  }
  if (op.kind === "del" && against.kind === "del") {
    // Keep only the characters the other delete did not already remove, re-indexed.
    const kept: number[] = [];
    for (let i = op.pos; i < op.pos + op.len; i++) {
      if (i >= against.pos && i < against.pos + against.len) continue;
      kept.push(i < against.pos ? i : i - against.len);
    }
    return kept.length ? [{ kind: "del", pos: kept[0], len: kept.length }] : [];
  }
  return [op];
}

export function SdOtConflictLab() {
  const [caseIdx, setCaseIdx] = useState(0);
  const [aFirst, setAFirst] = useState(true);
  const [ot, setOt] = useState(true);

  const c = CASES[caseIdx];
  const first = aFirst ? { who: "A", op: c.a } : { who: "B", op: c.b };
  const second = aFirst ? { who: "B", op: c.b } : { who: "A", op: c.a };

  // Server: applies the first arrival as-is, transforms the second against it.
  const secondOnServer = ot ? transform(second.op, first.op, false) : [second.op];
  const server = apply(apply(c.doc, [first.op]), secondOnServer);
  // The first author already has its own op; it just applies what the server broadcasts.
  const firstClient = server;
  // The second author typed optimistically, so it must transform the incoming op against its own.
  const firstOnSecondClient = ot ? transform(first.op, second.op, true) : [first.op];
  const secondClient = apply(apply(c.doc, [second.op]), firstOnSecondClient);
  const docs = aFirst ? { A: firstClient, B: secondClient } : { A: secondClient, B: firstClient };
  const converged = docs.A === server && docs.B === server;

  const card = (title: string, lines: string[], doc: string, tone: string) => (
    <div className={`min-w-0 rounded-lg border p-2 ${tone}`}>
      <p className="text-xs font-semibold">{title}</p>
      {lines.map((l) => (
        <p key={l} className="font-mono text-[0.7rem] text-muted break-words">{l}</p>
      ))}
      <p className="mt-1 font-mono text-lg tracking-widest break-all">{doc}</p>
    </div>
  );

  return (
    <Widget title="Two people, one document" hint="Users A and B edit the same version at the same moment. The server orders them, transforms the late one, and broadcasts. Turn OT off to watch the copies drift apart.">
      <div className="flex flex-wrap gap-2">
        {CASES.map((x, i) => (
          <Pill key={x.label} active={caseIdx === i} onClick={() => setCaseIdx(i)}>
            {x.label}
          </Pill>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Pill active={aFirst} onClick={() => setAFirst(true)}>A arrives first</Pill>
        <Pill active={!aFirst} onClick={() => setAFirst(false)}>B arrives first</Pill>
        <Pill active={ot} onClick={() => setOt((v) => !v)}>OT: {ot ? "on" : "off"}</Pill>
      </div>

      <div className="mt-3 rounded-lg bg-surface-2 p-2 font-mono text-xs break-words">
        <p>v0: <span className="tracking-widest">{c.doc}</span></p>
        <p>A sends: {show(c.a)} (base v0)</p>
        <p>B sends: {show(c.b)} (base v0)</p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {card(
          "Server",
          [`v1 ← ${first.who}: ${show(first.op)}`, `v2 ← ${second.who}: ${showAll(secondOnServer)}`],
          server,
          "border-accent bg-accent-soft",
        )}
        {card(
          `Client ${first.who} (arrived first)`,
          [`local: ${show(first.op)}`, `gets: ${showAll(secondOnServer)}`],
          firstClient,
          firstClient === server ? "border-border" : "border-bad bg-bad-soft",
        )}
        {card(
          `Client ${second.who} (typed optimistically)`,
          [`local: ${show(second.op)}`, `gets: ${showAll(firstOnSecondClient)}`],
          secondClient,
          secondClient === server ? "border-border" : "border-bad bg-bad-soft",
        )}
      </div>

      <p className={`mt-3 rounded-lg p-2 text-sm ${converged ? "bg-good-soft" : "bg-bad-soft"}`}>
        {converged
          ? "Converged: every copy shows the same text, and each edit kept its intent."
          : "Diverged: the copies disagree, and nothing will ever fix it. Positions were applied to a document they were not computed for."}
      </p>
    </Widget>
  );
}
