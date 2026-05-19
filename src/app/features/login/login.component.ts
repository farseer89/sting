import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { AuthMicroService } from '../../core/auth/auth-micro.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, Button, InputText, Password, Checkbox, Toast],
  providers: [MessageService],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthMicroService);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);

  readonly appName = environment.appName;
  isLoggingIn = false;

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      void this.router.navigate(['/home']);
    }
  }

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberMe: [true],
  });

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    const { email, password, rememberMe } = this.loginForm.getRawValue();
    this.isLoggingIn = true;
    try {
      await this.auth.loginUser(email, password, rememberMe);
      await this.router.navigate(['/home']);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      this.messages.add({ severity: 'error', summary: 'Login failed', detail: message });
    } finally {
      this.isLoggingIn = false;
    }
  }
}
