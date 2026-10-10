"use client";

import { useState } from "react";
import { Widget } from "./Widget";

const SLOTS = 16384;
const NODES = [
  { name: "Node A", from: 0, to: 5460 },
  { name: "Node B", from: 5461, to: 10922 },
  { name: "Node C", from: 10923, to: 16383 },
];

/** CRC16-XMODEM, the checksum Redis Cluster uses for key slots. */
function crc16(input: string): number {
  let crc = 0;
  for (const byte of new TextEncoder().encode(input)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}

/** Only the part inside the first non-empty {...} is hashed, if there is one. */
function hashedPart(key: string): string {
  const open = key.indexOf("{");
  if (open === -1) return key;
  const close = key.indexOf("}", open + 1);
  if (close === -1 || close === open + 1) return key;
  return key.slice(open + 1, close);
}

function slotOf(key: string) {
  const part = hashedPart(key);
  const slot = crc16(part) % SLOTS;
  const node = NODES.find((n) => slot >= n.from && slot <= n.to)!;
  return { part, slot, node };
}

const PRESETS = [
  ["user:1000:cart", "user:1000:profile"],
  ["{user:1000}:cart", "{user:1000}:profile"],
  ["foo", "bar"],
];

export function SdHashSlotMapper() {
  const [keys, setKeys] = useState<string[]>(PRESETS[0]);
  const results = keys.map(slotOf);
  const sameSlot = results.every((r) => r.slot === results[0].slot);

  return (
    <Widget title="Hash slot mapper" hint="A 3-node cluster splits 16,384 slots. Type two keys and see where each lives, and whether one multi-key command can touch both.">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {keys.map((k, i) => (
          <div key={i} className="min-w-0">
            <label className="text-xs text-muted" htmlFor={`sd-slot-${i}`}>Key {i + 1}</label>
            <input
              id={`sd-slot-${i}`}
              value={k}
              onChange={(e) => setKeys((ks) => ks.map((x, j) => (j === i ? e.target.value : x)))}
              className="mt-1 min-h-10 w-full rounded-lg border border-border bg-bg px-3 font-mono text-sm"
            />
            <p className="mt-1 font-mono text-xs break-all">
              CRC16(&quot;{results[i].part}&quot;) mod 16384 = <span className="font-semibold text-accent">{results[i].slot}</span> → {results[i].node.name}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.join()} type="button" onClick={() => setKeys(p)} className="min-h-10 rounded-lg border border-border px-3 font-mono text-xs hover:bg-surface-2">
            {p.join(" + ")}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {NODES.map((n) => {
          const here = results.filter((r) => r.node.name === n.name).length;
          return (
            <div key={n.name} className={`min-w-0 rounded-lg border p-2 text-xs ${here ? "border-accent bg-accent-soft" : "border-border"}`}>
              <p className="font-semibold">{n.name}</p>
              <p className="text-muted">slots {n.from}–{n.to}</p>
              <p className="mt-1 font-mono">{here ? `${here} key${here > 1 ? "s" : ""}` : "—"}</p>
            </div>
          );
        })}
      </div>

      <p className={`mt-3 rounded-lg p-2 font-mono text-xs break-all ${sameSlot ? "bg-good-soft" : "bg-bad-soft"}`}>
        MGET {keys.join(" ")} →{" "}
        {sameSlot ? "OK, both keys are in one slot" : "(error) CROSSSLOT Keys in request don't hash to the same slot"}
      </p>
    </Widget>
  );
}
