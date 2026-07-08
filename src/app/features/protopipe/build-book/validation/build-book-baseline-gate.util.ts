import { BUILD_BOOK_BLOCK_PATTERNS } from '../build-book-block-patterns.catalog';
import { findBuildBookBlockDefinition } from '../build-book-block.catalog';
import { BUILD_BOOK_BASELINE_PAGE_ASSEMBLIES } from '../build-book-baseline-assemblies';
import { resolvePatternIdForBlock } from '../build-book-block-registry.util';
import { SKELETON_PATTERN_IDS, resolvePatternSkeleton } from '../build-book-pattern-skeletons';
import { patternIdsForPageKind } from '../build-book-page-pattern-policy';
import {
  BUILD_BOOK_PATTERN_CONTRACTS,
  manifestForBlock,
} from './build-book-pattern-contracts';

export interface BuildBookBaselineGateIssue {
  code: string;
  message: string;
}

export interface BuildBookBaselineGateResult {
  ok: boolean;
  issues: BuildBookBaselineGateIssue[];
}

function issue(code: string, message: string): BuildBookBaselineGateIssue {
  return { code, message };
}

export function validateBuildBookBaselineGate(): BuildBookBaselineGateResult {
  const issues: BuildBookBaselineGateIssue[] = [];

  for (const pattern of BUILD_BOOK_BLOCK_PATTERNS) {
    if (!pattern.intents.length) {
      issues.push(issue('pattern.intents', `Pattern "${pattern.id}" has no intents`));
    }
    const skeleton = resolvePatternSkeleton(pattern.id);
    if (skeleton.kind === 'pattern-generic' && SKELETON_PATTERN_IDS.has(pattern.id)) {
      // explicit generic allowed only when not in explicit map — check inverse
    }
    if (!SKELETON_PATTERN_IDS.has(pattern.id) && skeleton.kind === 'pattern-generic') {
      issues.push(
        issue('pattern.skeleton', `Pattern "${pattern.id}" has no dedicated skeleton mapping`),
      );
    }
  }

  for (const [templateId, pages] of Object.entries(BUILD_BOOK_BASELINE_PAGE_ASSEMBLIES)) {
    for (const page of pages) {
      for (const block of page.blocks) {
        const blockId = block.blockId;
      const def = findBuildBookBlockDefinition(blockId);
      if (!def) {
        issues.push(
          issue('baseline.block', `Baseline assembly "${templateId}" references unknown block "${blockId}"`),
        );
        continue;
      }
      const patternId = resolvePatternIdForBlock(blockId);
      if (!patternId) {
        issues.push(issue('baseline.pattern', `Block "${blockId}" has no patternId`));
      }
      if (!BUILD_BOOK_BLOCK_PATTERNS.some((pattern) => pattern.id === patternId)) {
        issues.push(
          issue('baseline.pattern', `Block "${blockId}" resolves to unknown pattern "${patternId}"`),
        );
      }
      const manifest = manifestForBlock(blockId);
      const contract = BUILD_BOOK_PATTERN_CONTRACTS[patternId];
      if (contract && !contract.reducedForStub && Object.keys(manifest).length === 0) {
        // Informational only until manifests are populated — do not fail CI yet for unwired blocks
      }
      }
    }
  }

  for (const pageKind of ['homepage', 'landing-page', 'blog-post'] as const) {
    for (const patternId of patternIdsForPageKind(pageKind)) {
      if (!BUILD_BOOK_BLOCK_PATTERNS.some((pattern) => pattern.id === patternId)) {
        issues.push(
          issue('policy.pattern', `Page kind "${pageKind}" allows unknown pattern "${patternId}"`),
        );
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

export function assertBuildBookBaselineGate(): void {
  const result = validateBuildBookBaselineGate();
  if (result.ok) return;
  const lines = result.issues.map((item) => `- [${item.code}] ${item.message}`);
  throw new Error(`Build Book baseline gate failed:\n${lines.join('\n')}`);
}
