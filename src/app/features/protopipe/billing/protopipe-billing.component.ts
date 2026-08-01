import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { PRODUCT_CONFIG } from '../../../core/config/product-config';
import { buildProtopipeAccessState, isProtopipeInternalAdminEmail } from '../access/protopipe-access.model';
import { AuthService } from '../../../core/auth/auth.service';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';
import {
  PROTOPIPE_BILLING_COMPARISON_GROUPS,
  PROTOPIPE_BILLING_NAV_SECTIONS,
  PROTOPIPE_BILLING_RECOMMENDED_TIER,
  PROTOPIPE_BILLING_TIER_OPTIONS,
  type ProtopipeBillingSection,
  type ProtopipeBillingTierOption,
  buildProtopipeBillingSummary,
  comparisonRowsForGroup,
  resolveProtopipeBillingTierState,
} from './protopipe-billing-copy';
import { ProtopipeBillingPortalService } from './protopipe-billing-portal.service';

@Component({
  selector: 'app-protopipe-billing',
  standalone: true,
  imports: [Button],
  templateUrl: './protopipe-billing.component.html',
  styleUrl: './protopipe-billing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProtopipeBillingComponent {
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly portal = inject(ProtopipeBillingPortalService);
  private readonly auth = inject(AuthService);
  readonly product = inject(PRODUCT_CONFIG);

  readonly subscription = this.strategy.subscription;
  readonly accessState = computed(() => {
    const email =
      this.auth.currentUserEmail || this.auth.getStoredProfile()?.email || '';
    return buildProtopipeAccessState(this.subscription(), {
      isInternalAdmin: isProtopipeInternalAdminEmail(email),
    });
  });
  readonly summary = computed(() => buildProtopipeBillingSummary(this.subscription(), this.accessState()));
  readonly tierOptions = PROTOPIPE_BILLING_TIER_OPTIONS;
  readonly navSections = PROTOPIPE_BILLING_NAV_SECTIONS;
  readonly comparisonGroups = PROTOPIPE_BILLING_COMPARISON_GROUPS;
  readonly recommendedTier = PROTOPIPE_BILLING_RECOMMENDED_TIER;
  readonly section = signal<ProtopipeBillingSection>('overview');
  readonly portalLoading = this.portal.loading;
  readonly portalError = this.portal.error;
  readonly refreshLoading = signal(false);
  readonly refreshMessage = signal<string | null>(null);

  readonly stripeCustomerLabel = computed(() => {
    const customerId = this.subscription()?.stripeCustomerId;
    if (!customerId) return 'Stripe customer pending';
    return `Stripe customer ${customerId.slice(-8)}`;
  });

  tierState(tier: ProtopipeBillingTierOption) {
    return resolveProtopipeBillingTierState(this.accessState(), tier);
  }

  selectSection(section: ProtopipeBillingSection): void {
    this.section.set(section);
  }

  comparisonRows(groupId: string) {
    return comparisonRowsForGroup(groupId);
  }

  async manageTier(tier: ProtopipeBillingTierOption): Promise<void> {
    const state = this.tierState(tier);
    if (state.isCurrent) return;
    await this.manageBilling(tier.id);
  }

  async manageBilling(planTier?: ProtopipeBillingTierOption['id']): Promise<void> {
    this.refreshMessage.set(null);
    try {
      const navigated = await this.portal.openPortal(this.product.routes.billing, planTier);
      if (!navigated) {
        await this.strategy.reload();
        this.refreshMessage.set('Billing status refreshed.');
      }
    } catch {
      // Error message is exposed by the shared portal service.
    }
  }

  async refreshStatus(): Promise<void> {
    if (this.refreshLoading()) return;
    this.refreshLoading.set(true);
    this.refreshMessage.set(null);
    this.portal.error.set(null);

    await this.strategy.reload();
    this.refreshMessage.set('Billing status refreshed from your account.');
    this.refreshLoading.set(false);
  }
}
