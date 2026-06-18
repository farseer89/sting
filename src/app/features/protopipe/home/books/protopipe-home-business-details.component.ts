import { ChangeDetectionStrategy, Component, OnInit, inject, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Button } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import type { ProtopipeContextCard } from '@hive/contracts';
import { firstValueFrom } from 'rxjs';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';

@Component({
  selector: 'app-protopipe-home-business-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, ProgressSpinner, DatePipe],
  templateUrl: './protopipe-home-business-details.component.html',
  styleUrl: './protopipe-home-business-details.component.scss',
})
export class ProtopipeHomeBusinessDetailsComponent implements OnInit {
  private readonly api = inject(ProtopipeApiService);
  readonly strategy = inject(ProtopipeStrategyService);

  readonly goSharpen = output<void>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly answeredCards = signal<ProtopipeContextCard[]>([]);

  readonly profile = () => this.strategy.onboardingProfile();

  ngOnInit(): void {
    void this.init();
  }

  private async init(): Promise<void> {
    await this.strategy.ensureLoaded();
    const siteId = this.strategy.siteId();
    if (!siteId) {
      this.loading.set(false);
      return;
    }

    try {
      const res = await firstValueFrom(this.api.listContextCards$(siteId, { status: 'answered' }));
      this.answeredCards.set((res.cards ?? []).slice(0, 12));
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not load business details'));
    } finally {
      this.loading.set(false);
    }
  }
}
