/**
 * Pure, framework-free helpers for the Intake Studio prototype. Kept separate
 * from the component so they can be unit-tested without mounting Angular.
 */

import type {
  ConversationQuestionView,
  ConversationView,
  IntakeChannel,
  IntakeRoutingOutcome,
  IntakeTriggerType,
} from './intake-view.model';

/**
 * Priority stack for open conversations. Lower number = higher priority.
 * Blocking fact_check first, then the rest by trigger urgency. Mirrors the
 * "only the top open conversation gets the next reply" rule.
 */
const TRIGGER_PRIORITY: Record<IntakeTriggerType, number> = {
  fact_check: 0,
  article_review: 1,
  project_match: 2,
  journalist: 3,
  onboarding: 4,
};

export function conversationPriority(c: Pick<ConversationView, 'triggerType' | 'blocking'>): number {
  // Blocking always wins regardless of trigger type.
  const base = TRIGGER_PRIORITY[c.triggerType] ?? 99;
  return c.blocking ? base - 0.5 : base;
}

/**
 * Sort open conversations: highest priority first, then oldest (most-aged)
 * first within the same priority so stale items surface.
 */
export function sortOpenConversations(conversations: ConversationView[]): ConversationView[] {
  return [...conversations].sort((a, b) => {
    const pa = conversationPriority(a);
    const pb = conversationPriority(b);
    if (pa !== pb) return pa - pb;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

const OPEN_STATUSES = new Set(['pending', 'in_progress']);

export function isOpenConversation(c: ConversationView): boolean {
  return OPEN_STATUSES.has(c.status);
}

/**
 * Human-friendly expiry countdown. Negative durations render as "expired".
 * Deterministic given an explicit `now` for testability.
 */
export function formatExpiry(expiresAt: string, now: Date = new Date()): string {
  const ms = new Date(expiresAt).getTime() - now.getTime();
  if (Number.isNaN(ms)) return 'unknown';
  if (ms <= 0) return 'expired';

  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m left`;

  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h left`;

  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

/** Relative age label, e.g. "3d ago". Deterministic given `now`. */
export function formatAge(createdAt: string, now: Date = new Date()): string {
  const ms = now.getTime() - new Date(createdAt).getTime();
  if (Number.isNaN(ms) || ms < 0) return 'just now';

  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export interface RoutingBadge {
  label: string;
  tone: 'good' | 'info' | 'warn' | 'error';
}

export function routingBadge(outcome: IntakeRoutingOutcome): RoutingBadge {
  switch (outcome) {
    case 'matched_conversation':
      return { label: 'Matched question', tone: 'good' };
    case 'intake_parsed':
      return { label: 'Parsed as update', tone: 'info' };
    case 'no_match':
      return { label: 'No match', tone: 'warn' };
    case 'error':
      return { label: 'Error', tone: 'error' };
    default:
      return { label: outcome, tone: 'info' };
  }
}

export const TRIGGER_LABELS: Record<IntakeTriggerType, string> = {
  project_match: 'Project match',
  fact_check: 'Fact check',
  journalist: 'Journalist',
  onboarding: 'Onboarding',
  article_review: 'Article review',
};

/**
 * Render a question for a specific channel. This is the proof of the
 * channel-agnostic core: the same question object renders as a numbered SMS
 * body or as in-app tappable options without the asker knowing the channel.
 */
export interface RenderedQuestion {
  channel: IntakeChannel;
  /** Full text the contact sees (SMS body, or in-app prompt). */
  prompt: string;
  /** Tappable options for in-app; numbered hints for SMS. Empty for free text. */
  options: string[];
  /** Short hint about how to answer. */
  replyHint: string;
}

export function renderQuestionForChannel(
  question: Pick<ConversationQuestionView, 'text' | 'answerShape' | 'choices'>,
  channel: IntakeChannel,
): RenderedQuestion {
  const choices = question.choices ?? [];

  if (channel === 'sms') {
    switch (question.answerShape) {
      case 'multiple_choice': {
        const numbered = choices.map((c, i) => `${i + 1}. ${c}`);
        return {
          channel,
          prompt: `${question.text}\n${numbered.join('\n')}`,
          options: numbered,
          replyHint: `Reply ${choices.map((_, i) => i + 1).join(', ')}`,
        };
      }
      case 'yes_no':
        return {
          channel,
          prompt: `${question.text}\nReply Y or N`,
          options: ['Y', 'N'],
          replyHint: 'Reply Y or N',
        };
      case 'photo':
        return {
          channel,
          prompt: `${question.text}\nText a photo back`,
          options: [],
          replyHint: 'Send a photo',
        };
      default:
        return {
          channel,
          prompt: question.text,
          options: [],
          replyHint: 'Reply with a text message',
        };
    }
  }

  // in_app
  switch (question.answerShape) {
    case 'multiple_choice':
      return {
        channel,
        prompt: question.text,
        options: choices,
        replyHint: 'Tap an option',
      };
    case 'yes_no':
      return {
        channel,
        prompt: question.text,
        options: ['Yes', 'No'],
        replyHint: 'Tap Yes or No',
      };
    case 'photo':
      return {
        channel,
        prompt: question.text,
        options: [],
        replyHint: 'Attach a photo',
      };
    default:
      return {
        channel,
        prompt: question.text,
        options: [],
        replyHint: 'Type your answer',
      };
  }
}

/**
 * Count unconfirmed AI-provenance claims for an article. Drives the publish-gate
 * banner: a draft cannot publish while this is greater than zero.
 */
export function unconfirmedAiClaimCount(
  claims: { provenance: 'client' | 'ai'; status: string }[],
): number {
  return claims.filter((c) => c.provenance === 'ai' && c.status === 'pending').length;
}
