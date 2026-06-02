import type { Node as ProseNode } from '@tiptap/pm/model';

export interface FlatTextIndex {
  text: string;
  /** flatText[i] → document position */
  posAt: number[];
}

/** Map inline text nodes in a textblock to absolute document positions. */
export function buildFlatTextIndex(block: ProseNode, blockPos: number): FlatTextIndex {
  const posAt: number[] = [];
  let text = '';

  block.forEach((child, offset) => {
    if (!child.isText) return;
    const chunk = child.text ?? '';
    for (let i = 0; i < chunk.length; i++) {
      text += chunk[i]!;
      posAt.push(blockPos + 1 + offset + i);
    }
  });

  return { text, posAt };
}

export function rangeFromFlatMatch(
  index: FlatTextIndex,
  start: number,
  length: number,
): { from: number; to: number } | null {
  if (length <= 0 || start < 0 || start + length > index.text.length) return null;
  const from = index.posAt[start];
  const toPos = index.posAt[start + length - 1];
  if (from === undefined || toPos === undefined) return null;
  return { from, to: toPos + 1 };
}
