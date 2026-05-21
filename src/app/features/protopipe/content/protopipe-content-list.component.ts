import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { SelectButton } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { Tag } from 'primeng/tag';
import { ProtopipeContentService, type ContentTab } from '../protopipe-content.service';
import type { ProtopipeContentPost } from '../protopipe.models';

@Component({
  selector: 'app-protopipe-content-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Button, SelectButton, FormsModule, Tag, ProgressSpinner],
  templateUrl: './protopipe-content-list.component.html',
  styleUrl: './protopipe-content-list.component.scss',
})
export class ProtopipeContentListComponent implements OnInit {
  protected readonly content = inject(ProtopipeContentService);
  private readonly router = inject(Router);

  readonly loading = this.content.loading;
  readonly error = this.content.error;
  readonly activeTab = this.content.activeTab;
  readonly filteredPosts = this.content.filteredPosts;

  readonly tabOptions = [
    { label: 'Published', value: 'published' as ContentTab },
    { label: 'Scheduled', value: 'scheduled' as ContentTab },
    { label: 'Drafts', value: 'draft' as ContentTab },
  ];

  ngOnInit(): void {
    void this.content.ensureLoaded();
  }

  onTabChange(tab: ContentTab): void {
    this.content.setTab(tab);
  }

  openNew(): void {
    void this.router.navigate(['/protopipe/content/new']);
  }

  openPost(post: ProtopipeContentPost): void {
    void this.router.navigate(['/protopipe/content', post.id]);
  }

  statusSeverity(status: string): 'success' | 'warn' | 'secondary' {
    if (status === 'published') return 'success';
    if (status === 'scheduled') return 'warn';
    return 'secondary';
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
