import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import type { ShireLead } from '@hive/contracts';
import { isShireHostedSite } from '@hive/contracts';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';

type LeadSortColumn = 'received' | 'name' | 'email' | 'status';
type LeadSortState = { column: LeadSortColumn; direction: 'asc' | 'desc' };
type LeadStatusFilter = 'all' | ShireLead['status'];

@Component({
  selector: 'app-protopipe-home-leads',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-home-leads.component.html',
  styleUrl: './protopipe-home-leads.component.scss',
})
export class ProtopipeHomeLeadsComponent implements OnInit {
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hostedSite = signal(false);
  readonly rows = signal<ShireLead[]>([]);
  readonly sort = signal<LeadSortState>({ column: 'received', direction: 'desc' });
  readonly statusFilter = signal<LeadStatusFilter>('all');
  readonly selectedLead = signal<ShireLead | null>(null);
  readonly deleting = signal(false);

  readonly sortedRows = computed(() => sortLeads(this.filteredRows(), this.sort()));
  readonly filteredRows = computed(() => {
    const filter = this.statusFilter();
    const all = this.rows();
    if (filter === 'all') return all;
    return all.filter((lead) => lead.status === filter);
  });
  readonly hasRows = computed(() => this.filteredRows().length > 0);
  readonly summaryCards = computed(() => buildLeadSummary(this.rows()));
  readonly latestReceived = computed(() => latestLeadDate(this.rows()));

  readonly statusFilters: { id: LeadStatusFilter; label: string }[] = [
    { id: 'all', label: 'All leads' },
    { id: 'new', label: 'New' },
    { id: 'reviewed', label: 'Reviewed' },
    { id: 'converted', label: 'Converted' },
    { id: 'archived', label: 'Archived' },
  ];

  ngOnInit(): void {
    const site = this.strategy.site();
    this.hostedSite.set(isShireHostedSite(site ?? {}));
    if (site?.id && this.hostedSite()) {
      void this.loadLeads();
    }
  }

  async loadLeads(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;

    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.api.listLeads(siteId);
      this.rows.set(res.leads);
      const selected = this.selectedLead();
      if (selected) {
        this.selectedLead.set(res.leads.find((lead) => lead.id === selected.id) ?? null);
      }
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not load leads.'));
    } finally {
      this.loading.set(false);
    }
  }

  setStatusFilter(filter: LeadStatusFilter): void {
    this.statusFilter.set(filter);
  }

  openLead(lead: ShireLead): void {
    this.selectedLead.set(lead);
  }

  closeDrawer(): void {
    this.selectedLead.set(null);
  }

  async deleteSelectedLead(): Promise<void> {
    const lead = this.selectedLead();
    const siteId = this.strategy.siteId();
    if (!lead || !siteId) return;

    const label = lead.name?.trim() || lead.email || 'this lead';
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;

    this.deleting.set(true);
    this.error.set(null);
    try {
      await this.api.deleteLead(siteId, lead.id);
      this.rows.update((rows) => rows.filter((row) => row.id !== lead.id));
      this.selectedLead.set(null);
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not delete lead.'));
    } finally {
      this.deleting.set(false);
    }
  }

  toggleSort(column: LeadSortColumn): void {
    this.sort.update((current) => ({
      column,
      direction:
        current.column === column
          ? current.direction === 'asc'
            ? 'desc'
            : 'asc'
          : column === 'received'
            ? 'desc'
            : 'asc',
    }));
  }

  sortIndicator(column: LeadSortColumn): string {
    const state = this.sort();
    if (state.column !== column) return '';
    return state.direction === 'asc' ? '↑' : '↓';
  }

  statusLabel(status: ShireLead['status']): string {
    switch (status) {
      case 'new':
        return 'New';
      case 'reviewed':
        return 'Reviewed';
      case 'converted':
        return 'Converted';
      case 'archived':
        return 'Archived';
      default:
        return status;
    }
  }

  messagePreview(lead: ShireLead): string {
    const message =
      lead.message?.trim() ||
      (typeof lead.payload['message'] === 'string' ? lead.payload['message'].trim() : '');
    if (!message) return '—';
    return message.length > 80 ? `${message.slice(0, 80)}…` : message;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  }

  formatDateLong(value: string | null | undefined): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  }
}

function sortLeads(rows: ShireLead[], sort: LeadSortState): ShireLead[] {
  const copy = [...rows];
  const dir = sort.direction === 'asc' ? 1 : -1;
  copy.sort((a, b) => {
    switch (sort.column) {
      case 'name':
        return dir * (a.name ?? '').localeCompare(b.name ?? '');
      case 'email':
        return dir * (a.email ?? '').localeCompare(b.email ?? '');
      case 'status':
        return dir * a.status.localeCompare(b.status);
      case 'received':
      default:
        return dir * (Date.parse(a.createdAt) - Date.parse(b.createdAt));
    }
  });
  return copy;
}

function buildLeadSummary(rows: ShireLead[]): { id: string; label: string; value: string; hint: string }[] {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const newCount = rows.filter((row) => row.status === 'new').length;
  const thisWeek = rows.filter((row) => now - Date.parse(row.createdAt) <= weekMs).length;
  const withMessage = rows.filter((row) => {
    const message =
      row.message?.trim() ||
      (typeof row.payload['message'] === 'string' ? row.payload['message'].trim() : '');
    return Boolean(message);
  }).length;

  return [
    { id: 'total', label: 'Total leads', value: String(rows.length), hint: 'All historical submissions' },
    { id: 'new', label: 'New', value: String(newCount), hint: 'Not yet reviewed' },
    { id: 'week', label: 'This week', value: String(thisWeek), hint: 'Last 7 days' },
    { id: 'messages', label: 'With message', value: String(withMessage), hint: 'Includes visitor note' },
  ];
}

function latestLeadDate(rows: ShireLead[]): string | null {
  return rows.reduce<string | null>((latest, row) => {
    if (!latest || row.createdAt > latest) return row.createdAt;
    return latest;
  }, null);
}
