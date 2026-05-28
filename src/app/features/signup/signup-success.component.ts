import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { PRODUCT_CONFIG } from '../../core/config/product-config';
import { BillingApiService } from '../../core/billing/billing-api.service';
import { parseBillingApiError } from '../../core/billing/billing-http.util';
import { AuthService } from '../../core/auth/auth.service';
import { SIGNUP_CREDENTIALS_KEY } from './signup.component';

@Component({
  selector: 'app-signup-success',
  standalone: true,
  imports: [Button, RouterLink],
  templateUrl: './signup-success.component.html',
  styleUrl: './signup-success.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupSuccessComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly billing = inject(BillingApiService);
  private readonly auth = inject(AuthService);
  readonly product = inject(PRODUCT_CONFIG);

  readonly status = signal<'loading' | 'error' | 'done'>('loading');
  readonly errorMessage = signal('');

  async ngOnInit(): Promise<void> {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    if (!sessionId) {
      this.status.set('error');
      this.errorMessage.set('Missing checkout session.');
      return;
    }

    try {
      const result = await this.billing.completeCheckout({
        productKey: this.product.billing.productKey,
        sessionId,
      });

      const credsRaw = sessionStorage.getItem(SIGNUP_CREDENTIALS_KEY);
      sessionStorage.removeItem(SIGNUP_CREDENTIALS_KEY);

      if (credsRaw) {
        const creds = JSON.parse(credsRaw) as { email: string; password: string };
        await this.auth.loginUser(creds.email, creds.password, true);
        const redirect = result.redirectPath || this.product.routes.postSignupRedirect;
        await this.router.navigateByUrl(redirect);
        this.status.set('done');
        return;
      }

      await this.router.navigate([this.product.routes.login]);
      this.status.set('done');
    } catch (err) {
      this.status.set('error');
      this.errorMessage.set(
        parseBillingApiError(err, 'We could not confirm your trial. Try signing in or contact support.'),
      );
    }
  }
}
