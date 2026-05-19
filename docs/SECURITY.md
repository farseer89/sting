# Sting security

## Threat model (MVP)

Sting is a browser SPA backed by bagend. Primary risks:

- **XSS** — malicious script in the app can read in-memory access tokens and act as the user until access expiry. Refresh tokens are **not** exposed to JavaScript (httpOnly cookie on bagend).
- **Token theft** — never store refresh tokens in `localStorage` / `sessionStorage`.
- **CSRF** — refresh cookie uses `SameSite=None; Secure` for cross-origin API calls; sign-in requires user credentials.

## Auth v2 (Sting)

| Artifact | Storage | Notes |
|----------|---------|--------|
| Refresh JWT | httpOnly cookie `fw_refresh` on bagend | Path `/api/v2/auth`; sent only to v2 auth routes |
| Access JWT | In-memory in `AuthService` | Short-lived (~5m in dev); `Authorization: Bearer` on API calls |
| User profile | `localStorage` / `sessionStorage` key `stingUserProfile` | No tokens |

Endpoints: `POST /api/v2/auth/signin`, `/refresh`, `/logout` with `withCredentials: true`.

Legacy v1 (`/api/users/signin` with `TokenPair` in JSON) remains for probe and other clients.

## Route guards

- `authGuard` — requires valid access JWT `exp` (or dev-only bypass when `enableDevRoutes` and not production).
- `guestGuard` — blocks `/login` when already authenticated.

Guards are **UX only**; bagend enforces auth on every API route.

## Hosting headers

`firebase.json` sets `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and **report-only** CSP. Tighten CSP after verifying third-party needs.

## Secrets

- Never commit API keys, JWT secrets, or service accounts.
- Production `environment.prod.ts` is generated in CI via `scripts/replace-env.js` (`STING_MICRO_URL`).
- Ignore `.firebaserc` locally; use `.firebaserc.example`.

## Reporting

Report suspected vulnerabilities to the Fieldwave platform team through your usual internal channel.
