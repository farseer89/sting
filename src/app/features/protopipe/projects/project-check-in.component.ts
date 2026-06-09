import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ProtopipeProjectMedia } from '@hive/contracts';
import { ProtopipeApiService } from '../protopipe-api.service';
import { parseProtopipeApiError } from '../protopipe-http.util';

const MAX_FILES = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

interface PendingFile {
  file: File;
  previewUrl: string;
  isVideo: boolean;
}

@Component({
  selector: 'app-project-check-in',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-check-in.component.html',
  styleUrl: './project-check-in.component.scss',
})
export class ProjectCheckInComponent {
  private readonly api = inject(ProtopipeApiService);

  readonly mode = input.required<'owner' | 'share'>();
  readonly siteId = input<string | null>(null);
  readonly projectId = input<string | null>(null);
  readonly shareToken = input<string | null>(null);
  readonly projectTitle = input<string | null>(null);
  readonly serviceType = input<string | null>(null);
  readonly locationLabel = input<string | null>(null);

  readonly submitted = output<void>();

  readonly body = signal('');
  readonly pendingFiles = signal<PendingFile[]>([]);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  onBodyInput(event: Event): void {
    this.body.set((event.target as HTMLTextAreaElement).value);
  }

  onFilesSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const selected = Array.from(inputEl.files ?? []);
    inputEl.value = '';

    if (!selected.length) return;

    const current = this.pendingFiles();
    const remaining = MAX_FILES - current.length;
    if (remaining <= 0) {
      this.error.set(`Maximum ${MAX_FILES} files per update`);
      return;
    }

    const next: PendingFile[] = [...current];
    for (const file of selected.slice(0, remaining)) {
      const isVideo = file.type.startsWith('video/');
      const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (file.size > maxBytes) {
        this.error.set(
          isVideo ? 'Videos must be 100MB or smaller' : 'Images must be 5MB or smaller',
        );
        continue;
      }
      if (!file.type.startsWith('image/') && !isVideo) {
        this.error.set('Only images and videos are supported');
        continue;
      }
      next.push({
        file,
        previewUrl: URL.createObjectURL(file),
        isVideo,
      });
    }
    this.pendingFiles.set(next);
    this.error.set(null);
  }

  removeFile(index: number): void {
    const files = [...this.pendingFiles()];
    const removed = files.splice(index, 1)[0];
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    this.pendingFiles.set(files);
  }

  async submit(): Promise<void> {
    const text = this.body().trim();
    const files = this.pendingFiles();
    if (!text && files.length === 0) {
      this.error.set('Add progress text or at least one photo/video');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      const media = await this.uploadFiles(files);
      const captureBody = {
        kind: 'check_in' as const,
        body: text || undefined,
        media,
      };

      if (this.mode() === 'owner') {
        const siteId = this.siteId();
        const projectId = this.projectId();
        if (!siteId || !projectId) throw new Error('Missing project context');
        await firstValueFrom(this.api.createProjectCapture$(siteId, projectId, captureBody));
      } else {
        const token = this.shareToken();
        if (!token) throw new Error('Missing share token');
        await firstValueFrom(this.api.createProjectShareCapture$(token, captureBody));
      }

      for (const f of files) URL.revokeObjectURL(f.previewUrl);
      this.body.set('');
      this.pendingFiles.set([]);
      this.success.set('Update saved');
      this.submitted.emit();
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not save update'));
    } finally {
      this.submitting.set(false);
    }
  }

  private async uploadFiles(files: PendingFile[]): Promise<ProtopipeProjectMedia[]> {
    if (files.length === 0) return [];

    const presignBody = {
      files: files.map((f) => ({
        fileName: f.file.name,
        mimeType: f.file.type,
        fileSize: f.file.size,
      })),
    };

    let uploads;
    if (this.mode() === 'owner') {
      const siteId = this.siteId();
      const projectId = this.projectId();
      if (!siteId || !projectId) throw new Error('Missing project context');
      const res = await firstValueFrom(
        this.api.presignProjectMedia$(siteId, projectId, presignBody),
      );
      uploads = res.uploads;
    } else {
      const token = this.shareToken();
      if (!token) throw new Error('Missing share token');
      const res = await firstValueFrom(this.api.presignProjectShareMedia$(token, presignBody));
      uploads = res.uploads;
    }

    await Promise.all(
      uploads.map((upload, i) =>
        fetch(upload.uploadUrl, {
          method: 'PUT',
          body: files[i].file,
          headers: { 'Content-Type': files[i].file.type },
        }).then((r) => {
          if (!r.ok) throw new Error('Upload failed');
        }),
      ),
    );

    return uploads.map((upload, i) => ({
      type: files[i].isVideo ? ('video' as const) : ('image' as const),
      url: upload.publicUrl,
      assetId: upload.assetId,
      mimeType: files[i].file.type,
      sortOrder: i,
    }));
  }
}
