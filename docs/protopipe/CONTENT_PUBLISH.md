# Protopipe content publish

## Flow

1. **Content** (`/protopipe/content`) — create draft, optional schedule date, **Publish now**.
2. bagend commits Markdown to **client-sites** via GitHub Contents API.
3. **client-sites** CI deploys the site (e.g. Cloudflare project `dwp`).

## bagend env (publish)

```env
GITHUB_TOKEN=ghp_...          # repo scope on client-sites
CLIENT_SITES_REPO=farseer89/client-sites
CLIENT_SITES_DEFAULT_BRANCH=main
```

## Path on publish

`sites/{clientSitesSlug}/src/content/blog/{slug}.md`

DWP: `sites/destination-wedding-painter/src/content/blog/...`

## API

| Method | Path |
|--------|------|
| GET | `/api/v2/protopipe/sites/:siteId/content` |
| POST | `/api/v2/protopipe/sites/:siteId/content` |
| PUT | `/api/v2/protopipe/sites/:siteId/content/:postId` |
| POST | `/api/v2/protopipe/sites/:siteId/content/:postId/publish` |
