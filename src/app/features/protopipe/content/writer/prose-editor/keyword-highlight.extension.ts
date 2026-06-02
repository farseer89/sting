import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as ProseNode } from '@tiptap/pm/model';

export interface KeywordHighlightStorage {
  /** Lower-cased target phrases. Empty array = highlighting off. */
  keywords: string[];
}

export const keywordHighlightKey = new PluginKey('protopipeKeywordHighlight');

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    protopipeKeywordHighlight: {
      /** Replace the highlighted keyword set; pass [] to clear. */
      setKeywords: (keywords: string[]) => ReturnType;
    };
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build one case-insensitive, word-boundary regex per keyword phrase. Longer
 * phrases are matched first so a multi-word keyword wins over its component
 * words (handled by the caller sorting keywords by length desc).
 */
function buildMatchers(keywords: string[]): RegExp[] {
  return keywords
    .map((kw) => kw.trim())
    .filter(Boolean)
    .map((kw) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(kw)}(?![\\p{L}\\p{N}])`, 'giu'));
}

function buildDecorations(doc: ProseNode, keywords: string[]): DecorationSet {
  const matchers = buildMatchers(keywords);
  if (!matchers.length) return DecorationSet.empty;

  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return;
    const text = node.textContent;
    if (!text) return;
    const base = pos + 1;
    // Track claimed spans so overlapping keywords don't double-decorate.
    const claimed: Array<[number, number]> = [];
    for (const re of matchers) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const start = m.index;
        const end = start + m[0].length;
        if (claimed.some(([s, e]) => start < e && end > s)) continue;
        claimed.push([start, end]);
        decorations.push(
          Decoration.inline(base + start, base + end, { class: 'pw-kw-mark' }),
        );
      }
    }
  });

  return decorations.length ? DecorationSet.create(doc, decorations) : DecorationSet.empty;
}

/**
 * Subtly highlights the article's intentional SEO keywords inside the prose so
 * the writer can see which words are load-bearing before trimming text. Toggled
 * on/off from the writer's tool rail; the keyword list lives in editor storage.
 */
export const KeywordHighlight = Extension.create<unknown, KeywordHighlightStorage>({
  name: 'protopipeKeywordHighlight',

  addStorage() {
    return { keywords: [] };
  },

  addCommands() {
    return {
      setKeywords:
        (keywords) =>
        ({ editor, tr, dispatch }) => {
          editor.storage['protopipeKeywordHighlight'].keywords = (keywords ?? [])
            .map((k) => k.toLowerCase())
            .filter(Boolean);
          if (dispatch) {
            tr.setMeta(keywordHighlightKey, true);
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    return [
      new Plugin({
        key: keywordHighlightKey,
        props: {
          decorations(state) {
            return buildDecorations(state.doc, extension.storage.keywords);
          },
        },
      }),
    ];
  },
});
