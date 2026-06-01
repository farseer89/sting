import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ThinkerComponent, type ThinkerAudience, type ThinkerMode } from './thinker.component';
import type { Thinker } from './thinker.model';
import type { Thought, ThoughtStatus } from './thought.model';
import type { ThoughtNode } from './train.model';
import { THINKERS, TRAIN_MOCK } from './train.mock';

interface BackgroundOption {
  id: string;
  label: string;
}

interface EdgePath {
  id: string;
  d: string;
  label?: string;
  midX: number;
  midY: number;
  active: boolean;
}

const NODE_W = 210;
const NODE_H = 124;
const CANVAS_PAD = 40;
const BACKGROUND_KEY = 'protopipe.thinker.background';

/**
 * Train of Thought — the macro view. Renders connected Thoughts as a node graph
 * (output-port -> input-port edges) and drills into a single Thought (the
 * stepper) on click. Wrapped in void chrome; supports an operator/customer
 * audience flag and a calm/debug mode.
 */
@Component({
  selector: 'app-train-of-thought',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThinkerComponent],
  templateUrl: './train-of-thought.component.html',
  styleUrl: './train-of-thought.component.scss',
})
export class TrainOfThoughtComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly train = TRAIN_MOCK;
  readonly thinkers: Record<string, Thinker> = THINKERS;

  readonly backgroundId = signal(this.readBackground());
  readonly audience = signal<ThinkerAudience>('operator');
  readonly mode = signal<ThinkerMode>('calm');
  readonly openNodeId = signal<string | null>(null);

  readonly backgrounds: BackgroundOption[] = [
    { id: 'ocean', label: 'Ocean depth' },
    { id: 'atmosphere', label: 'Atmosphere' },
    { id: 'twilight', label: 'Twilight' },
    { id: 'dawn', label: 'Dawn horizon' },
    { id: 'alpine', label: 'Alpine light' },
    { id: 'white', label: 'Void white' },
  ];

  readonly nodeW = NODE_W;
  readonly nodeH = NODE_H;

  constructor() {
    document.documentElement.classList.add('void-lab');
    this.syncThemeClass(this.backgroundId());
    this.destroyRef.onDestroy(() => {
      document.documentElement.classList.remove('void-lab', 'void-white');
    });
  }

  readonly openThought = computed<Thought | null>(() => {
    const id = this.openNodeId();
    if (!id) return null;
    return this.train.nodes.find((n) => n.id === id)?.thought ?? null;
  });

  readonly canvasSize = computed(() => {
    let w = 0;
    let h = 0;
    for (const n of this.train.nodes) {
      w = Math.max(w, n.position.x + NODE_W);
      h = Math.max(h, n.position.y + NODE_H);
    }
    return { w: w + CANVAS_PAD, h: h + CANVAS_PAD };
  });

  readonly edgePaths = computed<EdgePath[]>(() => {
    const byId = new Map(this.train.nodes.map((n) => [n.id, n]));
    return this.train.edges.map((e) => {
      const from = byId.get(e.fromNode);
      const to = byId.get(e.toNode);
      const sx = (from?.position.x ?? 0) + NODE_W;
      const sy = (from?.position.y ?? 0) + NODE_H / 2;
      const tx = to?.position.x ?? 0;
      const ty = (to?.position.y ?? 0) + NODE_H / 2;
      const dx = Math.max(40, (tx - sx) / 2);
      const d = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
      const active = (from?.thought?.outputs ?? []).some((o) => o.portId === e.fromPort && !!o.artifact);
      return { id: e.id, d, label: e.label, midX: (sx + tx) / 2, midY: (sy + ty) / 2, active };
    });
  });

  setBackground(id: string): void {
    this.backgroundId.set(id);
    this.syncThemeClass(id);
    try {
      localStorage.setItem(BACKGROUND_KEY, id);
    } catch {
      /* localStorage unavailable */
    }
  }

  private readBackground(): string {
    try {
      return localStorage.getItem(BACKGROUND_KEY) ?? 'white';
    } catch {
      return 'white';
    }
  }

  setAudience(a: ThinkerAudience): void {
    this.audience.set(a);
    if (a === 'customer') this.mode.set('calm');
  }

  toggleMode(): void {
    this.mode.update((m) => (m === 'calm' ? 'debug' : 'calm'));
  }

  openNode(node: ThoughtNode): void {
    if (node.thought) this.openNodeId.set(node.id);
  }

  closeThought(): void {
    this.openNodeId.set(null);
  }

  thinkerFor(kind: string): Thinker | undefined {
    return this.thinkers[kind];
  }

  monogram(kind: string): string {
    return (this.thinkers[kind]?.label ?? kind).charAt(0).toUpperCase();
  }

  nodeProgress(thought?: Thought): number {
    if (!thought?.steps.length) return 0;
    const done = thought.steps.filter((s) => s.status === 'complete' || s.status === 'skipped').length;
    return Math.round((done / thought.steps.length) * 100);
  }

  statusLabel(status?: ThoughtStatus): string {
    switch (status) {
      case 'running': return 'Thinking';
      case 'complete': return 'Done';
      case 'failed': return 'Attention';
      case 'pending': return 'Queued';
      case 'cancelled': return 'Stopped';
      default: return 'Idle';
    }
  }

  private syncThemeClass(id: string): void {
    document.documentElement.classList.toggle('void-white', id === 'white');
  }
}
