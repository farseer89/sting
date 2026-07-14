/**
 * Lightweight markdown → safe HTML for read-only Build Book / Blog Preview bodies.
 * Escapes all text; only emits a small allowlist of tags.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMarkdown(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/_([^_]+)_/g, '<em>$1</em>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  return out;
}

function normalizeHeadingText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Remove a leading ATX heading from body when it duplicates the block heading prop.
 */
export function stripLeadingMarkdownHeading(body: string, heading?: string): string {
  const trimmed = body.replace(/^\uFEFF/, '').trimStart();
  if (!trimmed) return '';

  const match = trimmed.match(/^(#{1,6})\s+(.+?)(?:\n+|$)/);
  if (!match) return body.trim();

  const headingText = match[2].trim();
  const wanted = heading?.trim();
  if (wanted && normalizeHeadingText(headingText) === normalizeHeadingText(wanted)) {
    return trimmed.slice(match[0].length).trimStart();
  }

  // Always drop a leading H1/H2 that is clearly a section title when a heading prop exists.
  if (wanted && match[1].length <= 2) {
    return trimmed.slice(match[0].length).trimStart();
  }

  return body.trim();
}

/**
 * Convert common article markdown into safe HTML for preview.
 */
export function markdownToPreviewHtml(raw: string): string {
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!text) return '';

  const lines = text.split('\n');
  const parts: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = Math.min(Math.max(heading[1].length, 3), 4);
      parts.push(`<h${level}>${inlineMarkdown(heading[2].trim())}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        const item = lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, '');
        items.push(`<li>${inlineMarkdown(item.trim())}</li>`);
        i += 1;
      }
      parts.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s+/.test(lines[i]) && !/^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
      para.push(lines[i].trim());
      i += 1;
    }
    parts.push(`<p>${inlineMarkdown(para.join(' '))}</p>`);
  }

  return parts.join('');
}
