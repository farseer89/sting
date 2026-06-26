import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-session-revoked-dialog',
  standalone: true,
  imports: [Dialog, Button],
  template: `
    <p-dialog
      header="Signed out for security"
      [(visible)]="visible"
      [modal]="true"
      [closable]="false"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '420px' }"
    >
      <p class="m-0 mb-4 text-600">
        Your session was ended because it may have been used elsewhere or looked suspicious. Sign in
        again to continue.
      </p>
      <button pButton type="button" class="w-full" label="Return to login" (click)="onLogout()"></button>
    </p-dialog>
  `,
})
export class SessionRevokedDialogComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  visible = false;
  private sub?: Subscription;

  ngOnInit(): void {
    this.sub = this.auth.sessionRevoked$.subscribe((revoked) => {
      this.visible = revoked;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onLogout(): void {
    this.auth.dismissSessionRevoked();
    this.visible = false;
    this.auth.logout();
  }
}
