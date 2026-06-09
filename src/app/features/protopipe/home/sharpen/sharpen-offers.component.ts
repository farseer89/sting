import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import type { ProtopipeOffering } from '@hive/contracts';
import { ProtopipeApiService } from '../../protopipe-api.service';

@Component({
  selector: 'app-sharpen-offers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sharpen-offers">
      <p class="sharpen-offers__lede">
        Tell us what you're offering — we'll work it into your content and calls to action.
      </p>

      @if (loading()) {
        <p class="sharpen-offers__status" aria-busy="true">Loading offers…</p>
      } @else if (error()) {
        <p class="sharpen-offers__status sharpen-offers__status--error">{{ error() }}</p>
      } @else {
        @if (activeOffer(); as active) {
          <div class="sharpen-offers__active">
            <span class="sharpen-offers__badge">Active</span>
            <p class="sharpen-offers__headline">{{ active.headline }}</p>
            @if (active.discountPercent != null) {
              <span class="sharpen-offers__meta">{{ active.discountPercent }}% off</span>
            }
            @if (active.validUntil) {
              <span class="sharpen-offers__meta">Ends {{ formatDate(active.validUntil) }}</span>
            }
          </div>
        }

        @if (showForm()) {
          <div class="sharpen-offers__form">
            <label class="sharpen-offers__label">
              Headline
              <input
                class="sharpen-offers__field"
                type="text"
                [value]="headline()"
                (input)="onField('headline', $event)"
                placeholder="15% off panel upgrades this month"
              />
            </label>
            <label class="sharpen-offers__label">
              Discount %
              <input
                class="sharpen-offers__field"
                type="number"
                min="0"
                max="100"
                [value]="discountPercent()"
                (input)="onField('discountPercent', $event)"
              />
            </label>
            <label class="sharpen-offers__label">
              End date
              <input
                class="sharpen-offers__field"
                type="date"
                [value]="validUntil()"
                (input)="onField('validUntil', $event)"
              />
            </label>
            <div class="sharpen-offers__actions">
              <button type="button" class="sharpen-offers__btn sharpen-offers__btn--primary" [disabled]="saving()" (click)="saveAndActivate()">
                {{ saving() ? 'Saving…' : 'Save & activate' }}
              </button>
              <button type="button" class="sharpen-offers__btn" (click)="toggleForm(false)">Cancel</button>
            </div>
          </div>
        } @else {
          <button type="button" class="sharpen-offers__btn sharpen-offers__btn--primary" (click)="toggleForm(true)">
            Add a promotion
          </button>
        }

        @if (draftOffers().length) {
          <ul class="sharpen-offers__drafts">
            @for (offer of draftOffers(); track offer.id) {
              <li class="sharpen-offers__draft">
                <span>{{ offer.headline }}</span>
                <button type="button" class="sharpen-offers__btn" (click)="activate(offer)">Activate</button>
              </li>
            }
          </ul>
        }
      }
    </div>
  `,
  styleUrl: './sharpen-offers.component.scss',
})
export class SharpenOffersComponent implements OnInit {
  readonly siteId = input.required<string>();
  readonly changed = output<void>();

  private readonly api = inject(ProtopipeApiService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly offerings = signal<ProtopipeOffering[]>([]);
  readonly showForm = signal(false);
  readonly headline = signal('');
  readonly discountPercent = signal('');
  readonly validUntil = signal('');

  readonly activeOffer = () => this.offerings().find((o) => o.status === 'active') ?? null;
  readonly draftOffers = () => this.offerings().filter((o) => o.status === 'draft');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    const siteId = this.siteId();
    if (!siteId) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.listOfferings$(siteId).subscribe({
      next: (res) => {
        this.offerings.set(res.offerings ?? []);
        this.loading.set(false);
        this.changed.emit();
      },
      error: () => {
        this.error.set('Could not load offers.');
        this.loading.set(false);
      },
    });
  }

  toggleForm(open: boolean): void {
    this.showForm.set(open);
    if (!open) {
      this.headline.set('');
      this.discountPercent.set('');
      this.validUntil.set('');
    }
  }

  onField(field: 'headline' | 'discountPercent' | 'validUntil', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (field === 'headline') this.headline.set(value);
    if (field === 'discountPercent') this.discountPercent.set(value);
    if (field === 'validUntil') this.validUntil.set(value);
  }

  saveAndActivate(): void {
    const siteId = this.siteId();
    const headline = this.headline().trim();
    if (!headline) return;

    const discount = this.discountPercent() ? Number(this.discountPercent()) : undefined;
    const validUntil = this.validUntil() ? new Date(this.validUntil()).toISOString() : undefined;
    const ctaLabel = discount ? 'Get your discount' : 'Learn more';

    this.saving.set(true);
    this.api
      .createOffering$(siteId, {
        title: headline.slice(0, 80),
        headline,
        discountPercent: discount,
        ctaLabel,
        ctaHref: '/contact',
        validUntil,
        kind: discount ? 'discount' : 'other',
      })
      .subscribe({
        next: (res) => {
          this.api.activateOffering$(siteId, res.offering.id).subscribe({
            next: () => {
              this.saving.set(false);
              this.toggleForm(false);
              this.reload();
            },
            error: () => {
              this.saving.set(false);
              this.error.set('Offer saved but could not activate.');
              this.reload();
            },
          });
        },
        error: () => {
          this.saving.set(false);
          this.error.set('Could not save offer.');
        },
      });
  }

  activate(offer: ProtopipeOffering): void {
    const siteId = this.siteId();
    this.api.activateOffering$(siteId, offer.id).subscribe({
      next: () => this.reload(),
      error: () => this.error.set('Could not activate offer.'),
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}
