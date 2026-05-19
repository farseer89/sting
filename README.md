# Sting

Greenfield Angular 21 MVP starter: auth service login, app shell, blank home, Firebase deploy.

## Prerequisites

- Node 20+ (any install — `nvm` optional)
- bagend micro API URL
- Firebase CLI (`npm install -g firebase-tools`) and `firebase login`

## Setup

```bash
npm install
cp src/environments/environment.template.ts src/environments/environment.prod.ts
# Edit environment.prod.ts or use env vars with configure-env:
STING_APP_NAME="My App" STING_MICRO_URL="https://droppin.shop" npm run configure-env
```

Dev uses `src/environments/environment.ts` (defaults to droppin.shop).

## Run

```bash
npm start
# http://localhost:4200/login
```

## Build & deploy

### Create Firebase project from the CLI

Hosting config is already in `firebase.json`. Create the GCP/Firebase project and `.firebaserc`:

```bash
firebase login
npm run setup:firebase -- stingweb   # pick a unique project id
```

This runs `firebase projects:create` and writes `.firebaserc`. New projects may still need billing enabled once in the [Firebase console](https://console.firebase.google.com).

### Deploy

```bash
npm run deploy:firebase
# → https://<project-id>.web.app
```

Manual alternative: copy `.firebaserc.example` to `.firebaserc` and set an existing project id.

## Add a feature

See [docs/ADDING_A_FEATURE.md](docs/ADDING_A_FEATURE.md).

## PrimeNG reference

Local LLM docs: [docs/primeng/](docs/primeng/) (from [primeng.org/llms](https://primeng.org/llms/llms.txt)).

The `/home` route is the **dashboard starter** (KPI cards, quick actions, activity table) — modern equivalent of probe `alpha-home` + layout shell.

## Relation to probe

Probe is the full FieldWave product. Sting is the minimal template — see probe `ai_context/active/STING_STARTER.md`.
