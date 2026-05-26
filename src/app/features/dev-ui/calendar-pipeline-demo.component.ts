import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CalendarComponent, type CalendarItem } from '../../shared/ui';

interface DemoData {
  postId: string;
  primaryKeyword?: string;
  predictedSearchVolume?: number;
  publishedUrl?: string;
}

/**
 * Showcases the full Protopipe content pipeline visuals against mock data,
 * including ghost suggestions, drafts, scheduled, published with GA metrics,
 * a failed publish, and a projected "weekly wins" banner.
 *
 * This is the iteration sandbox for the design language before the real
 * Protopipe wrapper consumes the calendar.
 */
@Component({
  selector: 'app-calendar-pipeline-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CalendarComponent],
  templateUrl: './calendar-pipeline-demo.component.html',
  styleUrl: './calendar-pipeline-demo.component.scss',
})
export class CalendarPipelineDemoComponent {
  protected readonly lastEvent = signal<string>('Click a chip or empty cell to see events here.');

  protected readonly items = computed<CalendarItem<DemoData>[]>(() => buildDemoItems());

  protected onItemClick(item: CalendarItem<DemoData>): void {
    this.lastEvent.set(`itemClick → ${item.title} (${item.status})`);
  }

  protected onItemAction(event: { item: CalendarItem<DemoData>; actionId: string }): void {
    this.lastEvent.set(`itemAction → ${event.actionId} on "${event.item.title}"`);
  }

  protected onCellClick(date: Date): void {
    this.lastEvent.set(`cellClick → empty cell on ${date.toDateString()}`);
  }
}

/**
 * Build a deterministic set of mock items anchored to today's calendar month
 * so the calendar always demos with items in view regardless of when you load it.
 */
