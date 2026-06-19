import type {
  ProtopipeInboundMessageLog,
  ProtopipeIntakeConversationStatus,
  ProtopipePendingConversation,
} from '@hive/contracts';
import type { Thought, ThoughtStatus, ThoughtStep, ThoughtStepStatus } from '../thinker/thought.model';

/**
 * Adapts an intake conversation (and the inbound message that triggered it)
 * into the Thinker `Thought` model so the existing run viewer renders a
 * conversation's ask -> wait -> answer -> resume timeline with zero new UI.
 * Each question becomes a step; conversation events become step/Thought events.
 */

function mapConversationStatus(status: ProtopipeIntakeConversationStatus): ThoughtStatus {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'in_progress':
      return 'running';
    case 'complete':
      return 'complete';
    case 'expired':
    case 'abandoned':
      return 'failed';
    default:
      return 'idle';
  }
}

function mapQuestionStatus(
  status: ProtopipePendingConversation['questions'][number]['status'],
): ThoughtStepStatus {
  switch (status) {
    case 'answered':
      return 'complete';
    case 'pending':
      return 'running';
    case 'expired':
      return 'failed';
    case 'skipped':
      return 'skipped';
    default:
      return 'pending';
  }
}

export function conversationToThought(conversation: ProtopipePendingConversation): Thought {
  const steps: ThoughtStep[] = conversation.questions.map((q) => ({
    id: `q${q.index}`,
    label: `Q${q.index + 1}: ${q.text}`,
    summary: q.answer ? `Answered: ${q.answer}` : `Awaiting reply (${q.answerShape})`,
    status: mapQuestionStatus(q.status),
    startedAt: q.sentAt,
    finishedAt: q.answeredAt,
    attempt: 1,
    events: conversation.events
      .filter((e) => e.questionIndex === q.index)
      .map((e) => ({
        at: e.at,
        level: e.type === 'error' || e.type === 'resume_failed' ? ('error' as const) : ('info' as const),
        message: e.detail ? `${e.type}: ${e.detail}` : e.type,
      })),
    output: q.answer
      ? [
          {
            id: `a${q.index}`,
            label: 'Answer',
            kind: q.mediaUrls && q.mediaUrls.length > 0 ? ('image' as const) : ('text' as const),
            data: q.mediaUrls && q.mediaUrls.length > 0 ? q.mediaUrls : q.answer,
            summary: q.answer,
          },
        ]
      : undefined,
  }));

  const currentStep = steps[conversation.currentQuestionIndex];

  return {
    id: conversation.id,
    thinkerKind: `intake:${conversation.triggerType}`,
    title: `${conversation.triggerType} — ${conversation.contactLabel ?? conversation.contactId}`,
    summary: conversation.resumeResult ?? conversation.resumeError ?? conversation.resumeTarget.label,
    status: mapConversationStatus(conversation.status),
    currentStepId: currentStep?.id,
    steps,
    inputs: [],
    outputs: conversation.resumeResult
      ? [{ portId: 'resume', label: 'Resume result', artifact: { id: 'resume', label: 'Resume', kind: 'text', data: conversation.resumeResult } }]
      : [],
    startedAt: conversation.createdAt,
    finishedAt: conversation.status === 'complete' ? conversation.updatedAt : undefined,
    totalCostUsd: conversation.estimatedCostUsd,
  };
}

/** Convenience: turn an inbound log row into a single-line event string. */
export function inboundMessageSummary(msg: ProtopipeInboundMessageLog): string {
  const outcome = msg.routingOutcome.replace(/_/g, ' ');
  return `${msg.from}: "${msg.body}" -> ${outcome}`;
}
