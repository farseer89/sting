import type { BlogArticleFillSource } from './build-book-article-fill.util';
import type { BlogArticleTemplateKey } from './build-book.types';

/** Full publishable article package sample for Blog Templates finished preview. */
export interface BlogArticlePackagePreview extends BlogArticleFillSource {
  title: string;
  primaryKeyword: string;
  searchIntent: string;
  seoTitle: string;
  h1: string;
  metaDescription: string;
  slug: string;
  excerpt: string;
  authorLine: string;
  pubDate: string;
  readTime: string;
}

export interface BlogArticleTemplateDefinition {
  id: BlogArticleTemplateKey;
  label: string;
  useCase: string;
  deck: string;
  lorem: string;
  requiredBlocks: readonly string[];
  renderTargets: readonly string[];
  blockIds: readonly string[];
  preview: BlogArticlePackagePreview;
}

function previewImage(label: string, from: string, to: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${from}"/>
          <stop offset="1" stop-color="${to}"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#g)"/>
      <circle cx="930" cy="170" r="180" fill="#fff" opacity=".18"/>
      <path d="M0 610c155-70 302-91 441-63 150 30 250 94 405 77 137-15 226-84 354-103v279H0z" fill="#111827" opacity=".22"/>
      <text x="72" y="110" fill="#fff" font-family="Arial, sans-serif" font-size="42" font-weight="700">${label}</text>
    </svg>
  `;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const BLOG_ARTICLE_TEMPLATE_CATALOG: readonly BlogArticleTemplateDefinition[] = [
  {
    id: 'answer-guide',
    label: 'Answer Guide',
    useCase: 'How-to, what-is, service explainers, and AI answer visibility.',
    deck: 'Answer-first post anatomy with a clear promise, structured H2s, support imagery, and a final conversion path.',
    lorem:
      'Plan the page around one search job, answer it in the first screen, then expand into sections a search engine or AI result can quote cleanly.',
    requiredBlocks: ['Hero', 'Quick answer', 'H2 sections', 'Process or tips', 'Related links', 'FAQ', 'CTA'],
    renderTargets: ['Astro', 'WordPress', 'Shopify', 'CMS JSON'],
    blockIds: [
      'universal-intro-centered',
      'universal-quick-answer',
      'universal-prose-band',
      'universal-split-image-right',
      'universal-prose-band',
      'universal-related-links',
      'universal-faq-accordion',
      'universal-cta-band',
    ],
    preview: {
      primaryKeyword: 'service page content strategy',
      searchIntent: 'informational / how-to',
      seoTitle: 'How to Plan a High-Converting Service Page',
      h1: 'How to Plan a High-Converting Service Page Before You Write',
      title: 'How to Plan a High-Converting Service Page Before You Write',
      metaDescription:
        'Learn how to plan a high-converting service page: clarify search intent, write an answer-first intro, structure H2s, and finish with a clear CTA.',
      slug: 'plan-high-converting-service-page',
      excerpt:
        'A practical answer-first guide for building service pages that rank, get cited, and convert.',
      authorLine: 'SearchClimber Editorial',
      pubDate: '2026-07-10',
      readTime: '8 min read',
      kicker: 'Answer Guide',
      intro:
        'Most service pages fail before the first sentence is written. This guide shows how to lock the search job, the promised outcome, and the next step so the finished article is useful to people and machines.',
      quickAnswer:
        'Start with one primary keyword and one reader job. Open with a direct answer, then expand into H2 sections that each cover one subtopic, add proof imagery where readers expect it, and close with a CTA that matches the article promise.',
      sections: [
        {
          h2: 'Start with the search intent',
          body:
            'Map the keyword to one job the reader needs done. Write the first section so it answers that job without burying the lead, and keep the SEO title, H1, and intro aligned to the same promise.',
        },
        {
          h2: 'Build the article around helpful proof',
          body:
            'Add examples, process notes, and image slots where the reader would expect to see real work. Each H2 should stand alone as a quotable answer for search and AI systems.',
        },
        {
          h2: 'Close with the next best action',
          body:
            'The final section should make the next step obvious. Keep related links nearby, then use a CTA that continues the same promise instead of introducing a new offer.',
        },
      ],
      faqItems: [
        {
          question: 'What makes this template good for AI answers?',
          answer:
            'It leads with a concise answer, uses clear H2 sections, and keeps each section focused on one retrievable idea.',
        },
        {
          question: 'Where do images fit?',
          answer:
            'Use a hero image for context and support images beside sections that need visual proof or process clarity.',
        },
      ],
      internalLinks: [
        { label: 'Content strategy overview', href: '/services/content-strategy' },
        { label: 'Service page examples', href: '/gallery' },
        { label: 'Get in touch', href: '/contact' },
      ],
      cta: { label: 'Plan my content', href: '/contact' },
      images: [
        {
          url: previewImage('Planning desk', '#0f766e', '#164e63'),
          alt: 'Planning notes and article outline on a desk',
        },
        {
          url: previewImage('Article proof', '#2563eb', '#0f172a'),
          alt: 'Example service article layout with proof points',
        },
      ],
    },
  },
  {
    id: 'decision-comparison',
    label: 'Decision Comparison',
    useCase: 'Best-of, versus, buyer guide, and package comparison searches.',
    deck: 'Commercial investigation layout for comparing options, showing criteria, and guiding the reader to a best-fit choice.',
    lorem:
      'Open with a recommendation, show the comparison criteria, then walk through options so the reader can choose without overbuying.',
    requiredBlocks: [
      'Hero',
      'Recommendation',
      'Comparison table',
      'Criteria',
      'Option sections',
      'Best fit',
      'Related links',
      'CTA',
    ],
    renderTargets: ['Astro', 'WordPress', 'Shopify', 'CMS JSON'],
    blockIds: [
      'universal-intro-centered',
      'universal-quick-answer',
      'universal-comparison-table',
      'universal-prose-band',
      'universal-split-image-right',
      'universal-prose-band',
      'universal-related-links',
      'universal-cta-band',
    ],
    preview: {
      primaryKeyword: 'website builder vs custom website',
      searchIntent: 'commercial investigation',
      seoTitle: 'Website Builder vs Custom Website',
      h1: 'Website Builder vs Custom Website: Which Is Right for Growth?',
      title: 'Website Builder vs Custom Website: Which Is Right for Growth?',
      metaDescription:
        'Compare website builders and custom websites by speed, SEO control, content model, integrations, and long-term growth so you choose the right fit.',
      slug: 'website-builder-vs-custom-website',
      excerpt:
        'A decision guide for teams choosing between a website builder and a custom site for search and conversion.',
      authorLine: 'SearchClimber Editorial',
      pubDate: '2026-07-08',
      readTime: '9 min read',
      kicker: 'Decision Comparison',
      intro:
        'If you need a quick brochure site, a builder can be enough. If your site has to support search, conversion, and future CMS publishing, a custom build usually gives you more control.',
      recommendationSummary:
        'Choose a website builder for simple offers and fast launch. Choose a custom website when structured content, technical SEO, and reusable templates matter more than shipping this week.',
      comparisonColumns: [
        { key: 'builder', label: 'Website builder' },
        { key: 'custom', label: 'Custom website' },
      ],
      comparisonRows: [
        {
          label: 'Launch speed',
          values: { builder: 'Days to weeks', custom: 'Weeks to months' },
        },
        {
          label: 'SEO control',
          values: { builder: 'Template-limited', custom: 'Full technical control' },
          highlight: true,
        },
        {
          label: 'Content model',
          values: { builder: 'Pages + basic blog', custom: 'Structured, reusable content' },
        },
        {
          label: 'Integrations',
          values: { builder: 'Marketplace apps', custom: 'Purpose-built systems' },
        },
        {
          label: 'Best for',
          values: {
            builder: 'Simple brochure offers',
            custom: 'Growth, search, and publishing',
          },
          highlight: true,
        },
      ],
      decisionCriteria: [
        'How complex is the offer and content model?',
        'Do you need reusable templates across many pages?',
        'Will search and conversion matter more than launch speed?',
        'What workflows must the site support over the next year?',
      ],
      sections: [
        {
          h2: 'Decision criteria that matter',
          body:
            'Compare cost against the workflows the site has to support over the next year, not just the launch date. Speed, SEO control, content structure, and integrations usually decide the fit.',
        },
        {
          h2: 'When a website builder is enough',
          body:
            'Builders work well when the offer is simple, the content model is small, and speed matters more than long-term flexibility. They are a strong choice for early validation.',
        },
        {
          h2: 'When custom gives you leverage',
          body:
            'Custom systems help when you need structured content, reusable templates, integrations, and stronger technical SEO. That is usually the better path for growth-oriented sites.',
        },
      ],
      internalLinks: [
        { label: 'Custom website builds', href: '/services/websites' },
        { label: 'SEO content systems', href: '/services/content-strategy' },
        { label: 'Talk through options', href: '/contact' },
      ],
      cta: { label: 'Compare my options', href: '/contact' },
      images: [
        {
          url: previewImage('Builder option', '#7c3aed', '#111827'),
          alt: 'Website builder interface mockup',
        },
        {
          url: previewImage('Custom system', '#0369a1', '#0f172a'),
          alt: 'Custom website system architecture preview',
        },
      ],
    },
  },
  {
    id: 'story-case-study',
    label: 'Story Case Study',
    useCase: 'Case studies, portfolio stories, local SEO, and experience-led proof.',
    deck: 'Trust-building article shape with a project snapshot, narrative sections, proof imagery, outcomes, and takeaways.',
    lorem:
      'Lead with the project snapshot, tell the story of the work, then close on outcomes and reusable lessons.',
    requiredBlocks: [
      'Hero',
      'Snapshot',
      'Context',
      'Process',
      'Outcome',
      'Related links',
      'FAQ',
      'CTA',
    ],
    renderTargets: ['Astro', 'WordPress', 'Shopify', 'CMS JSON'],
    blockIds: [
      'universal-intro-centered',
      'universal-case-snapshot',
      'universal-prose-band',
      'universal-split-image-right',
      'universal-prose-band',
      'universal-related-links',
      'universal-faq-accordion',
      'universal-cta-band',
    ],
    preview: {
      primaryKeyword: 'local SEO content refresh',
      searchIntent: 'informational / experience',
      seoTitle: 'Local SEO Content Refresh Case Study',
      h1: 'Inside a Local SEO Content Refresh for a Service Business',
      title: 'Inside a Local SEO Content Refresh for a Service Business',
      metaDescription:
        'See how a local service business turned buried project details into publishable SEO content with a snapshot, story sections, proof images, and clear outcomes.',
      slug: 'local-seo-content-refresh-case-study',
      excerpt:
        'A story-led case study showing how buried service knowledge became searchable, quotable content.',
      authorLine: 'SearchClimber Editorial',
      pubDate: '2026-07-05',
      readTime: '7 min read',
      kicker: 'Story Case Study',
      intro:
        'This case-study shape shows the work, the context, and the decisions behind the result. It is built for trust signals, local relevance, and reusable proof.',
      snapshot: {
        location: 'Phoenix metro',
        service: 'Local SEO content refresh',
        challenge: 'Best project details lived in calls and quotes, not on the site',
        result: 'Publishable articles with clearer answers, proof, and CTA paths',
      },
      outcome:
        'The business left with a reusable article pattern: snapshot first, story second, proof images where buyers expect evidence, and a CTA that matches the service promise.',
      takeaways: [
        'Turn repeated customer questions into H2 sections.',
        'Make the project snapshot scannable before the narrative.',
        'Publish proof images with descriptive alt text.',
        'Keep the CTA aligned with the story outcome.',
      ],
      sections: [
        {
          h2: 'The starting point',
          body:
            'The site had useful service pages, but the best details were hidden in calls, quotes, and project notes instead of publishable content. Buyers could not see the work that already existed.',
        },
        {
          h2: 'What changed',
          body:
            'We turned repeated customer questions into article sections, added proof images, and clarified the final CTA. The finished post reads like a story while still giving search engines clean answers and entities.',
        },
        {
          h2: 'What to take into the next project',
          body:
            'Lead with a snapshot. Tell the process honestly. Close on outcomes and reusable lessons so future buyers can evaluate fit quickly.',
        },
      ],
      faqItems: [
        {
          question: 'Why lead with a snapshot in a case study?',
          answer:
            'The snapshot surfaces location, service, challenge, and result so buyers and search systems can evaluate relevance before the full narrative.',
        },
        {
          question: 'Can this publish to WordPress or Shopify?',
          answer:
            'Yes. The preview is structured as portable blocks so each renderer can translate the same article into its destination format.',
        },
      ],
      internalLinks: [
        { label: 'Local SEO services', href: '/services/local-seo' },
        { label: 'More case studies', href: '/gallery' },
        { label: 'Start a project', href: '/contact' },
      ],
      cta: { label: 'Build a case study', href: '/contact' },
      images: [
        {
          url: previewImage('Case study result', '#92400e', '#111827'),
          alt: 'Finished local SEO case study preview',
        },
      ],
    },
  },
];

export function findBlogArticleTemplate(
  key: BlogArticleTemplateKey,
): BlogArticleTemplateDefinition | undefined {
  return BLOG_ARTICLE_TEMPLATE_CATALOG.find((template) => template.id === key);
}
