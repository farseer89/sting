import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { ProgressSpinner } from 'primeng/progressspinner';
import { RadioButton } from 'primeng/radiobutton';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import type {
  ProtopipeAnalyticsProperty,
  ProtopipeAnalyticsResponse,
  ProtopipeSite,
} from '@hive/contracts';
import { ProtopipeApiService } from '../protopipe-api.service';
import { parseProtopipeApiError } from '../protopipe-http.util';

interface SiteOption {
  label: string;
  value: string;
  hostname: string;
}

interface RangeOption {
  label: string;
  value: 7 | 28 | 90;
}

const RANGE_OPTIONS: RangeOption[] = [
  { label: '7d', value: 7 },
  { label: '28d', value: 28 },
  { label: '90d', value: 90 },
];

function isoDateMinusDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'app-protopipe-analytics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    FormsModule,
    RouterLink,
    Button,
    Dialog,
    ProgressSpinner,
    RadioButton,
    Select,
    SelectButton,
    TableModule,
    Tag,
    Toast,
  ],
  providers: [MessageService],
  templateUrl: './protopipe-analytics.component.html',
  styleUrl: './protopipe-analytics.component.scss',
})
export class ProtopipeAnalyticsComponent implements OnInit {
  private readonly api = inject(ProtopipeApiService);
  private readonly messages = inject(MessageService);

  readonly bootstrapping = signal(true);
  readonly loading = signal(false);
  readonly response = signal<ProtopipeAnalyticsResponse | null>(null);
  readonly error = signal<string | null>(null);

  readonly sites = signal<ProtopipeSite[]>([]);
  readonly selectedSiteId = signal<string | null>(null);
  readonly siteOptions = computed<SiteOption[]>(() =>
    this.sites().map((s) => ({
      label: s.displayName || s.hostname,
      value: s.id,
      hostname: s.hostname,
    })),
  );
  readonly selectedSite = computed<ProtopipeSite | null>(() => {
    const id = this.selectedSiteId();
    if (!id) return null;
    return this.sites().find((s) => s.id === id) ?? null;
  });

  readonly rangeOptions = RANGE_OPTIONS;
  readonly selectedRange = signal<7 | 28 | 90>(28);

  readonly pickerOpen = signal(false);
  readonly pickerProperties = signal<ProtopipeAnalyticsProperty[]>([]);
  readonly pickerSelected = signal<string | null>(null);
  readonly pickerSaving = signal(false);
  readonly pickerForceChange = signal(false);

  readonly needsPicker = computed(() => !!this.response()?.needsPropertyPicker);
  readonly notConfigured = computed(() => {
    const r = this.response();
    if (!r) return false;
    if (r.available) return false;
    return /Connect your Google account/i.test(r.error ?? '');
  });

  readonly daily = computed(() => this.response()?.daily ?? []);
  readonly sparkline = computed(() => this.buildSparkline(this.daily()));

  async ngOnInit(): Promise<void> {
    this.bootstrapping.set(true);
    try {
      const boot = await this.api.bootstrap();
      this.sites.set(boot.sites);
      const initial =
        boot.primarySiteId && boot.sites.find((s) => s.id === boot.primarySiteId)
          ? boot.primarySiteId
          : boot.sites[0]?.id ?? null;
      this.selectedSiteId.set(initial);
      if (initial) {
        await this.loadAnalytics();
      }
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not load your sites.'));
    } finally {
      this.bootstrapping.set(false);
    }
  }

  async onSiteChange(value: string): Promise<void> {
    this.selectedSiteId.set(value);
    await this.loadAnalytics();
  }

  async onRangeChange(value: 7 | 28 | 90): Promise<void> {
    this.selectedRange.set(value);
    await this.loadAnalytics();
  }

