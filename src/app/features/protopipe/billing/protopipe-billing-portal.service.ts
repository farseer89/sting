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

  /** Opens Stripe billing. Returns true when navigating away to Stripe. */
  async openPortal(returnPath: string, planTier?: string): Promise<boolean> {
    if (this.loading()) return false;
    this.loading.set(true);
    this.error.set(null);

    try {
      const returnUrl = new URL(returnPath, window.location.origin).toString();
      const session = await this.billing.createPortalSession({
        productKey: this.product.billing.productKey,
        returnUrl,
        ...(planTier ? { planTier: planTier as 'basic' | 'advanced' | 'pro' | 'agency_pro' } : {}),
      });

      const target = new URL(session.url, window.location.origin);
      const current = new URL(window.location.href);
      if (target.origin === current.origin && target.pathname === current.pathname) {
        this.loading.set(false);
        return false;
      }

      window.location.assign(session.url);
      return true;
    } catch (err) {
      const message = parseBillingApiError(err, 'Could not open Stripe billing. Please try again.');
      this.error.set(message);
      this.loading.set(false);
      throw new Error(message);
    }
  }
}
