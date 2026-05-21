# SEO article template (Protopipe)

Canonical on-page rules for posts published to **client-sites** Astro blogs. Enforcement: **warnings on Save**, **errors block Publish**.

## Field guide

| Field | Target (2026) | Publish |
|-------|----------------|---------|
| **Primary keyword** | From site plan; drives title, H1, intro | Error if missing or not on plan |
| **SEO title** | ≤60 characters; keyword near the front | Error if empty or missing keyword |
| **H1** | One per page; includes primary keyword; can match title | Error if empty or missing keyword |
| **Meta description** | 140–160 characters; benefit-led, click intent | Error if empty; warn if outside range |
| **Intro** | Keyword in first ~100 words; problem + promise | Warn if keyword missing |
| **Sections (H2)** | 1–8 chapters; each H2 required; body under each | Error if no sections |
| **Images** | Every image needs descriptive **alt** (≤200 chars) | Error if alt empty |
| **Internal links** | 1+ links to own site (e.g. `/gallery`, `/get-in-touch`) | Warn if none |
| **CTA** | Clear next step (e.g. Book / Get in touch) | Warn if missing |
| **Word count** | Often 300+ minimum; 800–1500 for guides | Warn if &lt;300 words |

## Structure (published markdown)

- **No `# H1` in body** — layout renders H1 from frontmatter `h1`.
- Intro paragraphs, then `## H2` sections, optional images `![alt](url)`.
- Optional “Related on this site” link list and CTA line at end.

## Frontmatter (client-sites)

```yaml
title: "SEO title for <title> tag"
description: "Meta description"
h1: "On-page headline"
primaryKeyword: "destination wedding painter"
pubDate: 2026-05-21
draft: false
```

## DWP example

- **Keyword:** `live wedding painting`
- **Title:** `Live Wedding Painting for Destination Weddings` (≤60 chars)
- **H1:** `Live Wedding Painting at Your Destination Wedding`
- **Meta:** 140–160 chars mentioning Maui/international travel and booking
- **H2s:** What is live wedding painting · Process & timeline · Why couples book · Get in touch
- **Internal links:** `/gallery`, `/get-in-touch`
- **CTA:** Book your painter → `/get-in-touch`

## Related

- [FEATURE_STANDARD.md](./FEATURE_STANDARD.md) — Phase D publish
- [CONTENT_PUBLISH.md](./CONTENT_PUBLISH.md) — GitHub + CI flow
