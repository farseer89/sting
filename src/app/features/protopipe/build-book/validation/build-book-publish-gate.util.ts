import type { ProtopipeSite } from '@hive/contracts';
import { findBuildBookBlockDefinition } from '../build-book-block.catalog';
import type { BuildBookPage } from '../build-book.types';

/** componentIds provisioned via LANDING_COMPONENT_MAP without template-specific astro paths. */
const UNIVERSAL_PUBLISH_COMPONENT_IDS = new Set([
  'hero-split',
  'hero-overlay',
  'stats-bar',
  'services-grid',
  'logo-strip',
  'process-steps',
  'feature-grid',
  'gallery-showcase',
  'testimonial-grid',
  'faq-accordion',
  'cta-banner',
  'lead-capture-form',
  'quote-request-form',
  'before-after',
  'content-split',
  'page-intro',
  'prose-section',
  'scheduler-embed',
  'consult-hero-split',
  'consult-hero-fullbleed',
  'consult-showcase-panel',
  'consult-stats-band',
  'consult-trusted-by',
  'consult-services-intro',
]);

function isPublishableBlock(blockId: string, componentId: string): boolean {
  const definition = findBuildBookBlockDefinition(blockId);
  if (!definition) return false;
  if (definition.astroComponent) return true;
  return UNIVERSAL_PUBLISH_COMPONENT_IDS.has(componentId);
}

export interface BuildBookPublishGateIssue {
  code: string;
  message: string;
}

export interface BuildBookPublishGateInput {
  homepage: BuildBookPage | null;
  site: Pick<ProtopipeSite, 'clientSitesSlug' | 'publishStatus'> | null;
  dirty: boolean;
}

export interface BuildBookPublishGateResult {
  ok: boolean;
  issues: BuildBookPublishGateIssue[];
}

function issue(code: string, message: string): BuildBookPublishGateIssue {
  return { code, message };
}

export function validateBuildBookPublishGate(
  input: BuildBookPublishGateInput,
): BuildBookPublishGateResult {
  const issues: BuildBookPublishGateIssue[] = [];

  if (input.dirty) {
    issues.push(issue('dirty', 'Save your changes before publishing'));
  }

  if (!input.site?.clientSitesSlug?.trim()) {
    issues.push(issue('slug', 'Set a site slug before publishing'));
  }

  if (!input.homepage) {
    issues.push(issue('homepage', 'Homepage is required'));
    return { ok: false, issues };
  }

  if (!input.homepage.blocks.length) {
    issues.push(issue('homepage.blocks', 'Homepage must have at least one block'));
  }

  for (const block of input.homepage.blocks) {
    if (!isPublishableBlock(block.blockId, block.componentId)) {
      issues.push(
        issue(
          'block.publish',
          `Block "${block.label ?? block.blockId}" is not wired for publish yet`,
        ),
      );
    }
  }

  if (input.site?.publishStatus === 'provisioning') {
    issues.push(issue('publish.provisioning', 'Publish is already in progress'));
  }

  return { ok: issues.length === 0, issues };
}
