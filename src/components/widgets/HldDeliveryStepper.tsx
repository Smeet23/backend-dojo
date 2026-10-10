"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Ticks = "pending" | "sent" | "delivered" | "read";
type Box = "alice" | "gateway" | "chat" | "store" | "push" | "bob";
type Step = { title: string; detail: string; ticks: Ticks; active: Box[]; inbox: boolean };

const BOXES: { id: Box; label: string }[] = [
  { id: "alice", label: "Alice's phone" },
  { id: "gateway", label: "WebSocket gateways" },
  { id: "chat", label: "Chat service" },
  { id: "store", label: "Message store / inbox" },
  { id: "push", label: "Push (APNs / FCM)" },
  { id: "bob", label: "Bob's phone" },
];

const COMMON_START: Step[] = [
  {
    title: "Alice taps send",
    detail: "The app gives the message a client-generated id, saves it in the local database and sends it over Alice's open WebSocket. Until the server acks, the bubble shows a clock.",
    ticks: "pending",
    active: ["alice", "gateway"],
    inbox: false,
  },
  {
    title: "Server persists, then acks",
    detail: "The chat service assigns a per-conversation sequence number and writes the message to Bob's undelivered inbox before anything else. Only after that durable write does it ack Alice: one grey tick means 'the server has it'.",
    ticks: "sent",
    active: ["gateway", "chat", "store", "alice"],
    inbox: true,
  },
];

const ONLINE: Step[] = [
  ...COMMON_START,
  {
    title: "Look up Bob's session",
    detail: "The session registry says Bob is connected to gateway 17. The chat service forwards the message there, and the gateway pushes it down Bob's WebSocket.",
    ticks: "sent",
    active: ["chat", "gateway", "bob"],
    inbox: true,
  },
  {
    title: "Bob's phone acks delivery",
    detail: "Bob's app stores the message locally and sends a delivery ack. The server removes it from Bob's inbox and sends a 'delivered' receipt to Alice: two grey ticks.",
    ticks: "delivered",
    active: ["bob", "gateway", "chat", "alice"],
    inbox: false,
  },
  {
    title: "Bob opens the chat",
    detail: "When the message is actually on screen, Bob's app sends a 'read' receipt (unless he has turned read receipts off). Alice's ticks turn blue.",
    ticks: "read",
    active: ["bob", "chat", "alice"],
    inbox: false,
  },
];

const OFFLINE: Step[] = [
  ...COMMON_START,
  {
    title: "Bob has no live connection",
    detail: "The session registry has no entry for Bob. The message simply stays in his inbox, and the chat service asks the push service to wake his phone with a notification.",
    ticks: "sent",
    active: ["chat", "push"],
    inbox: true,
  },
  {
    title: "Hours pass",
    detail: "Alice still sees one grey tick. Nothing is lost: the message is durable in the inbox. If Alice sends more messages, they queue behind it in order.",
    ticks: "sent",
    active: ["store"],
    inbox: true,
  },
  {
    title: "Bob reconnects and syncs",
    detail: "Bob opens the app, which opens a WebSocket and asks for everything after the last sequence number it has. The server streams the queued messages in order.",
    ticks: "sent",
    active: ["bob", "gateway", "chat", "store"],
    inbox: true,
  },
  {
    title: "Delivery ack flows back",
    detail: "Bob's app acks the batch. The server deletes those messages from the inbox and sends Alice a 'delivered' receipt. If Alice is offline now, that receipt waits in her inbox the same way.",
    ticks: "delivered",
    active: ["bob", "chat", "alice"],
    inbox: false,
  },
  {
    title: "Bob reads it",
    detail: "Bob opens the conversation and a read receipt travels back. Two blue ticks.",
    ticks: "read",
    active: ["bob", "chat", "alice"],
    inbox: false,
  },
];

const TICK_LABEL: Record<Ticks, string> = {
  pending: "… pending",
  sent: "✓ sent",
  delivered: "✓✓ delivered",
  read: "✓✓ read",
};

export function HldDeliveryStepper() {
  const [offline, setOffline] = useState(true);
  const [i, setI] = useState(0);
  const steps = offline ? OFFLINE : ONLINE;
  const step = steps[i];

  function choose(o: boolean) {
    setOffline(o);
    setI(0);
  }

  return (
    <Widget title="Message delivery states" hint="Follow one message from Alice to Bob and watch the ticks change. Switch Bob between online and offline.">
      <div className="flex flex-wrap gap-2">
        <Pill active={!offline} onClick={() => choose(false)}>Bob online</Pill>
        <Pill active={offline} onClick={() => choose(true)}>Bob offline</Pill>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BOXES.map((b) => (
          <div
            key={b.id}
            className={`min-w-0 rounded-lg border p-2 text-sm ${step.active.includes(b.id) ? "border-accent bg-accent-soft" : "border-border bg-surface-2 text-muted"}`}
          >
            <p className="font-medium break-words">{b.label}</p>
            {b.id === "store" && <p className="text-xs">{step.inbox ? "Bob's inbox: 1 pending" : "Bob's inbox: empty"}</p>}
            {b.id === "alice" && <p className="font-mono text-xs">{TICK_LABEL[step.ticks]}</p>}
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-lg bg-surface-2 p-3">
        <p className="text-xs text-muted">
          Step {i + 1} of {steps.length}
        </p>
        <p className="font-semibold">{step.title}</p>
        <p className="mt-1 text-sm">{step.detail}</p>
        <p
          className={`mt-2 inline-block rounded px-2 py-0.5 font-mono text-xs ${
            step.ticks === "read" ? "bg-accent text-white dark:text-bg" : step.ticks === "pending" ? "bg-warn-soft" : "bg-surface"
          }`}
        >
          Alice sees: {TICK_LABEL[step.ticks]}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-40">
          Back
        </button>
        <button
          type="button"
          onClick={() => setI((x) => Math.min(steps.length - 1, x + 1))}
          disabled={i === steps.length - 1}
          className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
        >
          Next step
        </button>
        <button type="button" onClick={() => setI(0)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>
    </Widget>
  );
}
