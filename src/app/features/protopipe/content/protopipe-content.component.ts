import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { ProgressSpinner } from 'primeng/progressspinner';
import { SelectButton } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { Toast } from 'primeng/toast';
import { ProtopipeContentService } from '../protopipe-content.service';
import type { ContentTab } from '../protopipe-content.service';
import type { ProtopipeContentPost } from '../protopipe.models';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

@Component({
  selector: 'app-protopipe-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    Button,
    InputText,
    Textarea,
    TableModule,
    Tag,
    Toast,
    ConfirmDialog,
    Dialog,
    SelectButton,
    DatePicker,
    ProgressSpinner,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './protopipe-content.component.html',
  styleUrl: './protopipe-content.component.scss',
})
export class ProtopipeContentComponent implements OnInit {
  protected readonly content = inject(ProtopipeContentService);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);

  readonly loading = this.content.loading;
  readonly saving = this.content.saving;
  readonly publishing = this.content.publishing;
  readonly error = this.content.error;
  readonly activeTab = this.content.activeTab;
  readonly filteredPosts = this.content.filteredPosts;
  readonly editingId = this.content.editingId;

  readonly tabOptions = [
    { label: 'Published', value: 'published' as ContentTab },
    { label: 'Scheduled', value: 'scheduled' as ContentTab },
    { label: 'Drafts', value: 'draft' as ContentTab },
  ];

  readonly editorVisible = computed(() => this.editingId() !== null);

  readonly editTitle = signal('');
  readonly editSlug = signal('');
  readonly editDescription = signal('');
  readonly editBody = signal('');
  readonly editScheduleAt = signal<Date | null>(null);

  ngOnInit(): void {
    void this.content.ensureLoaded();
  }

  onTabChange(tab: ContentTab): void {
    this.content.setTab(tab);
  }

  openCreate(): void {
    this.editTitle.set('');
    this.editSlug.set('');
    this.editDescription.set('');
    this.editBody.set('');
    this.editScheduleAt.set(null);
    this.content.startCreate();
  }

  openEdit(post: ProtopipeContentPost): void {
    this.editTitle.set(post.title);
    this.editSlug.set(post.slug);
    this.editDescription.set(post.description);
    this.editBody.set(post.bodyMarkdown);
    this.editScheduleAt.set(post.publishAt ? new Date(post.publishAt) : null);
    this.content.startEdit(post.id);
  }

  closeEditor(): void {
    this.content.cancelEdit();
  }

  onTitleChange(value: string): void {
    this.editTitle.set(value);
    if (!this.editSlug() || this.editingId() === 'new') {
      this.editSlug.set(slugify(value));
    }
    this.content.markDirty();
  }

  fieldChange(): void {
    this.content.markDirty();
  }

  async savePost(): Promise<void> {
    const ok = await this.content.savePost({
      title: this.editTitle(),
      slug: this.editSlug(),
      description: this.editDescription(),
      bodyMarkdown: this.editBody(),
      scheduleAt: this.editScheduleAt()?.toISOString(),
    });
    if (ok) {
      this.messages.add({ severity: 'success', summary: 'Saved', life: 3000 });
    }
  }

  confirmPublish(post: ProtopipeContentPost): void {
    this.confirm.confirm({
      message: `Publish "${post.title}" to the live site now?`,
      header: 'Publish now',
      icon: 'pi pi-upload',
      accept: () => void this.publishPost(post.id),
    });
  }

  async publishPost(postId: string): Promise<void> {
    const ok = await this.content.publishNow(postId);
    if (ok) {
      this.messages.add({ severity: 'success', summary: 'Published', detail: 'Deploy will run via GitHub Actions.', life: 5000 });
      this.closeEditor();
    }
  }

  statusSeverity(status: string): 'success' | 'warn' | 'secondary' {
    if (status === 'published') return 'success';
    if (status === 'scheduled') return 'warn';
    return 'secondary';
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  }

  editingPost(): ProtopipeContentPost | undefined {
    const id = this.editingId();
    if (!id || id === 'new') {
      return undefined;
    }
    return this.content.postById(id);
  }
}
