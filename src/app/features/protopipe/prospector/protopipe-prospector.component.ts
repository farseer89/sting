import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Prospect, ProspectPriority, ProspectStatus, ProspectWebsiteStatus } from '@hive/contracts';
import { ProtopipeProspectorService } from './protopipe-prospector.service';
import { ProtopipeProspectorAvatarFormComponent } from './protopipe-prospector-avatar-form.component';
import { ProtopipeHomeThinkerViewState } from '../home/protopipe-home-thinker-view.state';
import { ProtopipeHomeThinkerBinderComponent } from '../home/thinker/protopipe-home-thinker-binder.component';
import { ProtopipeProspectorLeadDrawerComponent } from './protopipe-prospector-lead-drawer.component';
import type { ProspectorRunDto, ProspectorScoredLead } from './prospector-run.model';
import type { BuildBookProspectContext } from '../build-book/build-book-context';
import { isShirePrimary } from '../shire/shire-http.util';
import { ProtopipeProspectorStore } from './protopipe-prospector.store';

export type ProspectorSection = 'new-search' | 'leads' | 'prospects' | 'run-pipeline';

function relativeTime(iso: string | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  if (h < 48) return 'yesterday';
  return `${Math.floor(h / 24)}d ago`;
}

@Component({
  selector: 'app-protopipe-prospector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProtopipeProspectorStore],
  imports: [
    FormsModule,
    ProtopipeProspectorAvatarFormComponent,
    ProtopipeHomeThinkerBinderComponent,
    ProtopipeProspectorLeadDrawerComponent,
  ],
  templateUrl: './protopipe-prospector.component.html',
  styleUrl: './protopipe-prospector.component.scss',
})
export class ProtopipeProspectorComponent implements OnInit {
  private readonly service = inject(ProtopipeProspectorService);
  readonly store = inject(ProtopipeProspectorStore);
  readonly thinkerView = inject(ProtopipeHomeThinkerViewState);
  readonly buildDemo = output<BuildBookProspectContext>();
  readonly shirePrimary = isShirePrimary();

  readonly activeSection = signal<ProspectorSection>('new-search');
  readonly selectedRun = signal<ProspectorRunDto | null>(null);
  readonly runs = signal<ProspectorRunDto[]>([]);
  readonly runsLoading = signal(true);
  readonly runsError = signal<string | null>(null);
  readonly launching = signal(false);
  readonly launchError = signal<string | null>(null);
  readonly expanding = signal(false);
  readonly expandError = signal<string | null>(null);

  readonly prospectStatuses: ProspectStatus[] = [
    'new',
    'call_ready',
    'contacted',
    'qualified',
    'promoted',
    'archived',
  ];
  readonly prospectPriorities: ProspectPriority[] = ['critical', 'high', 'medium', 'monitor'];
  readonly websiteStatuses: ProspectWebsiteStatus[] = ['none', 'poor', 'fair', 'good', 'unknown'];

  // ── Lead drawer ───────────────────────────────────────────────────────────

  readonly drawerLead = signal<ProspectorScoredLead | null>(null);
  readonly drawerVisible = signal(false);

  openLeadDrawer(lead: ProspectorScoredLead): void {
    this.drawerLead.set(lead);
    this.drawerVisible.set(true);
  }

  // ── Lead selection ────────────────────────────────────────────────────────

  readonly selectedLeadNames = signal<Set<string>>(new Set());

  readonly selectedLeads = computed((): ProspectorScoredLead[] => {
    const run = this.selectedRun();
    const leads = run?.artifacts.scoredLeads ?? [];
    const sel = this.selectedLeadNames();
    return leads.filter((l) => l.displayName && sel.has(l.displayName));
  });

  readonly selectedCount = computed(() => this.selectedLeadNames().size);

  readonly allSelected = computed(() => {
    const leads = this.selectedRun()?.artifacts.scoredLeads ?? [];
    if (!leads.length) return false;
    const sel = this.selectedLeadNames();
    return leads.every((l) => l.displayName && sel.has(l.displayName));
  });

  // ── Run stats ─────────────────────────────────────────────────────────────

  readonly totalLeads = computed(() =>
    this.runs().reduce((acc, r) => acc + (r.artifacts.scoredLeads?.length ?? 0), 0),
  );

  readonly totalCost = computed(() =>
    this.runs().reduce((acc, r) => acc + (r.totalCostUsd ?? 0), 0),
  );

  constructor() {
    this.thinkerView.setFocusBackLabel('Back to leads');
    this.thinkerView.setExitHandler(() => this.activeSection.set('leads'));
  }

