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

@Injectable({ providedIn: 'root' })
export class BillingApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.MICRO_BASE_URL;

  createCheckoutSession(
    body: BillingCheckoutSessionRequest,
  ): Promise<BillingCheckoutSessionResponse> {
    const url = `${this.base}${BillingEndpoints.checkoutSession.path}`;
    return firstValueFrom(this.http.post<BillingCheckoutSessionResponse>(url, body));
  }

  completeCheckout(body: BillingCompleteCheckoutRequest): Promise<BillingCompleteCheckoutResponse> {
    const url = `${this.base}${BillingEndpoints.completeCheckout.path}`;
    return firstValueFrom(this.http.post<BillingCompleteCheckoutResponse>(url, body));
  }

  createPortalSession(body: BillingPortalSessionRequest): Promise<BillingPortalSessionResponse> {
    const url = `${this.base}${BillingEndpoints.portalSession.path}`;
    return firstValueFrom(this.http.post<BillingPortalSessionResponse>(url, body));
  }
}
