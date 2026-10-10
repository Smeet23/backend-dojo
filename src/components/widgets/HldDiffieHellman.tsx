"use client";

import { useState, type ReactNode } from "react";
import { Pill, Widget } from "./Widget";

const P = 23;
const G = 5;
const M = 9; // Mallory's secret exponent

function modPow(base: number, exp: number, mod: number): number {
  let result = 1;
  let b = base % mod;
  let e = exp;
  while (e > 0) {
    if (e & 1) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= 1;
  }
  return result;
}

function Box({ title, children, tone }: { title: string; children: ReactNode; tone?: string }) {
  return (
    <div className={`min-w-0 rounded-lg border border-border p-2 text-sm ${tone ?? ""}`}>
      <p className="text-xs font-semibold text-accent">{title}</p>
      <div className="mt-1 space-y-0.5 font-mono text-[0.78rem] break-words">{children}</div>
    </div>
  );
}

export function HldDiffieHellman() {
  const [a, setA] = useState(6);
  const [b, setB] = useState(15);
  const [mitm, setMitm] = useState(false);
  const [bruteShown, setBruteShown] = useState(false);

  const A = modPow(G, a, P);
  const B = modPow(G, b, P);
  const Mpub = modPow(G, M, P);

  // What each side receives
  const aliceGets = mitm ? Mpub : B;
  const bobGets = mitm ? Mpub : A;
  const aliceSecret = modPow(aliceGets, a, P);
  const bobSecret = modPow(bobGets, b, P);
  const malloryWithAlice = modPow(A, M, P);
  const malloryWithBob = modPow(B, M, P);

  // Eve's brute force: find any x with g^x mod p == A
  let found = -1;
  const tries: string[] = [];
  for (let x = 1; x < P; x++) {
    const v = modPow(G, x, P);
    tries.push(`${G}^${x} mod ${P} = ${v}${v === A ? "  ← match" : ""}`);
    if (v === A) {
      found = x;
      break;
    }
  }

  const slider = "h-10 w-full accent-accent";

  return (
    <Widget title="Diffie-Hellman with small numbers" hint={`Public: p = ${P}, g = ${G}. Pick Alice's and Bob's secret exponents and watch both sides land on the same secret without sending it.`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="min-w-0 text-sm">
          Alice&apos;s secret a = <span className="font-mono">{a}</span>
          <input type="range" min={1} max={P - 2} value={a} onChange={(e) => { setA(Number(e.target.value)); setBruteShown(false); }} className={slider} />
        </label>
        <label className="min-w-0 text-sm">
          Bob&apos;s secret b = <span className="font-mono">{b}</span>
          <input type="range" min={1} max={P - 2} value={b} onChange={(e) => setB(Number(e.target.value))} className={slider} />
        </label>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <Pill active={mitm} onClick={() => setMitm((v) => !v)}>Mallory in the middle: {mitm ? "on" : "off"}</Pill>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Box title="Alice">
          <p>sends A = {G}^{a} mod {P} = {A}</p>
          <p>receives {aliceGets}</p>
          <p>secret = {aliceGets}^{a} mod {P} = <b>{aliceSecret}</b></p>
        </Box>
        <Box title={mitm ? "Wire (Mallory swaps keys)" : "Wire (Eve sees all of this)"} tone={mitm ? "bg-bad-soft" : "bg-surface-2"}>
          <p>p = {P}, g = {G}</p>
          <p>A = {A}{mitm ? ` → replaced by ${Mpub}` : ""}</p>
          <p>B = {B}{mitm ? ` → replaced by ${Mpub}` : ""}</p>
          <p className="font-sans text-muted">{mitm ? `Mallory's secret m = ${M}` : "The secret itself never crosses."}</p>
        </Box>
        <Box title="Bob">
          <p>sends B = {G}^{b} mod {P} = {B}</p>
          <p>receives {bobGets}</p>
          <p>secret = {bobGets}^{b} mod {P} = <b>{bobSecret}</b></p>
        </Box>
      </div>

      {mitm ? (
        <div className="mt-3 rounded-lg bg-bad-soft p-2 text-sm">
          Alice&apos;s key ({aliceSecret}) is shared with Mallory ({malloryWithAlice}), and Bob&apos;s key ({bobSecret}) is also shared with Mallory ({malloryWithBob}). Mallory decrypts and re-encrypts everything, and neither side can tell. This is why TLS has the server <b>sign</b> its key share with a certificate key.
        </div>
      ) : (
        <div className={`mt-3 rounded-lg p-2 text-sm ${aliceSecret === bobSecret ? "bg-good-soft" : "bg-bad-soft"}`}>
          Both computed {aliceSecret}: (g^b)^a = (g^a)^b = g^(ab) mod p. Eve knows p, g, A and B but not a or b.
        </div>
      )}

      {!mitm && (
        <div className="mt-3">
          <button type="button" onClick={() => setBruteShown((v) => !v)} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
            {bruteShown ? "Hide" : "Let Eve brute-force a"}
          </button>
          {bruteShown && (
            <div className="mt-2 rounded-lg border border-border p-2 text-sm">
              <pre className="max-h-48 overflow-auto font-mono text-[0.72rem] whitespace-pre-wrap break-all">{tries.join("\n")}</pre>
              <p className="mt-1">
                Eve found an exponent ({found}) that produces A in {tries.length} tries, then computes B^{found} mod {P} = {modPow(B, found, P)}. With p = 23 that&apos;s trivial. With a 2048-bit prime (or a 256-bit elliptic curve) the same search would outlast the universe: that&apos;s the discrete logarithm problem.
              </p>
            </div>
          )}
        </div>
      )}
    </Widget>
  );
}
