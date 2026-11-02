"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Version = "noHistory" | "plainList" | "sessionState";
type Msg = { role: "user" | "assistant"; content: string };

const VERSION_LABEL: Record<Version, string> = {
  noHistory: "1. Just render the turn",
  plainList: "2. history = []",
  sessionState: "3. st.session_state",
};

const CODE: Record<Version, string> = {
  noHistory: `user_input = st.chat_input("Type here")
if user_input:
    with st.chat_message("user"):
        st.markdown(user_input)
    with st.chat_message("assistant"):
        st.markdown(user_input)  # echo bot`,
  plainList: `history = []                      # runs on EVERY rerun
for m in history:
    with st.chat_message(m["role"]):
        st.markdown(m["content"])
user_input = st.chat_input("Type here")
if user_input:
    history.append({"role": "user", "content": user_input})
    ...`,
  sessionState: `if "history" not in st.session_state:   # only on the first run
    st.session_state["history"] = []
for m in st.session_state["history"]:
    with st.chat_message(m["role"]):
        st.markdown(m["content"])
user_input = st.chat_input("Type here")
if user_input:
    st.session_state["history"].append(...)
    ...`,
};

const SAMPLES = ["Hi!", "My name is Kabir.", "What's my name?"];

export function LgStreamlitRerun() {
  const [version, setVersion] = useState<Version>("noHistory");
  const [session, setSession] = useState<Msg[]>([]);
  const [screen, setScreen] = useState<Msg[]>([]);
  const [reruns, setReruns] = useState(1);
  const [note, setNote] = useState("Script ran once on page load. Nothing typed yet.");

  function choose(v: Version) {
    setVersion(v);
    setSession([]);
    setScreen([]);
    setReruns(1);
    setNote("Script ran once on page load. Nothing typed yet.");
  }

  function submit(text: string) {
    const turn: Msg[] = [
      { role: "user", content: text },
      { role: "assistant", content: text },
    ];
    setReruns((r) => r + 1);
    if (version === "sessionState") {
      const next = [...session, ...turn];
      setSession(next);
      setScreen(next);
      setNote(`Rerun: session_state still held ${session.length} messages, so they were redrawn, then the new turn was added.`);
    } else if (version === "plainList") {
      setScreen(turn);
      setNote("Rerun: history = [] executed again and wiped the list, so only this turn is drawn.");
    } else {
      setScreen(turn);
      setNote("Rerun: the page is rebuilt from scratch, and only the current turn is drawn.");
    }
  }

  function refresh() {
    setSession([]);
    setScreen([]);
    setReruns(1);
    setNote("Browser refresh = new session: st.session_state starts empty. (A backend InMemorySaver would still hold thread-1!)");
  }

  return (
    <Widget title="Streamlit reruns the whole script" hint="Every time you press Enter, Streamlit runs your file again from the top. Pick a version and send a few messages (this is an echo bot).">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(VERSION_LABEL) as Version[]).map((v) => (
          <Pill key={v} active={version === v} onClick={() => choose(v)}>
            {VERSION_LABEL[v]}
          </Pill>
        ))}
      </div>

      <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-2 p-2 font-mono text-[0.7rem]">{CODE[version]}</pre>

      <div className="mt-3 rounded-lg border border-border p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-muted">Browser tab</p>
          <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[0.7rem]">script runs: {reruns}</span>
        </div>
        <ul className="mt-2 min-h-16 space-y-1">
          {screen.length === 0 && <li className="text-sm text-muted">(empty page)</li>}
          {screen.map((m, i) => (
            <li key={i} className={`flex gap-2 rounded-lg px-2 py-1 text-sm break-words ${m.role === "user" ? "bg-accent-soft" : "bg-surface-2"}`}>
              <span className="font-semibold">{m.role === "user" ? "user" : "assistant"}</span>
              <span className="min-w-0">{m.content}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap gap-2">
          {SAMPLES.map((s) => (
            <button key={s} type="button" onClick={() => submit(s)} className="min-h-10 rounded-lg border border-accent px-3 text-sm">
              Enter: {s}
            </button>
          ))}
          <button type="button" onClick={refresh} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
            Refresh tab
          </button>
        </div>
      </div>

      <p className="mt-3 rounded-lg bg-surface-2 p-2 text-sm">{note}</p>
      <p className="mt-2 text-xs text-muted">st.session_state holds {session.length} message(s).</p>
    </Widget>
  );
}
