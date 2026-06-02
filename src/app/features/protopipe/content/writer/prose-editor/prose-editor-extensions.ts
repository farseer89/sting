import { Extension, type Extensions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';

export interface ProseExtensionOptions {
  placeholder?: string;
  /** Extra TipTap extensions (e.g. fact highlight, slash, bubble menu). */
  extra?: Extensions;
}

/**
 * The constrained editor schema for article body/intro prose. Deliberately
 * narrow so it round-trips cleanly to the markdown subset the publish pipeline
 * (`renderBodyMarkdownFromTemplate`) and the LLM draft step emit:
 * paragraphs, bold, italic, inline code, bullet/ordered lists, blockquote,
 * links, and hard breaks. No headings (the H2 is edited outside the editor),
 * no code blocks, no horizontal rules, and never raw HTML.
 */
export function buildProseExtensions(options: ProseExtensionOptions = {}): Extensions {
  const { placeholder, extra = [] } = options;

  return [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      horizontalRule: false,
    }),
    Link.configure({
      openOnClick: false,
      autolink: false,
      HTMLAttributes: { rel: 'noopener', target: null },
    }),
    Placeholder.configure({
      placeholder: placeholder ?? '',
      showOnlyWhenEditable: true,
    }),
    Markdown.configure({
      html: false,
      tightLists: true,
      bulletListMarker: '-',
      linkify: false,
      breaks: false,
      transformPastedText: true,
      transformCopiedText: true,
    }),
    ...extra,
  ];
}

/**
 * Helper extension placeholder kept for symmetry; lets callers add a no-op
 * extension when composing optional features conditionally.
 */
export const NoopExtension = Extension.create({ name: 'protopipeNoop' });
