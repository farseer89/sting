# Design assets (PrimeBlocks / FieldWave)

## PrimeBlocks Figma

The PrimeBlocks Figma file is **not committed** (typical size ~480MB).

Place it locally:

```bash
# From repo root
mkdir -p design
cp "/Users/miked/Downloads/primeblocks (1).fig" design/primeblocks.fig
```

Or run:

```bash
./scripts/setup-design-assets.sh
```

Use it as visual reference for dashboard blocks; Sting implements layout via **PrimeNG 21 Lara preset** + probe `alpha-layout` patterns (see `src/app/layout/shell/`).

## Probe parity checklist

| Probe | Sting |
|-------|--------|
| `lara-light-blue` theme CSS | `@primeuix/themes/lara` + `FieldwavePreset` |
| Inter / Poppins fonts | `index.html` Google Fonts |
| `--surface-ground: #eff3f8` | Lara semantic tokens |
| FieldWave logo in sidebar | `assets/images/blocks/logos/fieldwave.png` |
| Green primary `#059669` | Emerald scale in preset |
| PrimeFlex utilities | `primeflex` in `styles.scss` |

## PrimeNG docs in repo

See [docs/primeng/README.md](../docs/primeng/README.md) and [Configuration](https://primeng.org/configuration).
