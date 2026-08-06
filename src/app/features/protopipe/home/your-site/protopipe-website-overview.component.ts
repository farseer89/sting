import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { isShireHostedSite } from '@hive/contracts';

@Component({
  selector: 'app-protopipe-website-overview',
  standalone: true,
  templateUrl: './protopipe-website-overview.component.html',
  styleUrl: './protopipe-website-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProtopipeWebsiteOverviewComponent {
  private readonly strategy = inject(ProtopipeStrategyService);

  readonly site = this.strategy.site;
  readonly hostedSite = computed(() => isShireHostedSite(this.site() ?? {}));
  readonly displayUrl = computed(() => {
    const site = this.site();
    return site?.url || site?.previewBaseUrl || site?.hostname || 'No website selected';
  });
}
