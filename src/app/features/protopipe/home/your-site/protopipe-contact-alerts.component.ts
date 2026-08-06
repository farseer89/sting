import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import type { ShireFormNotificationsResponse, ShirePatchFormNotificationsRequest } from '@hive/contracts';
import { isShireHostedSite } from '@hive/contracts';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';

@Component({
  selector: 'app-protopipe-contact-alerts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CheckboxModule, InputTextModule, ButtonModule],
  templateUrl: './protopipe-contact-alerts.component.html',
  styleUrl: './protopipe-contact-alerts.component.scss',
})
export class ProtopipeContactAlertsComponent implements OnInit {
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly saved = signal(false);
  readonly hostedSite = signal(false);
  readonly fallbackEmail = signal<string | undefined>(undefined);

  notifyEmail = true;
  notifySms = false;
  email = '';
  smsPhone = '';

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    const site = this.strategy.site();
    this.hostedSite.set(isShireHostedSite(site ?? {}));
    if (!site?.id || !this.hostedSite()) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.api.getFormNotifications(site.id);
      this.applySettings(res);
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not load contact alerts.'));
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;

    this.saving.set(true);
    this.error.set(null);
    this.saved.set(false);
    try {
      const body: ShirePatchFormNotificationsRequest = {
        notifyEmail: this.notifyEmail,
        notifySms: this.notifySms,
        email: this.email.trim() || undefined,
        smsPhone: this.smsPhone.trim() || undefined,
      };
      const res = await this.api.patchFormNotifications(siteId, body);
      this.applySettings(res);
      this.saved.set(true);
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not save contact alerts.'));
    } finally {
      this.saving.set(false);
    }
  }

  private applySettings(res: ShireFormNotificationsResponse): void {
    this.notifyEmail = res.notifyEmail;
    this.notifySms = res.notifySms;
    this.email = res.email ?? '';
    this.smsPhone = res.smsPhone ?? '';
    this.fallbackEmail.set(res.fallbackEmail);
    this.hostedSite.set(res.hostedSite);
  }
}
