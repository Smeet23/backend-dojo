"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

const KEYS = [
  "t_81/u_42/avatar-9f3c.png",
  "t_81/u_42/notes/2026/a1b2.pdf",
  "t_81/u_42/notes/2026/c3d4.pdf",
  "t_81/u_42/notes/2025/e5f6.pdf",
  "t_81/u_7/avatar-0b7e.png",
  "t_81/u_7/drafts/",
  "t_95/u_3/report-77aa.csv",
];

const PREFIXES = ["", "t_81/", "t_81/u_42/", "t_81/u_42/notes/", "t_81/u_7/"];

/** What LIST returns for a prefix and optional delimiter: a group-by over key strings. */
export function listKeys(keys: string[], prefix: string, delimiter: string | null) {
  const contents: string[] = [];
  const common = new Set<string>();
  for (const key of keys) {
    if (!key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    const cut = delimiter ? rest.indexOf(delimiter) : -1;
    if (delimiter && cut >= 0) common.add(prefix + rest.slice(0, cut + delimiter.length));
    else contents.push(key);
  }
  return { contents, commonPrefixes: [...common] };
}

export function PrefixListing() {
  const [prefix, setPrefix] = useState("t_81/");
  const [useDelimiter, setUseDelimiter] = useState(true);
  const result = useMemo(() => listKeys(KEYS, prefix, useDelimiter ? "/" : null), [prefix, useDelimiter]);

  return (
    <Widget title="Folders are a group-by" hint="The bucket holds only the flat keys on the left. Pick a prefix and toggle the delimiter to see where 'folders' come from.">
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted">Prefix</span>
          {PREFIXES.map((p) => (
            <Pill key={p || "none"} active={prefix === p} onClick={() => setPrefix(p)}>
              <span className="font-mono text-[0.78rem]">{p || "(none)"}</span>
            </Pill>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted">Delimiter</span>
          <Pill active={useDelimiter} onClick={() => setUseDelimiter(true)}>/</Pill>
          <Pill active={!useDelimiter} onClick={() => setUseDelimiter(false)}>none</Pill>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Every key in the bucket</p>
          <ul className="space-y-1 font-mono text-[0.78rem]">
            {KEYS.map((k) => (
              <li key={k} className={`break-all rounded px-1 ${k.startsWith(prefix) ? "bg-accent-soft" : "text-muted"}`}>{k}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">LIST response</p>
          <pre className="whitespace-pre-wrap break-all font-mono text-[0.78rem] leading-6">
            {`ListObjectsV2 prefix="${prefix}"${useDelimiter ? ' delimiter="/"' : ""}\n\n`}
            {`CommonPrefixes (${result.commonPrefixes.length}):\n`}
            {result.commonPrefixes.map((c) => `  ${c}\n`).join("") || "  (none)\n"}
            {`\nContents (${result.contents.length}):\n`}
            {result.contents.map((c) => `  ${c}\n`).join("") || "  (none)\n"}
          </pre>
        </div>
      </div>

      <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
        {useDelimiter
          ? "Each 'folder' is just the key text up to the next '/', reported once. Nothing called a folder is stored. Note t_81/u_7/drafts/ is a zero-byte object a tool created to fake an empty folder."
          : "Without a delimiter there are no folders at all: just every key that starts with the prefix. This is what the bucket really is."}
      </p>
    </Widget>
  );
}
