import type { BuildBookSection, BuildBookWireLayout } from '../build-book.types';

export interface BuildBlockRenderContext {
  section: BuildBookSection;
  blockId: string;
  layout: BuildBookWireLayout;
  props: Record<string, unknown>;
  editable: boolean;
  active: boolean;
}

export function readHeading(props: Record<string, unknown>, fallback = 'Section heading'): string {
  return String(props['heading'] ?? props['headline'] ?? fallback);
}

export function readSubhead(props: Record<string, unknown>, fallback = ''): string {
  return String(props['subhead'] ?? props['subheading'] ?? props['body'] ?? fallback);
}

export function readEyebrow(props: Record<string, unknown>, fallback = ''): string {
  return String(props['eyebrow'] ?? props['kicker'] ?? fallback);
}

export function readPrimaryCta(props: Record<string, unknown>, fallback = 'Get started'): string {
  return String(props['ctaLabel'] ?? props['primaryCtaLabel'] ?? fallback);
}

export function readSecondaryCta(props: Record<string, unknown>, fallback = 'Learn more'): string {
  return String(props['secondaryCtaLabel'] ?? fallback);
}

export function readSubmitLabel(props: Record<string, unknown>, fallback = 'Send message'): string {
  return String(props['submitLabel'] ?? fallback);
}