  async loadAnalytics(): Promise<void> {
    const siteId = this.selectedSiteId();
    if (!siteId) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const days = this.selectedRange();
      const startDate = isoDateMinusDays(days - 1);
      const endDate = isoToday();
      const res = await this.api.getSiteAnalytics(siteId, { startDate, endDate });
      this.response.set(res);
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not load analytics.'));
    } finally {
      this.loading.set(false);
    }
  }

  async openPicker(forceChange: boolean): Promise<void> {
    this.pickerForceChange.set(forceChange);
    this.pickerOpen.set(true);
    const siteId = this.selectedSiteId();
    if (!siteId) return;

    const inlineCandidates = this.response()?.candidates;
    if (forceChange || !inlineCandidates || inlineCandidates.length === 0) {
      try {
        const { properties } = await this.api.listSiteAnalyticsProperties(siteId);
        this.pickerProperties.set(properties);
      } catch (err) {
        this.messages.add({
          severity: 'error',
          summary: 'Could not load GA4 properties',
          detail: parseProtopipeApiError(err, 'Try again in a moment.'),
          life: 6000,
        });
      }
    } else {
      this.pickerProperties.set(inlineCandidates);
    }

    const current = this.response()?.property?.propertyId ?? null;
    this.pickerSelected.set(current);
  }

  closePicker(): void {
    this.pickerOpen.set(false);
    this.pickerProperties.set([]);
    this.pickerSelected.set(null);
    this.pickerForceChange.set(false);
  }

  async confirmPicker(): Promise<void> {
    const siteId = this.selectedSiteId();
    const propertyId = this.pickerSelected();
    if (!siteId || !propertyId) return;
    this.pickerSaving.set(true);
    try {
      await this.api.setSiteAnalyticsProperty(siteId, { propertyId });
      this.messages.add({
        severity: 'success',
        summary: 'GA4 property saved',
        life: 4000,
      });
      this.closePicker();
      await this.loadAnalytics();
    } catch (err) {
      this.messages.add({
        severity: 'error',
        summary: 'Could not save property',
        detail: parseProtopipeApiError(err, 'Try again.'),
        life: 6000,
      });
    } finally {
      this.pickerSaving.set(false);
    }
  }

  async clearOverride(): Promise<void> {
    const siteId = this.selectedSiteId();
    if (!siteId) return;
    this.pickerSaving.set(true);
    try {
      await this.api.setSiteAnalyticsProperty(siteId, { propertyId: null });
      this.messages.add({
        severity: 'success',
        summary: 'Reverted to auto-match',
        life: 4000,
      });
      this.closePicker();
      await this.loadAnalytics();
    } catch (err) {
      this.messages.add({
        severity: 'error',
        summary: 'Could not clear override',
        detail: parseProtopipeApiError(err, 'Try again.'),
        life: 6000,
      });
    } finally {
      this.pickerSaving.set(false);
    }
  }

  formatDuration(seconds: number | undefined): string {
    if (!seconds || !Number.isFinite(seconds)) return '0s';
    const total = Math.round(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  }

  private buildSparkline(daily: { date: string; sessions: number; users: number }[]): {
    width: number;
    height: number;
    sessionsPath: string;
    usersPath: string;
    points: { x: number; y: number; date: string; sessions: number; users: number }[];
    maxValue: number;
  } | null {
    if (!daily.length) return null;
    const width = 720;
    const height = 200;
    const padX = 8;
    const padY = 12;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    const maxValue = Math.max(1, ...daily.map((d) => Math.max(d.sessions, d.users)));

    const x = (i: number) =>
      padX + (daily.length === 1 ? innerW / 2 : (i / (daily.length - 1)) * innerW);
    const y = (v: number) => padY + innerH - (v / maxValue) * innerH;

    const sessionsPath = daily
      .map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.sessions).toFixed(1)}`)
      .join(' ');
    const usersPath = daily
      .map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.users).toFixed(1)}`)
      .join(' ');

    const points = daily.map((d, i) => ({
      x: x(i),
      y: y(d.sessions),
      date: d.date,
      sessions: d.sessions,
      users: d.users,
    }));

    return { width, height, sessionsPath, usersPath, points, maxValue };
  }
}
