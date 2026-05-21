import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { Toast } from 'primeng/toast';
import type { ProtopipeContentSection, ProtopipeContentTemplate, ProtopipeKeywordDto } from '@hive/contracts';
import {
  PROTOPIPE_CONTENT_META_MAX,
  PROTOPIPE_CONTENT_META_MIN,
  PROTOPIPE_CONTENT_TITLE_WARN,
} from '../protopipe.constants';
import {
  ProtopipeContentService,
  emptyContentTemplate,
} from '../protopipe-content.service';
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
    Select,
    Message,
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
  readonly seoChecklist = this.content.seoChecklist;
  readonly planKeywords = this.content.planKeywords;

  readonly metaMin = PROTOPIPE_CONTENT_META_MIN;
  readonly metaMax = PROTOPIPE_CONTENT_META_MAX;
  readonly titleWarn = PROTOPIPE_CONTENT_TITLE_WARN;

  readonly tabOptions = [
    { label: 'Published', value: 'published' as ContentTab },
    { label: 'Scheduled', value: 'scheduled' as ContentTab },
    { label: 'Drafts', value: 'draft' as ContentTab },
  ];

  readonly editorVisible = computed(() => this.editingId() !== null);

  readonly editSlug = signal('');
  readonly editScheduleAt = signal<Date | null>(null);
  readonly editTemplate = signal<ProtopipeContentTemplate>(emptyContentTemplate());
  readonly selectedKeywordId = signal<string | null>(null);

  readonly metaLength = computed(() => this.editTemplate().metaDescription.length);

  ngOnInit(): void {
    void this.content.ensureLoaded();
  }

  onTabChange(tab: ContentTab): void {
    this.content.setTab(tab);
  }

  openCreate(): void {
    this.editSlug.set('');
    this.editScheduleAt.set(null);
    this.editTemplate.set(emptyContentTemplate());
    this.selectedKeywordId.set(null);
    this.content.startCreate();
  }

  openEdit(post: ProtopipeContentPost): void {
    this.editSlug.set(post.slug);
    this.editScheduleAt.set(post.publishAt ? new Date(post.publishAt) : null);
    this.editTemplate.set(post.template ?? emptyContentTemplate());
    const kwId = post.template?.primaryKeywordId ?? null;
    this.selectedKeywordId.set(kwId);
    this.content.startEdit(post.id);
  }

  closeEditor(): void {
    this.content.cancelEdit();
  }

  onKeywordSelect(keywordId: string | null): void {
    this.selectedKeywordId.set(keywordId);
    const kw = this.planKeywords().find((k) => k.id === keywordId);
    this.patchTemplate({
      primaryKeywordId: keywordId ?? undefined,
      primaryKeywordPhrase: kw?.phrase ?? '',
    });
    this.content.markDirty();
  }

  onTitleChange(value: string): void {
    const t = this.editTemplate();
    const slug = this.editSlug();
    const updates: Partial<ProtopipeContentTemplate> = { title: value };
    if (!t.h1?.trim()) {
      updates.h1 = value;
    }
    if (!slug || this.editingId() === 'new') {
      this.editSlug.set(slugify(value));
    }
    this.patchTemplate(updates);
    this.content.markDirty();
  }

  patchTemplate(partial: Partial<ProtopipeContentTemplate>): void {
    this.editTemplate.update((t) => ({ ...t, ...partial }));
  }

  patchSection(index: number, partial: Partial<ProtopipeContentSection>): void {
    this.editTemplate.update((t) => {
      const sections = [...t.sections];
      sections[index] = { ...sections[index], ...partial };
      return { ...t, sections };
    });
    this.content.markDirty();
  }

  addSection(): void {
    this.editTemplate.update((t) => ({
      ...t,
      sections: [...t.sections, { h2: '', body: '', images: [] }],
    }));
    this.content.markDirty();
  }

  removeSection(index: number): void {
    this.editTemplate.update((t) => ({
      ...t,
      sections: t.sections.filter((_, i) => i !== index),
    }));
    this.content.markDirty();
  }

  fieldChange(): void {
    this.content.markDirty();
  }

  async savePost(): Promise<void> {
    const ok = await this.content.savePost({
      slug: this.editSlug(),
      template: this.editTemplate(),
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
      this.messages.add({
        severity: 'success',
        summary: 'Published',
        detail: 'Deploy will run via GitHub Actions.',
        life: 5000,
      });
      this.closeEditor();
    }
  }

  statusSeverity(status: string): 'success' | 'warn' | 'secondary' {
    if (status === 'published') return 'success';
    if (status === 'scheduled') return 'warn';
    return 'secondary';
  }

  checklistSeverity(level: string): 'error' | 'warn' | 'info' {
    if (level === 'error') return 'error';
    if (level === 'warning') return 'warn';
    return 'info';
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

  keywordOptions(): Array<{ label: string; value: string }> {
    return this.planKeywords().map((k: ProtopipeKeywordDto) => ({
      label: k.phrase,
      value: k.id,
    }));
  }
}
