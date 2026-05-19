import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Subscription } from 'rxjs';
import type { AuthProvider } from '@hive/contracts';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-session-expired-dialog',
  standalone: true,
  imports: [Dialog, Button, InputText, FormsModule],
  templateUrl: './session-expired-dialog.component.html',
  styleUrl: './session-expired-dialog.component.scss',
})
export class SessionExpiredDialogComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);

  visible = false;
  authProvider: AuthProvider = 'email';
  email = '';
  password = '';
  errorMessage = '';
  isSubmitting = false;

  private sessionExpiredSub?: Subscription;

  ngOnInit(): void {
    this.sessionExpiredSub = this.auth.sessionExpired$.subscribe((expired) => {
      if (expired) {
        this.authProvider = this.auth.getStoredProfile()?.authProvider ?? 'email';
        this.email = this.auth.currentUserEmail;
        this.password = '';
        this.errorMessage = '';
        this.isSubmitting = false;
        this.visible = true;
      } else {
        this.visible = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.sessionExpiredSub?.unsubscribe();
  }

  async onEmailReAuth(): Promise<void> {
    if (this.isSubmitting || !this.email || !this.password) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const rememberMe = !!localStorage.getItem('stingUserProfile');
      await this.auth.loginUser(this.email, this.password, rememberMe);
      this.auth.dismissSessionExpired();
      this.visible = false;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
      this.errorMessage = message;
    } finally {
      this.isSubmitting = false;
    }
  }

  onLogout(): void {
    this.auth.dismissSessionExpired();
    this.visible = false;
    this.auth.logout();
  }
}
