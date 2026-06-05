import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { ProtopipeSiteContentPlan, ProtopipeScoredKeyword } from '@hive/contracts';
import { ProtopipeHomeStrategyViewState } from './protopipe-home-strategy-view.state';

interface KeywordRow {
  phrase: string;
  searchVolume: number | null;
  opportunityScore: number;
  tier: string;
  tierKey: 'immediate' | 'long-term' | 'long-tail';
  avatarLabel: string;
  source: string;
  funnel: string;
  gap: string;
  serpFeatures: string;
}

@Component({
  selector: 'app-strategy-content-keywords',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './strategy-content-keywords.component.html',
  styleUrl: './strategy-content-keywords.component.scss',
})
export class StrategyContentKeywordsComponent {
  private readonly viewState = inject(ProtopipeHomeStrategyViewState);

  readonly plan = input.required<ProtopipeSiteContentPlan>();

  readonly rows = computed(() => {
    const tiers = this.plan().keywordTiers;
    const avatars = this.plan().keywordStrategySnapshot?.confirmedAvatars ?? [];
    const avatarById = new Map(avatars.map((a) => [a.id, a.description]));
    return [
      ...this.toRows(tiers.immediateFocus, 'Immediate', 'immediate', avatarById),
      ...this.toRows(tiers.longTerm, 'Long-term', 'long-term', avatarById),
      ...this.toRows(tiers.longTail, 'Long-tail', 'long-tail', avatarById),
    ];
  });

  private toRows(
    items: ProtopipeScoredKeyword[],
    tier: string,
    tierKey: KeywordRow['tierKey'],
    avatarById: Map<string, string>,
  ): KeywordRow[] {
    return items.map((kw) => ({
      phrase: kw.phrase,
      searchVolume: kw.searchVolume ?? null,
      opportunityScore: kw.opportunityScore,
      tier,
      tierKey,
      avatarLabel: kw.avatarId ? (avatarById.get(kw.avatarId) ?? kw.avatarId) : '—',
      source: kw.discoverySource ?? kw.source,
      funnel: kw.funnelStage ?? '—',
      gap: kw.isGap ? 'Gap' : '—',
      serpFeatures: kw.serpFeatures?.length ? kw.serpFeatures.join(', ') : '—',
    }));
  }

  openKeyword(phrase: string): void {
    this.viewState.selectFromKeywordPhrase(this.plan(), phrase);
  }
}
