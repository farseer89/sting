# FieldWave UI patterns

Global layout patterns ported from **probe** (telematics equipment list, dashboard style guide). Loaded via `src/styles.scss` → `src/styles/patterns/`.

## Quick apply

1. Open **UI Playground** → **Style patterns** tab.
2. Pick a pattern (e.g. **Equipment list (full)**).
3. Copy the **root class** (`fw-pattern-equipment-list`) onto your feature container.
4. Copy the HTML snippet for structure; bind your data.

## Root classes

| Pattern | Root class | Use when |
|---------|------------|----------|
| Equipment list (full) | `fw-pattern-equipment-list` | Toolbar + filter pills + excel grid |
| Excel table only | `fw-pattern-equipment-list` | Dense scrollable equipment grid |
| Equipment toolbar | `fw-pattern-equipment-list` | Search bar + filter pills only |
| PrimeNG table | `fw-datatable-equipment` | `p-table` with equipment cell styles |
| Dashboard card | `fw-dashboard-card` | KPI / section chrome |

## Equipment excel table

Probe reference: `telematics-equipment`, `data-manager`.

```html
<div class="fw-pattern-equipment-list">
  <div class="fw-toolbar advanced-bar">…</div>
  <div class="fw-secondary-toolbar">…</div>
  <div class="fw-excel-view">
    <div class="fw-excel-container">
      <div class="fw-excel-table">
        <div class="fw-excel-header">…</div>
        <div class="fw-excel-row">…</div>
      </div>
    </div>
  </div>
</div>
```

**Cell helpers:** `fw-equipment-code`, `fw-equipment-name`, `fw-status-badge` (`status-active` | `status-inactive` | `status-warn`).

**Custom columns:** override `grid-template-columns` on `.fw-excel-header` and `.fw-excel-row` together (must match).

## PrimeNG table variant

```html
<div class="fw-datatable-equipment">
  <div class="fw-table-header">…</div>
  <p-table styleClass="p-datatable-sm p-datatable-striped" [value]="rows">…</p-table>
</div>
```

## Source files

- `src/styles/patterns/_excel-equipment-table.scss`
- `src/styles/patterns/_equipment-toolbar.scss`
- `src/styles/patterns/_datatable-equipment.scss`
- `src/styles/patterns/_dashboard-card.scss`

Probe originals: `probe/src/app/.../telematics-equipment/`, `probe/src/dashboard-style-guide.md`.
