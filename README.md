# Aïmen Louafi — Portfolio

A static portfolio and writing site built with [Astro](https://astro.build). The site deploys to GitHub Pages and contains no client-side framework runtime.

## Local development

Requirements: Node.js 22.12 or newer.

```bash
npm install
npm run dev
```

Before pushing, run the same formatting, type, build, and internal-link validation used by CI:

```bash
npm run verify
```

## Update profile content

The core profile, links, selected work, and career timeline live in [`src/data/profile.ts`](src/data/profile.ts). This keeps factual content separate from page markup.

To add a portrait:

1. Put an optimized image in `public/assets/img/`, ideally WebP or AVIF and at least 640 × 800 px.
2. Change `portrait` in `src/data/profile.ts` to its public path, for example `/assets/img/profile.webp`.
3. Update the image `alt` text in `src/pages/index.astro`.

## Publish writing

Posts are Markdown or MDX files in `src/content/writing/`. Their frontmatter is validated at build time by `src/content.config.ts`.

### Internal post

```md
---
title: What I learned evaluating tool-using agents
description: A short description used in listings and social previews.
publishedAt: 2026-10-01
language: en
topic: tech
draft: false
---

Your post starts here.
```

To choose the image shown when a post is shared, add a `cover`. Use a 1200 × 630 px JPEG or PNG in `public/assets/img/writing/`; posts without one use the default social card.

```md
cover:
src: /assets/img/writing/my-post/cover.jpg
alt: What the image shows.
```

### External post

Add `link`; its topic page and the RSS feed will link directly to it, and Astro will not create a local article page.

```md
---
title: Notes on a film
description: A short description of the review.
publishedAt: 2026-10-10
language: fr
topic: cinema
director: Film Director
publisher: Publication Name
link: https://example.com/the-article
draft: false
---
```

Allowed languages are `en` and `fr`. Allowed topics are `cinema`, `tech`, and `notes`; they are listed at `/cinema/`, `/tech/`, and `/other/`, each with its own feed (`/cinema/rss.xml`, and so on) next to the full `/rss.xml`. Set `draft: true` to keep an entry out of the site and RSS feed.

## Letterboxd strip

The Cinema page shows recently watched films and the latest reviews from the [Letterboxd](https://letterboxd.com/endtell/) diary. Letterboxd's RSS feed can't be read from a browser (it sends no CORS headers), so a small Cloudflare Worker in `workers/letterboxd/` relays it as JSON and keeps a copy for five minutes. The page includes a snapshot taken at build time and replaces it with the relay's list on every visit; if the relay is unreachable, the snapshot stays.

The RSS feed only carries the last 50 diary entries, so older reviews come from Letterboxd's data export (Settings → Data → Export your data). To refresh them, for example after editing an old review, run `npm run import:reviews -- ~/Downloads/letterboxd-<user>-<date>.zip` and commit `src/data/letterboxd-reviews.json`. The export has no spoiler flag: set `"spoilers": true` by hand on any review whose excerpt should stay hidden.

Imported reviews also get their own page at `/reviews/<slug>/`, and those labelled "Cannes YYYY" in their first line are grouped by edition on `/cannes/`. To list a post on that page too, add `cannes: 2027` (the edition's year) to its frontmatter. The number of films seen per edition is set by hand in `src/pages/cannes.astro`.

The relay runs on Cloudflare, not GitHub Pages, so pushing to `main` does not update it. After changing `workers/letterboxd/` or `src/lib/letterboxd.ts`, run `npx wrangler@4 login` once, then `npm run deploy:relay`. Its URL is `letterboxdRelay` in `src/data/profile.ts`.

## Deployment

Pushes to `main` run `.github/workflows/deploy.yml`, which type-checks, builds, and deploys `dist/` to GitHub Pages. The canonical site URL is configured in `astro.config.mjs`.
