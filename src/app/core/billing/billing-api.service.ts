import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  BillingEndpoints,
  type BillingCheckoutSessionRequest,
  type BillingCheckoutSessionResponse,
  type BillingCompleteCheckoutRequest,
  type BillingCompleteCheckoutResponse,
  type BillingPortalSessionRequest,
  type BillingPortalSessionResponse,
} from '@hive/contracts';
import { environment } from '@env/environment';
import { isShirePrimary, shireApiUrl } from '../../features/protopipe/shire/shire-http.util';

@Injectable({ providedIn: 'root' })
export class BillingApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.MICRO_BASE_URL;

  createCheckoutSession(
    body: BillingCheckoutSessionRequest,
  ): Promise<BillingCheckoutSessionResponse> {
    const url = this.billingUrl(BillingEndpoints.checkoutSession.path);
    return firstValueFrom(this.http.post<BillingCheckoutSessionResponse>(url, body));
  }

  completeCheckout(body: BillingCompleteCheckoutRequest): Promise<BillingCompleteCheckoutResponse> {
    const url = this.billingUrl(BillingEndpoints.completeCheckout.path);
    return firstValueFrom(this.http.post<BillingCompleteCheckoutResponse>(url, body));
  }

  createPortalSession(body: BillingPortalSessionRequest): Promise<BillingPortalSessionResponse> {
    const url = this.billingUrl(BillingEndpoints.portalSession.path);
    return firstValueFrom(this.http.post<BillingPortalSessionResponse>(url, body));
  }

  private billingUrl(path: string): string {
    if (isShirePrimary()) {
      return shireApiUrl(path);
    }
    return `${this.base}${path}`;
  }
}
