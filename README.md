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

### External post

Add `externalUrl`; the writing index and RSS feed will link directly to it, and Astro will not create a local article page.

```md
---
title: Notes on a film
description: A short description of the review.
publishedAt: 2026-10-10
language: fr
topic: cinema
externalUrl: https://example.com/the-article
draft: false
---
```

Allowed languages are `en` and `fr`. Allowed topics are `tech`, `cinema`, and `notes`. Set `draft: true` to keep an entry out of the site and RSS feed.

## Deployment

Pushes to `main` run `.github/workflows/deploy.yml`, which type-checks, builds, and deploys `dist/` to GitHub Pages. The canonical site URL is configured in `astro.config.mjs`.
