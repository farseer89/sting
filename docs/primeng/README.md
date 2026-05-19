# PrimeNG reference (for agents & developers)

Sting uses **PrimeNG 21** with `providePrimeNG()` and per-component imports.

**Theme:** Lara preset via `src/app/core/theme/fieldwave-preset.ts` (matches probe `lara-light-*` + FieldWave green `#059669`). Do not use Aura unless you intentionally want a different look.

Required setup (already in repo):

- `providePrimeNG({ theme: { preset: FieldwavePreset } })` in `app.config.ts`
- `primeicons` + `primeflex` in `src/styles.scss`
- Inter/Poppins in `index.html`

| File | Purpose |
|------|---------|
| [llms.txt](./llms.txt) | Compact index — component list + guide links |
| [llms-full.txt](./llms-full.txt) | Full LLM-oriented component docs |

Upstream (refresh when upgrading PrimeNG):

- https://primeng.org/llms/llms.txt
- https://primeng.org/llms/llms-full.txt
- [Migration v21](https://primeng.org/migration/v21)

```bash
curl -fsSL https://primeng.org/llms/llms.txt -o docs/primeng/llms.txt
curl -fsSL https://primeng.org/llms/llms-full.txt -o docs/primeng/llms-full.txt
```

**Dev Docs (local dev):** `/dev/docs` — Stinger onboarding and launch checklist.

**UI Playground (local dev):** `/dev/ui` — searchable catalog of PrimeNG components + Hive contract examples. See `docs/BUILDING_UI_WITH_HIVE.md`.

Dashboard UI patterns for Sting features: see `src/app/features/home/` and probe `src/dashboard-style-guide.md`.
