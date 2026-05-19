# Launch a new MVP from Sting

1. **Clone** `git clone https://github.com/farseer89/sting.git my-mvp && cd my-mvp`
2. **Install** `npm install`
3. **Environment** `cp src/environments/environment.template.ts src/environments/environment.prod.ts` then `STING_APP_NAME="My MVP" npm run configure-env`
4. **Firebase** `npm run setup:firebase -- my-mvp-id` then `npm run deploy:firebase`
5. **bagend CORS** Add `https://my-mvp-id.web.app` to bagend allowlist
6. **Hive** Keep `@hive/contracts` in sync (`file:../hive-contracts` or published package)
7. **Feature** `ng g component features/my-idea --standalone` — register in `app.routes.ts` and `navigation.service.ts`
8. **UI** Copy from `features/_templates/dashboard-kpi` or use `/dev/ui` playground (dev only)
9. **Lint** `npm run lint` before deploy

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [ADDING_A_FEATURE.md](./ADDING_A_FEATURE.md).
