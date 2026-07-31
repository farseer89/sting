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

const PROMPT_TYPES: ProtopipeMentionPromptType[] = [
  'generic',
  'local',
  'comparison',
  'brand_defense',
];

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

  readonly typeLabels = MENTION_PROMPT_TYPE_LABELS;
  readonly promptTypes = PROMPT_TYPES;

  readonly summaryByType = computed(() => this.store.output()?.summaryByType ?? null);

  readonly promptsForSelectedType = computed(() => {
    const output = this.store.output();
    if (!output) return [];
    const type = this.selectedType();
    const prompts = output.prompts.filter((p) => p.promptType === type);
    return prompts.map((prompt) => {
      const results = output.results.filter((r) => r.promptId === prompt.id);
      const mentioned = results.filter((r) => r.brandMentioned).length;
      const captures = output.captures.filter((c) => c.promptId === prompt.id);
      const snippet = captures[0]?.rawResponse?.slice(0, 280) ?? '';
      return {
        ...prompt,
        mentionRate: results.length ? mentioned / results.length : 0,
        brandMentioned: mentioned > 0,
        snippet,
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
    this.activeSection.set('by-type');
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
