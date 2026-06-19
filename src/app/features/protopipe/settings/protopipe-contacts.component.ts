import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import type { ProtopipeContact, ProtopipeContactRole } from '@hive/contracts';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';
import { ProtopipeContactsApiService } from './protopipe-contacts-api.service';
import { parseProtopipeApiError } from '../protopipe-http.util';

const ROLE_OPTIONS: { label: string; value: ProtopipeContactRole }[] = [
  { label: 'Owner', value: 'owner' },
  { label: 'Staff', value: 'staff' },
  { label: 'Journalist', value: 'journalist' },
  { label: 'External', value: 'external' },
];

@Component({
  selector: 'app-protopipe-contacts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Button, InputText, ProgressSpinner, Select, Tag, Toast],
  providers: [MessageService],
  templateUrl: './protopipe-contacts.component.html',
  styleUrl: './protopipe-contacts.component.scss',
})
export class ProtopipeContactsComponent implements OnInit {
  private readonly api = inject(ProtopipeContactsApiService);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly messages = inject(MessageService);

  readonly roleOptions = ROLE_OPTIONS;

  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly contacts = signal<ProtopipeContact[]>([]);
  readonly loadError = signal<string | null>(null);

  readonly newPhone = signal('');
  readonly newLabel = signal('');
  readonly newRole = signal<ProtopipeContactRole>('owner');

  readonly siteId = computed(() => this.strategy.siteId());

  readonly canAdd = computed(() => this.newPhone().trim().length >= 10);

  async ngOnInit(): Promise<void> {
    await this.strategy.ensureLoaded();
    await this.load();
  }

  async load(): Promise<void> {
    const siteId = this.siteId();
    if (!siteId) {
      this.loadError.set('No site selected. Please complete onboarding first.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const { contacts } = await this.api.list(siteId);
      this.contacts.set(contacts);
    } catch (err) {
      this.loadError.set(parseProtopipeApiError(err, 'Could not load contacts.'));
    } finally {
      this.loading.set(false);
    }
  }

  async addContact(): Promise<void> {
    const siteId = this.siteId();
    if (!siteId || !this.canAdd()) return;
    this.busy.set(true);
    try {
      const { contact } = await this.api.create(siteId, {
        phone: this.newPhone().trim(),
        label: this.newLabel().trim() || undefined,
        role: this.newRole(),
      });
      this.contacts.update((list) => [...list, contact]);
      this.newPhone.set('');
      this.newLabel.set('');
      this.newRole.set('owner');
      this.messages.add({ severity: 'success', summary: 'Contact added', life: 4000 });
    } catch (err: any) {
      this.messages.add({
        severity: 'error',
        summary: 'Could not add contact',
        detail: parseProtopipeApiError(err, 'Please check the phone number and try again.'),
        life: 6000,
      });
    } finally {
      this.busy.set(false);
    }
  }

  async removeContact(contact: ProtopipeContact): Promise<void> {
    const siteId = this.siteId();
    if (!siteId || this.busy()) return;
    if (!window.confirm(`Remove ${contact.label ?? contact.phone} from SMS contacts?`)) return;
    this.busy.set(true);
    try {
      await this.api.delete(siteId, contact.id);
      this.contacts.update((list) => list.filter((c) => c.id !== contact.id));
      this.messages.add({ severity: 'success', summary: 'Contact removed', life: 4000 });
    } catch (err) {
      this.messages.add({
        severity: 'error',
        summary: 'Could not remove contact',
        detail: parseProtopipeApiError(err, 'Please try again.'),
        life: 6000,
      });
    } finally {
      this.busy.set(false);
    }
  }

  roleSeverity(role: ProtopipeContactRole): 'info' | 'success' | 'secondary' | 'warn' {
    switch (role) {
      case 'owner': return 'success';
      case 'staff': return 'info';
      case 'journalist': return 'warn';
      default: return 'secondary';
    }
  }

  isOptedOut(contact: ProtopipeContact): boolean {
    return !!contact.optedOutAt;
  }

  formatPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  }
}
