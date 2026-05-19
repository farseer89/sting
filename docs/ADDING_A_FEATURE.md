# Adding a feature to Sting

1. Generate a standalone component:

```bash
ng generate component features/my-feature --standalone
```

2. Add PrimeNG imports on the component (`imports: [Card, Button, ...]`).

3. Register a child route in `src/app/app.routes.ts` under the shell `children`:

```typescript
{
  path: 'my-feature',
  loadComponent: () =>
    import('./features/my-feature/my-feature.component').then((m) => m.MyFeatureComponent),
},
```

4. Add a nav item in `src/app/core/config/navigation.service.ts`.

5. Run `npm run build:prod` and deploy.

Use `src/app/features/home/` as the dashboard layout reference (KPI grid, quick actions, activity table). PrimeNG component docs: `docs/primeng/`.
