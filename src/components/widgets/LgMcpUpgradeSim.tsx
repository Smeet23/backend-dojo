"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "tools" | "mcp";
type Service = { name: string; tools: number };

const SERVICES: Service[] = [
  { name: "GitHub", tools: 10 },
  { name: "Slack", tools: 6 },
  { name: "Gmail", tools: 5 },
  { name: "Jira", tools: 8 },
];

type Event = { text: string; tone: "good" | "warn" | "bad" | "neutral" };

export function LgMcpUpgradeSim() {
  const [mode, setMode] = useState<Mode>("tools");
  const [apps, setApps] = useState(3);
  const [services, setServices] = useState(2);
  const [log, setLog] = useState<Event[]>([]);

  const active = SERVICES.slice(0, services);
  const github = SERVICES[0];
  const clientFunctions = active.reduce((s, sv) => s + sv.tools, 0) * apps;

  function push(e: Event[]) {
    setLog((l) => [...e, ...l].slice(0, 6));
  }

  function apiChange() {
    if (mode === "tools") {
      push([
        { text: `GitHub ships API v2 (paths and field names change)`, tone: "neutral" },
        { text: `${apps} app${apps > 1 ? "s" : ""} × ${github.tools} GitHub tools = ${apps * github.tools} functions to patch before PR questions work again`, tone: "bad" },
      ]);
    } else {
      push([
        { text: `GitHub ships API v2 (paths and field names change)`, tone: "neutral" },
        { text: `GitHub MCP server is updated once by its maintainers. ${apps} client config${apps > 1 ? "s" : ""} unchanged: 0 edits on your side`, tone: "good" },
      ]);
    }
  }

  function newTool() {
    if (mode === "tools") {
      push([
        { text: `GitHub adds "list_workflow_runs"`, tone: "neutral" },
        { text: `Write, test and deploy the new function in each of ${apps} app${apps > 1 ? "s" : ""}`, tone: "warn" },
      ]);
    } else {
      push([
        { text: `GitHub adds "list_workflow_runs" to its MCP server`, tone: "neutral" },
        { text: `Every app sees it on the next get_tools() call, with its description and schema`, tone: "good" },
      ]);
    }
  }

  return (
    <Widget title="Who absorbs the change?" hint="Pick how many apps and services you integrate, then simulate an upstream change in each architecture.">
      <div className="flex flex-wrap gap-2">
        <Pill active={mode === "tools"} onClick={() => { setMode("tools"); setLog([]); }}>Hand-written tools</Pill>
        <Pill active={mode === "mcp"} onClick={() => { setMode("mcp"); setLog([]); }}>MCP servers</Pill>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="min-w-0 text-sm">
          <span className="text-muted">Apps (chatbots): {apps}</span>
          <input type="range" min={1} max={5} value={apps} onChange={(e) => setApps(Number(e.target.value))} className="mt-1 block h-10 w-full accent-accent" />
        </label>
        <label className="min-w-0 text-sm">
          <span className="text-muted">Services: {active.map((s) => s.name).join(", ")}</span>
          <input type="range" min={1} max={4} value={services} onChange={(e) => setServices(Number(e.target.value))} className="mt-1 block h-10 w-full accent-accent" />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Array.from({ length: Math.min(apps, 2) }).map((_, i) => (
          <div key={i} className="min-w-0 rounded-lg border border-border p-2">
            <p className="text-xs font-semibold">App {i + 1}</p>
            {mode === "tools" ? (
              <ul className="mt-1 space-y-0.5 font-mono text-[0.7rem]">
                {active.map((s) => (
                  <li key={s.name} className="break-words rounded bg-warn-soft px-1.5 py-0.5">{s.tools} {s.name} tool functions (your code)</li>
                ))}
              </ul>
            ) : (
              <pre className="mt-1 overflow-x-auto rounded bg-good-soft p-1.5 font-mono text-[0.7rem]">
{active.map((s) => `"${s.name.toLowerCase()}": {"url": ".../mcp"}`).join(",\n")}
              </pre>
            )}
          </div>
        ))}
      </div>
      {apps > 2 && <p className="mt-1 text-xs text-muted">…and {apps - 2} more app{apps - 2 > 1 ? "s" : ""} with the same setup.</p>}

      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
        <div className="min-w-0 rounded-lg bg-surface-2 p-2">
          <p className="text-xs text-muted">Integration code you maintain</p>
          <p className="font-mono">{mode === "tools" ? `${clientFunctions} functions` : `${apps * services} config entries`}</p>
        </div>
        <div className="min-w-0 rounded-lg bg-surface-2 p-2">
          <p className="text-xs text-muted">Coupled to upstream APIs?</p>
          <p className="font-mono">{mode === "tools" ? "yes, directly" : "no, via server"}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={apiChange} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
          GitHub changes its API
        </button>
        <button type="button" onClick={newTool} className="min-h-10 flex-1 rounded-lg border border-border px-3 text-sm">
          GitHub adds a tool
        </button>
      </div>

      <ol className="mt-3 space-y-1">
        {log.map((e, i) => (
          <li key={`${log.length}-${i}`} className={`rounded px-2 py-1 text-[0.78rem] break-words ${e.tone === "good" ? "bg-good-soft" : e.tone === "warn" ? "bg-warn-soft" : e.tone === "bad" ? "bg-bad-soft" : "bg-surface-2"}`}>
            {e.text}
          </li>
        ))}
      </ol>
    </Widget>
  );
}
