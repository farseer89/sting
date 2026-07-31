import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe, PercentPipe } from '@angular/common';
import { ProgressSpinner } from 'primeng/progressspinner';
import type { ProtopipeMentionPromptType } from '@hive/contracts';
import { ProtopipeStrategyService } from '../../../protopipe-strategy.service';
import {
  MENTION_PROMPT_TYPE_LABELS,
  MentionsBookStore,
  type MentionsBookSection,
} from './mentions-book.store';
import { MENTION_ENGINES, type MentionEngineUiConfig } from './mention-engines.config';

const PROMPT_TYPES: ProtopipeMentionPromptType[] = [
  'generic',
  'local',
  'comparison',
  'brand_defense',
];

export interface MentionEngineCardView extends MentionEngineUiConfig {
  mentionRate: number | null;
  consistencyScore: number | null;
  promptCount: number | null;
}

export interface MentionCompetitorView {
  name: string;
  mentionCount: number;
  shareOfVoice: number;
}

export interface MentionPromptResponseView {
  runIndex: number;
  text: string;
  brandMentioned: boolean;
}

export interface MentionPromptRowView {
  id: string;
  text: string;
  mentionRate: number;
  brandMentioned: boolean;
  responses: MentionPromptResponseView[];
  citedDomains: string[];
}

@Component({
  selector: 'app-protopipe-home-mentions-book',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MentionsBookStore],
  imports: [DatePipe, PercentPipe, ProgressSpinner],
  templateUrl: './protopipe-home-mentions-book.component.html',
  styleUrl: './protopipe-home-mentions-book.component.scss',
})
export class ProtopipeHomeMentionsBookComponent implements OnInit, OnDestroy {
  readonly store = inject(MentionsBookStore);
  private readonly strategy = inject(ProtopipeStrategyService);

  readonly siteLabel = input('');
  readonly openSharpen = output<void>();
  readonly viewRun = output<string>();

  readonly sections: { id: MentionsBookSection; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'by-type', label: 'By type' },
    { id: 'history', label: 'History' },
  ];

  readonly activeSection = signal<MentionsBookSection>('overview');
  readonly selectedType = signal<ProtopipeMentionPromptType>('generic');
  readonly expandedPromptIds = signal<ReadonlySet<string>>(new Set());

  readonly typeLabels = MENTION_PROMPT_TYPE_LABELS;
  readonly promptTypes = PROMPT_TYPES;
  readonly engines = MENTION_ENGINES;

  readonly summaryByType = computed(() => this.store.output()?.summaryByType ?? null);

  /** 0–100 visibility score derived from Gemini mention rate (single-engine v1). */
  readonly visibilityScore = computed(() => {
    const rate = this.overallMentionRate();
    return rate == null ? null : Math.round(rate * 100);
  });

  readonly overallMentionRate = computed(() => {
    const output = this.store.output();
    if (!output?.results.length) return null;
    const mentioned = output.results.filter((r) => r.brandMentioned).length;
    return mentioned / output.results.length;
  });

  readonly overallConsistency = computed(() => {
    const summary = this.summaryByType();
    if (!summary) return null;
    const scores = PROMPT_TYPES.map((t) => summary[t].consistencyScore).filter((s) => s > 0);
    if (!scores.length) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  });

  readonly promptStats = computed(() => {
    const output = this.store.output();
    if (!output) return null;
    const promptIds = new Set(output.prompts.map((p) => p.id));
    let mentionedPrompts = 0;
    let gapPrompts = 0;
    for (const id of promptIds) {
      const runs = output.results.filter((r) => r.promptId === id);
      if (!runs.length) continue;
      if (runs.some((r) => r.brandMentioned)) {
        mentionedPrompts += 1;
      } else {
        gapPrompts += 1;
      }
    }
    return {
      total: output.prompts.length,
      mentioned: mentionedPrompts,
      gaps: gapPrompts,
    };
  });

  readonly engineCards = computed((): MentionEngineCardView[] => {
    const output = this.store.output();
    const mentionRate = this.overallMentionRate();
    const consistency = this.overallConsistency();
    const promptCount = output?.prompts.length ?? null;

    return MENTION_ENGINES.map((engine) => {
      if (engine.status === 'active') {
        return {
          ...engine,
          mentionRate,
          consistencyScore: consistency,
          promptCount,
        };
      }
      return {
        ...engine,
        mentionRate: null,
        consistencyScore: null,
        promptCount: null,
      };
    });
  });

  readonly topCompetitors = computed((): MentionCompetitorView[] => {
    const output = this.store.output();
    if (!output) return [];
    const counts = new Map<string, number>();
    for (const result of output.results) {
      for (const name of result.citedCompetitors) {
        const key = name.trim();
        if (!key) continue;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    const total = [...counts.values()].reduce((a, b) => a + b, 0) || 1;
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, mentionCount]) => ({
        name,
        mentionCount,
        shareOfVoice: mentionCount / total,
      }));
  });

  readonly promptsForSelectedType = computed((): MentionPromptRowView[] => {
    const output = this.store.output();
    if (!output) return [];
    const type = this.selectedType();
    const prompts = output.prompts.filter((p) => p.promptType === type);
    return prompts.map((prompt) => {
      const results = output.results.filter((r) => r.promptId === prompt.id);
      const mentioned = results.filter((r) => r.brandMentioned).length;
      const captures = output.captures
        .filter((c) => c.promptId === prompt.id)
        .sort((a, b) => a.runIndex - b.runIndex);
      const responses: MentionPromptResponseView[] = captures.map((capture) => {
        const result = results.find((r) => r.runIndex === capture.runIndex);
        return {
          runIndex: capture.runIndex,
          text: capture.rawResponse ?? '',
          brandMentioned: result?.brandMentioned ?? false,
        };
      });
      return {
        id: prompt.id,
        text: prompt.text,
        mentionRate: results.length ? mentioned / results.length : 0,
        brandMentioned: mentioned > 0,
        responses,
        citedDomains: [...new Set(results.flatMap((r) => r.citedDomains))],
      };
    });
  });

  ngOnInit(): void {
    void this.bootstrap();
  }

  ngOnDestroy(): void {
    this.store.stopPolling();
  }

  selectSection(section: MentionsBookSection): void {
    this.activeSection.set(section);
  }

  selectType(type: ProtopipeMentionPromptType): void {
    this.selectedType.set(type);
    this.expandedPromptIds.set(new Set());
    this.activeSection.set('by-type');
  }

  selectPromptType(type: ProtopipeMentionPromptType): void {
    this.selectedType.set(type);
    this.expandedPromptIds.set(new Set());
  }

  isPromptExpanded(promptId: string): boolean {
    return this.expandedPromptIds().has(promptId);
  }

  togglePromptExpanded(promptId: string): void {
    this.expandedPromptIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(promptId)) {
        next.delete(promptId);
      } else {
        next.add(promptId);
      }
      return next;
    });
  }

  hasExpandableContent(row: MentionPromptRowView): boolean {
    return row.responses.length > 1 || row.responses.some((r) => r.text.length > 280);
  }

  async onRunCheck(force = false): Promise<void> {
    await this.store.runCheck(force);
  }

  onImproveFacts(): void {
    this.openSharpen.emit();
  }

  onViewRun(): void {
    const snapshotId = this.store.snapshot()?.id;
    if (snapshotId) {
      this.viewRun.emit(snapshotId);
    }
  }

  private async bootstrap(): Promise<void> {
    await this.strategy.ensureLoaded();
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    this.store.setSiteId(siteId);
    await this.store.loadLatest();
  }
}
