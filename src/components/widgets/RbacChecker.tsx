"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const ROLES = ["user", "moderator", "admin"] as const;
type Role = (typeof ROLES)[number];

type Permission = "notes:write:own" | "notes:hide:any" | "deadzone:read" | "deadzone:purge";

const GRANTS: Record<Role, Permission[]> = {
  user: ["notes:write:own"],
  moderator: ["notes:write:own", "notes:hide:any"],
  admin: ["notes:write:own", "notes:hide:any", "deadzone:read", "deadzone:purge"],
};

type Action = { label: string; request: string; needs: Permission; ownership: boolean };

const ACTIONS: Action[] = [
  { label: "Edit note 42", request: "PATCH /notes/42", needs: "notes:write:own", ownership: true },
  { label: "Hide note 42", request: "POST /notes/42/hide", needs: "notes:hide:any", ownership: false },
  { label: "List dead-zone notes", request: "GET /admin/dead-zone", needs: "deadzone:read", ownership: false },
  { label: "Purge a dead-zone note", request: "DELETE /admin/dead-zone/42", needs: "deadzone:purge", ownership: false },
];

export function decide(signedIn: boolean, role: Role, action: Action, owns: boolean): { status: string; why: string } {
  if (!signedIn) return { status: "401 Unauthorized", why: "No valid session or token, so the auth middleware stops the request before any permission check." };
  if (!GRANTS[role].includes(action.needs)) return { status: "403 Forbidden", why: `Role "${role}" doesn't have ${action.needs}.` };
  if (action.ownership && !owns) return { status: "403 Forbidden", why: "The role allows editing your own notes, but note 42 belongs to someone else." };
  return { status: "200 OK", why: `Role "${role}" has ${action.needs}${action.ownership ? " and owns the note" : ""}.` };
}

export function RbacChecker() {
  const [signedIn, setSignedIn] = useState(true);
  const [role, setRole] = useState<Role>("user");
  const [owns, setOwns] = useState(true);
  const [actionIdx, setActionIdx] = useState(0);
  const action = ACTIONS[actionIdx];
  const result = decide(signedIn, role, action, owns);
  const tone = result.status.startsWith("200") ? "bg-good-soft" : result.status.startsWith("401") ? "bg-warn-soft" : "bg-bad-soft";

  return (
    <Widget title="RBAC checker" hint="Choose who is calling and what they try. The server checks identity, then role, then ownership.">
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted-foreground">Identity</span>
          <Pill active={signedIn} onClick={() => setSignedIn(true)}>Signed in</Pill>
          <Pill active={!signedIn} onClick={() => setSignedIn(false)}>No / expired token</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted-foreground">Role</span>
          {ROLES.map((r) => <Pill key={r} active={role === r} onClick={() => setRole(r)}>{r}</Pill>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted-foreground">Note 42</span>
          <Pill active={owns} onClick={() => setOwns(true)}>Caller owns it</Pill>
          <Pill active={!owns} onClick={() => setOwns(false)}>Someone else&apos;s</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted-foreground">Action</span>
          {ACTIONS.map((a, i) => <Pill key={a.label} active={actionIdx === i} onClick={() => setActionIdx(i)}>{a.label}</Pill>)}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[20rem] text-left text-[0.78rem]">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-1.5 pr-2 font-medium">Permission</th>
              {ROLES.map((r) => <th key={r} className={`px-2 py-1.5 font-medium ${r === role ? "text-primary" : ""}`}>{r}</th>)}
            </tr>
          </thead>
          <tbody>
            {(["notes:write:own", "notes:hide:any", "deadzone:read", "deadzone:purge"] as Permission[]).map((p) => (
              <tr key={p} className={`border-b border-border ${p === action.needs ? "bg-primary/10" : ""}`}>
                <td className="py-1.5 pr-2 font-mono">{p}</td>
                {ROLES.map((r) => <td key={r} className="px-2 py-1.5">{GRANTS[r].includes(p) ? "✓" : "–"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`mt-4 rounded-lg p-3 text-sm ${tone}`}>
        <p className="font-mono text-[0.78rem] text-muted-foreground">{action.request}</p>
        <p className="font-semibold">{result.status}</p>
        <p>{result.why}</p>
      </div>
    </Widget>
  );
}
