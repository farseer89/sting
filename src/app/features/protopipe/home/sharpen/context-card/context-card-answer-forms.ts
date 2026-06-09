import type {
  ProtopipeContextCard,
  ProtopipeContextCardTopic,
} from '@hive/contracts';

export type ContextCardFormFieldType = 'text' | 'number' | 'textarea' | 'select';

export type ClaimVerdict = 'accurate' | 'correct' | 'not_true';

export interface ContextCardFormFieldOption {
  value: string;
  label: string;
}

export interface ContextCardFormField {
  key: string;
  label: string;
  type: ContextCardFormFieldType;
  placeholder?: string;
  required?: boolean;
  options?: ContextCardFormFieldOption[];
  rows?: number;
}

export type ContextCardAnswerDraft = Record<string, string>;

export interface ComposeAnswerResult {
  value: string | null;
  fieldErrors: Record<string, string>;
}

const CREDENTIAL_TYPE_OPTIONS: ContextCardFormFieldOption[] = [
  { value: 'license', label: 'License' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'certification', label: 'Certification' },
  { value: 'bond', label: 'Bond' },
];

const CREDENTIAL_TYPE_LABELS: Record<string, string> = {
  license: 'Contractor license',
  insurance: 'Insurance',
  certification: 'Certification',
  bond: 'Bond',
};

function cardTextLower(card: ProtopipeContextCard): string {
  return card.cardText.toLowerCase();
}

/** Resolve topic using card metadata plus light cardText heuristics. */
export function effectiveTopic(card: ProtopipeContextCard): ProtopipeContextCardTopic {
  if (card.type === 'claim') return card.topic;

  if (card.topic !== 'other') return card.topic;

  const text = cardTextLower(card);
  if (text.includes('license') || text.includes('credential') || text.includes('insured')) {
    return 'credentials';
  }
  if (text.includes('price') || text.includes('cost') || text.includes('rate') || text.includes('charge')) {
    return 'pricing';
  }
  if (text.includes('permit') || text.includes('code') || text.includes('regulat')) {
    return 'regulations';
  }
  if (text.includes('area') || text.includes('location') || text.includes('city') || text.includes('serve')) {
    return 'service_area';
  }
  if (text.includes('process') || text.includes('timeline') || text.includes('how long')) {
    return 'process';
  }
  return card.topic;
}

function geoPlaceholder(base: string, card: ProtopipeContextCard): string {
  if (!card.geoSignal) return base;
  return base;
}

function pricingFields(card: ProtopipeContextCard): ContextCardFormField[] {
  return [
    {
      key: 'service',
      label: 'Service or item',
      type: 'text',
      placeholder: geoPlaceholder('e.g. Panel upgrade', card),
      required: true,
    },
    {
      key: 'lowPrice',
      label: 'Low price ($)',
      type: 'number',
      placeholder: '1800',
      required: true,
    },
    {
      key: 'highPrice',
      label: 'High price ($)',
      type: 'number',
      placeholder: '2800',
      required: true,
    },
    {
      key: 'note',
      label: 'Note (optional)',
      type: 'text',
      placeholder: 'After inspection, permits included, etc.',
    },
  ];
}

function credentialsFields(card: ProtopipeContextCard): ContextCardFormField[] {
  return [
    {
      key: 'credentialType',
      label: 'Credential type',
      type: 'select',
      options: CREDENTIAL_TYPE_OPTIONS,
      required: true,
    },
    {
      key: 'identifier',
      label: 'Number or ID',
      type: 'text',
      placeholder: card.geoSignal
        ? 'Include license number and issuing authority'
        : 'e.g. C-12345',
      required: true,
    },
    {
      key: 'issuer',
      label: 'Issuer (optional)',
      type: 'text',
      placeholder: 'e.g. Hawaii DCCA',
    },
  ];
}

function processFields(card: ProtopipeContextCard): ContextCardFormField[] {
  return [
    {
      key: 'duration',
      label: 'Typical duration',
      type: 'text',
      placeholder: card.geoSignal ? 'e.g. 2–3 business days' : 'e.g. 2–3 days',
      required: true,
    },
    {
      key: 'steps',
      label: 'What happens',
      type: 'textarea',
      rows: 3,
      placeholder: 'Brief steps the customer should expect',
      required: true,
    },
  ];
}

function serviceAreaFields(card: ProtopipeContextCard): ContextCardFormField[] {
  return [
    {
      key: 'areas',
      label: 'Cities or neighborhoods served',
      type: 'textarea',
      rows: 2,
      placeholder: card.geoSignal
        ? 'List specific cities, neighborhoods, or counties'
        : 'e.g. Kihei, Wailea, central Maui',
      required: true,
    },
  ];
}

