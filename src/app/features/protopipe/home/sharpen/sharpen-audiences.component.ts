import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';

const MAX_TARGET_CUSTOMERS = 5;

@Component({
  selector: 'app-sharpen-audiences',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sharpen-audiences.component.html',
  styleUrl: './sharpen-audiences.component.scss',
})
export class SharpenAudiencesComponent implements OnInit {
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly router = inject(Router);

  readonly siteId = input.required<string>();
  readonly changed = output<void>();

  readonly loading = signal(false);
  readonly savingTargetCustomers = signal(false);
  readonly targetCustomerStatus = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly targetCustomerSites = signal<string[]>([]);
  readonly savedTargetCustomerSites = signal<string[]>([]);
  readonly targetCustomerDraft = signal('');
  readonly maxTargetCustomers = MAX_TARGET_CUSTOMERS;

  readonly targetCustomersDirty = computed(() => {
    const current = this.targetCustomerSites();
    const saved = this.savedTargetCustomerSites();
    if (current.length !== saved.length) return true;
    const a = [...current].sort();
    const b = [...saved].sort();
    return a.some((v, i) => v !== b[i]);
  });

  ngOnInit(): void {
    this.syncTargetCustomersFromProfile();
  }

  openAudienceBook(): void {
    const siteId = this.siteId();
    void this.router.navigate(['/home'], {
      queryParams: siteId ? { view: 'audience-book', siteId } : { view: 'audience-book' },
    });
  }

  private syncTargetCustomersFromProfile(): void {
    const saved = this.strategy.onboardingProfile()?.targetCustomerSites ?? [];
    const copy = [...saved];
    this.targetCustomerSites.set(copy);
    this.savedTargetCustomerSites.set(copy);
  }

  addTargetCustomer(event?: Event): void {
    event?.preventDefault();
    this.commitDraft(
      this.targetCustomerDraft,
      this.targetCustomerSites,
      MAX_TARGET_CUSTOMERS,
      (v) => v.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase(),
    );
  }

  removeTargetCustomer(index: number): void {
    this.targetCustomerSites.update((list) => list.filter((_, i) => i !== index));
  }

  onTargetCustomerDraftInput(value: string): void {
    this.targetCustomerDraft.set(value);
  }

  saveTargetCustomers(): void {
    const siteId = this.siteId();
    if (!siteId || this.savingTargetCustomers()) return;

    this.savingTargetCustomers.set(true);
    this.error.set(null);
    this.targetCustomerStatus.set(null);

    this.api
      .updateTargetCustomers$(siteId, {
        targetCustomerSites: this.targetCustomerSites(),
      })
      .subscribe({
        next: (res) => {
          const saved = res.targetCustomerSites ?? [];
          this.targetCustomerSites.set(saved);
          this.savedTargetCustomerSites.set([...saved]);
          this.savingTargetCustomers.set(false);
          if (res.discoveryRunId) {
            this.targetCustomerStatus.set('Rescanning example sites for keyword fit…');
          } else {
            this.targetCustomerStatus.set('Saved.');
          }
          this.changed.emit();
        },
        error: (err) => {
          this.error.set(parseProtopipeApiError(err, 'Could not save target customer sites.'));
          this.savingTargetCustomers.set(false);
        },
      });
  }

  private commitDraft(
    draftSignal: { (): string; set: (v: string) => void },
    listSignal: { update: (fn: (list: string[]) => string[]) => void },
    max: number,
    normalize: (v: string) => string,
  ): void {
    const raw = draftSignal().trim();
    if (!raw) return;
    const value = normalize(raw);
    if (!value) return;
    listSignal.update((list) => {
      if (list.includes(value) || list.length >= max) return list;
      return [...list, value];
    });
    draftSignal.set('');
  }
}
