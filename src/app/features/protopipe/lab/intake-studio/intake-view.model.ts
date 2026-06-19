/**
 * UI-only view models for the Intake Studio prototype (Phase 0).
 *
 * These intentionally mirror the shape that the real `@hive/contracts`
 * `protopipe/intake` DTOs will take (PendingConversation, ConversationQuestion,
 * ConversationEvent, InboundMessageLog) so the later live adapter can target the
 * same components without a UI rewrite. No HTTP — fed by in-file fixtures.
 */

export type IntakeTriggerType =
  | 'project_match'
  | 'fact_check'
  | 'journalist'
  | 'onboarding'
  | 'article_review';

export type IntakeChannel = 'sms' | 'in_app';

export type IntakeAnswerShape = 'free_text' | 'yes_no' | 'multiple_choice' | 'photo';

export type IntakeQuestionStatus = 'pending' | 'answered' | 'expired' | 'skipped';

export type IntakeConversationStatus =
  | 'pending'
  | 'in_progress'
  | 'complete'
  | 'expired'
  | 'abandoned';

export type IntakeRoutingOutcome =
  | 'matched_conversation'
  | 'intake_parsed'
  | 'no_match'
  | 'error';

export type IntakeEventType =
  | 'triggered'
  | 'question_sent'
  | 'answer_received'
  | 'question_expired'
  | 'conversation_complete'
  | 'resume_executed'
  | 'resume_failed'
  | 'error';

export type ClaimProvenance = 'client' | 'ai';

export type ClaimStatus = 'pending' | 'answered' | 'skipped' | 'dismissed';

/** A pointer back to whatever the conversation resumes when answered. */
export interface ResumeTargetView {
  type: 'claim' | 'article' | 'project' | 'site';
  id: string;
  label: string;
}

export interface ConversationQuestionView {
  index: number;
  text: string;
  answerShape: IntakeAnswerShape;
  /** Present when answerShape is multiple_choice. */
  choices?: string[];
  channel: IntakeChannel;
  status: IntakeQuestionStatus;
  sentAt: string;
  expiresAt: string;
  answer?: string;
  mediaUrls?: string[];
  answeredAt?: string;
}

export interface ConversationEventView {
  type: IntakeEventType;
  at: string;
  questionIndex?: number;
  detail?: string;
}

export interface ConversationView {
  id: string;
  contactId: string;
  contactLabel: string;
  triggerType: IntakeTriggerType;
  /** Hard publish gate when true (fact_check). */
  blocking: boolean;
  resumeTarget: ResumeTargetView;
  status: IntakeConversationStatus;
  currentQuestionIndex: number;
  questions: ConversationQuestionView[];
  events: ConversationEventView[];
  createdAt: string;
  updatedAt: string;
  resumeResult?: string;
  resumeError?: string;
}

export interface ExtractedEntitiesView {
  projectCodes?: string[];
  entityNames?: string[];
  updateType?: string;
  confidence?: number;
}

export interface RecordCreatedView {
  type: 'project' | 'update' | 'time_entry' | 'asset' | 'claim';
  id: string;
  label: string;
}

export interface InboundMessageView {
  id: string;
  contactId: string;
  contactLabel: string;
  from: string;
  body: string;
  mediaUrls?: string[];
  receivedAt: string;
  routingOutcome: IntakeRoutingOutcome;
  matchedConversationId?: string;
  matchedQuestionIndex?: number;
  extractedEntities?: ExtractedEntitiesView;
  projectMatchResult?: 'auto_matched' | 'ambiguous_spawned_question' | 'no_match';
  recordsCreated?: RecordCreatedView[];
  processingMs?: number;
  error?: string;
}

export interface ClaimView {
  id: string;
  articleId: string;
  claimText: string;
  provenance: ClaimProvenance;
  status: ClaimStatus;
  /** What the client confirmed (or corrected) the claim to. */
  answerValue?: string;
  correctedFrom?: string;
  /** Conversation that was opened to verify this claim, if any. */
  conversationId?: string;
}

export interface ArticleClaimsView {
  articleId: string;
  articleTitle: string;
  claims: ClaimView[];
}
