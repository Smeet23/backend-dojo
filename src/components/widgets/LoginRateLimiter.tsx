"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type ScenarioKey = "script" | "botnet" | "spray" | "office";

const SCENARIOS: Record<ScenarioKey, { label: string; desc: string; ips: number; accounts: number; attempts: number; legit: boolean }> = {
  script: { label: "Script, one IP", desc: "1,000 password guesses a minute from one server against one account.", ips: 1, accounts: 1, attempts: 1000, legit: false },
  botnet: { label: "Botnet, one account", desc: "500 machines each try 2 passwords a minute against the CEO's account.", ips: 500, accounts: 1, attempts: 1000, legit: false },
  spray: { label: "Password spraying", desc: "500 machines try \"Summer2026!\" once against each of 5,000 accounts.", ips: 500, accounts: 5000, attempts: 5000, legit: false },
  office: { label: "Busy office", desc: "40 real employees log in at 9:00, all behind one shared office IP.", ips: 1, accounts: 40, attempts: 40, legit: true },
};

const PER_IP = 10; // attempts per IP per minute
const PER_ACCOUNT = 5; // failures per account before lockout
const GLOBAL = 100; // failed attempts per minute before alert + CAPTCHA

function simulate(key: ScenarioKey, ip: boolean, account: boolean, global: boolean) {
  const s = SCENARIOS[key];
  const perIpTried = s.attempts / s.ips;
  const afterIp = (ip ? Math.min(perIpTried, PER_IP) : perIpTried) * s.ips;
  const perAccountTried = afterIp / s.accounts;
  // Real users mostly succeed, so per-account failure limits rarely touch them.
  const afterAccount = s.legit ? afterIp : (account ? Math.min(perAccountTried, PER_ACCOUNT) : perAccountTried) * s.accounts;
  const tripped = global && !s.legit && afterAccount > GLOBAL;
  const reaching = tripped ? 0 : afterAccount;
  return {
    reaching: Math.round(reaching),
    perTarget: Math.round(reaching / s.accounts),
    blockedByIp: Math.round(s.attempts - afterIp),
    blockedByAccount: Math.round(afterIp - afterAccount),
    tripped,
    legitBlocked: s.legit ? Math.round(s.attempts - afterIp) : 0,
  };
}

export function LoginRateLimiter() {
  const [key, setKey] = useState<ScenarioKey>("script");
  const [ip, setIp] = useState(true);
  const [account, setAccount] = useState(false);
  const [global, setGlobal] = useState(false);
  const s = SCENARIOS[key];
  const r = simulate(key, ip, account, global);

  let verdict: { tone: "good" | "bad" | "warn"; text: string };
  if (s.legit) {
    verdict = r.legitBlocked > 0
      ? { tone: "warn", text: `${r.legitBlocked} real employees are blocked by the per-IP limit. Shared IPs are why per-IP limits must be generous or combined with other signals.` }
      : { tone: "good", text: "Everyone logs in. Good limits stay out of real users' way." };
  } else if (r.tripped) {
    verdict = { tone: "good", text: "Global failure rate tripped: the team is alerted and logins now require a CAPTCHA, which the bots can't pass." };
  } else if (r.perTarget <= PER_ACCOUNT && r.reaching <= GLOBAL) {
    verdict = { tone: "good", text: `Only ${r.reaching} guesses a minute get through. Brute force is no longer practical.` };
  } else if (key === "spray" && r.perTarget <= 1) {
    verdict = { tone: "bad", text: `${r.reaching.toLocaleString()} guesses a minute, but only one per account, so per-IP and per-account limits never trigger. Some users have that password. Only a global view catches this.` };
  } else {
    verdict = { tone: "bad", text: `${r.reaching.toLocaleString()} guesses a minute reach the password check (${r.perTarget.toLocaleString()} per targeted account). A weak password will fall.` };
  }

  return (
    <Widget title="Layered login rate limiting" hint="Pick a traffic pattern, then switch limit layers on and off.">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SCENARIOS) as ScenarioKey[]).map((k) => (
          <Pill key={k} active={key === k} onClick={() => setKey(k)}>{SCENARIOS[k].label}</Pill>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">{s.desc}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          { on: ip, set: setIp, title: "Per IP", rule: `${PER_IP} attempts / min / IP`, blocked: r.blockedByIp },
          { on: account, set: setAccount, title: "Per account", rule: `lock after ${PER_ACCOUNT} failures`, blocked: r.blockedByAccount },
          { on: global, set: setGlobal, title: "Global", rule: `>${GLOBAL} failures / min → alert + CAPTCHA`, blocked: -1 },
        ].map((l) => (
          <button
            key={l.title}
            type="button"
            onClick={() => l.set(!l.on)}
            aria-pressed={l.on}
            className={`min-h-10 rounded-lg border p-3 text-left text-sm ${l.on ? "border-accent bg-accent-soft" : "border-border bg-surface"}`}
          >
            <span className="block font-semibold">{l.on ? "✓ " : ""}{l.title}</span>
            <span className="block text-xs text-muted">{l.rule}</span>
            {l.on && l.blocked > 0 && <span className="mt-1 block text-xs">blocks {l.blocked.toLocaleString()} / min</span>}
            {l.on && l.blocked === -1 && <span className="mt-1 block text-xs">{r.tripped ? "tripped" : "not tripped"}</span>}
          </button>
        ))}
      </div>

      <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${verdict.tone === "good" ? "bg-good-soft" : verdict.tone === "warn" ? "bg-warn-soft" : "bg-bad-soft"}`}>
        <p className="font-semibold">{s.legit ? "Real logins processed" : "Guesses reaching the password check"}: {(s.legit ? s.attempts - r.legitBlocked : r.reaching).toLocaleString()} / min</p>
        <p className="mt-1">{verdict.text}</p>
      </div>
    </Widget>
  );
}
