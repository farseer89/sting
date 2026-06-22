# Writing Book — deferred features (post-MVP)

MVP ships the `wb-*` binder shell with four panels: **Canvas**, **Generation**, **SEO & schedule**, and conditional **Fact check**.

## Tier 1 — Edit pass polish

- Keyword strip + inline highlighting toggle
- Word progress in masthead
- Full pipeline step list in Generation panel
- SERP preview panel
- Blog preview panel + takeover
- Type readiness chips / Hints panel

## Tier 2 — Power user and layout

- Brief panel (edit before re-run)
- Layout slots panel (block templates)
- Thought pack picker in masthead
- Open in Thinker from Generation
- Re-run pipeline, CTA offering override, event log
- Context cards in Fact check panel
- Schedule date in SEO panel

## Tier 3 — Rich canvas

- Hero + section images, uploads
- Video/embeds per section
- AI bubble / slash menus
- Intro suggestion button
- Margin AI notes (computed in TS, never rendered)
- Preview on site strip

## Removed / replaced in MVP

- Icon tool rail (`pw__rail`)
- Sliding right inspector + `ProtopipeWriterInspectorBridge`
- Home void side panel for writer tools
- Dev → Writer mock (`writer-binder` component — styles reused via SCSS import)
- Full void takeover hiding home nav while in Writing book
