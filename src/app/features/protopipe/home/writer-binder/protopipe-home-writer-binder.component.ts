import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

export type WriterPanel =
  | 'canvas'
  | 'brief'
  | 'serp'
  | 'preview'
  | 'seo'
  | 'facts'
  | 'pipeline';

@Component({
  selector: 'app-protopipe-home-writer-binder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-home-writer-binder.component.html',
  styleUrl: './protopipe-home-writer-binder.component.scss',
})
export class ProtopipeHomeWriterBinderComponent {
  readonly activePanel = signal<WriterPanel>('canvas');
  readonly keywordsVisible = signal(true);

  readonly mockSections = [
    {
      heading: 'Signs Your Panel Needs Replacing',
      body: 'If your breakers trip more than once a month, outlets feel warm near the panel, or you notice a burning smell, those are early warning signs worth taking seriously. Most 100–150A panels installed before 2000 weren\'t designed for today\'s demand.',
      wordCount: 312,
    },
    {
      heading: 'Understanding Panel Capacity',
      body: 'A standard modern home needs at least 200A service. EV chargers alone draw 40–50A continuously. Add a home office, whole-house AC, and smart appliances, and older 100A panels routinely hit 90% capacity — NEC §220 requires a 20% safety margin.',
      wordCount: 287,
    },
    {
      heading: 'The Cost of a Panel Upgrade (2024)',
      body: 'Panel replacements in Phoenix typically run $1,800–$3,200 for a 200A upgrade, including permits and inspection. The range depends on service entry location, panel brand, and whether the meter base needs work.',
      wordCount: 203,
    },
    {
      heading: 'The Permit Process in Arizona',
      body: 'All electrical panel work in Arizona requires a permit through your city building department. Inspections are scheduled within 3–5 business days. A licensed electrician handles this process — unpermitted work can void your homeowner\'s insurance.',
      wordCount: 178,
    },
    {
      heading: 'DIY vs. Hiring a Licensed Electrician',
      body: 'Panel work involves live utility feeds. Even with the main breaker off, the service entry conductors remain energized — only the utility can de-energize those. This is why panel replacement is not a DIY job.',
      wordCount: 161,
    },
  ];

  readonly mockFacts = [
    {
      id: 'f1',
      claim: 'Most homes built before 1990 have panels that need immediate replacement.',
      severity: 'critical' as const,
      context: 'This is overstated. Many pre-1990 panels are functional if properly maintained. Consider: "may benefit from inspection" rather than "need replacement."',
      resolved: false,
    },
    {
      id: 'f2',
      claim: 'Panel upgrades typically cost between $1,500–$3,000.',
      severity: 'warning' as const,
      context: 'Current Phoenix market data shows $1,800–$3,200. Consider updating the range or citing a source.',
      resolved: false,
    },
  ];

  readonly pipelineSteps = [
    { label: 'Site context', status: 'done' as const, duration: '0.2s', cost: '$0.001' },
    { label: 'Keyword analysis', status: 'done' as const, duration: '8.3s', cost: '$0.012' },
    { label: 'Competitor research', status: 'done' as const, duration: '12.1s', cost: '$0.019' },
    { label: 'Topic structuring', status: 'done' as const, duration: '6.7s', cost: '$0.009' },
    { label: 'Draft writing', status: 'done' as const, duration: '41.8s', cost: '$0.063' },
    { label: 'Fact extraction', status: 'done' as const, duration: '4.2s', cost: '$0.007' },
    { label: 'Quality review', status: 'done' as const, duration: '3.1s', cost: '$0.005' },
  ];

  get unresolvedFacts(): number {
    return this.mockFacts.filter((f) => !f.resolved).length;
  }

  get totalWords(): number {
    return this.mockSections.reduce((s, sec) => s + sec.wordCount, 0) + 210; // intro
  }

  readonly targetWords = 2100;
}
