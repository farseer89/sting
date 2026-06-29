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
  selector: 'app-protopipe-build-inline-cta',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (editable()) {
      <span
        #editableEl
        [class]="editableClasses()"
        contenteditable="true"
        role="textbox"
        aria-label="Call to action label"
        (focus)="onFocus()"
        (input)="onInput()"
        (blur)="onBlur()"
        (paste)="onPaste($event)"
        (keydown)="onKeydown($event)"
      ></span>
    } @else {
      <span [class]="hostClass()">{{ value() }}</span>
    }
  `,
  styleUrl: './build-inline-cta.component.scss',
})
export class ProtopipeBuildInlineCtaComponent implements AfterViewInit {
  readonly value = input('');
  readonly editable = input(false);
  readonly hostClass = input('bdh__btn');

  readonly valueChange = output<string>();

  readonly editableClasses = computed(() => {
    const base = 'bb-inline-text bb-inline-text--button';
    const host = this.hostClass().trim();
    return host ? `${base} ${host}` : base;
  });


  private readonly editableEl = viewChild<ElementRef<HTMLElement>>('editableEl');
  private focused = false;
  private inputTimer: ReturnType<typeof setTimeout> | null = null;

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
    if (event.key === 'Enter') event.preventDefault();
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
