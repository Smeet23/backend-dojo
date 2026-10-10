import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "security-sqli-fix",
    lectures: [20],
    tags: ["injection", "sql"],
    type: "scenario",
    prompt:
      "Security review of your notes app's search endpoint:\nconst sql = \"SELECT * FROM notes WHERE user_id = \" + userId + \" AND title LIKE '%\" + q + \"%' ORDER BY \" + sortColumn;\nq and sortColumn both come from query parameters. Choose the fix for each.",
    fields: [
      {
        label: "The search term q",
        options: ["Escape quotes with a regex", "Pass it as a bound parameter ($2)", "Base64-encode it", "Reject requests containing SQL keywords"],
        answer: "Pass it as a bound parameter ($2)",
      },
      {
        label: "The sortColumn",
        options: ["Pass it as a bound parameter", "Map it through an allowlist of known column names", "Wrap it in quotes", "Trust it, since the frontend only offers valid columns"],
        answer: "Map it through an allowlist of known column names",
      },
    ],
    explanation:
      "Values belong in parameters, where the database treats them strictly as data. Identifiers like column names can't be parameterized, so map the user's choice to a fixed set. Hand-rolled escaping and keyword blocklists miss edge cases, and the frontend's dropdown is no protection against a modified request.",
    lessonAnchor: "parameterized-queries",
  },
  {
    id: "security-command-injection",
    lectures: [20],
    tags: ["injection", "shell"],
    type: "mcq",
    prompt:
      "Your shop resizes uploaded product photos with exec(`convert in.png -resize 800x800 ${req.body.outputName}`). What's the right fix?",
    options: [
      "Strip semicolons from outputName",
      "Use execFile/spawn with the arguments as an array, and generate the output name on the server",
      "Run the command inside a try/catch",
      "Only allow logged-in sellers to upload",
    ],
    answer: "Use execFile/spawn with the arguments as an array, and generate the output name on the server",
    explanation:
      "Passing arguments as an array skips the shell, so special characters are never interpreted as commands. Stripping one character misses pipes, ampersands and shell-specific tricks, and authentication doesn't stop a malicious logged-in user.",
    lessonAnchor: "command-injection",
  },
  {
    id: "security-password-storage",
    lectures: [20],
    tags: ["passwords", "hashing"],
    type: "mcq",
    prompt:
      "A legacy service stores passwords as sha256(salt + password) with a random per-user salt. The table leaks. Which statement is most accurate?",
    options: [
      "Safe: salting defeats every offline attack",
      "Rainbow tables now work because the salt is stored in the same row",
      "Rainbow tables fail, but a GPU can still try billions of guesses per second per user, so weak passwords fall quickly",
      "Safe, because SHA-256 can't be reversed",
    ],
    answer: "Rainbow tables fail, but a GPU can still try billions of guesses per second per user, so weak passwords fall quickly",
    explanation:
      "Salts make every hash unique, which kills precomputed tables, but SHA-256 is designed to be fast. Migrate to a slow password hash like Argon2id, scrypt or bcrypt (for example, rehash each user at their next login).",
    lessonAnchor: "slow-hashes",
  },
  {
    id: "security-session-cookie",
    lectures: [20],
    tags: ["sessions", "cookies"],
    type: "scenario",
    prompt:
      "You're issuing session cookies for app.notes.dev, whose API is on the same site. Users often arrive by clicking links in emails. Configure the session.",
    fields: [
      { label: "Session ID", options: ["Auto-increment integer", "Hash of the user's email", "128+ bits from a CSPRNG", "Current timestamp in ms"], answer: "128+ bits from a CSPRNG" },
      { label: "Readable by JavaScript?", options: ["Yes, so the SPA can read it", "No: HttpOnly"], answer: "No: HttpOnly" },
      { label: "SameSite", options: ["None", "Lax", "Not set"], answer: "Lax" },
    ],
    explanation:
      "Session IDs must be unguessable, so use a CSPRNG; anything derived from user data or a counter can be predicted. HttpOnly keeps the ID away from XSS. Lax blocks cross-site POSTs while keeping users logged in when they follow an email link (Strict would show them logged out on that first click).",
    lessonAnchor: "cookie-flags",
  },
  {
    id: "security-jwt-payload",
    lectures: [20],
    tags: ["jwt"],
    type: "mcq",
    prompt:
      "A teammate wants to put the user's date of birth and home address into the JWT payload \"since it's signed, so nobody can see or change it\". What's wrong with that reasoning?",
    options: [
      "Nothing; signed tokens are encrypted",
      "Signing stops changes, but the payload is only Base64-encoded, so anyone holding the token can read it",
      "Signing doesn't prevent changes, only reading",
      "JWTs can't contain more than three claims",
    ],
    answer: "Signing stops changes, but the payload is only Base64-encoded, so anyone holding the token can read it",
    explanation:
      "A valid signature proves the payload hasn't been altered, but anyone can decode it. Keep payloads to non-sensitive claims like the user ID, role and expiry.",
    lessonAnchor: "the-payload-is-readable",
  },
  {
    id: "security-jwt-revocation",
    lectures: [20],
    tags: ["jwt", "sessions"],
    type: "scenario",
    prompt:
      "Support ticket: \"My account was hacked, please sign me out of every device now.\" Your API uses stateless JWTs that expire after 30 days, stored in localStorage.",
    fields: [
      {
        label: "Can you do it today?",
        options: ["Yes, delete the user's session rows", "No, valid tokens keep working until they expire", "Yes, the JWT library can unsign tokens", "Yes, change the user's password and tokens die"],
        answer: "No, valid tokens keep working until they expire",
      },
      {
        label: "Best redesign",
        options: ["Make tokens last 90 days", "Short-lived access tokens plus revocable, rotating refresh tokens stored server-side", "Put the password hash in the payload", "Move the token to sessionStorage"],
        answer: "Short-lived access tokens plus revocable, rotating refresh tokens stored server-side",
      },
    ],
    explanation:
      "A stateless token stays valid until exp, and changing the password doesn't touch already-issued tokens. Short access tokens limit the damage window, and revoking the server-side refresh tokens ends every device's session within minutes. Server-side sessions would make this instant.",
    lessonAnchor: "revocation",
  },
  {
    id: "security-rate-limit-spray",
    lectures: [20],
    tags: ["rate-limiting", "auth"],
    type: "mcq",
    prompt:
      "Your login endpoint limits 10 attempts per IP per minute and locks an account after 5 failures. Logs show 4,000 failed logins in the last minute, each from a different IP and each against a different account, all with the password \"Summer2026!\". What's missing?",
    options: [
      "A stricter per-IP limit",
      "A global failed-login limit that alerts the team and turns on CAPTCHAs",
      "A longer account lockout",
      "Nothing; no single account had more than one failure",
    ],
    answer: "A global failed-login limit that alerts the team and turns on CAPTCHAs",
    explanation:
      "This is password spraying: one guess per account from rotating IPs, which slips under per-IP and per-account limits. Only a system-wide view of failures notices it.",
    lessonAnchor: "rate-limiting",
  },
  {
    id: "security-bola-invoice",
    lectures: [20],
    tags: ["authorization", "bola"],
    type: "scenario",
    prompt:
      "A pen tester logs in as customer A, calls GET /invoices/5 and receives customer B's invoice. The route has requireAuth and requires read:invoices.",
    fields: [
      { label: "Vulnerability", options: ["SQL injection", "BOLA", "BFLA", "CSRF"], answer: "BOLA" },
      {
        label: "Fix",
        options: [
          "SELECT * FROM invoices WHERE id = $1 AND account_id = $2 (caller's account)",
          "Hide invoice IDs in the frontend",
          "Add another requireAuth middleware",
          "Require the read:all-invoices permission",
        ],
        answer: "SELECT * FROM invoices WHERE id = $1 AND account_id = $2 (caller's account)",
      },
      { label: "Response when no row matches", options: ["403 Forbidden", "404 Not Found", "401 Unauthorized", "200 OK with an empty body"], answer: "404 Not Found" },
    ],
    explanation:
      "Authentication and the permission passed, but nobody checked access to this specific object. Scope the query to the caller's account, and return 404 when nothing matches so attackers can't tell \"exists but not yours\" from \"doesn't exist\".",
    lessonAnchor: "bola",
  },
  {
    id: "security-bfla-admin",
    lectures: [20],
    tags: ["authorization", "bfla"],
    type: "scenario",
    prompt:
      "GET /admin/users returns every user's email. It only checks that the caller is logged in; the team assumed no member would find the URL. A member found it in the JavaScript bundle.",
    fields: [
      { label: "Category", options: ["Horizontal escalation (BOLA)", "Vertical escalation (BFLA)", "Stored XSS", "Misconfigured CORS"], answer: "Vertical escalation (BFLA)" },
      { label: "Fix", options: ["Rename the route to something harder to guess", "Add a role check requiring admin", "Switch to UUIDs", "Add rate limiting"], answer: "Add a role check requiring admin" },
    ],
    explanation:
      "A member reached a function above their role, which is vertical escalation. Obscurity was the only protection. An explicit role check, ideally in a central default-deny authorization layer, is the real fix.",
    lessonAnchor: "bfla",
  },
  {
    id: "security-xss-comments",
    lectures: [20],
    tags: ["xss"],
    type: "scenario",
    prompt:
      "Your notes app renders Markdown comments as HTML with dangerouslySetInnerHTML. A comment containing a script tag ran in every viewer's browser.",
    fields: [
      { label: "Type of XSS", options: ["Stored", "Reflected", "DOM-based", "Not XSS, it's CSRF"], answer: "Stored" },
      {
        label: "Primary fix",
        options: ["Add a CSP header and change nothing else", "Run the generated HTML through an allowlist sanitizer library", "Strip the word script with a regex", "Make session cookies Secure"],
        answer: "Run the generated HTML through an allowlist sanitizer library",
      },
      {
        label: "Last line of defense",
        options: ["CSP blocking inline scripts", "CORS allowing only your origin", "SameSite=None", "Sequential IDs"],
        answer: "CSP blocking inline scripts",
      },
    ],
    explanation:
      "The payload was saved and served to everyone, which makes it stored XSS. A maintained allowlist sanitizer fixes the root cause; regex filters are easily bypassed. CSP is the backstop that stops injected scripts from running if something still slips through.",
    lessonAnchor: "defending-against-xss",
  },
  {
    id: "security-csrf",
    lectures: [20],
    tags: ["csrf", "cookies"],
    type: "mcq",
    prompt:
      "A legacy admin panel uses cookie sessions with SameSite=None and has a GET /users/:id/delete link. A teammate says \"we're safe from CSRF because CORS only allows our origin\". What's the best response?",
    options: [
      "Agreed, CORS blocks cross-site requests from being sent",
      "CORS only controls reading responses; set SameSite=Lax, make delete a POST or DELETE, and add CSRF tokens or Origin checks",
      "Switch the cookie to Secure and nothing else is needed",
      "Move the session ID into localStorage",
    ],
    answer: "CORS only controls reading responses; set SameSite=Lax, make delete a POST or DELETE, and add CSRF tokens or Origin checks",
    explanation:
      "A foreign page can still make the browser send the request with the cookie attached; CORS just hides the response. SameSite stops the cookie riding along, state-changing GETs are unsafe even with Lax, and tokens or Origin checks verify the request came from your own pages.",
    lessonAnchor: "csrf",
  },
  {
    id: "security-leaked-secret",
    lectures: [20],
    tags: ["misconfiguration", "secrets"],
    type: "order",
    prompt:
      "Production incident: the Stripe secret key was committed to a public repository an hour ago. Put the response in the right order.",
    steps: [
      "Revoke the leaked key and issue a new one",
      "Deploy the new key from the secret manager or environment variables",
      "Check the provider's logs for activity with the old key",
      "Remove the key from the code and add a secret-scanning check to CI",
    ],
    explanation:
      "Rotation comes first: the key is already in the Git history and every clone, so deleting the file doesn't make it secret again. Then restore service with the new key, look for misuse, and prevent a repeat.",
    lessonAnchor: "secrets",
  },
];
