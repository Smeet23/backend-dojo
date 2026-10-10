import type { Question } from "@/lib/types";

const ATTACKS = ["CSRF", "Stored XSS", "Reflected XSS", "DOM-based XSS", "SQL injection", "CORS misconfiguration"];

export const quiz: Question[] = [
  {
    id: "hld-attack-classify",
    lectures: [32],
    tags: ["classification"],
    type: "scenario",
    prompt:
      "Three incident reports land on your desk:\n• A: Users who opened a forum thread had their accounts post spam. The thread's first comment contained a script tag.\n• B: A user visited a cat-photo site and their email address on your app was changed. Your app uses cookie sessions.\n• C: Your SPA reads location.hash and writes it into innerHTML to show a welcome message. A crafted link ran script.\nName each attack.",
    fields: [
      { label: "Report A", options: ATTACKS, answer: "Stored XSS" },
      { label: "Report B", options: ATTACKS, answer: "CSRF" },
      { label: "Report C", options: ATTACKS, answer: "DOM-based XSS" },
    ],
    explanation:
      "A's payload was saved and served to every viewer (stored). B's attacker never ran code on your site; their page made the victim's browser send an authenticated request (CSRF). C's bug is entirely in client JavaScript writing an attacker-controlled source into a dangerous sink (DOM-based).",
    lessonAnchor: "stored-xss",
  },
  {
    id: "hld-attack-csrf-fix",
    lectures: [32],
    tags: ["csrf", "cookies"],
    type: "scenario",
    prompt:
      "Your banking app uses a session cookie with no SameSite attribute set explicitly, and POST /transfer has no other checks. A security audit flags CSRF.\nPick the cookie setting and the server-side check.",
    fields: [
      {
        label: "Session cookie",
        options: ["SameSite=None; Secure", "SameSite=Lax (or Strict); HttpOnly; Secure", "No attributes", "Store it in localStorage instead"],
        answer: "SameSite=Lax (or Strict); HttpOnly; Secure",
      },
      {
        label: "On POST /transfer",
        options: ["Verify a per-session CSRF token", "Check the User-Agent header", "Rely on CORS", "Require HTTPS only"],
        answer: "Verify a per-session CSRF token",
      },
    ],
    explanation:
      "Lax stops browsers attaching the cookie to cross-site POSTs, and the CSRF token is something an attacker's page can't read, so forged requests fail even in browsers or flows where the cookie is still sent. CORS and HTTPS don't stop a forged form POST.",
    lessonAnchor: "defenses",
  },
  {
    id: "hld-attack-lax-get",
    lectures: [32],
    tags: ["csrf", "samesite"],
    type: "mcq",
    prompt:
      "Your session cookie is SameSite=Lax. A legacy endpoint GET /account/delete?confirm=yes deletes the account. Is it protected from CSRF?",
    options: [
      "No: Lax still sends the cookie on cross-site top-level GET navigations, so a link can trigger it",
      "Yes: Lax blocks all cross-site requests",
      "Yes: GET requests can't carry cookies",
      "No, but only because the cookie isn't HttpOnly",
    ],
    answer: "No: Lax still sends the cookie on cross-site top-level GET navigations, so a link can trigger it",
    explanation:
      "Lax deliberately allows top-level GET navigation so links from other sites arrive logged in. That's safe only if GET has no side effects; make destructive actions POST (or DELETE) with a CSRF token.",
    lessonAnchor: "defenses",
  },
  {
    id: "hld-attack-xss-react",
    lectures: [32],
    tags: ["xss", "output-encoding"],
    type: "mcq",
    prompt:
      "Your React app renders user bios. To support bold and links, a developer switched from rendering {bio} to dangerouslySetInnerHTML with the raw bio. What's the right way to keep rich text without opening XSS?",
    options: [
      "Run the HTML through an allowlist sanitiser such as DOMPurify before rendering, and add a strict CSP",
      "Strip the word 'script' from bios with a regex",
      "Set the session cookie to SameSite=Strict",
      "Validate bios are under 500 characters",
    ],
    answer: "Run the HTML through an allowlist sanitiser such as DOMPurify before rendering, and add a strict CSP",
    explanation:
      "Opting out of escaping means you must sanitise with a maintained allowlist sanitiser; regex blocklists are easily bypassed (event handler attributes don't contain 'script'). SameSite is a CSRF control and does nothing for script already running on your origin.",
    lessonAnchor: "defenses-1",
  },
  {
    id: "hld-attack-httponly",
    lectures: [32],
    tags: ["xss", "cookies"],
    type: "mcq",
    prompt:
      "Your session cookie is HttpOnly. A stored XSS bug is found in the comments page. A teammate says 'we're fine, the script can't read the cookie'. What's wrong with that?",
    options: [
      "The script can still call your API as the user from their browser, and read any CSRF token on the page",
      "HttpOnly only works over HTTP, not HTTPS",
      "Nothing; HttpOnly fully prevents XSS damage",
      "HttpOnly cookies are sent to every origin",
    ],
    answer: "The script can still call your API as the user from their browser, and read any CSRF token on the page",
    explanation:
      "HttpOnly stops cookie theft, which limits damage after the tab closes, but injected script runs on your origin and can do anything the user can while the page is open. Fix the encoding bug.",
    lessonAnchor: "xss",
  },
  {
    id: "hld-attack-cors-myth",
    lectures: [32],
    tags: ["cors"],
    type: "scenario",
    prompt:
      "Your API sets Access-Control-Allow-Origin: https://app.example.com. A teammate concludes: 'only our frontend can call the API now, so we can skip auth on the internal admin endpoints.'\nRespond.",
    fields: [
      {
        label: "Can a script using curl call the admin endpoints?",
        options: ["No, CORS blocks it", "Yes, CORS is only enforced by browsers", "Only with a preflight", "Only from the same IP"],
        answer: "Yes, CORS is only enforced by browsers",
      },
      {
        label: "Does CORS stop a forged form POST from evil.com?",
        options: ["Yes, the Origin is rejected", "No, the request is still sent; CORS only hides the response", "Yes, if credentials are included", "Only for JSON bodies"],
        answer: "No, the request is still sent; CORS only hides the response",
      },
    ],
    explanation:
      "CORS relaxes the browser's same-origin policy for reading responses. Non-browser clients ignore it entirely, and simple cross-origin requests still reach the server. Every endpoint needs real authentication and authorisation.",
    lessonAnchor: "why-cors-is-not-a-defense",
  },
  {
    id: "hld-attack-cors-reflect",
    lectures: [32],
    tags: ["cors", "misconfiguration"],
    type: "mcq",
    prompt:
      "To fix 'CORS errors' quickly, a developer made the API echo whatever Origin header arrives into Access-Control-Allow-Origin, with Access-Control-Allow-Credentials: true. What's the impact?",
    options: [
      "Any website can make a logged-in user's browser fetch their private data and read the response",
      "None; it's equivalent to the wildcard *",
      "It only affects non-browser clients",
      "It blocks all cross-origin requests",
    ],
    answer: "Any website can make a logged-in user's browser fetch their private data and read the response",
    explanation:
      "Reflecting the origin with credentials allowed grants every site read access to authenticated responses. The wildcard * is actually safer, because browsers refuse to combine it with credentials. Use an explicit allowlist.",
    lessonAnchor: "misconfigurations-that-create-holes",
  },
  {
    id: "hld-attack-sqli-sort",
    lectures: [32],
    tags: ["sql-injection"],
    type: "scenario",
    prompt:
      "A product search endpoint builds: \"SELECT * FROM products WHERE name ILIKE '%\" + q + \"%' ORDER BY \" + sort.\nFix each part.",
    fields: [
      {
        label: "The search term q",
        options: ["Escape quotes by hand", "Bind it as a query parameter", "Block inputs containing OR", "Base64-encode it"],
        answer: "Bind it as a query parameter",
      },
      {
        label: "The sort column",
        options: ["Bind it as a query parameter", "Map it to a fixed allowlist of columns", "Escape quotes by hand", "Uppercase it"],
        answer: "Map it to a fixed allowlist of columns",
      },
    ],
    explanation:
      "Values like q belong in placeholders so they can never change the query's grammar. Placeholders can't stand in for identifiers like column names, so ORDER BY must come from a fixed allowlist; hand escaping and blocklists are fragile.",
    lessonAnchor: "defenses-2",
  },
  {
    id: "hld-attack-sqli-layers",
    lectures: [32],
    tags: ["sql-injection", "defense-in-depth"],
    type: "mcq",
    prompt:
      "Your read-only reporting service connects to Postgres as a superuser and returns raw database errors to clients. All queries are already parameterised. What's the most valuable additional hardening?",
    options: [
      "Use a least-privilege read-only DB role and return generic errors",
      "Remove parameterisation and validate inputs instead",
      "Add CORS headers to the reporting API",
      "Switch to a NoSQL database",
    ],
    answer: "Use a least-privilege read-only DB role and return generic errors",
    explanation:
      "Defense in depth: if an injection ever slips in through a raw query, a read-only role limits the damage, and generic errors stop attackers mapping your schema. CORS is unrelated, and NoSQL stores have their own injection bugs.",
    lessonAnchor: "defenses-2",
  },
];
