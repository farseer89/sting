import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass, NgStyle } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { Divider } from 'primeng/divider';
import { InputText } from 'primeng/inputtext';
import { Ripple } from 'primeng/ripple';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { AuthService } from '../../core/auth/auth.service';
import { PRODUCT_CONFIG } from '../../core/config/product-config';
import { validationMessages } from '../../core/validation/validation-messages';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgClass,
    NgStyle,
    Button,
    InputText,
    Checkbox,
    Dialog,
    Divider,
    Ripple,
    Toast,
    RouterLink,
  ],
  providers: [MessageService],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  readonly product = inject(PRODUCT_CONFIG);

  loginForm!: FormGroup;
  readonly formErrors = signal({ email: '', password: '' });
  readonly isLoggingIn = signal(false);
  readonly hasError = signal(false);
  readonly errorMessage = signal('');
  readonly isNetworkError = signal(false);
  readonly helpDialogVisible = signal(false);
  readonly showPassword = signal(false);

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      void this.router.navigate([this.product.routes.home], { replaceUrl: true });
    }
    this.createForm();
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }

  createForm(): void {
    this.loginForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]],
        rememberMe: [true],
      },
      { updateOn: 'blur' },
    );

    this.loginForm.valueChanges.subscribe(() => this.logValidationErrors());
  }

  async onSubmit(): Promise<void> {
    if (this.isLoggingIn() || !this.loginForm.valid) {
      return;
    }

    this.isLoggingIn.set(true);
    this.clearErrors();

    const email = (this.loginForm.get('email')?.value || '').toLowerCase().trim();
    const password = this.loginForm.get('password')?.value || '';
    const rememberMe = this.loginForm.get('rememberMe')?.value || false;

    try {
      await this.auth.loginUser(email, password, rememberMe);
      await this.router.navigate([this.product.routes.home], { replaceUrl: true });
    } catch (err: unknown) {
      this.handleAuthError(err);
    } finally {
      this.isLoggingIn.set(false);
    }
  }

  showHelpDialog(): void {
    this.helpDialogVisible.set(true);
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  private handleAuthError(err: unknown): void {
    const message = err instanceof Error ? err.message : 'Login failed';
    this.hasError.set(true);
    this.errorMessage.set(message);
    this.isNetworkError.set(
      message.includes('Unable to connect') ||
        message.includes('Network security') ||
        message.includes('SSL certificate') ||
        message.includes('Failed to fetch') ||
        message.includes('Http failure'),
    );

    let displayMessage = message;
    if (
      message.includes('incorrect') ||
      message.includes('password') ||
      message.includes('invalid credentials')
    ) {
      displayMessage = 'Incorrect password. Please try again.';
      this.errorMessage.set(displayMessage);
      this.loginForm.get('password')?.reset();
      this.loginForm.get('password')?.markAsUntouched();
    } else if (message.includes('not found') || message.includes('email')) {
      displayMessage = 'Email not found. Please check your email address.';
      this.errorMessage.set(displayMessage);
    }

    this.messages.add({
      severity: this.isNetworkError() ? 'warn' : 'error',
      summary: this.isNetworkError() ? 'Connection Error' : 'Login Failed',
      detail: this.isNetworkError()
        ? 'Unable to connect to server. See details below.'
        : displayMessage,
      life: this.isNetworkError() ? 10000 : 5000,
    });
  }

  private clearErrors(): void {
    this.hasError.set(false);
    this.errorMessage.set('');
    this.isNetworkError.set(false);
  }

  private logValidationErrors(): void {
    const next = { email: '', password: '' };
    Object.keys(this.loginForm.controls).forEach((key) => {
      const control = this.loginForm.get(key);
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
