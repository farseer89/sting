#!/usr/bin/env bash
# Copy PrimeBlocks Figma + probe logos into sting (local only; .fig is gitignored).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIG_SRC="${PRIMEBLOCKS_FIG:-$HOME/Downloads/primeblocks (1).fig}"
mkdir -p "$ROOT/design" "$ROOT/public/assets/images/blocks/logos"
if [[ -f "$FIG_SRC" ]]; then
  cp "$FIG_SRC" "$ROOT/design/primeblocks.fig"
  echo "Copied Figma -> design/primeblocks.fig"
else
  echo "Figma not found at: $FIG_SRC"
  echo "Set PRIMEBLOCKS_FIG=/path/to/file.fig"
fi
PROBE_LOGO="$ROOT/../probe/src/assets/images/blocks/logos/fieldwave.png"
if [[ -f "$PROBE_LOGO" ]]; then
  cp "$PROBE_LOGO" "$ROOT/public/assets/images/blocks/logos/"
  cp "$ROOT/../probe/src/assets/images/blocks/logos/fieldwave-white.png" "$ROOT/public/assets/images/blocks/logos/" 2>/dev/null || true
  echo "Copied FieldWave logos from probe"
fi
