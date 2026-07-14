import { Injectable, signal } from '@angular/core';

export interface BlogPreviewRequest {
  contentPostId: string;
  title?: string;
}

/** Cross-view handoff: Calendar / Thinker → dedicated Blog Preview surface. */
@Injectable({ providedIn: 'root' })
export class ProtopipeBlogPreviewNavState {
  private readonly _request = signal<BlogPreviewRequest | null>(null);

  readonly request = this._request.asReadonly();

  open(contentPostId: string, title?: string): void {
    const id = contentPostId.trim();
    if (!id) return;
    this._request.set({
      contentPostId: id,
      title: title?.trim() || undefined,
    });
  }

  clear(): void {
    this._request.set(null);
  }
}
