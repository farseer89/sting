import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { ProtopipeContentPost } from '@hive/contracts';
import { ProtopipeContentService } from '../../protopipe-content.service';
import { ProtopipeHomeStrategyViewState } from '../strategy/protopipe-home-strategy-view.state';

interface SchedulerPlan {
  id: string;
  code: string;
  name: string;
  status: string;
  pieceCount: number;
  color: string;
  startPct: number;
  widthPct: number;
}

interface SchedulerPiece {
  id: string;
  postId: string;
  planId: string;
  title: string;
  keyword: string;
  status: 'draft' | 'scheduled' | 'published' | 'research';
  publishLabel: string;
  color: string;
  startPct: number;
  widthPct: number;
}

interface SchedulerCalendarCell {
  day: number | null;
  weekend: boolean;
  stickies: SchedulerPiece[];
}

interface SchedulerCalendar {
  month: string;
  weekdays: string[];
  weeks: SchedulerCalendarCell[][];
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#0891b2', '#db2777'];
const STATUS_LABELS = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  research: 'Research',
} as const;

@Component({
  selector: 'app-protopipe-content-scheduler',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-content-scheduler.component.html',
  styleUrl: './protopipe-content-scheduler.component.scss',
})
export class ProtopipeContentSchedulerComponent {
  private readonly content = inject(ProtopipeContentService);
  private readonly strategyView = inject(ProtopipeHomeStrategyViewState);

  readonly viewModes = [
    { id: 'week' as const, label: 'Week' },
    { id: 'month' as const, label: 'Month' },
  ];
  readonly rowModes = [
    { id: 'pipeline' as const, label: 'Pipeline' },
    { id: 'articles' as const, label: 'Articles' },
    { id: 'traffic' as const, label: 'Traffic' },
  ];
  readonly statusLabels = STATUS_LABELS;
  readonly focusedPlanId = signal('');
  readonly viewMode = signal<'week' | 'month'>('week');
  readonly rowMode = signal<'pipeline' | 'articles' | 'traffic'>('articles');
  readonly editMode = signal(false);
  readonly playheadPct = signal(18);

  readonly posts = computed(() =>
    [...this.content.scheduledPosts(), ...this.content.draftPosts(), ...this.content.publishedPosts()]
      .filter((post) => post.brief || post.publishAt || post.status === 'scheduled')
      .sort((a, b) => dateMs(a.publishAt) - dateMs(b.publishAt)),
  );

  readonly plans = computed<SchedulerPlan[]>(() => {
    const byCluster = new Map<string, ProtopipeContentPost[]>();
    for (const post of this.posts()) {
      const cluster = post.brief?.sourceClusterName || post.suggestedKeyword || 'Scheduled Articles';
      byCluster.set(cluster, [...(byCluster.get(cluster) ?? []), post]);
    }
    return [...byCluster.entries()].map(([name, posts], index) => ({
      id: planId(name, index),
      code: `CP${index + 1}`,
      name,
      status: posts.some((post) => post.status === 'scheduled') ? 'scheduled' : 'draft',
      pieceCount: posts.length,
      color: COLORS[index % COLORS.length],
      startPct: Math.min(72, 4 + index * 8),
      widthPct: Math.max(16, Math.min(38, posts.length * 8 + 12)),
    }));
  });

  readonly pieces = computed<SchedulerPiece[]>(() => {
    const plans = this.plans();
    return this.posts().map((post, index) => {
      const plan =
        plans.find((candidate) => candidate.name === (post.brief?.sourceClusterName || post.suggestedKeyword)) ??
        plans[0];
      const publishAt = post.publishAt ? new Date(post.publishAt) : addDays(new Date(), index * 7 + 7);
      return {
        id: post.id,
        postId: post.id,
        planId: plan?.id ?? 'scheduled',
        title: post.title || post.brief?.workingTitle || 'Scheduled article',
        keyword: post.suggestedKeyword || post.brief?.primaryKeywordPhrase || 'keyword',
        status: statusForPost(post),
        publishLabel: publishAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        color: plan?.color ?? COLORS[index % COLORS.length],
        startPct: Math.min(82, 8 + index * 7),
        widthPct: this.viewMode() === 'week' ? 20 : 10,
      };
    });
  });

  readonly focusedPlan = computed(() => {
    const plans = this.plans();
    return plans.find((plan) => plan.id === this.focusedPlanId()) ?? plans[0] ?? null;
  });

  readonly days = computed(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: this.viewMode() === 'week' ? 7 : 14 }, (_, index) => {
      const date = addDaysDate(start, index);
      return {
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        sub: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isToday: sameDate(date, new Date()),
      };
    });
  });

  readonly calendar = computed<SchedulerCalendar>(() => buildCalendar(this.pieces()));
  readonly notes = computed(() =>
    this.pieces().slice(0, 8).map((piece, index) => ({
      text: piece.keyword,
      meta: piece.status,
      status: piece.status,
      pin: String(index + 1).padStart(2, '0'),
    })),
  );

  isFocused(): boolean {
    return Boolean(this.focusedPlan());
  }

  clearFocus(): void {
    this.focusedPlanId.set('');
  }

  focusPlan(plan: SchedulerPlan): void {
    this.focusedPlanId.set(plan.id);
  }

  piecesForPlan(planId: string): SchedulerPiece[] {
    return this.pieces().filter((piece) => piece.planId === planId);
  }

  openPiece(piece: SchedulerPiece): void {
    this.strategyView.openPostBrief(piece.postId);
  }

  setViewMode(id: 'week' | 'month'): void {
    this.viewMode.set(id);
  }

  setRowMode(id: 'pipeline' | 'articles' | 'traffic'): void {
    this.rowMode.set(id);
  }

  toggleEditMode(): void {
    this.editMode.update((value) => !value);
  }

  sparkHeight(value: number): number {
    return Math.max(8, value);
  }

  truncate(text: string, max: number): string {
    return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
  }
}

function planId(name: string, index: number): string {
  return `${index}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function statusForPost(post: ProtopipeContentPost): SchedulerPiece['status'] {
  if (post.status === 'published') return 'published';
  if (post.status === 'scheduled') return 'scheduled';
  return post.brief ? 'draft' : 'research';
}

function dateMs(value?: string): number {
  return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
}

function addDays(date: Date, days: number): Date {
  return addDaysDate(date, days);
}

function addDaysDate(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date): Date {
  const next = new Date(date);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function sameDate(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function buildCalendar(pieces: SchedulerPiece[]): SchedulerCalendar {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: SchedulerCalendarCell[] = [];
  for (let i = 0; i < first.getDay(); i++) {
    cells.push({ day: null, weekend: false, stickies: [] });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const stickies = pieces.filter((piece) => piece.publishLabel.endsWith(String(day)));
    cells.push({
      day,
      weekend: date.getDay() === 0 || date.getDay() === 6,
      stickies,
    });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, weekend: false, stickies: [] });
  const weeks: SchedulerCalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return {
    month: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    weekdays: WEEKDAYS,
    weeks,
  };
}
