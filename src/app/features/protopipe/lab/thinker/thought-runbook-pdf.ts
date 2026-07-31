import type { Thought, ThoughtArtifact, ThoughtStep } from './thought.model';

export interface RunbookExportMeta {
  runId?: string;
  siteId?: string;
  exportedAt?: Date;
}

const MARGIN = 48;
const PAGE_W = 612; // letter
const PAGE_H = 792;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BODY_SIZE = 9;
const MONO_SIZE = 8;
const HEADING_SIZE = 13;
const SUBHEAD_SIZE = 11;
const LINE_H = 11;
const MONO_LINE_H = 10;
/** Cap a single artifact block so one bad blob cannot freeze the browser. */
const MAX_ARTIFACT_CHARS = 48_000;

export function buildRunbookFilename(thought: Thought, runId?: string): string {
  const slug = thought.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  const idPart = (runId ?? thought.id).slice(-8);
  const date = new Date().toISOString().slice(0, 10);
  return `runbook-${slug || 'article'}-${idPart}-${date}.pdf`;
}

export function artifactToRunbookText(artifact: ThoughtArtifact): string {
  const header = [`=== ${artifact.label} (${artifact.kind}) ===`];
  if (artifact.summary?.trim()) {
    header.push(`Summary: ${artifact.summary.trim()}`);
  }
  header.push('');

  switch (artifact.kind) {
    case 'markdown':
    case 'text':
      return [...header, String(artifact.data ?? '')].join('\n');
    case 'metric': {
      const m = artifact.data as { value?: unknown; unit?: string; delta?: string };
      const parts = [`Value: ${m?.value ?? '—'}`];
      if (m?.unit) parts.push(`Unit: ${m.unit}`);
      if (m?.delta) parts.push(`Delta: ${m.delta}`);
      return [...header, ...parts].join('\n');
    }
    case 'table': {
      const t = artifact.data as { columns?: string[]; rows?: string[][] };
      const cols = t?.columns ?? [];
      const rows = t?.rows ?? [];
      const lines = [cols.join(' | ')];
      for (const row of rows) {
        lines.push(row.join(' | '));
      }
      return [...header, ...lines].join('\n');
    }
    case 'image': {
      const img = artifact.data as { url?: string; alt?: string; prompt?: string };
      const lines = [];
      if (img?.url) lines.push(`Image URL: ${img.url}`);
      if (img?.alt) lines.push(`Alt: ${img.alt}`);
      if (img?.prompt) lines.push(`Prompt: ${img.prompt}`);
      return [...header, ...lines].join('\n');
    }
    case 'json':
    default:
      try {
        return [...header, JSON.stringify(artifact.data, null, 2)].join('\n');
      } catch {
        return [...header, String(artifact.data)].join('\n');
      }
  }
}

function truncateArtifactText(text: string): string {
  if (text.length <= MAX_ARTIFACT_CHARS) return text;
  return `${text.slice(0, MAX_ARTIFACT_CHARS)}\n\n… [truncated — open Thinker for the full artifact]`;
}

