import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Button } from 'primeng/button';

export type BuildBookSection = 'hero' | 'fold' | 'services' | 'proof' | 'areas' | 'close';

export interface BuildBookHeroOption {
  id: string;
  label: string;
  desc: string;
  layout: 'fullbleed' | 'split' | 'bento' | 'dual-path' | 'metrics' | 'band';
  tag?: string;
}

export interface BuildBookFoldOption {
  id: string;
  label: string;
  desc: string;
  layout: 'contract-bar' | 'capabilities' | 'featured' | 'stats';
}

export interface BuildBookServicesOption {
  id: string;
  label: string;
  desc: string;
  layout: 'grid' | 'list' | 'cards' | 'tabs';
}

@Component({
  selector: 'app-protopipe-home-build-book',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  templateUrl: './protopipe-home-build-book.component.html',
  styleUrl: './protopipe-home-build-book.component.scss',
})
export class ProtopipeHomeBuildBookComponent {
  readonly section = signal<BuildBookSection>('hero');
  readonly selectedHeroId = signal('hero-fullbleed');
  readonly selectedFoldId = signal('fold-contract');
  readonly selectedServicesId = signal('svc-grid');

  readonly heroOptions: BuildBookHeroOption[] = [
    {
      id: 'hero-fullbleed',
      label: 'Full bleed',
      desc: 'Photo background, dark scrim, left-aligned copy and dual CTAs.',
      layout: 'fullbleed',
      tag: 'Popular',
    },
    {
      id: 'hero-split',
      label: 'Split field',
      desc: 'Half photo, half copy — strong for trades with job-site photography.',
      layout: 'split',
    },
    {
      id: 'hero-bento',
      label: 'Bento grid',
      desc: 'Copy left, photo mosaic right — editorial without losing conversion.',
      layout: 'bento',
    },
    {
      id: 'hero-dual',
      label: 'Dual path',
      desc: 'Emergency vs planned work — two CTA cards for dispatch-heavy trades.',
      layout: 'dual-path',
      tag: 'Trades',
    },
    {
      id: 'hero-metrics',
      label: 'Metrics rail',
      desc: 'Headline plus proof stats — authority-first for engineering and consulting.',
      layout: 'metrics',
    },
    {
      id: 'hero-band',
      label: 'Horizon band',
      desc: 'Copy and stats on top, full-width photo band below the fold line.',
      layout: 'band',
    },
  ];

  readonly foldOptions: BuildBookFoldOption[] = [
    {
      id: 'fold-contract',
      label: 'Contract bar',
      desc: 'Logo strip of agencies, GCs, or certifications immediately below hero.',
      layout: 'contract-bar',
    },
    {
      id: 'fold-capabilities',
      label: 'Capabilities grid',
      desc: 'Three or four service pillars with icon, title, and one-line detail.',
      layout: 'capabilities',
    },
    {
      id: 'fold-featured',
      label: 'Featured project',
      desc: 'One flagship job with photo, scope tags, and outcome line.',
      layout: 'featured',
    },
    {
      id: 'fold-stats',
      label: 'Stats infographic',
      desc: 'Chalkboard or flat stat card — years, wells drilled, response time.',
      layout: 'stats',
    },
  ];

  readonly servicesOptions: BuildBookServicesOption[] = [
    {
      id: 'svc-grid',
      label: 'Service grid',
      desc: 'Equal cards in a 2×2 or 3-column grid — scannable for multi-trade shops.',
      layout: 'grid',
    },
    {
      id: 'svc-list',
      label: 'Stacked list',
      desc: 'Full-width rows with chevron — compact when you have many line items.',
      layout: 'list',
    },
    {
      id: 'svc-cards',
      label: 'Photo cards',
      desc: 'Image-forward cards with price or scope hints — high visual weight.',
      layout: 'cards',
    },
    {
      id: 'svc-tabs',
      label: 'Tabbed sectors',
      desc: 'Residential / commercial / industrial tabs — one page, multiple audiences.',
      layout: 'tabs',
    },
  ];

  selectSection(id: BuildBookSection): void {
    this.section.set(id);
  }

  selectHero(id: string): void {
    this.selectedHeroId.set(id);
  }

  selectFold(id: string): void {
    this.selectedFoldId.set(id);
  }

  selectServices(id: string): void {
    this.selectedServicesId.set(id);
  }

  sectionLabel(id: BuildBookSection): string {
    const labels: Record<BuildBookSection, string> = {
      hero: 'Hero',
      fold: 'Fold',
      services: 'Services',
      proof: 'Proof',
      areas: 'Areas',
      close: 'Close',
    };
    return labels[id];
  }

  sectionNum(id: BuildBookSection): string {
    const order: BuildBookSection[] = ['hero', 'fold', 'services', 'proof', 'areas', 'close'];
    const idx = order.indexOf(id);
    return String(idx + 1).padStart(2, '0');
  }
}
