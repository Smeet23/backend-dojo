"use client";

import { useState } from "react";
import { Widget } from "./Widget";

type Build = { id: string; commit: string; buggy: boolean };
type Release = { id: number; build: string; config: number; note: string };

const COMMITS = ["a1f3c9", "b72e10", "c90d44", "d1aa07", "e5b3f2", "f0c871"];

const START_BUILDS: Build[] = [{ id: "build-1", commit: COMMITS[0], buggy: false }];
const START_RELEASES: Release[] = [{ id: 100, build: "build-1", config: 1, note: "Initial deploy" }];

export function ReleaseLedger() {
  const [builds, setBuilds] = useState<Build[]>(START_BUILDS);
  const [releases, setReleases] = useState<Release[]>(START_RELEASES);
  const [config, setConfig] = useState(1);
  const [live, setLive] = useState(100);

  const latest = releases[releases.length - 1];
  const liveRelease = releases.find((r) => r.id === live)!;
  const liveBuild = builds.find((b) => b.id === liveRelease.build)!;
  const merges = builds.length - 1;
  const nextIsBuggy = merges === 0;

  function addRelease(build: string, cfg: number, note: string) {
    const id = latest.id + 1;
    setReleases((rs) => [...rs, { id, build, config: cfg, note }]);
    setLive(id);
  }

  function merge() {
    if (builds.length >= COMMITS.length) return;
    const b: Build = { id: `build-${builds.length + 1}`, commit: COMMITS[builds.length], buggy: nextIsBuggy };
    setBuilds((bs) => [...bs, b]);
    addRelease(b.id, config, nextIsBuggy ? "New build: merged PRs (contains a bug)" : "New build: merged the fix");
  }

  function rotate() {
    const cfg = config + 1;
    setConfig(cfg);
    addRelease(liveRelease.build, cfg, "Same build, new config (DB password rotated)");
  }

  function reset() {
    setBuilds(START_BUILDS);
    setReleases(START_RELEASES);
    setConfig(1);
    setLive(100);
  }

  const full = releases.length >= 8;

  return (
    <Widget
      title="Release ledger"
      hint="Builds are code plus dependencies; a release is a build plus config. Make changes, then roll back by running an older release."
    >
      <div className={`rounded-lg px-3 py-2 text-sm ${liveBuild.buggy ? "bg-bad-soft" : "bg-good-soft"}`}>
        <strong>Live: release {live}</strong> ({liveBuild.id} @ {liveBuild.commit}, config v{liveRelease.config}).{" "}
        {liveBuild.buggy ? "Dashboards show a spike of 5xx errors." : "Error rate normal."}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={merge}
          disabled={full || builds.length >= COMMITS.length}
          className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
        >
          {nextIsBuggy ? "Merge PRs and deploy" : "Merge a fix and deploy"}
        </button>
        <button
          type="button"
          onClick={rotate}
          disabled={full}
          className="min-h-10 flex-1 rounded-lg border border-border px-3 text-sm disabled:opacity-40"
        >
          Rotate DB password
        </button>
        <button type="button" onClick={reset} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>

      <ol className="mt-4 space-y-2">
        {[...releases].reverse().map((r) => {
          const b = builds.find((x) => x.id === r.build)!;
          const isLive = r.id === live;
          return (
            <li
              key={r.id}
              className={`flex flex-wrap items-center gap-2 rounded-lg border p-2 text-sm ${isLive ? "border-accent bg-accent-soft" : "border-border"}`}
            >
              <span className="font-mono font-semibold">#{r.id}</span>
              <span className="font-mono text-[0.75rem]">
                {b.id}@{b.commit} + config v{r.config}
              </span>
              <span className="w-full text-muted sm:w-auto sm:flex-1">{r.note}</span>
              {b.buggy && <span className="rounded bg-bad-soft px-2 text-xs">buggy build</span>}
              <button
                type="button"
                onClick={() => setLive(r.id)}
                disabled={isLive}
                className="min-h-10 rounded-lg border border-border px-3 text-xs disabled:opacity-40"
              >
                {isLive ? "Running" : "Run this release"}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-muted">
        Rolling back rebuilds nothing and edits nothing: an old release ID still means exactly the same build and config it always
        did, so it can be live again in seconds.
      </p>
    </Widget>
  );
}
