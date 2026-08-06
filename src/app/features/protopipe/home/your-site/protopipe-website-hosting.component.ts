import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';

@Component({
  selector: 'app-protopipe-website-hosting',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule],
  templateUrl: './protopipe-website-hosting.component.html',
  styleUrl: './protopipe-website-hosting.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProtopipeWebsiteHostingComponent implements OnInit {
  private readonly strategy = inject(ProtopipeStrategyService);

  readonly site = this.strategy.site;
  readonly scanning = signal(false);
  readonly connected = signal(false);
  readonly error = signal<string | null>(null);
  readonly websiteUrl = signal('');
  readonly canScan = computed(() => Boolean(this.websiteUrl().trim()) && !this.scanning());

  ngOnInit(): void {
    const site = this.site();
    this.websiteUrl.set(site?.url || site?.previewBaseUrl || site?.hostname || '');
  }

  async scan(): Promise<void> {
    if (!this.canScan()) return;
    this.scanning.set(true);
    this.error.set(null);
    this.connected.set(false);
    try {
      const result = await this.strategy.scanHostedSite(this.websiteUrl());
      this.connected.set(result.connected);
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not check hosted status.'));
    } finally {
      this.scanning.set(false);
    }
  }
}
