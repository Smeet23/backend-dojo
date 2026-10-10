"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "inner" | "left" | "leftWhere" | "leftOn";

const USERS = [
  { id: "u1", name: "Jane Smith" },
  { id: "u2", name: "John Doe" },
  { id: "u3", name: "Alice Brown" },
  { id: "u4", name: "Ravi Patel" },
];

const PROFILES = [
  { user_id: "u1", bio: "Frontend dev", phone: "+1-555-0101" },
  { user_id: "u3", bio: null as string | null, phone: "+1-555-0103" },
  { user_id: "u4", bio: "Shop owner", phone: null as string | null },
];

const SQL: Record<Mode, string> = {
  inner: "SELECT u.name, up.bio, up.phone\nFROM users u\nINNER JOIN user_profiles up ON u.id = up.user_id;",
  left: "SELECT u.name, up.bio, up.phone\nFROM users u\nLEFT JOIN user_profiles up ON u.id = up.user_id;",
  leftWhere: "SELECT u.name, up.bio, up.phone\nFROM users u\nLEFT JOIN user_profiles up ON u.id = up.user_id\nWHERE up.phone IS NOT NULL;",
  leftOn: "SELECT u.name, up.bio, up.phone\nFROM users u\nLEFT JOIN user_profiles up\n  ON u.id = up.user_id AND up.phone IS NOT NULL;",
};

const NOTES: Record<Mode, string> = {
  inner: "INNER JOIN keeps only users that have a matching profile row. John has never edited his profile, so he silently disappears from the user list.",
  left: "LEFT JOIN keeps every row from the left table (users). Where there is no match, the profile columns come back as NULL. This is the right join for \"users with their optional profile\".",
  leftWhere: "Trap: a WHERE condition on the right table runs after the join, and NULL fails it. John (no profile) and Ravi (no phone) are both filtered out, so this LEFT JOIN quietly behaves like an INNER JOIN with an extra filter.",
  leftOn: "Putting the condition in ON filters which profiles may match, but still keeps every user. Ravi stays, just with NULL profile columns.",
};

type Row = { name: string; bio: string | null; phone: string | null; matched: boolean };

function run(mode: Mode): Row[] {
  const rows: Row[] = [];
  for (const u of USERS) {
    const p = PROFILES.find((x) => x.user_id === u.id && (mode !== "leftOn" || x.phone !== null));
    if (p) rows.push({ name: u.name, bio: p.bio, phone: p.phone, matched: true });
    else if (mode !== "inner") rows.push({ name: u.name, bio: null, phone: null, matched: false });
  }
  if (mode === "leftWhere") return rows.filter((r) => r.phone !== null);
  return rows;
}

function Cell({ v }: { v: string | null }) {
  return v === null ? <span className="text-muted-foreground italic">NULL</span> : <span>{v}</span>;
}

export function SqlJoinLab() {
  const [mode, setMode] = useState<Mode>("inner");
  const rows = run(mode);
  const dropped = USERS.filter((u) => !rows.some((r) => r.name === u.name));

  return (
    <Widget title="INNER vs LEFT JOIN" hint="Same two tables, four queries. Watch which users survive.">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">users</p>
          <ul className="space-y-1 text-[0.75rem] font-mono">
            {USERS.map((u) => (
              <li key={u.id} className="rounded border border-border px-2 py-1">
                {u.id} · {u.name}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">user_profiles</p>
          <ul className="space-y-1 text-[0.75rem] font-mono">
            {PROFILES.map((p) => (
              <li key={p.user_id} className="rounded border border-border px-2 py-1 break-all">
                {p.user_id} · bio: {p.bio ?? "NULL"} · phone: {p.phone ?? "NULL"}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Pill active={mode === "inner"} onClick={() => setMode("inner")}>INNER JOIN</Pill>
        <Pill active={mode === "left"} onClick={() => setMode("left")}>LEFT JOIN</Pill>
        <Pill active={mode === "leftWhere"} onClick={() => setMode("leftWhere")}>LEFT + WHERE</Pill>
        <Pill active={mode === "leftOn"} onClick={() => setMode("leftOn")}>LEFT + condition in ON</Pill>
      </div>

      <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-[0.75rem] leading-5">{SQL[mode]}</pre>

      <p className="mt-3 mb-1 text-xs text-muted-foreground">Result ({rows.length} rows)</p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-[0.8rem]">
          <thead className="bg-muted">
            <tr>
              <th className="px-2 py-1.5">name</th>
              <th className="px-2 py-1.5">bio</th>
              <th className="px-2 py-1.5">phone</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className={`border-t border-border ${r.matched ? "" : "bg-warn-soft"}`}>
                <td className="px-2 py-1.5">{r.name}</td>
                <td className="px-2 py-1.5"><Cell v={r.bio} /></td>
                <td className="px-2 py-1.5"><Cell v={r.phone} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dropped.length > 0 && (
        <p className="mt-2 rounded-lg bg-bad-soft p-2 text-sm">Missing from the result: {dropped.map((d) => d.name).join(", ")}</p>
      )}
      <p className="mt-2 text-sm">{NOTES[mode]}</p>
    </Widget>
  );
}
