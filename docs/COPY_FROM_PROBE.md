# Copying from probe

## Safe to port (patterns)

- `AuthMicroService` login/logout/token/refresh logic
- `auth.interceptor` 401 + refresh behavior
- `alpha-layout` / `alpha-home` HTML structure (simplify nav)
- `environment` micro URL fields
- Firebase hosting rewrites

## Do not copy into Sting v1

- `app.module.ts` PrimeNG import block
- Equipment, fuel, jobs, admin, invoicing domains
- Okta / universal-login (phase 2)
- `HashLocationStrategy` unless you need it
- Datadog, Stripe, HCSS, telematics
- NgModule declarations

## PrimeNG

Probe uses PrimeNG 17 + NgModules. Sting uses **PrimeNG 21** + `providePrimeNG()` + per-component imports. Use Sting as the pilot for probe's PrimeNG 18+ migration.
