import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-jwt-secret-in-payload",
    lectures: [26],
    tags: ["jwt", "encoding"],
    type: "mcq",
    prompt:
      "A developer puts the user's phone number and an internal pricing API key in the JWT payload, reasoning that \"the token is signed, so it's secure\". What's wrong?",
    options: [
      "The payload is only base64url-encoded; anyone holding the token can read it",
      "Signed tokens can't contain strings",
      "The signature encrypts only the header",
      "Nothing, as long as RS256 is used",
    ],
    answer: "The payload is only base64url-encoded; anyone holding the token can read it",
    explanation:
      "A signature gives integrity and authenticity, not confidentiality. Anyone can decode the payload without a key. Keep secrets out, or use JWE if contents truly must be hidden.",
    lessonAnchor: "base64url-and-why-it-is-not-encryption",
  },
  {
    id: "hld-jwt-hs-vs-rs",
    lectures: [26],
    tags: ["jwt", "signing"],
    type: "scenario",
    prompt:
      "An auth service issues tokens verified by 25 microservices, some run by partner teams. Today all of them share one HS256 secret, and one partner service was just compromised.\nWhat's the risk and the better design?",
    fields: [
      { label: "Risk", options: ["The attacker can mint valid tokens for any user", "The attacker can only read tokens", "Tokens will start expiring early", "No risk, HMAC is one-way"], answer: "The attacker can mint valid tokens for any user" },
      { label: "Algorithm", options: ["RS256 or ES256", "HS512", "alg none", "HS256 with a longer secret"], answer: "RS256 or ES256" },
      { label: "How services get keys", options: ["Fetch public keys from a JWKS endpoint, chosen by kid", "Copy the private key to each service", "Email the secret to each team", "Embed the key in the token"], answer: "Fetch public keys from a JWKS endpoint, chosen by kid" },
    ],
    explanation:
      "With HS256 every verifier holds the signing secret, so any compromise allows forgery. With asymmetric signing only the auth server holds the private key; services verify with public keys from JWKS and can't mint tokens. A longer HMAC secret doesn't fix the sharing problem.",
    lessonAnchor: "signing-algorithms",
  },
  {
    id: "hld-jwt-alg-none",
    lectures: [26],
    tags: ["jwt", "security"],
    type: "scenario",
    prompt:
      "A pentester takes their own valid token, changes role to admin, sets the header to {\"alg\":\"none\"}, deletes the signature, and the API accepts it.\nDiagnose and fix.",
    fields: [
      { label: "Root cause", options: ["The verifier lets the token's header choose the algorithm", "The token was not base64url-encoded", "The exp claim was missing", "The secret is too short"], answer: "The verifier lets the token's header choose the algorithm" },
      { label: "Fix", options: ["Configure an algorithm allowlist (e.g. only RS256) in the verifier", "Reject tokens without a typ header", "Shorten token lifetime", "Encrypt the payload"], answer: "Configure an algorithm allowlist (e.g. only RS256) in the verifier" },
    ],
    explanation:
      "Accepting the header's alg lets an attacker opt out of signing. The server must decide which algorithms are acceptable. A shorter lifetime wouldn't help because the attacker can mint fresh forged tokens at will.",
    lessonAnchor: "accepting-alg-none",
  },
  {
    id: "hld-jwt-alg-confusion",
    lectures: [26],
    tags: ["jwt", "security"],
    type: "mcq",
    prompt:
      "Your API verifies RS256 tokens with a library call like verify(token, publicKey) and no algorithm option. An attacker sends a token with alg HS256, HMAC-signed using your RSA public key as the secret. Why might it pass?",
    options: [
      "The library reads alg from the header and runs HMAC with the public key bytes, which the attacker also has",
      "RSA public keys can sign tokens",
      "HS256 is stronger than RS256",
      "The kid header was missing",
    ],
    answer: "The library reads alg from the header and runs HMAC with the public key bytes, which the attacker also has",
    explanation:
      "This is algorithm confusion: the public key becomes an HMAC secret everyone knows. Pinning algorithms: [\"RS256\"] (and libraries that bind keys to algorithms) prevents it.",
    lessonAnchor: "algorithm-confusion",
  },
  {
    id: "hld-jwt-validation-order",
    lectures: [26],
    tags: ["jwt", "validation"],
    type: "order",
    prompt: "Put the steps an API takes to validate an incoming JWT in order.",
    steps: [
      "Split and base64url-decode the three parts",
      "Check the alg is on the server's allowlist",
      "Look up the verification key by kid in the trusted JWKS",
      "Verify the signature over header.payload",
      "Check exp, nbf, iss and aud",
      "Authorize the sub for the requested action",
    ],
    explanation:
      "Algorithm and key are fixed by the server before any cryptography runs; only a verified signature makes the claims trustworthy, and only trustworthy claims should be checked and used for authorization.",
    lessonAnchor: "validating-a-token",
  },
  {
    id: "hld-jwt-audience",
    lectures: [26],
    tags: ["jwt", "validation"],
    type: "mcq",
    prompt:
      "One identity provider issues tokens for both the reports API and the payments API. A user with read-only access to reports replays their reports token against the payments API, and it's accepted. Which check was missing?",
    options: ["aud", "exp", "iat", "typ"],
    answer: "aud",
    explanation:
      "Both tokens have a valid signature from the same issuer. Only the audience claim says which API the token is for, so the payments API must reject tokens whose aud doesn't include it.",
    lessonAnchor: "claims",
  },
  {
    id: "hld-jwt-revoke",
    lectures: [26],
    tags: ["jwt", "revocation"],
    type: "scenario",
    prompt:
      "A user reports their laptop stolen. Your access tokens are JWTs with a 15-minute expiry and you have revocable refresh tokens. Security wants the attacker cut off immediately, not in 15 minutes.\nWhat do you do?",
    fields: [
      { label: "Refresh tokens", options: ["Revoke all of the user's refresh tokens", "Leave them; they expire in 30 days", "Rotate the global signing key", "Extend their lifetime"], answer: "Revoke all of the user's refresh tokens" },
      { label: "Live access tokens", options: ["Bump the user's token version (or denylist their jti values) and check it per request", "Nothing can be done before expiry", "Rotate the signing key, logging out everyone", "Change the user's role claim"], answer: "Bump the user's token version (or denylist their jti values) and check it per request" },
    ],
    explanation:
      "Revoking refresh tokens stops new access tokens. For tokens already issued, a per-user version or jti denylist (cheap Redis check) blocks them now. Rotating the signing key also works but logs out every user, so it's an emergency-only lever.",
    lessonAnchor: "revocation-strategies",
  },
  {
    id: "hld-jwt-storage",
    lectures: [26],
    tags: ["jwt", "storage"],
    type: "scenario",
    prompt:
      "A web dashboard stores its JWT and refresh token in localStorage. An XSS bug in a third-party widget is found.\nWhat's exposed, and where should tokens live?",
    fields: [
      { label: "Exposure", options: ["Injected script can read and exfiltrate both tokens", "Nothing, localStorage is encrypted", "Only the access token header", "Only tokens from other origins"], answer: "Injected script can read and exfiltrate both tokens" },
      { label: "Better storage", options: ["HttpOnly, Secure, SameSite cookie (or a BFF holding tokens server-side)", "sessionStorage", "A global JS variable plus localStorage backup", "The URL query string"], answer: "HttpOnly, Secure, SameSite cookie (or a BFF holding tokens server-side)" },
    ],
    explanation:
      "Any script on the page can read localStorage and sessionStorage. HttpOnly cookies are invisible to JavaScript, and a backend-for-frontend keeps tokens off the browser entirely. URLs leak into logs and history.",
    lessonAnchor: "storing-tokens-in-the-browser",
  },
  {
    id: "hld-jwt-lifetime",
    lectures: [26],
    tags: ["jwt", "expiry"],
    type: "mcq",
    prompt:
      "To avoid users being logged out, a team sets JWT access tokens to expire after 90 days and has no refresh tokens. What's the main problem?",
    options: [
      "A stolen token works for up to 90 days, and there's no cheap way to cut it off",
      "Tokens get too large",
      "Signature verification gets slower over time",
      "exp can't hold dates that far ahead",
    ],
    answer: "A stolen token works for up to 90 days, and there's no cheap way to cut it off",
    explanation:
      "Self-contained tokens stay valid until exp. Short access tokens (minutes) with revocable, rotating refresh tokens keep users logged in while bounding the damage of a leak.",
    lessonAnchor: "expiry-and-refresh",
  },
];
