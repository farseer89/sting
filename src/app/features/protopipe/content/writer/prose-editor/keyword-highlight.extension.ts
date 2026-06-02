import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as ProseNode } from '@tiptap/pm/model';
import { buildFlatTextIndex, rangeFromFlatMatch } from './text-block-index';

export interface KeywordHighlightPluginState {
  keywords: string[];
}

export const keywordHighlightKey = new PluginKey<KeywordHighlightPluginState>(
  'protopipeKeywordHighlight',
);

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    protopipeKeywordHighlight: {
      setKeywords: (keywords: string[]) => ReturnType;
    };
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
    const flat = buildFlatTextIndex(node, pos);
    if (!flat.text) return;

    const claimed: Array<[number, number]> = [];
    for (const re of matchers) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(flat.text)) !== null) {
        const start = m.index;
        const end = start + m[0].length;
        if (claimed.some(([s, e]) => start < e && end > s)) continue;
        claimed.push([start, end]);
        const span = rangeFromFlatMatch(flat, start, m[0].length);
        if (!span) continue;
        decorations.push(
          Decoration.inline(span.from, span.to, {
            class: 'pw-kw-mark',
            title:
              'Intentional SEO keyword — safe to trim elsewhere, keep this phrase unless you mean to drop it',
            'data-kw-phrase': m[0],
          }),
        );
      }
    }
  });

  return decorations.length ? DecorationSet.create(doc, decorations) : DecorationSet.empty;
}

export const KeywordHighlight = Extension.create<unknown, KeywordHighlightPluginState>({
  name: 'protopipeKeywordHighlight',

  addStorage() {
    return { keywords: [] as string[] };
  },

  addCommands() {
    return {
      setKeywords:
        (keywords) =>
        ({ editor, tr, dispatch }) => {
          const list = (keywords ?? []).map((k) => k.trim()).filter(Boolean);
          editor.storage['protopipeKeywordHighlight'].keywords = list;
          if (dispatch) {
            tr.setMeta(keywordHighlightKey, { keywords: list });
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
        state: {
          init: (): KeywordHighlightPluginState => ({ keywords: [] }),
          apply(tr, value): KeywordHighlightPluginState {
            const meta = tr.getMeta(keywordHighlightKey) as KeywordHighlightPluginState | undefined;
            if (meta?.keywords) return meta;
            return value;
          },
        },
        props: {
          decorations(state) {
            const pluginKw = keywordHighlightKey.getState(state)?.keywords;
            const keywords = pluginKw ?? extension.storage.keywords;
            return buildDecorations(state.doc, keywords);
          },
        },
      }),
    ];
  },
});
