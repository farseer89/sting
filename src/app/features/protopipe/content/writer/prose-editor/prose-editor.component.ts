import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { Extensions } from '@tiptap/core';
import { Editor } from '@tiptap/core';
import { buildProseExtensions } from './prose-editor-extensions';
import { FactHighlight, type FactHighlightItem } from './fact-highlight.extension';
import {
  EditorMenus,
  type MenuSelectionInfo,
  type MenuSlashInfo,
} from './editor-menus.extension';

export interface ProseSelectionEvent extends MenuSelectionInfo {
  editor: Editor;
}

export interface ProseSlashEvent extends MenuSlashInfo {
  editor: Editor;
}

/**
 * Minimal, themeable TipTap prose editor for article body/intro. Speaks
 * markdown strings on both sides (`value` in, `valueChange` out) so it is a
 * drop-in replacement for the previous `<textarea>` and keeps the publish
 * pipeline (which expects markdown) untouched.
 *
 * Angular 21 / zoneless: the TipTap instance is created imperatively after the
 * first render and torn down on destroy; we deliberately do not depend on
 * ngx-tiptap.
 */
@Component({
  selector: 'app-prose-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="prose-editor" [class.is-disabled]="disabled()" #host></div>`,
  styleUrl: './prose-editor.component.scss',
})
export class ProseEditorComponent {
  /** Markdown content. */
  readonly value = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly placeholder = input<string>('');
  /** Optional extra TipTap extensions (slash, bubble menu). */
  readonly extensions = input<Extensions>([]);
  /** Reviewer-flagged claims to highlight inline. */
  readonly flaggedFacts = input<FactHighlightItem[]>([]);

  /** Emits markdown whenever the user edits. */
  readonly valueChange = output<string>();
  /** Emits when the editor gains focus (mirrors textarea (focus)). */
  readonly focused = output<void>();
  /** Emits when a highlighted claim is clicked (factId + anchor rect). */
  readonly factClick = output<{ factId: string; rect: DOMRect }>();
  /** Non-empty text selection (for the bubble menu), or null when collapsed. */
  readonly selectionChange = output<ProseSelectionEvent | null>();
  /** Active `/slash` command at the cursor, or null. */
  readonly slashChange = output<ProseSlashEvent | null>();
  /** Emits the underlying Editor once ready (for feature extensions). */
  readonly ready = output<Editor>();

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly destroyRef = inject(DestroyRef);

  private editor: Editor | null = null;
  /** Last markdown we emitted, to avoid echo-loops with the parent binding. */
  private lastEmitted: string | null = null;

  constructor() {
    afterNextRender(() => this.initEditor());

    // Push external value changes into the editor (skip our own echoes).
    effect(() => {
      const next = this.value() ?? '';
      const ed = this.editor;
      if (!ed) return;
      if (next === this.lastEmitted) return;
      const current = this.getMarkdown(ed);
      if (next === current) return;
      ed.commands.setContent(next, false);
    });

    effect(() => {
      this.editor?.setEditable(!this.disabled());
    });

    // Keep inline fact highlights in sync with the reviewer's flagged claims.
    effect(() => {
      const facts = this.flaggedFacts();
      this.editor?.commands.setFlaggedFacts(facts);
    });

    this.destroyRef.onDestroy(() => {
      this.editor?.destroy();
      this.editor = null;
    });
  }

  private initEditor(): void {
    const factHighlight = FactHighlight.configure({
      onFactClick: (factId, rect) => this.factClick.emit({ factId, rect }),
    });
    const menus = EditorMenus.configure({
      onSelection: (info) =>
        this.selectionChange.emit(
          info && this.editor ? { ...info, editor: this.editor } : null,
        ),
      onSlash: (info) =>
        this.slashChange.emit(info && this.editor ? { ...info, editor: this.editor } : null),
    });
    const extensions: Extensions = buildProseExtensions({
      placeholder: this.placeholder(),
      extra: [factHighlight, menus, ...this.extensions()],
    });

    const editor = new Editor({
      element: this.host().nativeElement,
      extensions,
      content: this.value() ?? '',
      editable: !this.disabled(),
      onUpdate: ({ editor: ed }) => {
        const md = this.getMarkdown(ed);
        this.lastEmitted = md;
        this.valueChange.emit(md);
      },
      onFocus: () => this.focused.emit(),
    });

    this.editor = editor;
    editor.commands.setFlaggedFacts(this.flaggedFacts());
    this.ready.emit(editor);
  }

  private getMarkdown(editor: Editor): string {
    const storage = editor.storage as { markdown?: { getMarkdown(): string } };
    return storage.markdown?.getMarkdown() ?? '';
  }
}
