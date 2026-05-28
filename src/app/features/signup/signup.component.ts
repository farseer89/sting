import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Ripple } from 'primeng/ripple';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { PRODUCT_CONFIG } from '../../core/config/product-config';
import { BillingApiService } from '../../core/billing/billing-api.service';
import { parseBillingApiError } from '../../core/billing/billing-http.util';
import { validationMessages } from '../../core/validation/validation-messages';

const SIGNUP_CREDENTIALS_KEY = 'sting.signup.credentials';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, NgStyle, Button, InputText, Ripple, Toast, RouterLink],
  providers: [MessageService],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly billing = inject(BillingApiService);
  private readonly messages = inject(MessageService);
  readonly product = inject(PRODUCT_CONFIG);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
  });

  readonly isSubmitting = signal(false);
  readonly showPassword = signal(false);

  readonly formErrors = signal({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  async onSubmit(): Promise<void> {
    if (this.isSubmitting() || this.form.invalid) return;
    this.isSubmitting.set(true);
    this.logValidationErrors();

    const { firstName, lastName, email, password } = this.form.getRawValue();
    const origin = window.location.origin;
    const successUrl = `${origin}${this.product.routes.signupSuccess}?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}${this.product.routes.signup}`;

    try {
      const session = await this.billing.createCheckoutSession({
        productKey: this.product.billing.productKey,
        email: email.toLowerCase().trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        successUrl,
        cancelUrl,
      });

      sessionStorage.setItem(
        SIGNUP_CREDENTIALS_KEY,
        JSON.stringify({ email: email.toLowerCase().trim(), password }),
      );

      window.location.href = session.url;
    } catch (err) {
      this.messages.add({
        severity: 'error',
        summary: 'Signup failed',
        detail: parseBillingApiError(err, 'Could not start checkout. Please try again.'),
      });
      this.isSubmitting.set(false);
    }
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  private logValidationErrors(): void {
    const next = { firstName: '', lastName: '', email: '', password: '' };
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (!control) return;
      if (!control.valid && (control.touched || control.dirty)) {
        const messages = validationMessages[key];
        if (messages && control.errors) {
          for (const errorKey of Object.keys(control.errors)) {
            if (messages[errorKey]) {
              next[key as keyof typeof next] += messages[errorKey] + ' ';
            }
          }
        }
      }
    });
    this.formErrors.set(next);
  }
}

export { SIGNUP_CREDENTIALS_KEY };
