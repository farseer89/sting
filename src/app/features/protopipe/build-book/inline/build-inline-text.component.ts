import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { readPlainText, stripRichPaste, syncTextContent } from './build-inline-edit.util';

@Component({
  selector: 'app-protopipe-build-inline-text',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (editable()) {
      @if (multiline()) {
        <div
          #editableEl
          [class]="editableClasses()"
          contenteditable="true"
          role="textbox"
          [attr.aria-multiline]="true"
          [attr.data-placeholder]="placeholder() || null"
          [attr.aria-label]="ariaLabel()"
          (focus)="onFocus()"
          (input)="onInput()"
          (blur)="onBlur()"
          (paste)="onPaste($event)"
          (keydown)="onKeydown($event)"
        ></div>
      } @else {
        <span
          #editableEl
          [class]="editableClasses()"
          contenteditable="true"
          role="textbox"
          [attr.data-placeholder]="placeholder() || null"
          [attr.aria-label]="ariaLabel()"
          (focus)="onFocus()"
          (input)="onInput()"
          (blur)="onBlur()"
          (paste)="onPaste($event)"
          (keydown)="onKeydown($event)"
        ></span>
      }
    } @else if (multiline() && asHtml()) {
      <span [class]="hostClass()" [innerHTML]="displayHtml()"></span>
    } @else {
      <span [class]="hostClass()">{{ value() }}</span>
    }
  `,
  styleUrl: './build-inline-text.component.scss',
})
export class ProtopipeBuildInlineTextComponent implements AfterViewInit {
  readonly value = input('');
  readonly editable = input(false);
  readonly multiline = input(false);
  readonly asHtml = input(false);
  readonly hostClass = input('');
  readonly ariaLabel = input('Editable text');
  readonly placeholder = input('');

  readonly valueChange = output<string>();

  private readonly editableEl = viewChild<ElementRef<HTMLElement>>('editableEl');
  private focused = false;
  private inputTimer: ReturnType<typeof setTimeout> | null = null;


  readonly editableClasses = computed(() => {
    const base = this.multiline()
      ? 'bb-inline-text bb-inline-text--multiline'
      : 'bb-inline-text';
    const host = this.hostClass().trim();
    return host ? `${base} ${host}` : base;
  });

  readonly displayHtml = computed(() =>
    this.value()
      .replace(/\n/g, '<br>')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/&lt;br&gt;/g, '<br>'),
  );

  constructor() {
    effect(() => {
      if (!this.editable()) return;
      const el = this.editableEl()?.nativeElement;
      if (!el || this.focused) return;
      syncTextContent(el, this.value(), false);
    });
  }

  ngAfterViewInit(): void {
    this.syncDomFromValue();
  }

  onFocus(): void {
    this.focused = true;
  }

  onInput(): void {
    if (this.inputTimer) clearTimeout(this.inputTimer);
    this.inputTimer = setTimeout(() => this.emitCurrentValue(), 120);
  }

  onBlur(): void {
    this.focused = false;
    if (this.inputTimer) {
      clearTimeout(this.inputTimer);
      this.inputTimer = null;
    }
    this.emitCurrentValue();
    this.syncDomFromValue();
  }

  onPaste(event: ClipboardEvent): void {
    stripRichPaste(event);
    queueMicrotask(() => this.emitCurrentValue());
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    if (this.multiline() && event.shiftKey) return;
    event.preventDefault();
  }

  private emitCurrentValue(): void {
    const el = this.editableEl()?.nativeElement;
    if (!el) return;
    const next = readPlainText(el);
    if (next !== this.value()) {
      this.valueChange.emit(next);
    }
  }

  private syncDomFromValue(): void {
    const el = this.editableEl()?.nativeElement;
    if (!el) return;
    syncTextContent(el, this.value(), this.focused);
  }
}