  async ngOnInit(): Promise<void> {
    void this.store.load();
    if (this.shirePrimary) {
      this.runsLoading.set(false);
      return;
    }
    try {
      const list = await this.service.listRuns();
      this.runs.set(list);
    } catch {
      this.runsError.set('Could not load recent searches.');
    } finally {
      this.runsLoading.set(false);
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async onSearch(input: { category: string; location: string }): Promise<void> {
    this.launching.set(true);
    this.launchError.set(null);

    try {
      if (this.shirePrimary) {
        await this.store.createCampaign(input.category, input.location);
        this.activeSection.set('prospects');
        return;
      }
      const run = await this.service.createRun(input.category, input.location);
      this.runs.update((prev) => [run, ...prev]);
      void this.store.syncCampaignFromRun(run);
      // New runs go straight to pipeline view since there are no leads yet.
      this.openRunPipeline(run);
    } catch {
      this.launchError.set('Failed to start search. Please try again.');
    } finally {
      this.launching.set(false);
    }
  }

  openRunLeads(run: ProspectorRunDto): void {
    // Still running — send to pipeline view.
    if (run.status === 'running' || run.status === 'pending') {
      this.openRunPipeline(run);
      return;
    }
    this.selectedRun.set(run);
    void this.store.syncCampaignFromRun(run);
    this.selectedLeadNames.set(new Set());
    this.activeSection.set('leads');
  }

  openRunPipeline(run?: ProspectorRunDto): void {
    const target = run ?? this.selectedRun();
    if (!target) return;
    this.selectedRun.set(target);
    this.thinkerView.setProspectorRunEmbedded(target);
    this.activeSection.set('run-pipeline');
  }

  backToLeads(): void {
    this.activeSection.set('leads');
  }

  async expandSearch(): Promise<void> {
    const run = this.selectedRun();
    if (!run || this.expanding()) return;

    this.expanding.set(true);
    this.expandError.set(null);
    try {
      const updated = await this.service.expandRun(run.id);
      // Update both the selectedRun and the run in the list
      this.selectedRun.set(updated);
      this.runs.update((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      void this.store.syncCampaignFromRun(updated);
    } catch {
      this.expandError.set('Could not expand — please try again.');
    } finally {
      this.expanding.set(false);
    }
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  toggleLead(name: string | undefined): void {
    if (!name) return;
    this.selectedLeadNames.update((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  toggleAll(): void {
    const leads = this.selectedRun()?.artifacts.scoredLeads ?? [];
    if (this.allSelected()) {
      this.selectedLeadNames.set(new Set());
    } else {
      this.selectedLeadNames.set(new Set(leads.map((l) => l.displayName ?? '')));
    }
  }

  clearSelection(): void {
    this.selectedLeadNames.set(new Set());
  }

  copySelected(): void {
    const leads = this.selectedLeads();
    const lines = leads.map((l) => {
      const parts: string[] = [l.displayName ?? ''];
      if (l.formattedAddress) parts.push(l.formattedAddress);
      if (l.websiteUri) parts.push(l.websiteUri);
      if (l.internationalPhoneNumber) parts.push(l.internationalPhoneNumber);
      return parts.join('\t');
    });
    void navigator.clipboard.writeText(lines.join('\n'));
  }

  stageSelectedAsProspects(): void {
    const run = this.selectedRun();
    if (!run) return;
    this.store.addLeadsAsProspects(this.selectedLeads(), run);
    this.clearSelection();
    this.activeSection.set('prospects');
  }

  saveProspects(): void {
    void this.store.saveProspects();
  }

  updateProspectStatus(prospect: Prospect, status: string): void {
    this.store.updateProspect(prospect.id, { status: status as ProspectStatus });
  }

  updateProspectPriority(prospect: Prospect, priority: string): void {
    this.store.updateProspect(prospect.id, { priority: priority as ProspectPriority });
  }

  updateProspectWebsiteStatus(prospect: Prospect, websiteStatus: string): void {
    this.store.updateProspect(prospect.id, { websiteStatus: websiteStatus as ProspectWebsiteStatus });
  }

  updateProspectNotes(prospect: Prospect, notes: string): void {
    this.store.updateProspect(prospect.id, { notes });
  }

  promoteProspect(prospect: Prospect): void {
    this.buildDemo.emit(this.store.promoteToBuildBook(prospect));
  }

  isLeadSelected(name: string | undefined): boolean {
    return Boolean(name && this.selectedLeadNames().has(name));
  }

  // ── Display helpers ───────────────────────────────────────────────────────

  runStatusClass(run: ProspectorRunDto): string {
    switch (run.status) {
      case 'complete': return 'complete';
      case 'failed': return 'failed';
      case 'running':
      case 'pending': return 'running';
      default: return 'pending';
    }
  }

  priorityLabel(p: string): string {
    return p.charAt(0).toUpperCase() + p.slice(1);
  }

  relativeTime = relativeTime;

  formatCost(usd: number | undefined): string {
    if (!usd) return '';
    return `$${usd.toFixed(4)}`;
  }

  leadCount(run: ProspectorRunDto): number {
    return run.artifacts.scoredLeads?.length ?? 0;
  }

  criticalCount(run: ProspectorRunDto): number {
    return run.artifacts.scoredLeads?.filter((l) => l.priority === 'critical').length ?? 0;
  }

  factors(lead: ProspectorScoredLead): string {
    return lead.scoreBreakdown
      .filter((b) => b.pts > 0)
      .map((b) => b.label)
      .join(' · ');
  }
}
