import { Directive, ElementRef, Input, OnChanges, inject } from '@angular/core';

/** Applies a CSS font stack via setProperty so comma-separated families render correctly. */
@Directive({
  selector: '[siteThemeFont]',
  standalone: true,
})
export class SiteThemeFontDirective implements OnChanges {
  @Input() siteThemeFont: string | null | undefined;

  private readonly element = inject(ElementRef<HTMLElement>);

  ngOnChanges(): void {
    const stack = this.siteThemeFont?.trim();
    if (stack) {
      this.element.nativeElement.style.setProperty('font-family', stack, 'important');
      return;
    }
    this.element.nativeElement.style.removeProperty('font-family');
  }
}
