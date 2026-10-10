import type { Question } from "@/lib/types";

const DOUBLES = ["Dummy", "Stub", "Spy", "Mock", "Fake", "Real dependency"];

export const quiz: Question[] = [
  {
    id: "testing-pick-doubles",
    lectures: [26],
    tags: ["test-doubles"],
    type: "scenario",
    prompt:
      "You're testing a shop's checkout service. For each dependency, pick the most fitting replacement:\n• The analytics client is required by the constructor, but the test never looks at analytics.\n• The tax-rate client must always return 18% so the total is predictable.\n• Many tests save carts and read them back; you want working storage without Postgres.\n• You need to assert the order-confirmation email was sent exactly once, by inspecting what was sent after the call.",
    fields: [
      { label: "Analytics client", options: DOUBLES, answer: "Dummy" },
      { label: "Tax-rate client", options: DOUBLES, answer: "Stub" },
      { label: "Cart storage", options: DOUBLES, answer: "Fake" },
      { label: "Mailer", options: DOUBLES, answer: "Spy" },
    ],
    explanation:
      "Unused but required is a dummy; a fixed canned answer is a stub; working simplified storage is a fake; recording calls to inspect afterwards is a spy. A mock would also work for the mailer, but a mock sets its expectations up front and fails on its own rather than being inspected afterwards.",
    lessonAnchor: "test-doubles",
  },
  {
    id: "testing-change-detector",
    lectures: [26],
    tags: ["state-vs-interaction"],
    type: "mcq",
    prompt:
      "A teammate refactors order shipping to publish one combined event instead of two separate ones. Subscribers receive exactly the same data. Forty tests go red, all of the form \"expect(bus.publish).toHaveBeenCalledTimes(2)\". What's the real problem?",
    options: [
      "The refactor introduced a regression and should be reverted",
      "The tests verify interactions instead of state, so they break on harmless implementation changes",
      "The event bus needs a contract test against the sandbox",
      "The tests should use a fake bus instead of a spy, and the counts would still be right",
    ],
    answer: "The tests verify interactions instead of state, so they break on harmless implementation changes",
    explanation:
      "Behaviour didn't change, only the implementation, so these are change-detector tests. Assert what subscribers end up with (state), and keep interaction checks for cases where the interaction itself matters, like an email sent exactly once.",
    lessonAnchor: "state-vs-interaction",
  },
  {
    id: "testing-payment-mock-prod",
    lectures: [26],
    tags: ["mocking", "third-party"],
    type: "scenario",
    prompt:
      "Production incident: every checkout fails after launch. Your tests mocked the payment provider's SDK to return { success: true }, and they all passed. The real API returns { status: \"succeeded\" }.\nHow should the test setup change?",
    fields: [
      {
        label: "What production code depends on",
        options: ["The provider's SDK directly", "A small PaymentGateway interface you own", "A global payment singleton", "Raw HTTP calls in each handler"],
        answer: "A small PaymentGateway interface you own",
      },
      {
        label: "What most tests replace",
        options: ["The provider's SDK", "Your PaymentGateway interface", "The HTTP library", "Nothing, they charge real cards"],
        answer: "Your PaymentGateway interface",
      },
      {
        label: "How you verify the real response shape",
        options: ["A few tests against the provider's sandbox", "A bigger mock with more fields", "Manual testing after each deploy", "Raising coverage to 100%"],
        answer: "A few tests against the provider's sandbox",
      },
    ],
    explanation:
      "Mocking an SDK you don't own only echoes your guesses about it. Wrap the provider behind an interface you own, double that interface in most tests, and keep a handful of sandbox tests that prove the wrapper matches the real API.",
    lessonAnchor: "do-not-mock-what-you-do-not-own",
  },
  {
    id: "testing-db-fake-fidelity",
    lectures: [26],
    tags: ["database", "integration"],
    type: "scenario",
    prompt:
      "Your repository tests run against an in-memory fake and pass, but production keeps hitting bugs: a misspelled column, a missing unique constraint, a JSONB operator the fake didn't support. Tests must stay fast and run in parallel.",
    fields: [
      {
        label: "What to test against",
        options: ["A more detailed in-memory fake", "A real Postgres started by Testcontainers", "A shared staging database", "SQLite in memory"],
        answer: "A real Postgres started by Testcontainers",
      },
      {
        label: "How each test gets a clean, isolated DB",
        options: ["TRUNCATE all tables after the suite", "A fresh copy of a migrated template database", "Run tests in alphabetical order", "Restart the container per test"],
        answer: "A fresh copy of a migrated template database",
      },
    ],
    explanation:
      "Those bugs live in exactly the layer a fake replaces, so test against real Postgres. Template databases give each test its own copy in milliseconds, which keeps tests isolated and parallel-safe; restarting a container per test would cost seconds each time.",
    lessonAnchor: "real-databases-in-tests",
  },
  {
    id: "testing-ci-sleep",
    lectures: [26],
    tags: ["flaky", "time"],
    type: "scenario",
    prompt:
      "A test enqueues a \"send receipt\" job, sleeps 100 ms, then checks the receipt exists. It passes locally but fails about once a day in CI. A second test checks that a cart reservation expires after 15 minutes and currently takes 15 real minutes.",
    fields: [
      {
        label: "Fix for the receipt test",
        options: ["Increase the sleep to 1 s", "Wait for a completion signal from the job", "Retry the test 3 times", "Run it only locally"],
        answer: "Wait for a completion signal from the job",
      },
      {
        label: "Fix for the expiry test",
        options: ["Inject a clock and advance it in the test", "Sleep 15 minutes in a nightly job", "Mock the database", "Lower the expiry to 1 s everywhere"],
        answer: "Inject a clock and advance it in the test",
      },
      {
        label: "Most likely flaky-test category for the first test",
        options: ["Async wait", "Concurrency race", "Test order dependency", "Network outage"],
        answer: "Async wait",
      },
    ],
    explanation:
      "Fixed sleeps guess at timing, and a busy CI machine beats the guess. Wait on a condition instead. Time-based logic becomes instant and deterministic when the code reads time from an injected clock you control.",
    lessonAnchor: "controlling-time",
  },
  {
    id: "testing-order-dependency",
    lectures: [26],
    tags: ["flaky"],
    type: "mcq",
    prompt:
      "After enabling parallel test runs, \"lists the user's orders\" fails randomly. It turns out it only passed because \"creates an order\" always ran first and left a row behind. Nobody has time to fix it this week. What's the best move?",
    options: [
      "Add automatic retries so the build stays green",
      "Quarantine it in a non-blocking suite with an owner, date and reason",
      "Disable parallelism for the whole suite permanently",
      "Leave it; the team knows it's flaky",
    ],
    answer: "Quarantine it in a non-blocking suite with an owner, date and reason",
    explanation:
      "This is a test order dependency. Quarantining keeps the main suite trustworthy while the test still runs and has someone accountable for it. Auto-retry teaches the team to ignore red builds and can hide real races.",
    lessonAnchor: "flaky-tests",
  },
  {
    id: "testing-coverage-bug",
    lectures: [26],
    tags: ["coverage", "mutation"],
    type: "scenario",
    prompt:
      "The rule is free shipping for orders of 50 or more. The code says if (total > 50). The test suite has 100% line coverage and 100% branch coverage using totals of 20 and 80, and it's green. A customer with a 50.00 order gets charged.",
    fields: [
      {
        label: "Why coverage didn't catch it",
        options: [
          "Coverage shows code ran, not that the boundary was checked",
          "Branch coverage was too low",
          "The tests had no assertions",
          "Coverage tools ignore if statements",
        ],
        answer: "Coverage shows code ran, not that the boundary was checked",
      },
      {
        label: "Tool that would have flagged the weak tests",
        options: ["Mutation testing", "A formatter", "Higher line coverage", "A type checker"],
        answer: "Mutation testing",
      },
      {
        label: "Missing test input",
        options: ["total = 50", "total = 0", "total = 1000", "total = -1"],
        answer: "total = 50",
      },
    ],
    explanation:
      "Both directions of the if ran, so coverage was perfect, but no test sat on the boundary. A mutant swapping >= and > would survive this suite, which is exactly the signal mutation testing gives you.",
    lessonAnchor: "mutation-testing",
  },
  {
    id: "testing-tdd-order",
    lectures: [26],
    tags: ["tdd"],
    type: "order",
    prompt: "You're adding the rule \"an unpaid order can't be shipped\" using TDD. Put the steps in order.",
    steps: [
      "Write a test that ships a pending order and expects an error",
      "Run it and watch it fail",
      "Add the smallest if statement that makes it pass",
      "Run it and watch it pass",
      "Extract the rule into a pure canTransition(from, to) function",
      "Rerun the suite and confirm it is still green",
    ],
    explanation:
      "Red (write and see it fail, which proves the test checks something), green (minimal code), then refactor while keeping the suite green. Skipping the refactor leaves the deliberately quick-and-dirty green code in place.",
    lessonAnchor: "red-green-refactor",
  },
  {
    id: "testing-tdd-fit",
    lectures: [26],
    tags: ["tdd"],
    type: "mcq",
    prompt: "Which of these tasks is the best fit for test-driven development?",
    options: [
      "Prototyping three different designs for a recommendations feature",
      "Implementing a tax calculator whose rates and rounding rules are fully specified",
      "Exploring an unfamiliar third-party API to see what it can do",
      "Tuning a slow dashboard query by trial and error",
    ],
    answer: "Implementing a tax calculator whose rates and rounding rules are fully specified",
    explanation:
      "TDD works best when the expected output is known but the implementation isn't: pricing, parsers, state machines. When you're still discovering what the answer should be, writing tests first mostly produces tests you'll throw away.",
    lessonAnchor: "when-tdd-fits",
  },
  {
    id: "testing-sizes",
    lectures: [26],
    tags: ["test-sizes"],
    type: "scenario",
    prompt:
      "Classify each test by what it's allowed to touch:\n• Calls the pricing function directly with in-memory values.\n• Runs repository queries against Postgres in a local container.\n• Logs in through the real auth provider and places an order on staging.",
    fields: [
      { label: "Pricing test", options: ["Small", "Medium", "Large"], answer: "Small" },
      { label: "Repository test", options: ["Small", "Medium", "Large"], answer: "Medium" },
      { label: "Staging checkout test", options: ["Small", "Medium", "Large"], answer: "Large" },
    ],
    explanation:
      "Small tests stay in one process; medium tests may use things on the same machine (local containers) but not the internet; large tests can touch anything. Unlike \"unit vs integration\", a machine can enforce these rules.",
    lessonAnchor: "test-sizes",
  },
  {
    id: "testing-complexity",
    lectures: [26],
    tags: ["complexity"],
    type: "mcq",
    prompt:
      "A linter flags a function that maps 25 country codes to currencies in one flat switch statement: cyclomatic complexity 26. Another function scores 7 but has an if inside a loop inside another if inside a try. Which reading is most sensible?",
    options: [
      "Split the switch immediately; anything above 10 must be refactored",
      "The switch is likely fine; the nested function is the one hard to read, which cognitive complexity would show",
      "Both are fine because neither has a bug",
      "Cyclomatic complexity proves the nested function is simpler",
    ],
    answer: "The switch is likely fine; the nested function is the one hard to read, which cognitive complexity would show",
    explanation:
      "A flat switch inflates the path count while staying easy to read, the classic exception to the 10 guideline. Cognitive complexity penalises nesting, so it flags the second function. Both metrics are prompts for a human look, not verdicts.",
    lessonAnchor: "complexity-metrics",
  },
];
