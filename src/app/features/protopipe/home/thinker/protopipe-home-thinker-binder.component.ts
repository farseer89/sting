import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

export interface MockStep {
  id: string;
  num: string;
  label: string;
  status: 'done' | 'running' | 'pending' | 'failed';
  durationMs?: number;
  costUsd?: number;
  summary?: string;
  inputArtifact?: { label: string; kind: string; preview: string };
  outputArtifact?: { label: string; kind: string; preview: string };
}

type ThinkerTab = 'output' | 'events' | 'raw';

@Component({
  selector: 'app-protopipe-home-thinker-binder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-home-thinker-binder.component.html',
  styleUrl: './protopipe-home-thinker-binder.component.scss',
})
export class ProtopipeHomeThinkerBinderComponent {
  readonly activeStepId = signal<string>('draft-writing');
  readonly activeTab = signal<ThinkerTab>('output');

  readonly steps: MockStep[] = [
    {
      id: 'site-context',
      num: '01',
      label: 'Site context',
      status: 'done',
      durationMs: 210,
      costUsd: 0.001,
      summary: 'Loaded site profile for Sparky Electric. Industry: electrical contractor. Voice: confident, approachable. Avg content length: 1,600 words.',
      inputArtifact: { label: 'Site ID', kind: 'text', preview: 'sparky-electric-phoenix-az' },
      outputArtifact: {
        label: 'Site profile',
        kind: 'json',
        preview: `{\n  "name": "Sparky Electric",\n  "industry": "Electrical contractor",\n  "location": "Phoenix, AZ",\n  "tone": "confident, approachable",\n  "avgWordCount": 1620\n}`,
      },
    },
    {
      id: 'keyword-analysis',
      num: '02',
      label: 'Keyword analysis',
      status: 'done',
      durationMs: 8340,
      costUsd: 0.012,
      summary: 'Found 47 related keywords. Primary: "electrical panel upgrade". Secondary: "panel replacement cost", "when to replace breaker box", "200 amp service upgrade".',
      inputArtifact: {
        label: 'Target topic',
        kind: 'text',
        preview: 'When should you upgrade your electrical panel?',
      },
      outputArtifact: {
        label: 'Keyword clusters',
        kind: 'table',
        preview: `PRIMARY\n  electrical panel upgrade        Vol: 12,100   KD: 42\n  breaker box replacement         Vol: 8,200    KD: 38\n\nSECONDARY\n  panel upgrade cost              Vol: 4,400    KD: 31\n  200 amp service upgrade         Vol: 3,600    KD: 29\n  how long do electrical panels last Vol: 2,900  KD: 24`,
      },
    },
    {
      id: 'competitor-research',
      num: '03',
      label: 'Competitor research',
      status: 'done',
      durationMs: 12060,
      costUsd: 0.019,
      summary: 'Analyzed 8 competitor articles. Avg length: 1,847 words. Content gaps found: permit process detail, cost by amperage tier, DIY risk section.',
      inputArtifact: {
        label: 'Keyword set',
        kind: 'text',
        preview: 'electrical panel upgrade, breaker box replacement',
      },
      outputArtifact: {
        label: 'Gap analysis',
        kind: 'markdown',
        preview: `## Content gaps vs competitors\n\n- ✗ Permit requirements by city\n- ✗ Cost breakdown by amperage (100A vs 200A)\n- ✗ Financing options\n- ✓ Signs you need an upgrade\n- ✓ DIY vs professional comparison`,
      },
    },
    {
      id: 'topic-structuring',
      num: '04',
      label: 'Topic structuring',
      status: 'done',
      durationMs: 6720,
      costUsd: 0.009,
      summary: 'Generated 6-section outline targeting 2,100 words. H2 structure optimized for featured snippet capture on "when to upgrade" query.',
      inputArtifact: {
        label: 'Gap analysis + keywords',
        kind: 'text',
        preview: 'Merged keyword clusters and content gaps',
      },
      outputArtifact: {
        label: 'Article outline',
        kind: 'markdown',
        preview: `# When Should You Upgrade Your Electrical Panel?\n\n## Signs Your Panel Needs Replacing\n## Understanding Panel Capacity\n## The Cost of a Panel Upgrade (2024)\n## The Permit Process in Arizona\n## DIY vs. Hiring a Licensed Electrician\n## Next Steps: What to Expect\n\n→ Target: 2,100 words  → Reading level: 8th grade`,
      },
    },
    {
      id: 'draft-writing',
      num: '05',
      label: 'Draft writing',
      status: 'running',
      summary: 'Generating full article draft based on outline and keyword targets. Currently writing section 3 of 6.',
      inputArtifact: {
        label: 'Article outline',
        kind: 'markdown',
        preview: '6-section outline, 2,100 word target',
      },
    },
    {
      id: 'fact-extraction',
      num: '06',
      label: 'Fact extraction',
      status: 'pending',
    },
    {
      id: 'quality-review',
      num: '07',
      label: 'Quality review',
      status: 'pending',
    },
  ];

  readonly mockEvents = [
    { at: '12:04:31', level: 'info', msg: 'Draft writing started' },
    { at: '12:04:32', level: 'info', msg: 'Writing section 1: Signs Your Panel Needs Replacing' },
    { at: '12:04:48', level: 'info', msg: 'Section 1 complete (312 words)' },
    { at: '12:04:49', level: 'info', msg: 'Writing section 2: Understanding Panel Capacity' },
    { at: '12:05:02', level: 'info', msg: 'Section 2 complete (287 words)' },
    { at: '12:05:03', level: 'info', msg: 'Writing section 3: The Cost of a Panel Upgrade' },
  ];

  get activeStep(): MockStep | undefined {
    return this.steps.find((s) => s.id === this.activeStepId());
  }

  get progress(): number {
    const done = this.steps.filter((s) => s.status === 'done').length;
    return Math.round((done / this.steps.length) * 100);
  }

  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  formatCost(usd?: number): string {
    if (!usd) return '';
    return `$${usd.toFixed(3)}`;
  }

  totalCost(): string {
    const total = this.steps
      .filter((s) => s.status === 'done')
      .reduce((sum, s) => sum + (s.costUsd ?? 0), 0);
    return `$${total.toFixed(3)}`;
  }
}
