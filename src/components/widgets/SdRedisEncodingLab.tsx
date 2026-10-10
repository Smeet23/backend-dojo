"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const EMBSTR_LIMIT = 44;
const MAX_ENTRIES = 128;
const MAX_VALUE = 64;

function stringEncoding(value: string): { encoding: string; why: string; allocs: number } {
  const bytes = new TextEncoder().encode(value).length;
  // Redis stores a string as a plain integer when it is a canonical 64-bit signed integer.
  if (/^-?[1-9]\d{0,18}$|^0$/.test(value)) {
    const n = BigInt(value);
    if (n >= BigInt("-9223372036854775808") && n <= BigInt("9223372036854775807")) {
      return { encoding: "int", why: "Looks like a 64-bit integer, so the number itself sits in the object's pointer field.", allocs: 1 };
    }
  }
  if (bytes <= EMBSTR_LIMIT) {
    return { encoding: "embstr", why: `${bytes} bytes ≤ ${EMBSTR_LIMIT}: the object header and the bytes share one allocation.`, allocs: 1 };
  }
  return { encoding: "raw", why: `${bytes} bytes > ${EMBSTR_LIMIT}: the object points to a separate SDS buffer.`, allocs: 2 };
}

type HashState = { fields: number; longest: number; encoding: "listpack" | "hashtable"; reason: string };
const START: HashState = { fields: 2, longest: 6, encoding: "listpack", reason: "" };

function grow(s: HashState, addFields: number, valueLen: number): HashState {
  const fields = Math.max(0, s.fields + addFields);
  const longest = Math.max(s.longest, valueLen);
  if (s.encoding === "hashtable") return { ...s, fields, longest };
  if (fields > MAX_ENTRIES) return { fields, longest, encoding: "hashtable", reason: `field count passed ${MAX_ENTRIES}` };
  if (longest > MAX_VALUE) return { fields, longest, encoding: "hashtable", reason: `a value longer than ${MAX_VALUE} bytes arrived` };
  return { fields, longest, encoding: "listpack", reason: "" };
}

export function SdRedisEncodingLab() {
  const [tab, setTab] = useState<"string" | "hash">("string");
  const [value, setValue] = useState("Alice");
  const [hash, setHash] = useState<HashState>(START);
  const s = stringEncoding(value);

  return (
    <Widget title="OBJECT ENCODING explorer" hint="Redis picks a compact internal layout for each value and upgrades it as the value grows. Clients never see the switch.">
      <div className="flex flex-wrap gap-2">
        <Pill active={tab === "string"} onClick={() => setTab("string")}>String</Pill>
        <Pill active={tab === "hash"} onClick={() => setTab("hash")}>Hash</Pill>
      </div>

      {tab === "string" ? (
        <div className="mt-3">
          <label className="block text-sm text-muted" htmlFor="sd-enc-value">SET greeting</label>
          <input
            id="sd-enc-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 min-h-10 w-full rounded-lg border border-border bg-bg px-3 font-mono text-sm"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {["42", "Alice", "hello world, this sentence is longer than forty-four bytes"].map((v) => (
              <button key={v} type="button" onClick={() => setValue(v)} className="min-h-10 max-w-full truncate rounded-lg border border-border px-3 text-xs hover:bg-surface-2">
                {v.length > 20 ? `${v.slice(0, 20)}…` : v}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            <div className="min-w-0 rounded-lg bg-accent-soft p-2">
              <p className="text-xs text-muted">OBJECT ENCODING</p>
              <p className="font-mono text-lg">&quot;{s.encoding}&quot;</p>
            </div>
            <div className="min-w-0 rounded-lg bg-surface-2 p-2">
              <p className="text-xs text-muted">Heap allocations</p>
              <p className="font-mono text-lg">{s.allocs}</p>
            </div>
            <div className="min-w-0 rounded-lg bg-surface-2 p-2 sm:col-span-1">
              <p className="text-xs text-muted">Why</p>
              <p className="text-xs">{s.why}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-muted">
            HSET user:1 … with defaults <span className="font-mono">hash-max-listpack-entries {MAX_ENTRIES}</span> and{" "}
            <span className="font-mono">hash-max-listpack-value {MAX_VALUE}</span>.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => setHash((h) => grow(h, 1, 8))} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">+1 short field</button>
            <button type="button" onClick={() => setHash((h) => grow(h, 25, 8))} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">+25 short fields</button>
            <button type="button" onClick={() => setHash((h) => grow(h, 1, 200))} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">+1 field, 200-byte value</button>
            <button type="button" onClick={() => setHash((h) => grow(h, -25, 0))} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">HDEL 25 fields</button>
            <button type="button" onClick={() => setHash(START)} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">Reset</button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            <div className={`min-w-0 rounded-lg p-2 ${hash.encoding === "listpack" ? "bg-good-soft" : "bg-warn-soft"}`}>
              <p className="text-xs text-muted">OBJECT ENCODING</p>
              <p className="font-mono text-lg">&quot;{hash.encoding}&quot;</p>
            </div>
            <div className="min-w-0 rounded-lg bg-surface-2 p-2">
              <p className="text-xs text-muted">Fields</p>
              <p className="font-mono text-lg">{hash.fields}</p>
            </div>
            <div className="min-w-0 rounded-lg bg-surface-2 p-2">
              <p className="text-xs text-muted">Longest value</p>
              <p className="font-mono text-lg">{hash.longest} B</p>
            </div>
          </div>
          <p className="mt-2 text-sm">
            {hash.encoding === "listpack"
              ? "Packed into one contiguous block. Lookups scan it (O(n)), which is cheap at this size and saves a lot of memory."
              : `Converted to a real hash table because ${hash.reason}. Lookups are O(1). Deleting fields will not convert it back.`}
          </p>
        </div>
      )}
    </Widget>
  );
}
