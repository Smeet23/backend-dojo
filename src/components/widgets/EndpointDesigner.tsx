"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Resource = "organizations" | "projects" | "tasks";
type Action = "list" | "create" | "get" | "update" | "delete" | "custom";

const SINGULAR: Record<Resource, string> = { organizations: "organization", projects: "project", tasks: "task" };
const ID: Record<Resource, string> = { organizations: "5b1e9f", projects: "42", tasks: "7" };
const CUSTOM: Record<Resource, { verb: string; status: string; why: string }> = {
  organizations: { verb: "archive", status: "200 OK", why: "Archiving changes an existing organization (and cascades to its projects); nothing new is created, so 200." },
  projects: { verb: "clone", status: "201 Created", why: "Cloning creates a brand-new project, so 201 with a Location header, even though it's a custom action." },
  tasks: { verb: "complete", status: "200 OK", why: "Completing may also notify watchers and close subtasks, so it's an action, not a bare PATCH. Nothing is created: 200." },
};

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const STATUSES = ["200 OK", "201 Created", "204 No Content", "404 Not Found"];

type Design = { method: string; url: string; body: string; status: string; response: string; why: string };

function design(r: Resource, a: Action): Design {
  const one = SINGULAR[r];
  const id = ID[r];
  const sample: Record<Resource, string> = {
    organizations: `{ "name": "Acme", "description": "Rocket gadgets" }`,
    projects: `{ "name": "Website relaunch", "organizationId": "5b1e9f" }`,
    tasks: `{ "title": "Write copy", "projectId": "42" }`,
  };
  switch (a) {
    case "list":
      return { method: "GET", url: `/${r}?page=1&limit=20`, body: "(none, use query params)", status: "200 OK", response: `{ "data": [ … ], "total": 57, "page": 1, "totalPages": 3 }`, why: "Read the collection. Paginated envelope; an empty result is still 200 with data: []." };
    case "create":
      return { method: "POST", url: `/${r}`, body: sample[r], status: "201 Created", response: `Location: /${r}/<newId>\n{ "id": "<newId>", …, "createdAt": "…" }`, why: "POST to the collection. Don't send id/createdAt; the server owns them. Return the created entity." };
    case "get":
      return { method: "GET", url: `/${r}/${id}`, body: "(none)", status: "200 OK", response: `{ "id": "${id}", … }`, why: `Plural collection, then the id. Still /${r}, never /${one}.` };
    case "update":
      return { method: "PATCH", url: `/${r}/${id}`, body: `{ "description": "Updated" }`, status: "200 OK", response: `{ "id": "${id}", …, "updatedAt": "…" }`, why: "PATCH sends only the changed fields. Nothing is created, so 200 with the updated entity." };
    case "delete":
      return { method: "DELETE", url: `/${r}/${id}`, body: "(none)", status: "204 No Content", response: "(empty body)", why: `Succeeded, nothing to return. A later GET /${r}/${id} gives 404.` };
    case "custom": {
      const c = CUSTOM[r];
      return { method: "POST", url: `/${r}/${id}/${c.verb}`, body: r === "projects" ? `{ "name": "Website relaunch (copy)" }  (optional overrides)` : "(none)", status: c.status, response: `{ "id": "${r === "projects" ? "77" : id}", … }`, why: `Non-CRUD actions use POST /${r}/:id/${c.verb}. ${c.why}` };
    }
  }
}

export function EndpointDesigner() {
  const [resource, setResource] = useState<Resource>("organizations");
  const [action, setAction] = useState<Action>("create");
  const [method, setMethod] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  const d = design(resource, action);
  const clear = () => { setMethod(null); setStatus(null); setReveal(false); };
  const actions: { id: Action; label: string }[] = [
    { id: "list", label: "List" },
    { id: "create", label: "Create" },
    { id: "get", label: "Get one" },
    { id: "update", label: "Update a field" },
    { id: "delete", label: "Delete" },
    { id: "custom", label: CUSTOM[resource].verb[0].toUpperCase() + CUSTOM[resource].verb.slice(1) },
  ];
  const show = reveal || (method !== null && status !== null);
  const mark = (pick: string | null, right: string) => (pick === null ? "" : pick === right ? " ✓" : " ✗");

  return (
    <Widget title="Endpoint designer" hint="Pick a resource and an action. Guess the method and success status, then compare with the conventional design.">
      <div className="space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted-foreground">Resource</span>
          {(Object.keys(SINGULAR) as Resource[]).map((r) => (
            <Pill key={r} active={resource === r} onClick={() => { setResource(r); clear(); }}>{r}</Pill>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted-foreground">Action</span>
          {actions.map((a) => (
            <Pill key={a.id} active={action === a.id} onClick={() => { setAction(a.id); clear(); }}>{a.label}</Pill>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted-foreground">Your method</span>
          {METHODS.map((m) => <Pill key={m} active={method === m} onClick={() => setMethod(m)}>{m}</Pill>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted-foreground">Your status</span>
          {STATUSES.map((s) => <Pill key={s} active={status === s} onClick={() => setStatus(s)}>{s}</Pill>)}
        </div>
      </div>

      {show ? (
        <div className="mt-4 rounded-lg border border-border p-3 text-sm">
          <p className="font-mono text-[0.85rem] font-semibold break-all">
            {d.method} {d.url}
          </p>
          {(method || status) && (
            <p className="mt-1 text-xs text-muted-foreground">
              You picked {method ?? "–"}{mark(method, d.method)} and {status ?? "–"}{mark(status, d.status)}
            </p>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Request body</p>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-muted p-2 font-mono text-[0.78rem] leading-6">{d.body}</pre>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Response · {d.status}</p>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-muted p-2 font-mono text-[0.78rem] leading-6">{d.response}</pre>
            </div>
          </div>
          <p className="mt-3 rounded-md bg-primary/10 px-3 py-2">{d.why}</p>
        </div>
      ) : (
        <button type="button" onClick={() => setReveal(true)} className="mt-4 min-h-10 w-full rounded-lg border border-border px-4 text-sm">
          Show the answer
        </button>
      )}
    </Widget>
  );
}
