# DRIVE security architecture

## Current architecture

DRIVE v0.8 is a client-only PWA. Vehicle data is stored in IndexedDB on the user's device; there is currently no remote API, password database, or server-side authorization layer.

That distinction matters: browser-side validation improves safety and data quality, but it is **not** a substitute for server-side authorization once a backend is introduced.

## Frontend security rules

- Treat every imported/local record as untrusted data.
- Validate numeric ranges, dates, and bounded text before writing records.
- Escape user-controlled strings before inserting them into HTML.
- Prefer `textContent`/DOM APIs over `innerHTML` for user-controlled content.
- Do not place credentials, API keys, access tokens, or private configuration in the repository.
- Keep service-worker caching explicit by resource type; changing diagnostic data must not be silently served forever from cache.
- Errors shown to users should be actionable and non-sensitive. Diagnostic detail belongs in controlled developer logs.

## Backend gate

When DRIVE gains synchronization or accounts, every sensitive endpoint must:

1. Authenticate the request.
2. Authorize the requested vehicle/user on the server for every protected operation.
3. Validate and constrain every request field server-side.
4. Use parameterized queries/ORM APIs for database access.
5. Return only fields the caller is authorized to receive.
6. Rate-limit authentication, synchronization, and expensive endpoints.
7. Use secure transport and secure, scoped session/token handling.
8. Never log passwords, session tokens, refresh tokens, or authorization headers.

Passwords, if accounts are introduced, must use a modern password hashing scheme such as Argon2id or bcrypt. Application encryption must use vetted platform/library primitives rather than custom cryptography.

## Secrets

Secrets belong in deployment environment variables or a dedicated secret manager, never in JavaScript, HTML, JSON configuration committed to Git, or a public GitHub Pages build.

Before adding a backend, enable secret scanning and dependency/security checks in CI.

## Threat model to revisit

The first backend release must explicitly address:

- broken access control between vehicle owners;
- stolen/expired sessions;
- malicious backup imports;
- oversized or abusive synchronization payloads;
- injection into dashboards/reports;
- exposed API keys and deployment secrets;
- replay/duplicate synchronization;
- abuse of GPS/location data.
