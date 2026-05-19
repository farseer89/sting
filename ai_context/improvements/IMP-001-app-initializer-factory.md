# IMP-001: APP_INITIALIZER `useFactory` must return a function

**Date:** 2026-05-19  
**Severity:** Critical — entire app failed to bootstrap; `/login` never rendered  
**Area:** Angular bootstrap, auth  
**Status:** Fixed (deployed stingbase)

## Symptom

On https://stingbase.web.app (and prod build locally):

```
TypeError: t is not a function
    at e.runInitializers (...)
```

App stuck on white screen. CSP report-only warnings in console (fonts, inline handler) were **not** the cause.

## Root cause

`APP_INITIALIZER` was registered as:

```typescript
{ provide: APP_INITIALIZER, useFactory: authInitializer, multi: true }
```

with:

```typescript
export function authInitializer(): Promise<boolean> {
  return inject(AuthService).bootstrapSession();
}
```

Angular’s initializer pipeline expects the **factory** to return a **function** that performs async work. Returning a `Promise` directly makes the runtime treat the Promise as the initializer and invoke it like a function → `t is not a function` inside `runInitializers`.

## Wrong pattern

```typescript
// auth.initializer.ts — WRONG
export function authInitializer(): Promise<boolean> {
  return inject(AuthService).bootstrapSession();
}

// app.config.ts
{ provide: APP_INITIALIZER, useFactory: authInitializer, multi: true }
```

## Correct pattern

```typescript
// auth.initializer.ts — CORRECT
export function authInitializer(): () => Promise<boolean> {
  return () => inject(AuthService).bootstrapSession();
}

// app.config.ts — unchanged
{ provide: APP_INITIALIZER, useFactory: authInitializer, multi: true }
```

Alternative (inline factory):

```typescript
{
  provide: APP_INITIALIZER,
  useFactory: () => {
    const auth = inject(AuthService);
    return () => auth.bootstrapSession();
  },
  multi: true,
}
```

## Verification

- [x] `npm run build:prod` succeeds
- [x] Hard refresh https://stingbase.web.app/login — page loads
- [x] No `runInitializers` TypeError in console

## Files

- `src/app/core/auth/auth.initializer.ts`
- `src/app/app.config.ts`

## Agent checklist

Before adding or changing `APP_INITIALIZER`:

1. Confirm `useFactory` returns **`() => void | Promise | Observable`**, not the Promise itself.
2. `inject()` is valid in the **outer** factory (injection context when factory runs).
3. Smoke-test prod build (`ng build --configuration production`) and open `/login`, not only `ng serve`.
4. Do not confuse with `provideAppInitializer()` (Angular 19+) — if used, follow that API’s signature instead.

## Related

- Auth bootstrap also calls `bootstrapSession()` for silent refresh — failures there are silent redirect to login, not this crash.
- [SECURITY.md](../../docs/SECURITY.md) — auth v2 model
- CSP font warnings: separate; see IMP-INDEX quick rules
