import type { Question } from "@/lib/types";

const GRANTS = ["Authorization code + PKCE", "Client credentials", "Device authorization", "Implicit", "Resource owner password"];

export const quiz: Question[] = [
  {
    id: "hld-oauth-pick-grant",
    lectures: [24],
    tags: ["oauth", "grant-types"],
    type: "scenario",
    prompt:
      "Pick the grant type for each client:\n• A React SPA that lets users connect their GitHub account.\n• A nightly billing job that calls the internal reports API.\n• A smart-TV app with only a remote control.",
    fields: [
      { label: "React SPA", options: GRANTS, answer: "Authorization code + PKCE" },
      { label: "Nightly billing job", options: GRANTS, answer: "Client credentials" },
      { label: "Smart-TV app", options: GRANTS, answer: "Device authorization" },
    ],
    explanation:
      "User-facing apps of every kind use authorization code with PKCE (implicit is deprecated). A job with no user authenticates as itself with client credentials. Devices without a usable browser use the device flow, with the user approving on their phone.",
    lessonAnchor: "grant-types",
  },
  {
    id: "hld-oauth-roles",
    lectures: [24],
    tags: ["oauth", "roles"],
    type: "scenario",
    prompt:
      "A user lets a budgeting app read transactions from their bank. The bank runs login.bank.com for sign-in and consent, and api.bank.com for account data.\nMap the OAuth roles.",
    fields: [
      { label: "Budgeting app", options: ["Client", "Resource owner", "Authorization server", "Resource server"], answer: "Client" },
      { label: "login.bank.com", options: ["Client", "Resource owner", "Authorization server", "Resource server"], answer: "Authorization server" },
      { label: "api.bank.com", options: ["Client", "Resource owner", "Authorization server", "Resource server"], answer: "Resource server" },
    ],
    explanation:
      "The app requesting access is the client; the server that authenticates the user and issues tokens is the authorization server; the API that accepts tokens and holds the data is the resource server. The user is the resource owner.",
    lessonAnchor: "the-four-roles",
  },
  {
    id: "hld-oauth-pkce-why",
    lectures: [24],
    tags: ["oauth", "pkce"],
    type: "mcq",
    prompt:
      "A mobile app uses the authorization code flow without PKCE. A malicious app registered the same custom URL scheme and receives the redirect containing the code. What stops the attacker from getting tokens?",
    options: [
      "Nothing: the code plus the public client_id is enough to redeem it",
      "The client_secret embedded in the app",
      "The state parameter",
      "The code expires after one hour",
    ],
    answer: "Nothing: the code plus the public client_id is enough to redeem it",
    explanation:
      "A public client has no real secret (anything in the app binary can be extracted), and state only protects against CSRF. PKCE fixes this: the token request must include the verifier, which the attacker never saw.",
    lessonAnchor: "what-pkce-adds",
  },
  {
    id: "hld-oauth-flow-order",
    lectures: [24],
    tags: ["oauth", "pkce"],
    type: "order",
    prompt: "Put the authorization code + PKCE flow in order.",
    steps: [
      "Client generates a code verifier and its SHA-256 code challenge",
      "Browser is redirected to /authorize with the code challenge and state",
      "User logs in and approves the requested scopes",
      "Authorization server redirects back with a one-time code and state",
      "Client POSTs the code and code verifier to /token",
      "Client calls the API with the access token as a Bearer header",
    ],
    explanation:
      "The challenge goes out first through the browser; the verifier is only revealed on the back-channel token request, where the server hashes it and compares. Tokens come back from /token, then the access token is used on API calls.",
    lessonAnchor: "authorization-code-flow-with-pkce",
  },
  {
    id: "hld-oauth-token-lifetimes",
    lectures: [24],
    tags: ["oauth", "tokens"],
    type: "scenario",
    prompt:
      "Your API issues 30-day access tokens so users don't get logged out. A token leaks into a third-party logging service.\nWhat should the design be?",
    fields: [
      { label: "Access token lifetime", options: ["About 15 minutes", "30 days", "1 year", "Never expires"], answer: "About 15 minutes" },
      { label: "Staying logged in", options: ["Refresh token with rotation, used only at the token endpoint", "Send the password on every request", "A longer-lived access token", "Store the authorization code and reuse it"], answer: "Refresh token with rotation, used only at the token endpoint" },
    ],
    explanation:
      "Access tokens go everywhere and are the most likely to leak, so keep them short. A refresh token, sent only to the authorization server and rotated on each use, keeps the session alive and can be revoked. Authorization codes are single-use.",
    lessonAnchor: "access-tokens-and-refresh-tokens",
  },
  {
    id: "hld-oauth-refresh-reuse",
    lectures: [24],
    tags: ["oauth", "tokens"],
    type: "mcq",
    prompt:
      "With refresh token rotation enabled, the authorization server receives refresh token R1, which was already exchanged for R2 an hour ago. What should it do?",
    options: [
      "Treat it as likely theft and revoke the whole token family, including R2",
      "Issue a new access token, since R1 was valid once",
      "Return R2 again",
      "Ignore it and wait for R1 to expire naturally",
    ],
    answer: "Treat it as likely theft and revoke the whole token family, including R2",
    explanation:
      "A rotated refresh token should never be presented again. Reuse means two parties hold copies, so the safe response is to revoke everything in that chain and make the user log in again.",
    lessonAnchor: "access-tokens-and-refresh-tokens",
  },
  {
    id: "hld-oauth-oidc-login",
    lectures: [24],
    tags: ["oidc"],
    type: "scenario",
    prompt:
      "You're adding \"Sign in with Google\" to your app. A teammate plans to log users in by taking any Google access token the client sends and calling an API with it.\nWhat should you use instead?",
    fields: [
      { label: "Credential that proves identity", options: ["ID token from OpenID Connect", "Access token", "Refresh token", "Authorization code"], answer: "ID token from OpenID Connect" },
      { label: "Key claim to check against your client_id", options: ["aud", "scope", "jti", "typ"], answer: "aud" },
      { label: "Stable identifier to key your user table on", options: ["sub", "email", "name", "iat"], answer: "sub" },
    ],
    explanation:
      "Access tokens authorize API calls and could have been issued to another app; the ID token is meant for your client and its aud must equal your client_id. Key accounts on sub, because email addresses can change or be reassigned.",
    lessonAnchor: "openid-connect",
  },
  {
    id: "hld-oauth-redirect-uri",
    lectures: [24],
    tags: ["oauth", "security"],
    type: "mcq",
    prompt:
      "An authorization server accepts any redirect_uri that starts with https://app.example.com. The app has an open redirect at /go?url=... What can an attacker do?",
    options: [
      "Send victims to /authorize with redirect_uri=https://app.example.com/go?url=evil.com and collect their codes",
      "Nothing, because the domain is still app.example.com",
      "Read the client secret from the redirect",
      "Change the scopes after consent",
    ],
    answer: "Send victims to /authorize with redirect_uri=https://app.example.com/go?url=evil.com and collect their codes",
    explanation:
      "Prefix matching lets the code be delivered to an open redirect that forwards it (in the URL) to the attacker. Register and match exact redirect URIs.",
    lessonAnchor: "registration",
  },
  {
    id: "hld-oauth-client-credentials-user",
    lectures: [24],
    tags: ["oauth", "client-credentials"],
    type: "mcq",
    prompt:
      "A service gets a token with the client credentials grant and calls GET /users/7/orders. How should the orders API authorize the call?",
    options: [
      "Based on the calling service's identity and scopes, since no user is involved",
      "As user 7, because the path names them",
      "As an admin, because client credentials are trusted",
      "Reject it: client credentials can't call APIs",
    ],
    answer: "Based on the calling service's identity and scopes, since no user is involved",
    explanation:
      "Client-credentials tokens represent the client itself. The API should decide from the client's identity and granted scopes (for example orders:read for all users) rather than pretending a user is present or granting blanket admin.",
    lessonAnchor: "client-credentials-flow",
  },
];
