# Client portal (`clients.droppin.shop`)

Authenticated area for end clients (wedding couples, etc.) after an operator converts a lead in Protopipe. Lives in the **same Sting build** as the operator app — no separate Angular project.

## Routes

| Path | Purpose |
|------|---------|
| `/portal/welcome` | Magic-link exchange (`?token=`) |
| `/portal/dashboard` | Client home (requires client JWT) |

Operator shell (`/protopipe`, etc.) is blocked when only a client session is active (`operatorOnlyGuard` redirects to `/portal/dashboard`).

## Flow

1. Visitor submits **Lead capture** on the Astro landing page.
2. Operator opens **Protopipe → Leads** and clicks **Convert to client**.
3. bagend creates `ClientUser` + magic link and emails it via SendGrid (falls back to logs + UI link if send fails).
4. Client opens `https://clients.droppin.shop/portal/welcome?token=...` (or `http://localhost:4200/portal/welcome?token=...` locally).
5. Portal exchanges token → JWT → `/portal/dashboard`.

## Local dev

```bash
# Terminal 1 — bagend
cd bagend && npm start

# Terminal 2 — sting (operator + portal, default port 4200)
cd sting && npm start

# After convert, use token from bagend log:
open "http://localhost:4200/portal/welcome?token=YOUR_TOKEN"
```

Set `CLIENT_PORTAL_BASE_URL=http://localhost:4200` in bagend `.env` so convert logs the correct local URL.

## Build & deploy

One production build serves both Firebase hosting targets:

```bash
cd sting && npm run build:prod
firebase deploy --only hosting
```

- **sting** → `protopipe.droppin.shop` (operator)
- **client-portal** → `clients.droppin.shop` (same `dist/sting/browser`, different Firebase site / domain)

## API

| Endpoint | Auth |
|----------|------|
| `POST /api/v2/public/magic-link/verify` | Public |
| `GET /api/v2/client/me` | Client JWT (`role: client`) |

Client JWT is stored in `sessionStorage` under `client_portal_access_token`, separate from the operator access token.
