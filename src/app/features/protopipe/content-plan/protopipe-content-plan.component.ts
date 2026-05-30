import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type {
  KeywordPriority,
  ProtopipeContentPlanCalendarItem,
  ProtopipeScoredKeyword,
} from '@hive/contracts';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ProgressBar } from 'primeng/progressbar';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';
import { prioritySeverity } from '../protopipe-keyword-display';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';
import { ContentPlanStore } from './content-plan.store';

type PlanSection = 'overview' | 'calendar' | 'keywords' | 'clusters' | 'audit';

interface PlanSectionDef {
  id: PlanSection;
  label: string;
  icon: string;
}

type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

@Component({
  selector: 'app-protopipe-content-plan',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    Card,
    Button,
    Tag,
    TableModule,
    TabsModule,
    ProgressBar,
    Tooltip,
  ],
  templateUrl: './protopipe-content-plan.component.html',
  styleUrl: './protopipe-content-plan.component.scss',
})
export class ProtopipeContentPlanComponent implements OnInit {
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly store = inject(ContentPlanStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeTab = signal<PlanSection>('overview');
  readonly sections: PlanSectionDef[] = [
    { id: 'overview', label: 'Overview', icon: 'pi pi-compass' },
    { id: 'calendar', label: 'Calendar', icon: 'pi pi-calendar' },
    { id: 'keywords', label: 'Keywords', icon: 'pi pi-list' },
    { id: 'clusters', label: 'Clusters', icon: 'pi pi-sitemap' },
    { id: 'audit', label: 'Existing content', icon: 'pi pi-file' },
  ];

  readonly plan = this.store.plan;
  readonly starting = this.store.starting;
  readonly loading = this.store.loading;
  readonly error = this.store.error;
  readonly isRunning = this.store.isRunning;
  readonly isComplete = this.store.isComplete;
  readonly hasFailed = this.store.hasFailed;

  readonly tiers = computed(() => this.plan()?.keywordTiers);
  readonly clusters = computed(() => this.plan()?.clusters ?? []);
  readonly calendar = computed(() => this.plan()?.calendar ?? []);
  readonly pillars = computed(() => this.plan()?.pillars ?? []);
  readonly audit = computed(() => this.plan()?.existingContent);
  readonly narrative = computed(() => this.plan()?.narrative);

  readonly progressPct = computed(() => {
    const p = this.plan()?.progress;
    if (!p || p.total <= 0) return 0;
    return Math.round((p.scanned / p.total) * 100);
  });

  async ngOnInit(): Promise<void> {
    this.destroyRef.onDestroy(() => this.store.stopPolling());
    await this.strategy.ensureLoaded();
    const siteId = this.strategy.siteId();
    if (siteId) {
      this.store.setSiteId(siteId);
      await this.store.loadLatest();
    }
  }

  generate(): void {
    void this.store.generate();
  }

  sectionCount(id: PlanSection): number | null {
    switch (id) {
      case 'calendar':
        return this.calendar().length || null;
      case 'keywords': {
        const t = this.tiers();
        if (!t) return null;
        return (
          t.immediateFocus.length + t.longTerm.length + t.longTail.length || null
        );
      }
      case 'clusters':
        return this.clusters().length || null;
      case 'audit':
        return this.audit()?.scannedCount || null;
      default:
        return null;
    }
  }

  // ---- display helpers ----

  tierKeywords(tier: 'immediateFocus' | 'longTerm' | 'longTail'): ProtopipeScoredKeyword[] {
    return this.tiers()?.[tier] ?? [];
  }

  prioritySeverity(priority?: KeywordPriority): TagSeverity {
    return priority ? prioritySeverity(priority) : 'secondary';
  }

  volumeBadge(kw: ProtopipeScoredKeyword): string {
    return kw.volumeSource === 'google_ads' ? 'ads' : kw.volumeSource === 'dataforseo' ? 'dfs' : '—';
  }

  cpcRange(kw: ProtopipeScoredKeyword): string | null {
    const ads = kw.googleAds;
    if (!ads || (ads.cpcLow == null && ads.cpcHigh == null)) return null;
    const lo = ads.cpcLow != null ? `$${ads.cpcLow.toFixed(2)}` : '?';
    const hi = ads.cpcHigh != null ? `$${ads.cpcHigh.toFixed(2)}` : '?';
    return `${lo}–${hi}`;
  }

  calendarByCluster(): { cluster: string; items: ProtopipeContentPlanCalendarItem[] }[] {
    const groups = new Map<string, ProtopipeContentPlanCalendarItem[]>();
    for (const item of this.calendar()) {
      const key = item.clusterName ?? 'Unassigned';
      const arr = groups.get(key) ?? [];
      arr.push(item);
      groups.set(key, arr);
    }
    return [...groups.entries()].map(([cluster, items]) => ({ cluster, items }));
  }
}
