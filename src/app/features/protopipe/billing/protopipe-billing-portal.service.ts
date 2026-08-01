import { Injectable, inject, signal } from '@angular/core';
import { PRODUCT_CONFIG } from '../../../core/config/product-config';
import { BillingApiService } from '../../../core/billing/billing-api.service';
import { parseBillingApiError } from '../../../core/billing/billing-http.util';

@Injectable({ providedIn: 'root' })
export class ProtopipeBillingPortalService {
  private readonly billing = inject(BillingApiService);
  private readonly product = inject(PRODUCT_CONFIG);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async openPortal(returnPath: string, planTier?: string): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    try {
      const session = await this.billing.createPortalSession({
        productKey: this.product.billing.productKey,
        returnUrl: new URL(returnPath, window.location.origin).toString(),
        ...(planTier ? { planTier: planTier as 'basic' | 'advanced' | 'pro' | 'agency_pro' } : {}),
      });
      window.location.href = session.url;
    } catch (err) {
      const message = parseBillingApiError(err, 'Could not open Stripe billing. Please try again.');
      this.error.set(message);
      throw new Error(message);
    } finally {
      this.loading.set(false);
    }
  }
}
