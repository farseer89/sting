import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { KeywordIntent, KeywordPriority } from '../../protopipe.models';
import {
  VOID_ARTICLES,
  VOID_BAR_CHART,
  VOID_CALENDAR_WEEKS,
  VOID_CHANNEL_BARS,
  VOID_FEED,
  VOID_FOLDERS,
  VOID_KANBAN,
  VOID_KEYWORDS,
  VOID_MAIL,
  VOID_METRICS,
  VOID_SCHEDULE,
  VOID_SERP,
  VOID_SLACK,
  VOID_STRIPE_CHARGES,
  VOID_WINDOWS,
  type VoidWindowId,
} from './void-dashboard.mock';
import { VOID_NAV, VOID_NAV_DEFAULT_OPEN, VOID_NAV_SITE, VOID_PREMIERE_DEFAULT_OPEN, VOID_PREMIERE_NAV, VOID_PREMIERE_SITE, type VoidNavItem } from './void-nav.mock';
import { VoidContentWriterComponent } from './void-content-writer.component';
import { VoidContentSpokeComponent } from './void-content-spoke.component';
import { VoidPremiereSchedulerComponent } from './void-premiere-scheduler.component';
import { VoidKeywordPickerComponent } from './void-keyword-picker.component';

interface TrafficPoint {
  v: number;
}

