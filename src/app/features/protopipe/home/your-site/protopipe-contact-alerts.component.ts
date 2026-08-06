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

  readonly notifyEmail = signal(true);
  readonly notifySms = signal(false);
  readonly emails = signal<string[]>(['']);
  readonly smsPhones = signal<string[]>(['']);

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
        notifyEmail: this.notifyEmail(),
        notifySms: this.notifySms(),
        emails: this.cleanList(this.emails()),
        smsPhones: this.cleanList(this.smsPhones()),
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

  addEmail(): void {
    this.emails.update((rows) => [...rows, '']);
  }

  removeEmail(index: number): void {
    this.emails.update((rows) => (rows.length <= 1 ? [''] : rows.filter((_, i) => i !== index)));
  }

  updateEmail(index: number, value: string): void {
    this.emails.update((rows) => rows.map((row, i) => (i === index ? value : row)));
  }

  addSmsPhone(): void {
    this.smsPhones.update((rows) => [...rows, '']);
  }

  removeSmsPhone(index: number): void {
    this.smsPhones.update((rows) => (rows.length <= 1 ? [''] : rows.filter((_, i) => i !== index)));
  }

  updateSmsPhone(index: number, value: string): void {
    this.smsPhones.update((rows) => rows.map((row, i) => (i === index ? value : row)));
  }

  private applySettings(res: ShireFormNotificationsResponse): void {
    this.notifyEmail.set(res.notifyEmail);
    this.notifySms.set(res.notifySms);
    this.emails.set(this.toEditableList(res.emails, res.email));
    this.smsPhones.set(this.toEditableList(res.smsPhones, res.smsPhone));
    this.fallbackEmail.set(res.fallbackEmail);
    this.hostedSite.set(res.hostedSite);
  }

  private toEditableList(values?: string[], legacy?: string): string[] {
    const normalized = (values?.length ? values : legacy?.trim() ? [legacy.trim()] : []).filter(
      Boolean,
    );
    return normalized.length ? normalized : [''];
  }

  private cleanList(values: string[]): string[] | undefined {
    const cleaned = values.map((value) => value.trim()).filter(Boolean);
    return cleaned.length ? cleaned : undefined;
  }
}
