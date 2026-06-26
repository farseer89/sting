import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionExpiredDialogComponent } from './shared/session-expired-dialog/session-expired-dialog.component';
import { SessionRefreshingOverlayComponent } from './shared/session-refreshing-overlay/session-refreshing-overlay.component';
import { SessionRevokedDialogComponent } from './shared/session-revoked-dialog/session-revoked-dialog.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    SessionExpiredDialogComponent,
    SessionRefreshingOverlayComponent,
    SessionRevokedDialogComponent,
  ],
  template: `
    <router-outlet />
    <app-session-refreshing-overlay />
    <app-session-expired-dialog />
    <app-session-revoked-dialog />
  `,
  styleUrl: './app.scss',
})
export class App {}