interface BackgroundOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-void-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    VoidContentWriterComponent,
    VoidPremiereSchedulerComponent,
    VoidContentSpokeComponent,
    VoidKeywordPickerComponent,
  ],
  templateUrl: './void-dashboard.component.html',
  styleUrl: './void-dashboard.component.scss',
})
export class VoidDashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly aiInput = viewChild<ElementRef<HTMLInputElement>>('aiInput');

  constructor() {
    document.documentElement.classList.add('void-lab');
    this.syncThemeClass(this.backgroundId());
    this.destroyRef.onDestroy(() => {
      document.documentElement.classList.remove('void-lab', 'void-white');
    });
  }

  readonly backgroundId = signal('white');
  readonly activeWindow = signal<VoidWindowId>('keyword-picker');
  readonly navMode = signal<'rail' | 'dock'>('rail');
  readonly navCollapsed = signal(false);
  readonly activeNavId = signal('start-keywords');
  readonly aiOpen = signal(false);
  readonly aiQuery = signal('');
  readonly loadingWindow = signal(false);
  readonly clock = signal(this.formatClock());

  readonly backgrounds: BackgroundOption[] = [
    { id: 'white', label: 'Void white' },
    { id: 'ocean', label: 'Ocean depth' },
    { id: 'dawn', label: 'Dawn horizon' },
    { id: 'alpine', label: 'Alpine light' },
    { id: 'twilight', label: 'Twilight' },
    { id: 'atmosphere', label: 'Atmosphere' },
  ];

  readonly windows = VOID_WINDOWS;
  readonly isShellMode = computed(() => this.backgroundId() === 'white');
  readonly navItems = computed(() => (this.isShellMode() ? VOID_PREMIERE_NAV : VOID_NAV));
  readonly navSite = computed(() => (this.isShellMode() ? VOID_PREMIERE_SITE : VOID_NAV_SITE));
  readonly metrics = signal(VOID_METRICS);
  readonly keywords = signal(VOID_KEYWORDS);
  readonly articles = signal(VOID_ARTICLES);
  readonly feed = signal(VOID_FEED);
  readonly serpRows = signal(VOID_SERP);
  readonly schedule = signal(VOID_SCHEDULE);
  readonly stripeCharges = signal(VOID_STRIPE_CHARGES);
  readonly slackMessages = signal(VOID_SLACK);
  readonly mailMessages = signal(VOID_MAIL);
  readonly folderNodes = signal(VOID_FOLDERS);
  readonly kanbanCards = signal(VOID_KANBAN);
  readonly kanbanColumns = [
    { id: 'draft' as const, label: 'Draft' },
    { id: 'scheduled' as const, label: 'Scheduled' },
    { id: 'published' as const, label: 'Published' },
  ];

  readonly calendarDow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
  readonly calendarWeeks = VOID_CALENDAR_WEEKS;
  readonly barChart = VOID_BAR_CHART;
  readonly channelBars = VOID_CHANNEL_BARS;

  readonly traffic = signal<TrafficPoint[]>(this.seedTraffic());
  readonly trafficPath = computed(() => this.buildPath(this.traffic().map((p) => p.v)));
  readonly barMax = computed(() => Math.max(...this.barChart.map((b) => b.value), 1));
  readonly channelMax = computed(() => Math.max(...this.channelBars.map((b) => b.value), 1));

  private readonly openNavGroups = new Set<string>([...VOID_NAV_DEFAULT_OPEN, ...VOID_PREMIERE_DEFAULT_OPEN]);

  ngOnInit(): void {
    const trafficTick = window.setInterval(() => this.driftTraffic(), 2400);
    const clockTick = window.setInterval(() => this.clock.set(this.formatClock()), 1000);
    this.destroyRef.onDestroy(() => {
      clearInterval(trafficTick);
      clearInterval(clockTick);
    });
  }

  setBackground(id: string): void {
    this.backgroundId.set(id);
    this.syncThemeClass(id);
    if (id === 'white') {
      this.activeWindow.set('keyword-picker');
      this.activeNavId.set('start-keywords');
    } else if (this.activeWindow() === 'scheduler') {
      this.activeWindow.set('overview');
      this.activeNavId.set('my-plan');
    }
  }

  private syncThemeClass(bgId: string): void {
    document.documentElement.classList.toggle('void-white', bgId === 'white');
  }

  toggleNavMode(): void {
    this.navMode.update((mode) => (mode === 'rail' ? 'dock' : 'rail'));
  }

  toggleNavCollapse(): void {
    this.navCollapsed.update((v) => !v);
  }

  isNavGroupOpen(id: string): boolean {
    return this.openNavGroups.has(id);
  }

  toggleNavGroup(id: string): void {
    if (this.openNavGroups.has(id)) {
      this.openNavGroups.delete(id);
    } else {
      this.openNavGroups.add(id);
    }
  }

  selectNavItem(item: VoidNavItem): void {
    if (item.disabled || item.separator || !item.window) {
      return;
    }
    this.activeNavId.set(item.id);
    this.selectWindow(item.window);
  }

  isNavActive(item: VoidNavItem): boolean {
    return this.activeNavId() === item.id;
  }

  onKeywordPickerContinue(_phrases: readonly string[]): void {
    this.selectWindow('scheduler');
  }

  selectWindow(id: string): void {
    if (id === this.activeWindow() || this.aiOpen()) {
      return;
    }
    this.loadingWindow.set(true);
    window.setTimeout(() => {
      this.activeWindow.set(id as VoidWindowId);
      const navId = this.navIdForWindow(id as VoidWindowId);
      if (navId) {
        this.activeNavId.set(navId);
      }
      this.loadingWindow.set(false);
    }, 280);
  }

  openAi(): void {
    this.aiOpen.set(true);
    window.setTimeout(() => this.aiInput()?.nativeElement.focus(), 320);
  }

  closeAi(): void {
    this.aiOpen.set(false);
    this.aiQuery.set('');
  }

  submitAi(): void {
    const q = this.aiQuery().trim();
    if (!q) {
      this.closeAi();
      return;
    }
    this.feed.update((items) => [
      { id: crypto.randomUUID(), time: this.nowTime(), label: `Agent — ${q}` },
      ...items.slice(0, 7),
    ]);
    this.closeAi();
  }

  onAiKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeAi();
    }
    if (event.key === 'Enter') {
      this.submitAi();
    }
  }

  isAccentPriority(priority: KeywordPriority): boolean {
    return priority === 'high';
  }

  isAccentStatus(status: (typeof VOID_ARTICLES)[number]['status']): boolean {
    return status === 'published' || status === 'scheduled';
  }

  isStripeAccent(status: (typeof VOID_STRIPE_CHARGES)[number]['status']): boolean {
    return status === 'succeeded';
  }

  formatVolume(n: number): string {
    if (n >= 1000) {
      return `${(n / 1000).toFixed(1)}k`;
    }
    return String(n);
  }

  intentShort(intent: KeywordIntent): string {
    if (intent === 'informational') {
      return 'info';
    }
    if (intent === 'transactional') {
      return 'txn';
    }
    return 'comm';
  }

  barHeight(value: number, max: number): number {
    return Math.max(4, (value / max) * 100);
  }

  kanbanColumn(column: 'draft' | 'scheduled' | 'published'): (typeof VOID_KANBAN)[number][] {
    return this.kanbanCards().filter((c) => c.column === column);
  }

  folderKindLabel(kind: (typeof VOID_FOLDERS)[number]['kind']): string {
    if (kind === 'site') {
      return 'site';
    }
    if (kind === 'folder') {
      return 'dir';
    }
    return 'file';
  }

  private driftTraffic(): void {
    this.traffic.update((points) => {
      const last = points[points.length - 1]?.v ?? 40;
      const next = Math.max(20, Math.min(80, last + (Math.random() - 0.48) * 5));
      return [...points.slice(1), { v: next }];
    });
  }

  private seedTraffic(): TrafficPoint[] {
    const out: TrafficPoint[] = [];
    let v = 42;
    for (let i = 0; i < 48; i++) {
      v = Math.max(20, Math.min(80, v + (Math.random() - 0.5) * 6));
      out.push({ v });
    }
    return out;
  }

  private buildPath(values: number[]): string {
    if (!values.length) {
      return '';
    }
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = Math.max(0.001, max - min);
    return values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * 100;
        const y = 100 - ((v - min) / range) * 100;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }

  private formatClock(): string {
    const d = new Date();
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  private nowTime(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  private navIdForWindow(window: VoidWindowId): string | undefined {
    const groups = this.isShellMode() ? VOID_PREMIERE_NAV : VOID_NAV;
    for (const group of groups) {
      for (const child of group.children ?? []) {
        if (child.window === window) {
          return child.id;
        }
      }
    }
    return undefined;
  }
}
