import type { Question } from "@/lib/types";

const STRATEGIES = ["Recreate", "Rolling update", "Blue-green", "Canary"];

export const quiz: Question[] = [
  {
    id: "devops-monthly-release",
    lectures: [30],
    tags: ["dora", "ci"],
    type: "scenario",
    prompt:
      "Your team ships a big release once a month. Each one bundles ~200 commits, and when something breaks it takes a day to find which change caused it. Management suggests releasing even less often to reduce risk.",
    fields: [
      {
        label: "What the DORA research suggests",
        options: [
          "Deploy smaller changes more often; frequency and stability rise together",
          "Release less often; fewer deploys means fewer failures",
          "Keep monthly releases but add a week of manual QA",
          "Speed and stability are a trade-off; pick one",
        ],
        answer: "Deploy smaller changes more often; frequency and stability rise together",
      },
      {
        label: "Branching model to adopt",
        options: [
          "Trunk-based with short-lived branches and feature flags",
          "Git Flow with release branches",
          "One long-lived branch per developer",
          "Merge feature branches only when the feature is complete",
        ],
        answer: "Trunk-based with short-lived branches and feature flags",
      },
    ],
    explanation:
      "Top DORA performers deploy on demand and have the lowest failure rates, because a one-change deploy is easy to diagnose and roll back. Trunk-based development keeps branches to a day or two; feature flags let unfinished work merge without being visible. Git Flow suits installed, versioned software.",
    lessonAnchor: "measuring-delivery-with-dora",
  },
  {
    id: "devops-broken-on-server",
    lectures: [30],
    tags: ["builds", "containers"],
    type: "scenario",
    prompt:
      "A build that passed CI fails on the server: the lock file was git-ignored, CI ran npm install and picked up a newer minor version of a library, and the server has Node 18 while the code uses a Node 22 API.",
    fields: [
      {
        label: "Dependency fix",
        options: [
          "Commit package-lock.json and install with npm ci",
          "Run npm install twice",
          "Use ^ ranges for every dependency",
          "Delete node_modules before each build",
        ],
        answer: "Commit package-lock.json and install with npm ci",
      },
      {
        label: "Runtime fix",
        options: [
          "Ship a container image with a pinned node:22.x base",
          "Upgrade Node on the server by hand",
          "Use node:latest as the base image",
          "Ask everyone to develop on Node 18",
        ],
        answer: "Ship a container image with a pinned node:22.x base",
      },
    ],
    explanation:
      "A committed lock file plus npm ci makes the dependency tree reproducible. Packaging the runtime into a pinned image ships the environment with the code; hand-upgrading the server creates a snowflake, and latest makes next month's build different from today's.",
    lessonAnchor: "reproducible-builds",
  },
  {
    id: "devops-oidc",
    lectures: [30],
    tags: ["ci", "security"],
    type: "mcq",
    prompt:
      "Your deploy workflow uses a long-lived AWS access key stored as a repository secret. A third-party action you use is compromised and exfiltrates environment variables. What setup would have limited the damage most?",
    options: [
      "OIDC: GitHub issues a short-lived token per job, and AWS trusts it only for this repo and main branch",
      "Store the key in a GitHub environment secret instead of a repository secret",
      "Base64-encode the key so it isn't readable in logs",
      "Rotate the key once a year",
    ],
    answer: "OIDC: GitHub issues a short-lived token per job, and AWS trusts it only for this repo and main branch",
    explanation:
      "With OIDC there's no permanent credential to steal; the temporary credentials expire when the job ends and are scoped by repo and branch claims. Moving or encoding a long-lived key doesn't change that it works from anywhere until rotated.",
    lessonAnchor: "cloud-credentials-with-oidc",
  },
  {
    id: "devops-which-version-running",
    lectures: [30],
    tags: ["versioning"],
    type: "mcq",
    prompt:
      "After a deploy, users still see an old bug. You need to know exactly what code production is running. What should your service's deployment version be?",
    options: [
      "The commit hash, used as the image tag and exposed on a health/info endpoint",
      "A semver number bumped by hand on each release",
      "The tag latest, always pointing at the newest image",
      "The build date in YYYY-MM-DD format",
    ],
    answer: "The commit hash, used as the image tag and exposed on a health/info endpoint",
    explanation:
      "A deployed service's version is for operators, not API users, so the commit hash is the most precise identifier. Semver communicates compatibility to library users, and latest tells you nothing about which build is actually running.",
    lessonAnchor: "versioning-a-service",
  },
  {
    id: "devops-oomkilled",
    lectures: [30],
    tags: ["containers", "kubernetes"],
    type: "scenario",
    prompt:
      "The notes-api pod keeps restarting with status OOMKilled during a large export. Its spec has limits: memory 512Mi. A teammate thinks Kubernetes itself is killing the pod.",
    fields: [
      {
        label: "Kernel feature enforcing the limit",
        options: ["cgroups", "PID namespace", "Network namespace", "OverlayFS"],
        answer: "cgroups",
      },
      {
        label: "Where the limit is written",
        options: ["memory.max in the pod's cgroup directory", "/etc/hosts in the container", "The image manifest", "etcd only"],
        answer: "memory.max in the pod's cgroup directory",
      },
      {
        label: "Who actually kills the process",
        options: ["The kernel's OOM killer", "The scheduler", "The API server", "The registry"],
        answer: "The kernel's OOM killer",
      },
    ],
    explanation:
      "Namespaces control what a process sees; cgroups control how much it uses. The kubelet writes the 512Mi limit into memory.max, and when the process exceeds it the kernel's OOM killer terminates it. Kubernetes then reports OOMKilled and restarts the container.",
    lessonAnchor: "control-groups",
  },
  {
    id: "devops-slow-docker-build",
    lectures: [30],
    tags: ["docker", "builds"],
    type: "scenario",
    prompt:
      "Every one-line code change triggers a 50-second npm ci in your Docker build, and the final Go image for another service is 900 MB because it contains the whole toolchain.",
    fields: [
      {
        label: "Node Dockerfile fix",
        options: [
          "COPY package.json and the lock file, RUN npm ci, then COPY . .",
          "COPY . . then RUN npm ci --prefer-offline",
          "Put RUN npm ci at the very end",
          "Disable the build cache",
        ],
        answer: "COPY package.json and the lock file, RUN npm ci, then COPY . .",
      },
      {
        label: "Go image fix",
        options: [
          "Multi-stage build: compile in golang, copy only the binary into a tiny base",
          "Use golang:latest",
          "Run go build when the container starts",
          "Squash all layers into one",
        ],
        answer: "Multi-stage build: compile in golang, copy only the binary into a tiny base",
      },
    ],
    explanation:
      "The cache is reused until the first instruction whose inputs changed; copying all source first means every edit invalidates the install. A multi-stage build leaves the compiler behind, so the shipped image holds just the binary.",
    lessonAnchor: "writing-a-good-dockerfile",
  },
  {
    id: "devops-liveness-db",
    lectures: [30],
    tags: ["kubernetes", "probes"],
    type: "scenario",
    prompt:
      "Production incident: the database had a slow minute, and suddenly all 12 API pods restarted at once, which made the database even slower. The pods' liveness probe calls /health, which runs SELECT 1 against the database.",
    fields: [
      {
        label: "What liveness should check",
        options: [
          "Only that the process isn't stuck (e.g. responds at all)",
          "Database and every downstream API",
          "CPU usage below 80%",
          "That the latest image is running",
        ],
        answer: "Only that the process isn't stuck (e.g. responds at all)",
      },
      {
        label: "Probe that may check dependencies",
        options: ["Readiness", "Liveness", "Startup", "None of them"],
        answer: "Readiness",
      },
      {
        label: "What a failing readiness probe does",
        options: [
          "Removes the pod from Service endpoints, no restart",
          "Restarts the container",
          "Deletes the Deployment",
          "Reschedules the pod to another node",
        ],
        answer: "Removes the pod from Service endpoints, no restart",
      },
    ],
    explanation:
      "Liveness failures restart containers, so tying liveness to a shared dependency causes restart storms. Readiness failures just stop traffic to that pod until it recovers, which is the right reaction to a temporarily unavailable dependency.",
    lessonAnchor: "probes",
  },
  {
    id: "devops-pick-strategy",
    lectures: [30],
    tags: ["deployments"],
    type: "scenario",
    prompt: "Pick a deployment strategy for each situation.",
    fields: [
      {
        label: "Internal admin tool, a few seconds of downtime at 3 a.m. is fine, simplest option",
        options: STRATEGIES,
        answer: "Recreate",
      },
      {
        label: "Payments API: v1 and v2 must never serve at the same time, and rollback must be instant",
        options: STRATEGIES,
        answer: "Blue-green",
      },
      {
        label: "Risky search rewrite: expose it to a small share of real users and compare error rates first",
        options: STRATEGIES,
        answer: "Canary",
      },
      {
        label: "Default Kubernetes rollout for a backward-compatible change, no extra environment",
        options: STRATEGIES,
        answer: "Rolling update",
      },
    ],
    explanation:
      "Recreate is simplest but has a downtime gap. Blue-green keeps exactly one version live and rolls back by flipping the router, at double the infrastructure. Canary limits the blast radius using real traffic. Rolling is zero-downtime and cheap, but both versions serve traffic during the rollout.",
    lessonAnchor: "deployment-strategies",
  },
  {
    id: "devops-gitops-drift",
    lectures: [30],
    tags: ["gitops", "iac"],
    type: "mcq",
    prompt:
      "During an incident, an engineer runs kubectl scale to bump notes-api to 20 replicas directly in the cluster. Ten minutes later it's back to 3. The cluster is managed with Argo CD. What happened, and what should they have done?",
    options: [
      "The GitOps agent reverted drift from Git; change replicas in the Git repo (a PR) instead",
      "The HPA crashed; restart it",
      "Kubernetes has a hard cap of 3 replicas per Deployment",
      "kubectl changes always expire after 10 minutes",
    ],
    answer: "The GitOps agent reverted drift from Git; change replicas in the Git repo (a PR) instead",
    explanation:
      "In GitOps, Git is the single source of truth and the in-cluster agent continuously reapplies it, so manual changes are treated as drift and undone. The durable fix is a reviewed commit, which is also recorded and reversible.",
    lessonAnchor: "gitops",
  },
  {
    id: "devops-terraform-state",
    lectures: [30],
    tags: ["iac", "terraform"],
    type: "scenario",
    prompt:
      "Two engineers each run terraform apply from their laptops with their own local state files, and one of them commits terraform.tfstate to the repo so the other can use it.",
    fields: [
      {
        label: "Where state should live",
        options: [
          "A remote backend with locking and encryption",
          "Committed in Git next to the code",
          "On each engineer's laptop",
          "Nowhere; Terraform can rebuild it from code",
        ],
        answer: "A remote backend with locking and encryption",
      },
      {
        label: "Why committing it is dangerous",
        options: [
          "State contains every resource attribute, including secrets",
          "Git can't store JSON files",
          "It makes terraform plan slower",
          "Terraform refuses to read committed state",
        ],
        answer: "State contains every resource attribute, including secrets",
      },
    ],
    explanation:
      "Separate state copies make applies overwrite each other; a shared remote backend with locking prevents that. State holds passwords and keys in plain attributes, so it must be stored encrypted and never in Git. Lose it and Terraform plans to recreate everything.",
    lessonAnchor: "terraform-state",
  },
  {
    id: "devops-error-budget",
    lectures: [30],
    tags: ["sre", "slo"],
    type: "scenario",
    prompt:
      "Your notes API has an availability SLO of 99.9% over 30 days. It's the 23rd, and outages this month have totalled 50 minutes. The product team wants to ship a large new feature tomorrow.",
    fields: [
      {
        label: "Monthly error budget",
        options: ["About 43 minutes", "About 4 minutes", "About 7 hours", "About 52 minutes"],
        answer: "About 43 minutes",
      },
      {
        label: "What to do",
        options: [
          "Freeze feature deploys and spend the time on reliability until the window resets",
          "Ship it; budgets are only guidelines",
          "Lower the SLO to 99% for this month",
          "Ship it but skip the canary to save time",
        ],
        answer: "Freeze feature deploys and spend the time on reliability until the window resets",
      },
    ],
    explanation:
      "0.1% of 30 days is about 43 minutes, and 50 minutes means the budget is overspent. The agreed policy is to pause risky changes and invest in reliability; moving the goalposts mid-month defeats the point of having an SLO. 52 minutes is the yearly budget at 99.99%.",
    lessonAnchor: "slis-slos-and-error-budgets",
  },
  {
    id: "devops-incident-order",
    lectures: [30],
    tags: ["incidents"],
    type: "order",
    prompt: "A deploy at 14:02 causes 40% of requests to fail. Put the incident response in the right order.",
    steps: [
      "On-call engineer is paged by the SLO alert",
      "Assign an incident commander, fixers and a communicator",
      "Roll back the 14:02 deploy to stop the damage",
      "Confirm error rates are back to normal",
      "Find the root cause and ship a proper fix",
      "Publish a blameless postmortem with timeline, impact and follow-ups",
    ],
    explanation:
      "Mitigation comes before diagnosis: restore service first (rollback or flag off), then investigate calmly. The postmortem comes last, once the root cause is known, and focuses on systems rather than blaming people.",
    lessonAnchor: "on-call-and-incidents",
  },
];
