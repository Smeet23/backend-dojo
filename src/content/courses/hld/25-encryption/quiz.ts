import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "hld-crypto-hybrid",
    lectures: [25],
    tags: ["encryption", "hybrid"],
    type: "scenario",
    prompt:
      "You need to send a 2 GB backup file to a partner who has published an RSA public key. Only the partner should be able to read it.\nHow do you encrypt it?",
    fields: [
      { label: "Encrypt the file with", options: ["A random AES-256-GCM key", "The partner's RSA public key directly", "SHA-256", "Your own RSA private key"], answer: "A random AES-256-GCM key" },
      { label: "Protect that AES key with", options: ["The partner's RSA public key", "Your RSA private key", "Base64 encoding", "The same AES key"], answer: "The partner's RSA public key" },
    ],
    explanation:
      "RSA is slow and can only encrypt data smaller than its key, so real systems are hybrid: AES encrypts the bulk data, and the recipient's public key wraps the AES key. Encrypting with your own private key is signing, which anyone with your public key can undo.",
    lessonAnchor: "symmetric-vs-asymmetric",
  },
  {
    id: "hld-crypto-ecb",
    lectures: [25],
    tags: ["encryption", "aes"],
    type: "mcq",
    prompt:
      "A team encrypts user records with AES-256 in ECB mode. A security review flags it even though the key is strong and secret. Why?",
    options: [
      "Identical plaintext blocks produce identical ciphertext blocks, so patterns leak, and there is no integrity check",
      "AES-256 is too weak for user data",
      "ECB needs a public key",
      "ECB output is larger than the plaintext",
    ],
    answer: "Identical plaintext blocks produce identical ciphertext blocks, so patterns leak, and there is no integrity check",
    explanation:
      "ECB encrypts each block independently, revealing repeated structure, and it doesn't detect tampering. Use an AEAD mode such as AES-GCM with a unique nonce per message.",
    lessonAnchor: "modes-of-operation",
  },
  {
    id: "hld-crypto-nonce-reuse",
    lectures: [25],
    tags: ["encryption", "aes"],
    type: "mcq",
    prompt:
      "A service encrypts every message with AES-GCM using the same key and a hard-coded nonce of all zeros. What's the consequence?",
    options: [
      "Attackers can recover the XOR of plaintexts and forge authentication tags",
      "Nothing, because nonces don't need to be secret",
      "Decryption becomes slower",
      "The key length effectively halves but it's still safe",
    ],
    answer: "Attackers can recover the XOR of plaintexts and forge authentication tags",
    explanation:
      "Nonces need not be secret, but they must never repeat under the same key. Reuse in GCM leaks plaintext relationships and breaks integrity. Generate a fresh random 96-bit nonce per message.",
    lessonAnchor: "nonces-and-ivs",
  },
  {
    id: "hld-crypto-forward-secrecy",
    lectures: [25],
    tags: ["tls", "diffie-hellman"],
    type: "scenario",
    prompt:
      "An attacker has recorded a year of your HTTPS traffic. Today they steal your server's certificate private key.\nWhat decides whether they can decrypt the old recordings?",
    fields: [
      { label: "Key exchange that protects old traffic", options: ["Ephemeral ECDHE", "RSA key transport", "Static Diffie-Hellman with a fixed server key", "AES-CBC"], answer: "Ephemeral ECDHE" },
      { label: "Name of the property", options: ["Forward secrecy", "Non-repudiation", "Key stretching", "Certificate pinning"], answer: "Forward secrecy" },
    ],
    explanation:
      "With ephemeral ECDHE each session used throwaway DH secrets, so the long-term key only ever signed the exchange and can't reconstruct session keys. With RSA key transport, the session key was encrypted under the stolen key, so old traffic falls. TLS 1.3 requires ephemeral exchange.",
    lessonAnchor: "ephemeral-keys-and-forward-secrecy",
  },
  {
    id: "hld-crypto-mitm",
    lectures: [25],
    tags: ["diffie-hellman", "authentication"],
    type: "mcq",
    prompt:
      "Two IoT devices run plain, unauthenticated Diffie-Hellman over Wi-Fi to agree on a key. What attack does this leave open?",
    options: [
      "A man in the middle runs separate exchanges with each device and relays traffic",
      "An eavesdropper computes the shared secret from A and B",
      "Replay of the AES key",
      "Collision attacks on SHA-256",
    ],
    answer: "A man in the middle runs separate exchanges with each device and relays traffic",
    explanation:
      "Passive eavesdroppers can't solve the discrete log, but an active attacker can substitute their own public values. DH must be authenticated, for example by signing the key shares with keys tied to certificates.",
    lessonAnchor: "the-man-in-the-middle",
  },
  {
    id: "hld-crypto-passwords",
    lectures: [25],
    tags: ["hashing", "passwords"],
    type: "scenario",
    prompt:
      "A legacy system stores user passwords encrypted with AES, with the key in an environment variable, so support staff can \"look up\" forgotten passwords.\nWhat should it do instead?",
    fields: [
      { label: "Storage approach", options: ["Salted slow hash: Argon2id or bcrypt", "AES-GCM with a rotated key", "SHA-256 without a salt", "Base64 encoding"], answer: "Salted slow hash: Argon2id or bcrypt" },
      { label: "Forgotten password flow", options: ["Send a single-use reset link", "Email the decrypted password", "Show it to support staff", "Store a plaintext copy for recovery"], answer: "Send a single-use reset link" },
    ],
    explanation:
      "Passwords should be one-way hashed with a deliberately slow, salted function, so a database plus key leak doesn't reveal them. Fast hashes like plain SHA-256 are brute-forced at billions of guesses per second. Nobody should ever be able to read a password back.",
    lessonAnchor: "hashing-is-not-encryption",
  },
  {
    id: "hld-crypto-sign-keys",
    lectures: [25],
    tags: ["signatures"],
    type: "scenario",
    prompt:
      "Your company publishes software updates. Clients must be sure an update came from you and wasn't modified.\nWhich keys are used where?",
    fields: [
      { label: "You sign the update's hash with", options: ["Your private key", "Your public key", "The client's public key", "A shared AES key"], answer: "Your private key" },
      { label: "Clients verify with", options: ["Your public key, shipped in the app", "Your private key", "Their own private key", "The update's SHA-256 alone"], answer: "Your public key, shipped in the app" },
    ],
    explanation:
      "Signing uses the signer's private key so only you can produce it; anyone with your public key can verify it. A bare hash alone proves nothing, because an attacker who changes the file can also publish a new hash.",
    lessonAnchor: "digital-signatures",
  },
  {
    id: "hld-crypto-tls-order",
    lectures: [25],
    tags: ["tls"],
    type: "order",
    prompt: "Put the TLS 1.3 handshake steps in order.",
    steps: [
      "Client sends ClientHello with cipher suites and an ECDHE key share",
      "Server replies with ServerHello and its ECDHE key share",
      "Both sides derive handshake keys from the shared secret",
      "Server sends its certificate chain",
      "Server sends CertificateVerify, a signature over the handshake",
      "Both send Finished and switch to AES-GCM traffic keys",
    ],
    explanation:
      "TLS 1.3 exchanges key shares in the first round trip so everything after ServerHello is encrypted. The certificate and CertificateVerify then authenticate the server and bind it to the key exchange, and Finished confirms both saw the same handshake.",
    lessonAnchor: "how-tls-combines-them",
  },
  {
    id: "hld-crypto-cert-check",
    lectures: [25],
    tags: ["certificates", "tls"],
    type: "mcq",
    prompt:
      "A browser connecting to shop.example receives a certificate for shop.example that is correctly formatted and unexpired, but signed by a CA that isn't in the browser's trust store or chained to one. What happens and why?",
    options: [
      "The connection is rejected: without a chain to a trusted root, anyone could have made that certificate",
      "It's accepted because the hostname matches",
      "It's accepted because the dates are valid",
      "It's accepted because the server proved it holds the private key",
    ],
    answer: "The connection is rejected: without a chain to a trusted root, anyone could have made that certificate",
    explanation:
      "Possessing a private key only proves the server matches its certificate. The certificate is only meaningful if a trusted CA vouched for the name-to-key binding; an attacker can generate a self-signed certificate for any name.",
    lessonAnchor: "the-chain-of-trust",
  },
  {
    id: "hld-crypto-envelope",
    lectures: [25],
    tags: ["encryption", "kms"],
    type: "mcq",
    prompt:
      "You store 50 TB of customer files encrypted at rest and must rotate the master key every year without re-encrypting all 50 TB. What design allows that?",
    options: [
      "Envelope encryption: per-object data keys encrypted by a KMS master key",
      "Encrypt every file directly with the master key",
      "Hash the files instead of encrypting them",
      "Use RSA to encrypt every file",
    ],
    answer: "Envelope encryption: per-object data keys encrypted by a KMS master key",
    explanation:
      "With envelope encryption, rotating the master key only means re-wrapping the small data keys, not the data. Encrypting files directly with the master key would require re-encrypting everything on rotation.",
    lessonAnchor: "where-these-show-up-in-system-design",
  },
];
