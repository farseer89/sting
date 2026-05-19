import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass, NgStyle } from '@angular/common';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { Divider } from 'primeng/divider';
import { InputText } from 'primeng/inputtext';
import { Ripple } from 'primeng/ripple';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { AuthService } from '../../core/auth/auth.service';
import { validationMessages } from '../../core/validation/validation-messages';
import { environment } from '../../../environments/environment';

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
  ],
  providers: [MessageService],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);

  loginForm!: FormGroup;
  formErrors = { email: '', password: '' };
  isLoggingIn = false;
  hasError = false;
  errorMessage = '';
  isNetworkError = false;
  helpDialogVisible = false;
  showPassword = false;

  readonly loginWelcomeMessage = 'Welcome to FieldWave';
  readonly loginImageUrl = 'assets/images/surfing.jpeg';

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      void this.router.navigate(['/home']);
    }
    this.applyThemeColors('#059669', '#064e3b', '#f59e0b');
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
      { updateOn: 'blur' }
    );

    this.loginForm.valueChanges.subscribe(() => this.logValidationErrors());
  }

  async onSubmit(): Promise<void> {
    if (this.isLoggingIn || !this.loginForm.valid) {
      return;
    }

    this.isLoggingIn = true;
    this.clearErrors();

    const email = (this.loginForm.get('email')?.value || '').toLowerCase().trim();
    const password = this.loginForm.get('password')?.value || '';
    const rememberMe = this.loginForm.get('rememberMe')?.value || false;

    try {
      await this.auth.loginUser(email, password, rememberMe);
      await this.router.navigate(['/home']);
    } catch (err: unknown) {
      this.handleAuthError(err);
    } finally {
      this.isLoggingIn = false;
    }
  }

  showHelpDialog(): void {
    this.helpDialogVisible = true;
  }

  private handleAuthError(err: unknown): void {
    const message = err instanceof Error ? err.message : 'Login failed';
    this.hasError = true;
    this.errorMessage = message;
    this.isNetworkError =
      message.includes('Unable to connect') ||
      message.includes('Network security') ||
      message.includes('SSL certificate') ||
      message.includes('Failed to fetch') ||
      message.includes('Http failure');

    if (
      message.includes('incorrect') ||
      message.includes('password') ||
      message.includes('invalid credentials')
    ) {
      this.errorMessage = 'Incorrect password. Please try again.';
      this.loginForm.get('password')?.reset();
      this.loginForm.get('password')?.markAsUntouched();
    } else if (message.includes('not found') || message.includes('email')) {
      this.errorMessage = 'Email not found. Please check your email address.';
    }

    this.messages.add({
      severity: this.isNetworkError ? 'warn' : 'error',
      summary: this.isNetworkError ? 'Connection Error' : 'Login Failed',
      detail: this.isNetworkError ? 'Unable to connect to server. See details below.' : this.errorMessage,
      life: this.isNetworkError ? 10000 : 5000,
    });
  }

  private clearErrors(): void {
    this.hasError = false;
    this.errorMessage = '';
    this.isNetworkError = false;
  }

  private logValidationErrors(): void {
    Object.keys(this.loginForm.controls).forEach((key) => {
      const control = this.loginForm.get(key);
      if (!control) return;

      if (!control.valid && (control.touched || control.dirty)) {
        const messages = validationMessages[key];
        this.formErrors[key as keyof typeof this.formErrors] = '';
        if (messages && control.errors) {
          for (const errorKey of Object.keys(control.errors)) {
            if (messages[errorKey]) {
              this.formErrors[key as keyof typeof this.formErrors] += messages[errorKey] + ' ';
            }
          }
        }
      } else {
        this.formErrors[key as keyof typeof this.formErrors] = '';
      }
    });
  }

  private applyThemeColors(primaryColor: string, secondaryColor: string, accentColor: string): void {
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    document.documentElement.style.setProperty('--secondary-color', secondaryColor);
    document.documentElement.style.setProperty('--accent-color', accentColor);

    const hex = primaryColor.replace(/^#/, '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);
    document.documentElement.style.setProperty('--primary-900', this.darken(primaryColor, 15));
  }

  private darken(hex: string, percent: number): string {
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);
    r = Math.max(0, Math.floor(r * (1 - percent / 100)));
    g = Math.max(0, Math.floor(g * (1 - percent / 100)));
    b = Math.max(0, Math.floor(b * (1 - percent / 100)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}