function buildDemoItems(): CalendarItem<DemoData>[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const at = (day: number, hour = 9): Date => new Date(y, m, day, hour);

  return [
    // ── Suggested (ghost) — agent proposals not yet committed ───────────
    {
      id: 'sug-1',
      date: at(2, 9),
      title: 'How to choose a wedding painter in Maui',
      status: 'suggested',
      source: 'agent',
      badge: '320 mo. searches',
      data: { postId: 'sug-1', primaryKeyword: 'maui wedding painter', predictedSearchVolume: 320 },
      actions: [
        { id: 'accept', label: 'Accept', icon: 'pi pi-check', kind: 'primary' },
        { id: 'reject', label: 'Reject', icon: 'pi pi-times', kind: 'danger' },
      ],
    },
    {
      id: 'sug-2',
      date: at(9, 9),
      title: 'Live wedding painting vs. photography: pros & cons',
      status: 'suggested',
      source: 'agent',
      badge: '210 mo. searches',
      data: { postId: 'sug-2', primaryKeyword: 'live wedding painting' },
      actions: [
        { id: 'accept', label: 'Accept', icon: 'pi pi-check', kind: 'primary' },
        { id: 'reject', label: 'Reject', icon: 'pi pi-times', kind: 'danger' },
      ],
    },
    {
      id: 'sug-3',
      date: at(16, 9),
      title: 'Destination wedding painter pricing guide',
      status: 'suggested',
      source: 'agent',
      badge: '140 mo. searches',
      data: { postId: 'sug-3', primaryKeyword: 'destination wedding painter pricing' },
      actions: [{ id: 'accept', label: 'Accept', icon: 'pi pi-check', kind: 'primary' }],
    },
    {
      id: 'sug-4',
      date: at(23, 9),
      title: 'Painting styles for elopements vs. large weddings',
      status: 'suggested',
      source: 'agent',
      data: { postId: 'sug-4' },
    },

    // ── Drafts (in progress) ───────────────────────────────────────────
    {
      id: 'draft-1',
      date: at(4, 14),
      title: 'Choosing the right canvas size for your venue',
      status: 'draft',
      source: 'human',
      data: { postId: 'draft-1', primaryKeyword: 'wedding canvas size' },
      actions: [{ id: 'edit', label: 'Edit', icon: 'pi pi-pencil', kind: 'primary' }],
    },
    {
      id: 'draft-2',
      date: at(11, 14),
      title: 'How long does a live painting take?',
      status: 'draft',
      source: 'hybrid',
      badge: 'AI assisted',
      data: { postId: 'draft-2' },
      actions: [{ id: 'edit', label: 'Edit', icon: 'pi pi-pencil', kind: 'primary' }],
    },
    {
      id: 'draft-3',
      date: at(18, 14),
      title: 'Best wedding venues in Maui for painters',
      status: 'draft',
      source: 'human',
      data: { postId: 'draft-3' },
      actions: [{ id: 'edit', label: 'Edit', icon: 'pi pi-pencil', kind: 'primary' }],
    },

    // ── Scheduled (queued for publish) ─────────────────────────────────
    {
      id: 'sched-1',
      date: at(7, 9),
      title: 'Why couples love live painting at their reception',
      status: 'scheduled',
      source: 'human',
      data: { postId: 'sched-1' },
      actions: [
        { id: 'edit', label: 'Edit', icon: 'pi pi-pencil', kind: 'primary' },
        { id: 'unschedule', label: 'Unschedule', icon: 'pi pi-times' },
      ],
    },
    {
      id: 'sched-2',
      date: at(14, 9),
      title: 'How to prepare your venue for a live painter',
      status: 'scheduled',
      source: 'agent',
      data: { postId: 'sched-2' },
      actions: [{ id: 'edit', label: 'Edit', icon: 'pi pi-pencil', kind: 'primary' }],
    },
    {
      id: 'sched-3',
      date: at(21, 9),
      title: 'What to do with your live wedding painting after',
      status: 'scheduled',
      source: 'hybrid',
      data: { postId: 'sched-3' },
      actions: [{ id: 'edit', label: 'Edit', icon: 'pi pi-pencil', kind: 'primary' }],
    },

    // ── Published (with GA metric badges) ──────────────────────────────
    {
      id: 'pub-1',
      date: at(daysAgo(now, 21), 9),
      title: 'Beyond the studio: painting outdoors in Hawaii',
      status: 'published',
      source: 'human',
      metric: { label: 'visits this week', value: '+18', trend: 'up' },
      data: { postId: 'pub-1', publishedUrl: 'https://example.com/p/beyond-the-studio' },
      actions: [
        { id: 'view', label: 'View live', icon: 'pi pi-external-link', kind: 'primary' },
        { id: 'edit', label: 'Edit', icon: 'pi pi-pencil' },
      ],
    },
    {
      id: 'pub-2',
      date: at(daysAgo(now, 15), 9),
      title: 'Maui elopement photography vs. live painting',
      status: 'published',
      source: 'agent',
      metric: { label: 'visits this week', value: '+47', trend: 'up' },
      data: { postId: 'pub-2', publishedUrl: 'https://example.com/p/maui-elopement' },
      actions: [
        { id: 'view', label: 'View live', icon: 'pi pi-external-link', kind: 'primary' },
      ],
    },
    {
      id: 'pub-3',
      date: at(daysAgo(now, 10), 9),
      title: 'How long should your wedding day be?',
      status: 'published',
      source: 'human',
      metric: { label: 'visits this week', value: '+2', trend: 'down' },
      data: { postId: 'pub-3', publishedUrl: 'https://example.com/p/wedding-day-length' },
      actions: [
        { id: 'view', label: 'View live', icon: 'pi pi-external-link', kind: 'primary' },
      ],
    },
    {
      id: 'pub-4',
      date: at(daysAgo(now, 7), 9),
      title: 'Live painting timeline: hour by hour',
      status: 'published',
      source: 'hybrid',
      metric: { label: 'visits this week', value: '+9', trend: 'flat' },
      data: { postId: 'pub-4', publishedUrl: 'https://example.com/p/painting-timeline' },
      actions: [
        { id: 'view', label: 'View live', icon: 'pi pi-external-link', kind: 'primary' },
      ],
    },
    {
      id: 'pub-5',
      date: at(daysAgo(now, 4), 9),
      title: 'Five questions to ask your wedding painter',
      status: 'published',
      source: 'agent',
      metric: { label: 'visits this week', value: '+31', trend: 'up' },
      data: { postId: 'pub-5', publishedUrl: 'https://example.com/p/five-questions' },
      actions: [
        { id: 'view', label: 'View live', icon: 'pi pi-external-link', kind: 'primary' },
      ],
    },

    // ── Failed (needs retry) ───────────────────────────────────────────
    {
      id: 'fail-1',
      date: at(daysAgo(now, 1), 9),
      title: 'Why we paint with oils for weddings',
      status: 'failed',
      source: 'human',
      badge: 'Astro deploy failed',
      data: { postId: 'fail-1' },
      actions: [
        { id: 'retry', label: 'Retry publish', icon: 'pi pi-refresh', kind: 'primary' },
        { id: 'edit', label: 'Edit', icon: 'pi pi-pencil' },
      ],
    },
  ];
}

function daysAgo(now: Date, n: number): number {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.getDate();
}
