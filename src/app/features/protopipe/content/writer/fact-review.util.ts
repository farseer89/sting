import type {
  ArticleGenerationContentTarget,
  ArticleGenerationFlaggedFact,
  ProtopipeContentTemplate,
} from '@hive/contracts';
import { claimAppearsInText } from './prose-editor/claim-match';

/** Match bagend `hashContentField` (sha256 hex, first 16 chars). */
export async function hashContentFieldAsync(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

export function hashCacheKey(target: ArticleGenerationContentTarget): string {
  return target.kind === 'intro' ? 'intro' : `section:${target.index}`;
}

export function bodyForTarget(
  template: ProtopipeContentTemplate,
  target: ArticleGenerationContentTarget,
): string {
  if (target.kind === 'intro') return template.intro ?? '';
  return template.sections[target.index]?.body ?? '';
}

/** Legacy drafted-array index → writer target (assemble layout). */
export function draftedSectionIndexToTarget(sectionIndex: number): ArticleGenerationContentTarget {
  if (sectionIndex <= 0) return { kind: 'intro' };
  return { kind: 'section', index: sectionIndex - 1 };
}

export function resolveFactTarget(fact: ArticleGenerationFlaggedFact): ArticleGenerationContentTarget {
  if (fact.target) return fact.target;
  return draftedSectionIndexToTarget(fact.sectionIndex);
}

export async function templateContentFingerprint(
  template: ProtopipeContentTemplate,
): Promise<string> {
  const payload = {
    intro: template.intro ?? '',
    sections: (template.sections ?? []).map((s) => ({
      h2: s.h2 ?? '',
      body: s.body ?? '',
    })),
  };
  return hashContentFieldAsync(JSON.stringify(payload));
}

export interface FactEnrichment {
  stale: boolean;
  addressedInText: boolean;
  offsetsReliable: boolean;
}

export function enrichFact(
  fact: ArticleGenerationFlaggedFact,
  template: ProtopipeContentTemplate | null | undefined,
  bodyHashes: Record<string, string>,
): FactEnrichment {
  if (!template) {
    return { stale: false, addressedInText: false, offsetsReliable: false };
  }
  const target = resolveFactTarget(fact);
  const body = bodyForTarget(template, target);
  const currentHash = bodyHashes[hashCacheKey(target)];
  const addressedInText = !claimAppearsInText(fact.claim, body);
  const stale = Boolean(
    fact.contentHash && currentHash && fact.contentHash !== currentHash && !addressedInText,
  );
  const offsetsReliable =
    !stale &&
    Boolean(fact.contentHash && currentHash && fact.contentHash === currentHash) &&
    typeof fact.claimStart === 'number' &&
    typeof fact.claimEnd === 'number';
  return { stale, addressedInText, offsetsReliable };
}
