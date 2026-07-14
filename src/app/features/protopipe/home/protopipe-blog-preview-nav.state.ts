import { Injectable, signal } from '@angular/core';
import type { BlogArticleTemplateKey } from '../build-book/build-book.types';

export interface BlogPreviewContentPostRequest {
  kind: 'content-post';
  contentPostId: string;
  title?: string;
}

export interface BlogPreviewTemplateDesignRequest {
  kind: 'template-design';
  templateKey: BlogArticleTemplateKey;
  title?: string;
}

export type BlogPreviewRequest =
  | BlogPreviewContentPostRequest
  | BlogPreviewTemplateDesignRequest;

/** Cross-view handoff: Calendar / Thinker → dedicated Blog Preview surface. */
@Injectable({ providedIn: 'root' })
export class ProtopipeBlogPreviewNavState {
  private readonly _request = signal<BlogPreviewRequest | null>(null);

  readonly request = this._request.asReadonly();

  open(contentPostId: string, title?: string): void {
    const id = contentPostId.trim();
    if (!id) return;
    this._request.set({
      kind: 'content-post',
      contentPostId: id,
      title: title?.trim() || undefined,
    });
  }

  openArticleTemplate(templateKey: BlogArticleTemplateKey, title?: string): void {
    this._request.set({
      kind: 'template-design',
      templateKey,
      title: title?.trim() || undefined,
    });
  }

  clear(): void {
    this._request.set(null);
  }
}