function formatTimestamp(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatDuration(ms?: number): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

function statusTag(status: string): string {
  return `[${status.toUpperCase()}]`;
}

type PdfWriter = {
  doc: import('jspdf').default;
  y: number;
  page: number;
};

function newPage(w: PdfWriter): void {
  w.doc.addPage();
  w.page += 1;
  w.y = MARGIN;
  w.doc.setFont('helvetica', 'normal');
  w.doc.setFontSize(BODY_SIZE);
  w.doc.setTextColor(80, 80, 80);
  w.doc.text(`Runbook · page ${w.page}`, PAGE_W - MARGIN, 28, { align: 'right' });
  w.doc.setTextColor(0, 0, 0);
  w.y = MARGIN + 8;
}

function ensureSpace(w: PdfWriter, needed: number): void {
  if (w.y + needed > PAGE_H - MARGIN) {
    newPage(w);
  }
}

function writeLines(w: PdfWriter, lines: string[], font: 'helvetica' | 'courier', size: number, lineHeight: number): void {
  w.doc.setFont(font, 'normal');
  w.doc.setFontSize(size);
  for (const line of lines) {
    ensureSpace(w, lineHeight);
    w.doc.text(line, MARGIN, w.y);
    w.y += lineHeight;
  }
}

function writeWrapped(w: PdfWriter, text: string, font: 'helvetica' | 'courier', size: number, lineHeight: number): void {
  w.doc.setFont(font, 'normal');
  w.doc.setFontSize(size);
  const lines = w.doc.splitTextToSize(text, CONTENT_W) as string[];
  writeLines(w, lines, font, size, lineHeight);
}

function writeHeading(w: PdfWriter, text: string, size = HEADING_SIZE): void {
  ensureSpace(w, size + 12);
  w.doc.setFont('helvetica', 'bold');
  w.doc.setFontSize(size);
  w.doc.text(text, MARGIN, w.y);
  w.y += size + 6;
}

function writeSubheading(w: PdfWriter, text: string): void {
  ensureSpace(w, SUBHEAD_SIZE + 8);
  w.doc.setFont('helvetica', 'bold');
  w.doc.setFontSize(SUBHEAD_SIZE);
  w.doc.text(text, MARGIN, w.y);
  w.y += SUBHEAD_SIZE + 4;
}

function writeParagraph(w: PdfWriter, text: string): void {
  w.y += 4;
  writeWrapped(w, text, 'helvetica', BODY_SIZE, LINE_H);
  w.y += 6;
}

function writeStepSection(w: PdfWriter, step: ThoughtStep, index: number, total: number): void {
  newPage(w);
  writeHeading(w, `Step ${index + 1} of ${total}: ${step.label}`);
  writeParagraph(
    w,
    `${statusTag(step.status)}  Duration: ${formatDuration(step.durationMs)}  Attempt: ${step.attempt}`,
  );
  if (step.promptVersion) {
    writeParagraph(w, `Prompt: ${step.promptVersion}`);
  }
  if (step.startedAt || step.finishedAt) {
    writeParagraph(
      w,
      `Started: ${formatTimestamp(step.startedAt)}   Finished: ${formatTimestamp(step.finishedAt)}`,
    );
  }
  if (step.summary?.trim()) {
    writeSubheading(w, 'Summary');
    writeParagraph(w, step.summary.trim());
  }
  if (step.description?.trim()) {
    writeSubheading(w, 'Description');
    writeParagraph(w, step.description.trim());
  }
  if (step.error?.message) {
    writeSubheading(w, 'Error');
    writeParagraph(w, step.error.message);
    if (step.error.stack?.trim()) {
      writeWrapped(w, step.error.stack.trim(), 'courier', MONO_SIZE, MONO_LINE_H);
    }
  }

  if (step.input?.length) {
    writeSubheading(w, 'Input');
    for (const artifact of step.input) {
      w.y += 4;
      writeWrapped(w, truncateArtifactText(artifactToRunbookText(artifact)), 'courier', MONO_SIZE, MONO_LINE_H);
      w.y += 8;
    }
  }

  if (step.output?.length) {
    writeSubheading(w, 'Output');
    for (const artifact of step.output) {
      w.y += 4;
      writeWrapped(w, truncateArtifactText(artifactToRunbookText(artifact)), 'courier', MONO_SIZE, MONO_LINE_H);
      w.y += 8;
    }
  } else if (step.status === 'pending' || step.status === 'running') {
    writeSubheading(w, 'Output');
    writeParagraph(w, step.status === 'running' ? 'In progress…' : 'Not started.');
  } else {
    writeSubheading(w, 'Output');
    writeParagraph(w, 'No output recorded for this step.');
  }

  if (step.events.length) {
    writeSubheading(w, 'Events');
    for (const e of step.events) {
      writeWrapped(
        w,
        `${formatTimestamp(e.at)} [${e.level}] ${e.message}`,
        'helvetica',
        BODY_SIZE,
        LINE_H,
      );
    }
  }

  if (step.llmCalls?.length) {
    writeSubheading(w, 'LLM calls');
    for (const call of step.llmCalls) {
      const meta = [
        call.model,
        call.promptVersion,
        call.inputTokens != null ? `${call.inputTokens} in` : null,
        call.outputTokens != null ? `${call.outputTokens} out` : null,
        call.durationMs != null ? formatDuration(call.durationMs) : null,
      ]
        .filter(Boolean)
        .join(' · ');
      writeParagraph(w, `${call.label}${meta ? ` (${meta})` : ''}`);
      writeSubheading(w, 'System prompt');
      writeWrapped(w, truncateArtifactText(call.system), 'courier', MONO_SIZE, MONO_LINE_H);
      w.y += 6;
      writeSubheading(w, 'User prompt');
      writeWrapped(w, truncateArtifactText(call.user), 'courier', MONO_SIZE, MONO_LINE_H);
      w.y += 6;
      writeSubheading(w, 'Model response');
      writeWrapped(w, truncateArtifactText(call.response), 'courier', MONO_SIZE, MONO_LINE_H);
      w.y += 10;
    }
  }
}

function writeFinalDeliverables(w: PdfWriter, thought: Thought): void {
  newPage(w);
  writeHeading(w, 'Final deliverables');

  if (thought.outputs.length) {
    writeSubheading(w, 'Run outputs');
    for (const port of thought.outputs) {
      writeParagraph(w, port.label);
      if (port.artifact) {
        writeWrapped(w, truncateArtifactText(artifactToRunbookText(port.artifact)), 'courier', MONO_SIZE, MONO_LINE_H);
      } else {
        writeParagraph(w, 'No artifact attached.');
      }
      w.y += 6;
    }
  }

  if (thought.thinkerKind === 'mention_tracking') {
    const snapshot = thought.outputs.find((port) => port.portId === 'snapshot')?.artifact?.data as
      | { summaryByType?: Record<string, { mentionRate?: number; topGap?: string }> }
      | undefined;
    if (snapshot?.summaryByType) {
      writeSubheading(w, 'Visibility summary');
      for (const [type, summary] of Object.entries(snapshot.summaryByType)) {
        const rate =
          summary.mentionRate != null
            ? `${Math.round(summary.mentionRate * 100)}% mention rate`
            : '—';
        const gap = summary.topGap ? ` · gap: ${summary.topGap}` : '';
        writeParagraph(w, `${type}: ${rate}${gap}`);
      }
    }
    return;
  }

  const assemble = thought.steps.find((s) => s.id === 'assemble');
  const draft = thought.steps.find((s) => s.id === 'draft');
  const review = thought.steps.find((s) => s.id === 'review');
  const synthesis = thought.steps.find((s) => s.id === 'train:synthesis');

  if (synthesis?.output?.length) {
    writeSubheading(w, 'Master synthesis');
    for (const artifact of synthesis.output) {
      writeWrapped(w, truncateArtifactText(artifactToRunbookText(artifact)), 'courier', MONO_SIZE, MONO_LINE_H);
      w.y += 6;
    }
  }

  if (review?.output?.length) {
    writeSubheading(w, 'Quality review');
    for (const artifact of review.output) {
      writeWrapped(w, truncateArtifactText(artifactToRunbookText(artifact)), 'courier', MONO_SIZE, MONO_LINE_H);
      w.y += 6;
    }
  }

  if (draft?.output?.length) {
    writeSubheading(w, 'Draft prose');
    for (const artifact of draft.output) {
      writeWrapped(w, truncateArtifactText(artifactToRunbookText(artifact)), 'courier', MONO_SIZE, MONO_LINE_H);
      w.y += 6;
    }
  }

  if (assemble?.output?.length) {
    writeSubheading(w, 'Assembled article');
    for (const artifact of assemble.output) {
      writeWrapped(w, truncateArtifactText(artifactToRunbookText(artifact)), 'courier', MONO_SIZE, MONO_LINE_H);
      w.y += 6;
    }
  }
}

function writeTableOfContents(w: PdfWriter, thought: Thought): void {
  writeSubheading(w, 'Steps in this run');
  thought.steps.forEach((step, i) => {
    const line = `${String(i + 1).padStart(2, '0')}. ${step.label} — ${step.status}${step.summary ? `: ${step.summary}` : ''}`;
    writeWrapped(w, line, 'helvetica', BODY_SIZE, LINE_H);
  });
}

/** Build and download a PDF runbook for a Thought (full step log + final deliverables). */
export async function exportThoughtRunbookPdf(
  thought: Thought,
  meta: RunbookExportMeta = {},
): Promise<void> {
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default;
  const exportedAt = meta.exportedAt ?? new Date();

  const doc = new jsPDF('p', 'pt', 'letter');
  const w: PdfWriter = { doc, y: MARGIN, page: 1 };

  // Cover
  const coverTitle =
    thought.thinkerKind === 'content-plan'
      ? 'Strategy Runbook'
      : thought.thinkerKind === 'mention_tracking'
        ? 'AI Mentions Runbook'
        : 'Article Runbook';
  writeHeading(w, coverTitle, 20);
  writeParagraph(w, thought.title);
  if (thought.summary) writeParagraph(w, thought.summary);
  writeParagraph(w, `Status: ${thought.status.toUpperCase()}`);
  writeParagraph(w, `Started: ${formatTimestamp(thought.startedAt)}`);
  writeParagraph(w, `Finished: ${formatTimestamp(thought.finishedAt)}`);
  writeParagraph(w, `Exported: ${exportedAt.toLocaleString()}`);
  if (meta.runId) writeParagraph(w, `Run ID: ${meta.runId}`);
  if (meta.siteId) writeParagraph(w, `Site ID: ${meta.siteId}`);
  writeParagraph(w, `${thought.steps.length} steps recorded in this run.`);

  writeTableOfContents(w, thought);

  for (let i = 0; i < thought.steps.length; i++) {
    writeStepSection(w, thought.steps[i], i, thought.steps.length);
  }

  writeFinalDeliverables(w, thought);

  doc.save(buildRunbookFilename(thought, meta.runId));
}