function regulationsFields(card: ProtopipeContextCard): ContextCardFormField[] {
  return [
    {
      key: 'requirement',
      label: 'Requirement',
      type: 'text',
      placeholder: 'e.g. Permit required for panel upgrades',
      required: true,
    },
    {
      key: 'details',
      label: 'Authority and details',
      type: 'textarea',
      rows: 2,
      placeholder: card.geoSignal
        ? 'Permit office, typical cost, timeline — be specific'
        : 'e.g. Maui County; $180–250 typical',
      required: true,
    },
  ];
}

function defaultFields(card: ProtopipeContextCard): ContextCardFormField[] {
  const placeholders: Partial<Record<ProtopipeContextCardTopic, string>> = {
    business_profile: 'Years in business, team size, specialties…',
    services: 'Services you offer and any specialties…',
    customer_fit: 'Who you typically work with…',
    competitive: 'What sets you apart locally…',
    offers: 'Current promotion details…',
    project_story: 'Brief project outcome…',
    article_content: 'The confirmed fact…',
    other: 'Your answer in 1–2 sentences',
  };

  const topic = effectiveTopic(card);
  return [
    {
      key: 'primary',
      label: 'Your answer',
      type: 'textarea',
      rows: 3,
      placeholder: placeholders[topic] ?? placeholders.other,
      required: true,
    },
    {
      key: 'detail',
      label: 'Additional detail (optional)',
      type: 'textarea',
      rows: 2,
      placeholder: card.geoSignal
        ? 'Specific numbers, names, or places help AI search cite you'
        : 'Anything else worth noting',
    },
  ];
}

function claimFields(card: ProtopipeContextCard): ContextCardFormField[] {
  const fields: ContextCardFormField[] = [];
  if (card.suggestedValue) {
    fields.push({
      key: 'verdict',
      label: 'Is this accurate?',
      type: 'select',
      options: [
        { value: 'accurate', label: 'Accurate as written' },
        { value: 'correct', label: 'Needs correction' },
        { value: 'not_true', label: 'Not true' },
      ],
      required: true,
    });
  } else {
    fields.push({
      key: 'correction',
      label: 'Correct value',
      type: 'text',
      placeholder: 'Enter the right answer',
      required: true,
    });
  }
  return fields;
}

/** Fields shown when claim verdict is "correct". */
export function claimCorrectionField(card: ProtopipeContextCard): ContextCardFormField {
  return {
    key: 'correction',
    label: 'Correct value',
    type: 'text',
    placeholder: card.suggestedValue ?? 'Enter the right answer',
    required: true,
  };
}

/** Fields shown when claim verdict is "not_true". */
export function claimNotTrueField(): ContextCardFormField {
  return {
    key: 'alternative',
    label: 'What should we say instead? (optional)',
    type: 'textarea',
    rows: 2,
    placeholder: 'Leave blank to mark this claim as inaccurate',
  };
}

export function fieldsForCard(card: ProtopipeContextCard): ContextCardFormField[] {
  if (card.type === 'claim') return claimFields(card);

  switch (effectiveTopic(card)) {
    case 'pricing':
      return pricingFields(card);
    case 'credentials':
      return credentialsFields(card);
    case 'process':
      return processFields(card);
    case 'service_area':
      return serviceAreaFields(card);
    case 'regulations':
      return regulationsFields(card);
    default:
      return defaultFields(card);
  }
}

export function emptyDraftForCard(card: ProtopipeContextCard): ContextCardAnswerDraft {
  const draft: ContextCardAnswerDraft = {};
  for (const field of fieldsForCard(card)) {
    if (field.type === 'select' && field.options?.length) {
      draft[field.key] = field.options[0].value;
    } else {
      draft[field.key] = '';
    }
  }
  if (card.type === 'claim' && card.suggestedValue) {
    draft['verdict'] = 'accurate';
  }
  return draft;
}

