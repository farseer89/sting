import type { BuildBookBlockInstance } from './build-book.types';

export interface BaselineNavEntry {
  key: string;
  type: 'hero-unit' | 'single';
  blocks: BuildBookBlockInstance[];
}

const HERO_BLOCK_ID = 'wri-baseline-hero-life-proof';
const CONTRACT_BLOCK_ID = 'wri-baseline-contract-bar';

export function baselineNavEntriesFromBlocks(blocks: BuildBookBlockInstance[]): BaselineNavEntry[] {
  const entries: BaselineNavEntry[] = [];
  let index = 0;

  while (index < blocks.length) {
    const block = blocks[index];
    const next = blocks[index + 1];
    if (block.blockId === HERO_BLOCK_ID && next?.blockId === CONTRACT_BLOCK_ID) {
      entries.push({
        key: `hero-unit:${block.id}`,
        type: 'hero-unit',
        blocks: [block, next],
      });
      index += 2;
      continue;
    }

    entries.push({ key: block.id, type: 'single', blocks: [block] });
    index += 1;
  }

  return entries;
}

export function blocksFromBaselineNavEntries(entries: BaselineNavEntry[]): BuildBookBlockInstance[] {
  return entries.flatMap((entry) => entry.blocks);
}

export function normalizeHeroContractPair(blocks: BuildBookBlockInstance[]): BuildBookBlockInstance[] {
  const heroIndex = blocks.findIndex((block) => block.blockId === HERO_BLOCK_ID);
  const contractIndex = blocks.findIndex((block) => block.blockId === CONTRACT_BLOCK_ID);
  if (heroIndex < 0 || contractIndex < 0 || contractIndex === heroIndex + 1) {
    return blocks.map((block, order) => ({ ...block, order }));
  }

  const contract = blocks[contractIndex];
  const next = blocks.filter((_, index) => index !== contractIndex);
  const heroIndexAfter = next.findIndex((block) => block.blockId === HERO_BLOCK_ID);
  next.splice(heroIndexAfter + 1, 0, contract);
  return next.map((block, order) => ({ ...block, order }));
}
