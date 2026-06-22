/** Minimal component defaults for section swaps — keep in sync with bagend componentSectionDefaults. */

export interface BuildBookComponentDefaults {
  defaultProps: Record<string, unknown>;
  editableFields: string[];
}

const HERO_IMG =
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&q=80';
const GALLERY_IMG =
  'https://images.squarespace-cdn.com/content/v1/69c2330e1cc15834e49a0ad5/cac956ca-c49a-443a-a8c6-6a5c0b06d56a/2a21d9e0-33bb-471e-9ff7-ee6abf47aad9.jpg?format=800w';

export const BUILD_BOOK_COMPONENT_DEFAULTS: Record<string, BuildBookComponentDefaults> = {
  'hero-split': {
    defaultProps: {
      eyebrow: 'Your business',
      heading: 'Headline that converts',
      subhead: 'A short value proposition for visitors on any device.',
      ctaLabel: 'Get started',
      ctaHref: '#inquiry',
      imageSrc: HERO_IMG,
      imageAlt: 'Hero image',
    },
    editableFields: ['eyebrow', 'heading', 'subhead', 'ctaLabel', 'ctaHref', 'imageSrc', 'imageAlt'],
  },
  'hero-overlay': {
    defaultProps: {
      heading: 'Building excellence',
      subhead: 'Licensed professionals serving your area.',
      backgroundImageSrc: HERO_IMG,
      backgroundImageAlt: 'Hero background',
      ctaLabel: 'Get a quote',
      ctaHref: '#inquiry',
    },
    editableFields: [
      'heading',
      'subhead',
      'backgroundImageSrc',
      'backgroundImageAlt',
      'ctaLabel',
      'ctaHref',
      'phoneLabel',
      'phoneHref',
      'secondaryCtaLabel',
      'secondaryCtaHref',
    ],
  },
  'stats-bar': {
    defaultProps: {
      stats: [
        { value: '25+', label: 'Years in business' },
        { value: '500+', label: 'Projects completed' },
        { value: '100%', label: 'Licensed & insured' },
      ],
    },
    editableFields: ['stats'],
  },
  'services-grid': {
    defaultProps: {
      heading: 'Our services',
      services: [
        { icon: '🏠', title: 'Residential', body: 'Quality work for homes.', href: '#' },
        { icon: '🏢', title: 'Commercial', body: 'On schedule, on budget.', href: '#' },
      ],
    },
    editableFields: ['heading', 'services'],
  },
  'logo-strip': {
    defaultProps: {
      heading: 'Trusted by clients',
      logos: [
        { src: GALLERY_IMG, alt: 'Client 1' },
        { src: HERO_IMG, alt: 'Client 2' },
      ],
    },
    editableFields: ['heading'],
  },
  'process-steps': {
    defaultProps: {
      heading: 'How it works',
      steps: [
        { title: 'Connect', body: 'Tell us about your project.' },
        { title: 'Plan', body: 'We confirm scope and timeline.' },
        { title: 'Deliver', body: 'Quality results you can trust.' },
      ],
    },
    editableFields: ['heading', 'steps'],
  },
  'feature-grid': {
    defaultProps: {
      heading: 'Why choose us',
      features: [
        { title: 'Fast response', body: 'We reply within one business day.' },
        { title: 'Licensed pros', body: 'Insured, experienced teams.' },
      ],
    },
    editableFields: ['heading', 'features'],
  },
  'gallery-showcase': {
    defaultProps: {
      heading: 'Recent work',
      images: [
        { src: GALLERY_IMG, alt: 'Project 1' },
        { src: HERO_IMG, alt: 'Project 2' },
      ],
      mobileLimit: 3,
    },
    editableFields: ['heading', 'images', 'moreHref', 'moreLabel'],
  },
  'testimonial-grid': {
    defaultProps: {
      heading: 'What clients say',
      testimonials: [
        {
          quote: 'Professional, on time, and exceeded our expectations.',
          name: 'Sarah M.',
          role: 'Homeowner',
          imageSrc: GALLERY_IMG,
          imageAlt: 'Project photo',
        },
      ],
    },
    editableFields: ['heading', 'testimonials'],
  },
  'faq-accordion': {
    defaultProps: {
      heading: 'FAQ',
      items: [
        { question: 'What areas do you serve?', answer: 'We serve local and regional clients.' },
        { question: 'How do I get a quote?', answer: 'Submit the inquiry form below.' },
      ],
    },
    editableFields: ['heading', 'items'],
  },
  'cta-banner': {
    defaultProps: {
      heading: 'Ready to get started?',
      body: 'Tell us about your project — we will reply with next steps.',
    },
    editableFields: ['heading', 'body'],
  },
  'lead-capture-form': {
    defaultProps: {
      heading: 'Get in touch',
      subhead: 'We typically respond within 1–2 business days.',
      submitLabel: 'Send message',
    },
    editableFields: ['heading', 'subhead', 'submitLabel'],
  },
  'saas-hero-gradient': {
    defaultProps: {
      titleLines: ['Quality work.', 'Local trust.'],
      subtitle: 'Licensed professionals serving your community.',
      primaryCtaLabel: 'Get started',
      primaryCtaHref: '#inquiry',
      secondaryCtaLabel: 'View services',
      secondaryCtaHref: '#services',
      visualSrc: HERO_IMG,
      visualAlt: 'Hero visual',
    },
    editableFields: [
      'titleLines',
      'subtitle',
      'primaryCtaLabel',
      'primaryCtaHref',
      'secondaryCtaLabel',
      'secondaryCtaHref',
      'visualSrc',
      'visualAlt',
    ],
  },
  'saas-value-trio': {
    defaultProps: {
      heading: 'What we do',
      intro: 'Full-service coverage for residential and commercial clients.',
      items: [
        { number: '01', title: 'Residential', body: 'Homes and small projects.' },
        { number: '02', title: 'Commercial', body: 'Offices and light industrial.' },
        { number: '03', title: 'Emergency', body: 'When you need us fast.' },
      ],
    },
    editableFields: ['heading', 'intro', 'items'],
  },
  'saas-customer-metrics': {
    defaultProps: {
      heading: 'Outcomes clients report',
      cards: [
        { metric: '4.9★', company: 'Google rating', detail: 'Local reviews' },
        { metric: '15+', company: 'Years', detail: 'In business' },
      ],
    },
    editableFields: ['heading', 'cards'],
  },
  'saas-quote-highlight': {
    defaultProps: {
      quote: 'They showed up on time, explained everything, and the work was flawless.',
      attribution: 'Happy customer',
      role: 'Homeowner',
    },
    editableFields: ['quote', 'attribution', 'role'],
  },
  'image-band': {
    defaultProps: {
      imageSrc: HERO_IMG,
      imageAlt: 'Project photo',
    },
    editableFields: ['imageSrc', 'imageAlt'],
  },
  'consult-hero-fullbleed': {
    defaultProps: {
      heading: 'Trusted expertise for your project',
      subhead: 'Decades of experience serving government, commercial, and private clients.',
      backgroundImageSrc: HERO_IMG,
      backgroundImageAlt: 'Field site',
      primaryCtaLabel: 'Request a quote',
      primaryCtaHref: '#inquiry',
      secondaryCtaLabel: 'Call us',
      secondaryCtaHref: 'tel:+18005550100',
    },
    editableFields: [
      'heading',
      'subhead',
      'backgroundImageSrc',
      'backgroundImageAlt',
      'primaryCtaLabel',
      'primaryCtaHref',
      'secondaryCtaLabel',
      'secondaryCtaHref',
    ],
  },
  'consult-hero-split': {
    defaultProps: {
      heading: 'Professional service you can trust',
      subhead: 'Licensed, insured, and ready when you need us.',
      imageSrc: HERO_IMG,
      imageAlt: 'Team on site',
      primaryCtaLabel: 'Get a quote',
      primaryCtaHref: '#inquiry',
      secondaryCtaLabel: 'View services',
      secondaryCtaHref: '#services',
    },
    editableFields: [
      'heading',
      'subhead',
      'imageSrc',
      'imageAlt',
      'primaryCtaLabel',
      'primaryCtaHref',
      'secondaryCtaLabel',
      'secondaryCtaHref',
    ],
  },
};
