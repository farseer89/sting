import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import type { ProtopipeSuggestedAvatar } from '@hive/contracts';

const AVATAR_PALETTES = [
  { bg: '#e8f4fc', ink: '#1a6b8a', ring: '#7ec8e3' },
  { bg: '#f3eef9', ink: '#5c3d7a', ring: '#c4a8e0' },
  { bg: '#eef6ee', ink: '#2d5c3a', ring: '#8ec99a' },
  { bg: '#fdf4e8', ink: '#8a5a1a', ring: '#e8c07e' },
  { bg: '#fceef0', ink: '#8a2d3d', ring: '#e0a8b4' },
  { bg: '#eef0f6', ink: '#3d4a6b', ring: '#a8b4d8' },
] as const;

export type AvatarFieldPatch = {
  id: string;
  field: keyof Pick<
    ProtopipeSuggestedAvatar,
    | 'label'
    | 'description'
    | 'intentCluster'
    | 'exampleQueries'
    | 'emotionalState'
    | 'whatTheyNeed'
    | 'voiceTheyRespondTo'
  >;
  value: string | string[];
};

@Component({
  selector: 'app-protopipe-avatar-suggestion-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-avatar-suggestion-panel.component.html',
  styleUrl: './protopipe-avatar-suggestion-panel.component.scss',
})
export class ProtopipeAvatarSuggestionPanelComponent {
  readonly avatars = input.required<ProtopipeSuggestedAvatar[]>();
  readonly selectedIds = input.required<ReadonlySet<string>>();
  readonly hoveredId = input<string | null>(null);
  readonly maxSelected = input(3);

  readonly toggleAvatar = output<string>();
  readonly hoverAvatar = output<string | null>();
  readonly updateAvatar = output<AvatarFieldPatch>();
  readonly addCustom = output<void>();

  readonly expandedId = signal<string | null>(null);

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  atMax(): boolean {
    return this.selectedIds().size >= this.maxSelected();
  }

  canSelect(id: string): boolean {
    return this.isSelected(id) || !this.atMax();
  }

  onCardClick(id: string, event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('[data-avatar-edit]')) return;
    if (!this.canSelect(id)) return;
    this.toggleAvatar.emit(id);
  }

  toggleExpanded(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.expandedId.update((current) => (current === id ? null : id));
  }

  isExpanded(id: string): boolean {
    return this.expandedId() === id;
  }

  onCardEnter(id: string): void {
    this.hoverAvatar.emit(id);
  }

  onCardLeave(): void {
    this.hoverAvatar.emit(null);
  }

  emitField(id: string, field: AvatarFieldPatch['field'], value: string): void {
    if (field === 'exampleQueries') {
      const exampleQueries = value
        .split('\n')
        .map((q) => q.trim())
        .filter(Boolean)
        .slice(0, 10);
      this.updateAvatar.emit({ id, field, value: exampleQueries });
      return;
    }
    this.updateAvatar.emit({ id, field, value });
  }

  queriesText(av: ProtopipeSuggestedAvatar): string {
    return (av.exampleQueries ?? []).join('\n');
  }

  profileTitle(av: ProtopipeSuggestedAvatar): string {
    const label = av.label?.trim();
    if (label) return label;
    const cluster = av.intentCluster?.trim();
    if (cluster) return cluster;
    const first = av.description.split(/[.!?]/)[0]?.trim();
    return first && first.length <= 48 ? first : 'Customer profile';
  }

  profileSubtitle(av: ProtopipeSuggestedAvatar): string {
    if (av.origin === 'onboarding' || av.matchedOnboarding) {
      return 'From your onboarding profile';
    }
    if (av.origin === 'user') return 'Your custom audience';
    return 'Inferred from search behavior';
  }

  initials(av: ProtopipeSuggestedAvatar): string {
    const source = av.intentCluster?.trim() || av.description.trim();
    const words = source.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return '?';
  }

  palette(id: string): (typeof AVATAR_PALETTES)[number] {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash + id.charCodeAt(i) * (i + 1)) % AVATAR_PALETTES.length;
    }
    return AVATAR_PALETTES[hash];
  }

  avatarStyle(id: string): Record<string, string> {
    const p = this.palette(id);
    return {
      '--kwav-bg': p.bg,
      '--kwav-ink': p.ink,
      '--kwav-ring': p.ring,
    };
  }

  formatVolume(value: number | undefined): string {
    if (value == null) return '';
    if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k/mo`;
    return `${value}/mo`;
  }
}