function formatPrice(value: string): string {
  const num = Number(value.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(num) || num <= 0) return value.trim();
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function composePricing(draft: ContextCardAnswerDraft): string | null {
  const service = draft['service']?.trim();
  const low = draft['lowPrice']?.trim();
  const high = draft['highPrice']?.trim();
  const note = draft['note']?.trim();
  if (!service || !low || !high) return null;

  let value = `${service}: $${formatPrice(low)}–$${formatPrice(high)}`;
  if (note) value += `. ${note}`;
  return value;
}

function composeCredentials(draft: ContextCardAnswerDraft): string | null {
  const type = draft['credentialType']?.trim();
  const identifier = draft['identifier']?.trim();
  const issuer = draft['issuer']?.trim();
  if (!type || !identifier) return null;

  const label = CREDENTIAL_TYPE_LABELS[type] ?? 'Credential';
  let value = `${label} ${identifier}`;
  if (issuer) value += ` (${issuer})`;
  return value;
}

function composeProcess(draft: ContextCardAnswerDraft): string | null {
  const duration = draft['duration']?.trim();
  const steps = draft['steps']?.trim();
  if (!duration || !steps) return null;
  return `${duration}. ${steps}`;
}

function composeServiceArea(draft: ContextCardAnswerDraft): string | null {
  const areas = draft['areas']?.trim();
  if (!areas) return null;
  return areas;
}

function composeRegulations(draft: ContextCardAnswerDraft): string | null {
  const requirement = draft['requirement']?.trim();
  const details = draft['details']?.trim();
  if (!requirement || !details) return null;
  return `${requirement}. ${details}`;
}

function composeDefault(draft: ContextCardAnswerDraft): string | null {
  const primary = draft['primary']?.trim();
  if (!primary) return null;
  const detail = draft['detail']?.trim();
  return detail ? `${primary} ${detail}` : primary;
}

function composeClaim(card: ProtopipeContextCard, draft: ContextCardAnswerDraft): string | null {
  if (!card.suggestedValue) {
    return draft['correction']?.trim() || null;
  }

  const verdict = draft['verdict'] as ClaimVerdict | undefined;
  if (verdict === 'accurate') return card.suggestedValue.trim();
  if (verdict === 'correct') return draft['correction']?.trim() || null;
  if (verdict === 'not_true') {
    const alt = draft['alternative']?.trim();
    return alt || 'Not accurate — do not state this.';
  }
  return null;
}

function validateFields(
  fields: ContextCardFormField[],
  draft: ContextCardAnswerDraft,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (!field.required) continue;
    const value = draft[field.key]?.trim();
    if (!value) errors[field.key] = `${field.label} is required`;
  }
  return errors;
}

export function composeAnswerValue(
  card: ProtopipeContextCard,
  draft: ContextCardAnswerDraft,
): ComposeAnswerResult {
  const fieldErrors: Record<string, string> = {};

  if (card.type === 'claim') {
    const baseFields = fieldsForCard(card);
    Object.assign(fieldErrors, validateFields(baseFields, draft));

    const verdict = draft['verdict'] as ClaimVerdict | undefined;
    if (verdict === 'correct') {
      Object.assign(fieldErrors, validateFields([claimCorrectionField(card)], draft));
    }

    if (Object.keys(fieldErrors).length) {
      return { value: null, fieldErrors };
    }

    return { value: composeClaim(card, draft), fieldErrors: {} };
  }

  const fields = fieldsForCard(card);
  Object.assign(fieldErrors, validateFields(fields, draft));
  if (Object.keys(fieldErrors).length) {
    return { value: null, fieldErrors };
  }

  const topic = effectiveTopic(card);
  let value: string | null = null;

  switch (topic) {
    case 'pricing':
      value = composePricing(draft);
      break;
    case 'credentials':
      value = composeCredentials(draft);
      break;
    case 'process':
      value = composeProcess(draft);
      break;
    case 'service_area':
      value = composeServiceArea(draft);
      break;
    case 'regulations':
      value = composeRegulations(draft);
      break;
    default:
      value = composeDefault(draft);
      break;
  }

  if (!value) {
    return { value: null, fieldErrors: { _form: 'Please complete all required fields.' } };
  }

  return { value, fieldErrors: {} };
}

export function topicLabel(topic: ProtopipeContextCardTopic): string {
  return topic.replace(/_/g, ' ');
}

export function sourceLabel(stage: ProtopipeContextCard['source']['stage']): string {
  switch (stage) {
    case 'keyword_discovery':
      return 'From keyword discovery';
    case 'plan_generation':
      return 'From content plan';
    case 'article_generation':
      return 'From article review';
    case 'geo_discovery':
      return 'From AI search analysis';
    case 'project_capture':
      return 'From a project';
    default:
      return 'From strategy';
  }
}

export function citationLabel(card: ProtopipeContextCard): string | null {
  if (!card.geoSignal || !card.citationPotential) return null;
  return `${card.citationPotential} citation potential`;
}
