import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-session-refreshing-overlay',
  standalone: true,
  imports: [AsyncPipe],
  template: `
    @if (auth.refreshing$ | async) {
      <div class="session-refreshing-banner" role="status" aria-live="polite">
        <i class="pi pi-spin pi-spinner mr-2"></i>
        Restoring your session…
      </div>
    }
  `,
  styles: [
    `
      .session-refreshing-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1200;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.75rem 1rem;
        background: rgba(15, 23, 42, 0.92);
        color: #fff;
        font-size: 0.95rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }
    `,
  ],
})
export class SessionRefreshingOverlayComponent {
  readonly auth = inject(AuthService);
}
