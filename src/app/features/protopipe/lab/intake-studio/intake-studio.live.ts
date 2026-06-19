import type {
  ProtopipeInboundMessageLog,
  ProtopipePendingConversation,
} from '@hive/contracts';
import type { ConversationView, InboundMessageView } from './intake-view.model';

/**
 * Maps live @hive/contracts intake DTOs into the prototype's view models so the
 * existing components render real data unchanged. The view models were authored
 * to mirror the DTOs (Phase 0), so this is a thin, total mapping — the only
 * work is defaulting the few fields the UI treats as required.
 */

export function dtoToConversationView(dto: ProtopipePendingConversation): ConversationView {
  return {
    id: dto.id,
    contactId: dto.contactId,
    contactLabel: dto.contactLabel ?? dto.contactId,
    triggerType: dto.triggerType,
    blocking: dto.blocking,
    resumeTarget: {
      type: dto.resumeTarget.type,
      id: dto.resumeTarget.id,
      label: dto.resumeTarget.label ?? dto.resumeTarget.id,
    },
    status: dto.status,
    currentQuestionIndex: dto.currentQuestionIndex,
    questions: dto.questions.map((q) => ({
      index: q.index,
      text: q.text,
      answerShape: q.answerShape,
      choices: q.choices,
      channel: q.channel,
      status: q.status,
      sentAt: q.sentAt,
      expiresAt: q.expiresAt,
      answer: q.answer,
      mediaUrls: q.mediaUrls,
      answeredAt: q.answeredAt,
    })),
    events: dto.events.map((e) => ({
      type: e.type,
      at: e.at,
      questionIndex: e.questionIndex,
      detail: e.detail,
    })),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    resumeResult: dto.resumeResult,
    resumeError: dto.resumeError,
  };
}

export function dtoToInboundView(dto: ProtopipeInboundMessageLog): InboundMessageView {
  return {
    id: dto.id,
    contactId: dto.contactId,
    contactLabel: dto.contactLabel ?? dto.contactId,
    from: dto.from,
    body: dto.body,
    mediaUrls: dto.mediaUrls,
    receivedAt: dto.receivedAt,
    routingOutcome: dto.routingOutcome,
    matchedConversationId: dto.matchedConversationId,
    matchedQuestionIndex: dto.matchedQuestionIndex,
    extractedEntities: dto.extractedEntities,
    projectMatchResult: dto.projectMatchResult,
    recordsCreated: dto.recordsCreated?.map((r) => ({
      type: r.type,
      id: r.id,
      label: r.label ?? r.id,
    })),
    processingMs: dto.processingMs,
    error: dto.error,
  };
}
