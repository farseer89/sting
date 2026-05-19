# Security roadmap — Sting + bagend

**Last updated:** 2026-05-19  
**North star:** httpOnly rotating refresh cookie on bagend + short-lived access JWT in memory on Sting; fail-closed guards; bagend enforces auth on every API call.

**Reference:** [docs/SECURITY.md](../../docs/SECURITY.md) · [improvements/INDEX.md](../improvements/INDEX.md)

---

## Shipped (do not regress)

### Auth v2 (Sting + bagend + contracts)

- [x] bagend `POST /api/v2/auth/signin` — access in body, refresh in `fw_refresh` httpOnly cookie
- [x] bagend `POST /api/v2/auth/refresh` — cookie-only, rotation
- [x] bagend `POST /api/v2/auth/logout` — clear cookie
- [x] v1 `/api/users/signin` + `/refresh` unchanged (probe, mobile)
- [x] `@hive/contracts` v2 types (`SignInResponseV2`, `RefreshResponseV2`, `StoredUserProfile`, `AuthV2Endpoints`)
- [x] Sting: `withCredentials`, in-memory access token, profile-only storage (`stingUserProfile`)
- [x] Sting: `APP_INITIALIZER` silent refresh (factory returns `() => Promise` — see [IMP-001](../improvements/IMP-001-app-initializer-factory.md))
- [x] Sting: `authGuard` JWT `exp`; dev bypass only when `!production && enableDevRoutes`
- [x] Sting: `guestGuard` on `/login`
- [x] Sting: 401 → cookie refresh via interceptor; session-expired modal (PrimeBlocks style)
- [x] bagend: Argon2id for new passwords; scrypt verify + upgrade-on-login
- [x] bagend: CORS allowlist includes stingbase + `localhost:4200`
- [x] Deployed: bagend (DO / pm2), Sting (Firebase stingbase)

### Hosting & docs

- [x] Firebase: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- [x] CSP **report-only** (fonts.googleapis.com / fonts.gstatic.com allowed in policy text)
- [x] `docs/SECURITY.md`, launch doc CORS + v2 notes
- [x] `.gitignore`: `environment.prod.ts`, `.firebaserc`

---

## Phase A — Sting hardening (remaining)

### CSP & headers

- [ ] Review report-only CSP violations in browser console on stingbase (hard refresh)
- [ ] Self-host Inter/Poppins OR finalize Google Fonts CSP (remove inline handler warnings if any)
- [ ] Switch `Content-Security-Policy-Report-Only` → enforcing `Content-Security-Policy`
- [ ] Document custom-domain HSTS (Firebase handles `*.web.app`)

### Guards & build safety

- [ ] Compile-time assert prod bundle never has `enableDevRoutes: true` (e.g. build script check)
- [ ] Confirm prod build strips or never bundles dev routes (optional: separate tsconfig)

### Lint & supply chain

- [ ] Fix shell `click-events-have-key-events` / `interactive-supports-focus` (or scoped eslint override with comment)
- [ ] Add `eslint-plugin-security` (ban `bypassSecurityTrust*` without review)
- [ ] GitHub CI green: resolve or policy-waive `npm audit --audit-level=high` (4 highs as of 2026-05-19)
- [ ] CI: keep `GH_PAT` for private `hive-contracts`; document rotation in repo secrets

### Documentation

- [ ] Dev Docs section: “Security checklist for new features”
- [ ] Link this file from [README.md](../README.md) maintenance section

---

## Phase B — bagend & contracts (remaining)

### Auth v2 depth

- [ ] Optional `GET /api/v2/auth/me` for bootstrap / profile validation
- [ ] Refresh token reuse detection + revoke family on reuse
- [ ] bagend integration tests: `auth-v2.cookie.test.ts` (signin → refresh → logout)
- [ ] `Deprecation` / `Sunset` headers on v1 auth routes when clients migrate

### Password & legacy auth

- [ ] Consolidate bcrypt paths (`loginController.js`, `systemAdminRoutes.ts`, etc.) → `PasswordUtils` only
- [ ] Audit password-reset flows for double-hash (comment already warns)

### Packages (optional, reduces CI pain)

- [ ] Publish `@hive/contracts` to GitHub Packages (private) — Sting CI without sibling clone + `GH_PAT`
- [ ] Or: git submodule / monorepo layout — pick one strategy, document here

---

## Phase C — Authorization & enterprise (later)

- [ ] JWT access claims: `tenantId`, `roles[]` (minimal)
- [ ] bagend: tenant + role enforcement on every business route
- [ ] Sting: `roleGuard` + hide nav by role (UX only; bagend is source of truth)
- [ ] OIDC (Okta) authorization code + PKCE; same cookie session model to Sting

---

## Verification checklist (run after auth changes)

| Step | Command / action |
|------|------------------|
| Contracts build | `cd ../hive-contracts && npm run build` |
| Sting prod build | `cd sting && npm run build:prod` |
| bagend deploy | push `main` → DO self-hosted `Node.js CI` → `pm2 restart` |
| Sting deploy | `npm run deploy:firebase` |
| Login | https://stingbase.web.app/login — sign in against droppin.shop |
| Refresh | Wait for access expiry (~5m in dev config) or force 401 — modal + re-auth |
| v1 unchanged | probe/mobile still use `/api/users/signin` |

---

## Agent notes

- **Do not** return refresh token in JSON and cookie from the same endpoint.
- **Do not** put refresh tokens in `localStorage` / `sessionStorage`.
- **Do not** mutate v1 sign-in/refresh behavior in place — version routes.
- Before changing `APP_INITIALIZER`, read [IMP-001](../improvements/IMP-001-app-initializer-factory.md).
- Prod deploy ≠ green CI; check both when user reports “build failed.”

---

## Update log

| Date | Change |
|------|--------|
| 2026-05-19 | Initial list after v2 auth deploy + IMP-001 bootstrap fix |
