/** FieldWave style patterns — global classes in src/styles/patterns/ */

export type UiPatternId =
  | 'equipment-list-full'
  | 'equipment-excel-table'
  | 'equipment-toolbar'
  | 'equipment-datatable'
  | 'dashboard-card';

export interface UiPattern {
  id: UiPatternId;
  name: string;
  description: string;
  /** Root wrapper class to add on your feature container */
  rootClass: string;
  snippet: string;
  demoKey: UiPatternId;
  keywords?: string[];
}

export const UI_PATTERNS: UiPattern[] = [
  {
    id: 'equipment-list-full',
    name: 'Equipment list (full)',
    description:
      'Complete probe-style equipment screen: sticky toolbar, filter pills, excel grid. Wrap feature root with fw-pattern-equipment-list.',
    rootClass: 'fw-pattern-equipment-list',
    demoKey: 'equipment-list-full',
    keywords: ['telematics', 'excel', 'equipment', 'table', 'probe'],
    snippet: `<!-- Feature root -->
<div class="fw-pattern-equipment-list">
  <div class="fw-toolbar advanced-bar">...</div>
  <div class="fw-secondary-toolbar">...</div>
  <div class="fw-excel-view">
    <div class="fw-excel-container">
      <div class="fw-excel-table">
        <div class="fw-excel-header">...</div>
        <div class="fw-excel-row equipment-row">...</div>
      </div>
    </div>
  </div>
</div>

/* Global styles already loaded via src/styles.scss */`,
  },
  {
    id: 'equipment-excel-table',
    name: 'Excel equipment table',
    description: 'Dense scrollable grid with sticky header — from probe telematics / data-manager.',
    rootClass: 'fw-pattern-equipment-list',
    demoKey: 'equipment-excel-table',
    keywords: ['excel', 'grid', 'sortable'],
    snippet: `<div class="fw-pattern-equipment-list">
  <div class="fw-excel-view">
    <div class="fw-excel-container">
      <div class="fw-excel-table">
        <div class="fw-excel-header">
          <div class="fw-header-cell sortable col-code">Equipment Code</div>
          ...
        </div>
        @for (row of rows; track row.id) {
          <div class="fw-excel-row">
            <div class="fw-cell col-code">
              <span class="fw-equipment-code">{{ row.code }}</span>
            </div>
            ...
          </div>
        }
      </div>
    </div>
  </div>
</div>`,
  },
  {
    id: 'equipment-toolbar',
    name: 'Equipment toolbar',
    description: 'Primary sticky bar + filter pills + count badge.',
    rootClass: 'fw-pattern-equipment-list',
    demoKey: 'equipment-toolbar',
    keywords: ['toolbar', 'filter', 'search'],
    snippet: `<div class="fw-pattern-equipment-list">
  <div class="fw-toolbar advanced-bar">
    <div class="fw-toolbar-section">
      <span class="fw-compact-input">
        <i class="pi pi-search"></i>
        <input pInputText placeholder="Search equipment..." />
      </span>
    </div>
  </div>
  <div class="fw-secondary-toolbar">
    <div class="fw-filter-pills">
      <button class="fw-filter-pill active">All</button>
      <button class="fw-filter-pill">Active</button>
    </div>
    <span class="fw-equipment-count-badge">
      <i class="pi pi-cog"></i> 24 / 30 Equipment
    </span>
  </div>
</div>`,
  },
  {
    id: 'equipment-datatable',
    name: 'PrimeNG equipment table',
    description: 'p-table with FieldWave equipment cell classes — lighter than excel grid.',
    rootClass: 'fw-datatable-equipment',
    demoKey: 'equipment-datatable',
    keywords: ['p-table', 'primeng', 'export', 'heavyjob'],
    snippet: `<div class="fw-datatable-equipment">
  <div class="fw-table-header">
    <span class="fw-table-title">42 equipment</span>
    <input pInputText placeholder="Search..." />
  </div>
  <p-table
    [value]="rows"
    styleClass="p-datatable-sm p-datatable-striped"
    [paginator]="true"
    [rows]="10"
  >
    <ng-template pTemplate="header">
      <tr><th>Code</th><th>Name</th><th>Status</th></tr>
    </ng-template>
    <ng-template pTemplate="body" let-row>
      <tr>
        <td><span class="fw-equipment-code">{{ row.code }}</span></td>
        <td><span class="fw-equipment-name">{{ row.name }}</span></td>
        <td>...</td>
      </tr>
    </ng-template>
  </p-table>
</div>`,
  },
  {
    id: 'dashboard-card',
    name: 'Dashboard card',
    description: 'Card chrome from probe dashboard-style-guide.md.',
    rootClass: 'fw-dashboard-card',
    demoKey: 'dashboard-card',
    keywords: ['dashboard', 'card', 'kpi'],
    snippet: `<div class="fw-dashboard-card">
  <div class="fw-card-header">
    <i class="pi pi-chart-bar"></i>
    <h3>Section title</h3>
  </div>
  <div class="fw-card-content">
    <!-- KPIs, tables, etc. -->
  </div>
</div>`,
  },
];
