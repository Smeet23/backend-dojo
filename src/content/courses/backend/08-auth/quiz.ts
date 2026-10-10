import type { Question } from "@/lib/types";

const STRATEGIES = ["Server-side sessions", "Stateless JWTs", "API keys", "OAuth 2.0 / OIDC"];

export const quiz: Question[] = [
  {
    id: "auth-pick-strategy",
    lectures: [8],
    tags: ["strategy", "sessions", "jwt", "api-keys", "oauth"],
    type: "scenario",
    prompt:
      "You're designing auth for a notes SaaS. Pick the best fit for each piece:\n• The main browser web app on app.notes.dev, where support must be able to log a user out instantly.\n• A partner's backend that syncs notes nightly, with no human involved.\n• A \"Sign in with Google\" button on the login page.",
    fields: [
      { label: "Browser web app", options: STRATEGIES, answer: "Server-side sessions" },
      { label: "Partner nightly sync", options: STRATEGIES, answer: "API keys" },
      { label: "Sign in with Google", options: STRATEGIES, answer: "OAuth 2.0 / OIDC" },
    ],
    explanation:
      "Sessions give instant revocation and HttpOnly cookies for your own web app. Machine-to-machine traffic with no user suits a scoped API key (or OAuth client credentials). Social login is exactly what OpenID Connect on top of OAuth 2.0 provides.",
    lessonAnchor: "which-method-when",
  },
  {
    id: "auth-stolen-jwt",
    lectures: [8],
    tags: ["jwt", "revocation"],
    type: "mcq",
    prompt:
      "Production incident: a user reports their account was hijacked. Your mobile API uses stateless JWTs that expire after 30 days, signed with one HS256 secret, and nothing is stored server-side. What's the problem with your options right now?",
    options: [
      "You can't revoke that one token before it expires; rotating the secret works but logs out every user",
      "You can delete the user's session row and the token stops working",
      "Changing the user's password immediately invalidates the token",
      "JWTs can't be stolen because they're encrypted",
    ],
    answer: "You can't revoke that one token before it expires; rotating the secret works but logs out every user",
    explanation:
      "A stateless JWT is valid until exp unless the server keeps some record. That's why access tokens should be short-lived and paired with revocable refresh tokens. A password change doesn't affect an already-signed token, and JWTs are encoded, not encrypted.",
    lessonAnchor: "weaknesses",
  },
  {
    id: "auth-token-redesign",
    lectures: [8],
    tags: ["jwt", "refresh-tokens"],
    type: "scenario",
    prompt:
      "After that incident you redesign the mobile API's tokens so a stolen token is useful for minutes, not weeks, and support can cut off a single user.",
    fields: [
      { label: "Access token lifetime", options: ["30 days", "24 hours", "15 minutes", "Never expires"], answer: "15 minutes" },
      {
        label: "How the app stays logged in",
        options: [
          "A long-lived refresh token, stored and revocable server-side",
          "Store the user's password on the device and log in again",
          "Ask the user to log in every 15 minutes",
          "Extend exp by editing the token on the device",
        ],
        answer: "A long-lived refresh token, stored and revocable server-side",
      },
      {
        label: "Cutting off one user",
        options: ["Revoke their refresh tokens", "Rotate the signing key", "Delete the app from the store", "Return 500 for their requests"],
        answer: "Revoke their refresh tokens",
      },
    ],
    explanation:
      "Short access tokens limit the damage window; the refresh token is the revocable part. Revoking it means no new access tokens after at most 15 minutes. Rotating the key would log out everyone, and editing exp on the device breaks the signature.",
    lessonAnchor: "access-and-refresh-tokens",
  },
  {
    id: "auth-jwt-tamper",
    lectures: [8],
    tags: ["jwt", "signature"],
    type: "mcq",
    prompt:
      "A tester decodes their JWT, changes \"role\": \"member\" to \"role\": \"admin\", re-encodes the payload and sends it back with the original signature. What does a correctly implemented API do?",
    options: [
      "Rejects it with 401, because the signature no longer matches the modified header.payload",
      "Accepts it, because the payload is valid Base64URL",
      "Accepts it, but only for read requests",
      "Returns 403, because members can't become admins",
    ],
    answer: "Rejects it with 401, because the signature no longer matches the modified header.payload",
    explanation:
      "The signature covers every byte of the header and payload, so any edit invalidates it, and without the key the tester can't produce a new one. That's an authentication failure (untrusted token), so 401 rather than 403.",
    lessonAnchor: "structure",
  },
  {
    id: "auth-jwt-contents",
    lectures: [8],
    tags: ["jwt", "privacy"],
    type: "mcq",
    prompt:
      "A teammate proposes putting the user's email, phone number and Stripe customer secret in the JWT payload \"since it's signed, it's safe\". What's your review comment?",
    options: [
      "Signing prevents tampering, not reading: anyone holding the token can decode the payload, so keep it to IDs and non-sensitive claims",
      "Fine, Base64URL encryption hides it",
      "Fine, as long as the token uses RS256",
      "Move it to the header, which isn't readable",
    ],
    answer: "Signing prevents tampering, not reading: anyone holding the token can decode the payload, so keep it to IDs and non-sensitive claims",
    explanation:
      "Base64URL is an encoding anyone can reverse, and the header is just as readable. The algorithm choice affects who can sign and verify, not confidentiality.",
    lessonAnchor: "structure",
  },
  {
    id: "auth-session-cookie",
    lectures: [8],
    tags: ["cookies", "sessions"],
    type: "scenario",
    prompt:
      "You're setting the session cookie for the notes web app after login. A pen test recommends protecting it against XSS theft, plain-HTTP leaks and cross-site request forgery.\nWhich attribute handles each?",
    fields: [
      { label: "JavaScript can't read it (XSS)", options: ["HttpOnly", "Secure", "SameSite=Lax", "Max-Age"], answer: "HttpOnly" },
      { label: "Only sent over HTTPS", options: ["HttpOnly", "Secure", "SameSite=Lax", "Max-Age"], answer: "Secure" },
      { label: "Not sent on cross-site requests (CSRF)", options: ["HttpOnly", "Secure", "SameSite=Lax", "Max-Age"], answer: "SameSite=Lax" },
    ],
    explanation:
      "HttpOnly hides the cookie from document.cookie, Secure restricts it to HTTPS, and SameSite stops browsers attaching it to most requests initiated by other sites. Max-Age only controls lifetime.",
    lessonAnchor: "cookies",
  },
  {
    id: "auth-oidc-tokens",
    lectures: [8],
    tags: ["oauth", "oidc"],
    type: "scenario",
    prompt:
      "The notes app uses \"Sign in with Google\" and also reads the user's Google Calendar. After the code exchange your backend holds an ID token and an access token.",
    fields: [
      {
        label: "To find or create the local user",
        options: ["Verify the ID token and read sub/email", "Send the access token to the Calendar API", "Ask the user for their Google password", "Use the authorization code as the user ID"],
        answer: "Verify the ID token and read sub/email",
      },
      {
        label: "To fetch calendar events",
        options: ["Call the Calendar API with the access token", "Call the Calendar API with the ID token", "Call it with your API key and the user's email", "Store the user's Google password and log in as them"],
        answer: "Call the Calendar API with the access token",
      },
    ],
    explanation:
      "The ID token (a JWT) is OIDC's answer to \"who is this?\" and is meant for your app. The access token is OAuth's delegated permission and is meant for the resource server. Mixing them up is a classic security bug.",
    lessonAnchor: "sign-in-with-google-step-by-step",
  },
  {
    id: "auth-oauth-flow-choice",
    lectures: [8],
    tags: ["oauth"],
    type: "scenario",
    prompt: "Pick the OAuth 2.0 grant for each client of the shop's API.",
    fields: [
      {
        label: "React single-page app with users logging in",
        options: ["Authorization code + PKCE", "Implicit", "Client credentials", "Device code"],
        answer: "Authorization code + PKCE",
      },
      {
        label: "Inventory service calling the pricing service, no user",
        options: ["Authorization code + PKCE", "Implicit", "Client credentials", "Device code"],
        answer: "Client credentials",
      },
      {
        label: "The shop's smart-TV app",
        options: ["Authorization code + PKCE", "Implicit", "Client credentials", "Device code"],
        answer: "Device code",
      },
    ],
    explanation:
      "The implicit flow is deprecated because tokens leaked through the URL; browser apps now use authorization code with PKCE. Client credentials is for services acting as themselves, and device code lets a keyboard-less TV be approved from a phone.",
    lessonAnchor: "tokens-instead-of-passwords",
  },
  {
    id: "auth-rbac-dead-zone",
    lectures: [8],
    tags: ["rbac", "status-codes"],
    type: "scenario",
    prompt:
      "GET /admin/dead-zone lists permanently hidden notes and needs the deadzone:read permission (admins only). What should each caller get?",
    fields: [
      { label: "Request with an expired session cookie", options: ["200 OK", "401 Unauthorized", "403 Forbidden", "404 Not Found"], answer: "401 Unauthorized" },
      { label: "Logged-in moderator", options: ["200 OK", "401 Unauthorized", "403 Forbidden", "404 Not Found"], answer: "403 Forbidden" },
      { label: "Logged-in admin", options: ["200 OK", "401 Unauthorized", "403 Forbidden", "404 Not Found"], answer: "200 OK" },
    ],
    explanation:
      "Authentication runs first: no valid identity means 401. A known user whose role lacks the permission gets 403. Only the admin's role grants deadzone:read.",
    lessonAnchor: "rbac-in-the-request-cycle",
  },
  {
    id: "auth-idor",
    lectures: [8],
    tags: ["authorization", "ownership"],
    type: "mcq",
    prompt:
      "Every signed-in user has the notes:write:own permission, and PATCH /notes/:id checks it in middleware. A bug bounty report shows any user can edit any note by changing the ID. What's missing?",
    options: [
      "An ownership check in the handler: load the note and confirm it belongs to the caller before updating",
      "A stronger JWT signing algorithm",
      "Hiding the edit button for notes the user doesn't own",
      "Switching from sessions to JWTs",
    ],
    answer: "An ownership check in the handler: load the note and confirm it belongs to the caller before updating",
    explanation:
      "RBAC answered \"may users edit their notes?\" but nobody asked \"is this their note?\". That's broken object-level authorization (IDOR). UI changes don't help because the request can be sent directly.",
    lessonAnchor: "ownership-checks",
  },
  {
    id: "auth-login-errors",
    lectures: [8],
    tags: ["security", "enumeration"],
    type: "scenario",
    prompt:
      "Your login endpoint currently returns \"No account with that email\" in 5 ms for unknown emails, and \"Wrong password\" in 210 ms for known ones. Security asks you to stop attackers learning which emails are registered.",
    fields: [
      {
        label: "Error message",
        options: [
          "\"Invalid email or password\" for every failure",
          "Keep the specific messages; they help users",
          "\"Wrong password\" for every failure",
          "Return 404 for unknown emails",
        ],
        answer: "\"Invalid email or password\" for every failure",
      },
      {
        label: "Timing fix",
        options: [
          "When the user isn't found, still verify against a dummy password hash",
          "Return unknown emails even faster",
          "Switch to SHA-256 so hashing is quicker",
          "Log the timing in the response headers",
        ],
        answer: "When the user isn't found, still verify against a dummy password hash",
      },
    ],
    explanation:
      "Different messages and different timings both enable user enumeration. A generic message removes the first leak; doing the same expensive hash on every path removes the second. A fast hash would make brute-forcing passwords far easier.",
    lessonAnchor: "timing-attacks",
  },
  {
    id: "auth-session-login-order",
    lectures: [8],
    tags: ["sessions", "stateful"],
    type: "order",
    prompt: "Put the steps of a stateful login and the next request in order.",
    steps: [
      "Browser sends POST /login with email and password",
      "Server verifies the password against the salted hash",
      "Server stores a new random session ID with the user's data in Redis",
      "Server responds with Set-Cookie: sid=…; HttpOnly; Secure",
      "Browser automatically sends Cookie: sid=… with GET /notes",
      "Server looks up the session, attaches the user, and runs the handler",
    ],
    explanation:
      "The session is only created after the password checks out (and with a fresh ID, to prevent session fixation). From then on the browser attaches the cookie automatically, and each request costs one fast store lookup.",
    lessonAnchor: "stateful-authentication",
  },
];
