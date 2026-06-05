import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ProtopipeSiteContentPlan, ProtopipeScoredKeyword } from '@hive/contracts';

interface KeywordRow {
  phrase: string;
  searchVolume: number | null;
  opportunityScore: number;
  tier: string;
  tierKey: 'immediate' | 'long-term' | 'long-tail';
}

@Component({
  selector: 'app-strategy-content-keywords',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './strategy-content-keywords.component.html',
  styleUrl: './strategy-content-keywords.component.scss',
})
export class StrategyContentKeywordsComponent {
  readonly plan = input.required<ProtopipeSiteContentPlan>();

  readonly rows = computed(() => {
    const tiers = this.plan().keywordTiers;
    return [
      ...this.toRows(tiers.immediateFocus, 'Immediate', 'immediate'),
      ...this.toRows(tiers.longTerm, 'Long-term', 'long-term'),
      ...this.toRows(tiers.longTail, 'Long-tail', 'long-tail'),
    ];
  });

  private toRows(
    items: ProtopipeScoredKeyword[],
    tier: string,
    tierKey: KeywordRow['tierKey'],
  ): KeywordRow[] {
    return items.map((kw) => ({
      phrase: kw.phrase,
      searchVolume: kw.searchVolume ?? null,
      opportunityScore: kw.opportunityScore,
      tier,
      tierKey,
    }));
  }
}
