# Sting

Greenfield Angular 21 MVP starter: AuthMicro login, app shell, blank home, Firebase deploy.

## Prerequisites

- Node 20 (`nvm use`)
- bagend micro API URL
- Firebase CLI (`npm i -g firebase-tools`) for deploy

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

```bash
cp .firebaserc.example .firebaserc   # set your Firebase project id
npm run build:prod
npm run deploy:firebase
```

## Add a feature

See [docs/ADDING_A_FEATURE.md](docs/ADDING_A_FEATURE.md).

## Relation to probe

Probe is the full FieldWave product. Sting is the minimal template — see probe `ai_context/active/STING_STARTER.md`.
