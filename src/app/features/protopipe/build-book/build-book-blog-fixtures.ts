/** Sample posts for blog-home listing blocks and Content Posts article preview. */

export interface BuildBookBlogFixturePost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: string;
  date: string;
  readTime: string;
  body: string;
}

export const BUILD_BOOK_BLOG_FIXTURE_POSTS: BuildBookBlogFixturePost[] = [
  {
    id: 'fixture-1',
    slug: 'how-we-scope-a-project',
    title: 'How we scope a project before the first site visit',
    excerpt:
      'A clear scope keeps timelines honest. Here is the checklist we use before anyone rolls a truck.',
    coverImage: '',
    category: 'Process',
    date: 'Jun 12, 2026',
    readTime: '6 min',
    body: 'Every strong job starts with a shared picture of the work. We walk the constraints, confirm access, and write the scope in plain language so quotes stay comparable and surprises stay rare.',
  },
  {
    id: 'fixture-2',
    slug: 'field-notes-from-last-week',
    title: 'Field notes from last week’s installs',
    excerpt: 'Three jobs, three different site conditions — and the same habit that kept each one on track.',
    coverImage: '',
    category: 'Field notes',
    date: 'Jun 5, 2026',
    readTime: '4 min',
    body: 'Weather shifted mid-week, one panel needed a custom mount, and a homeowner changed the finish mid-install. The common thread: early photos, written change notes, and a same-day check-in.',
  },
  {
    id: 'fixture-3',
    slug: 'what-good-looks-like',
    title: 'What “good” looks like on walkthrough day',
    excerpt: 'A short guide to the finish standards we hold ourselves to before we call a job complete.',
    coverImage: '',
    category: 'Standards',
    date: 'May 28, 2026',
    readTime: '5 min',
    body: 'Walkthrough is not a formality. We check fasteners, clean edges, label panels, and leave the space ready for the next person who opens the door.',
  },
  {
    id: 'fixture-4',
    slug: 'choosing-materials-that-last',
    title: 'Choosing materials that last in real weather',
    excerpt: 'Spec sheets matter — so does how a product behaves after a season of sun, salt, and freeze-thaw.',
    coverImage: '',
    category: 'Materials',
    date: 'May 20, 2026',
    readTime: '7 min',
    body: 'We prefer products with proven field life over the cheapest line item. That usually means fewer callbacks and a finish that still looks intentional a year later.',
  },
  {
    id: 'fixture-5',
    slug: 'questions-to-ask-before-you-hire',
    title: 'Questions to ask before you hire a contractor',
    excerpt: 'Licensing, insurance, and communication habits — the questions that separate a good hire from a gamble.',
    coverImage: '',
    category: 'Advice',
    date: 'May 14, 2026',
    readTime: '5 min',
    body: 'Ask who will be on site, how change orders are handled, and what the warranty covers. Clear answers early save everyone time later.',
  },
  {
    id: 'fixture-6',
    slug: 'a-quiet-week-in-the-shop',
    title: 'A quiet week in the shop',
    excerpt: 'When the calendar opens up, we use the time to stage kits, sharpen tools, and plan the next wave of work.',
    coverImage: '',
    category: 'Behind the scenes',
    date: 'May 7, 2026',
    readTime: '3 min',
    body: 'Prep days are where quality compounds. Labeled bins, charged batteries, and staged materials mean the crew spends more time installing and less time hunting parts.',
  },
];

export const BUILD_BOOK_BLOG_DEFAULT_TOPICS = [
  'All',
  'Process',
  'Field notes',
  'Standards',
  'Materials',
  'Advice',
] as const;

export function blogFixturePosts(limit?: number): BuildBookBlogFixturePost[] {
  if (limit == null || limit >= BUILD_BOOK_BLOG_FIXTURE_POSTS.length) {
    return BUILD_BOOK_BLOG_FIXTURE_POSTS;
  }
  return BUILD_BOOK_BLOG_FIXTURE_POSTS.slice(0, Math.max(0, limit));
}

export function blogFixtureFeatured(
  rule: 'latest' | 'pinned' = 'latest',
  pinnedId?: string,
): BuildBookBlogFixturePost {
  if (rule === 'pinned' && pinnedId) {
    return (
      BUILD_BOOK_BLOG_FIXTURE_POSTS.find((post) => post.id === pinnedId) ??
      BUILD_BOOK_BLOG_FIXTURE_POSTS[0]
    );
  }
  return BUILD_BOOK_BLOG_FIXTURE_POSTS[0];
}

/**
 * Props overlay for Content Posts article preview.
 * Always overwrites display copy with fixture article content so preview
 * reads as a filled post — not the empty/default profile chrome.
 */
export function articlePreviewPropsForPattern(
  patternId: string,
  existing: Record<string, unknown>,
): Record<string, unknown> {
  const post = BUILD_BOOK_BLOG_FIXTURE_POSTS[0];
  const related = BUILD_BOOK_BLOG_FIXTURE_POSTS.slice(0, 3).map((item) => ({
    category: item.category,
    title: item.title,
    image: item.coverImage || '',
  }));

  switch (patternId) {
    case 'section-intro':
      return {
        ...existing,
        kicker: post.category,
        heading: post.title,
        body: `${post.excerpt}\n\n${post.date} · ${post.readTime}`,
      };
    case 'prose-band':
      return {
        ...existing,
        kicker: post.category,
        heading: post.title,
        // Universal / generic prose
        body: post.body,
        // Sparky field-notes band uses lede + article cards
        lede: post.body,
        articles: related,
      };
    case 'faq-accordion':
      return {
        ...existing,
        kicker: 'FAQ',
        heading: `Questions about “${post.title}”`,
        subhead: 'Sample questions a published article might answer.',
        items: [
          {
            q: 'How long does a typical project take?',
            a: 'Most residential jobs wrap in one to three days once materials are staged — we confirm the schedule in writing before we start.',
          },
          {
            q: 'Do you handle permits?',
            a: 'When the scope requires it, yes. We flag permit needs during scoping so timelines stay honest.',
          },
          {
            q: 'What should I prepare before the site visit?',
            a: 'Clear access to the work area, share any prior plans or photos, and note constraints like HOA rules or shared walls.',
          },
        ],
      };
    case 'cta-banner':
    case 'inquiry-close':
      return {
        ...existing,
        heading: 'Ready to talk through your project?',
        body: 'This is how the article CTA reads after generation — clear next step, same theme as your profile.',
        ctaLabel: String(existing['ctaLabel'] || existing['label'] || 'Get in touch'),
        ctaHref: String(existing['ctaHref'] || existing['href'] || '/contact'),
        primaryCtaLabel: String(
          existing['primaryCtaLabel'] || existing['ctaLabel'] || 'Get in touch',
        ),
        primaryCtaHref: String(existing['primaryCtaHref'] || existing['ctaHref'] || '/contact'),
      };
    case 'content-split':
      return {
        ...existing,
        kicker: post.category,
        heading: post.title,
        body: post.body,
      };
    case 'work-gallery':
    case 'video-reel':
      return {
        ...existing,
        kicker: post.category,
        heading: `Visuals for “${post.title}”`,
        subhead: post.excerpt,
      };
    default:
      return {
        ...existing,
        ...(typeof existing['heading'] === 'string' || existing['heading'] == null
          ? { heading: post.title }
          : {}),
        ...(typeof existing['body'] === 'string' || existing['body'] == null
          ? { body: post.body }
          : {}),
      };
  }
}
