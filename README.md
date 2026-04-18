# siriusganesh.com

Personal site. Astro, static build, hosted on Cloudflare Pages.

## Stack

- [Astro](https://astro.build/) — static site generator
- IBM Plex Mono + system Verdana stack — fonts
- Cloudflare Pages — hosting, CDN, TLS
- Cloudflare DNS — domain

## Local development

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # output in dist/
npm run preview   # serve dist/ locally
```

## Editing content

Almost everything you'll change day-to-day lives in **`src/data/content.ts`**.
Experience, capabilities, projects, about, contact — all plain data.

- **New project:** add an object to the `projects` array.
- **New job or promotion:** add/edit an entry in the `experience` array.
- **Copy tweak:** change the relevant `*Html` field.
- **Resume:** drop the new PDF at `public/Resume_SG.pdf` (same filename).

Visuals and layout live in:
- `src/styles/global.css` — all styles, CSS variables at top
- `src/layouts/Base.astro` — nav, footer, meta tags
- `src/pages/index.astro` — the page structure (mostly loops over `content.ts`)

## Deploying

The site is wired to Cloudflare Pages via GitHub. Every push to `main` triggers a
production build. Pushes to any other branch get a unique preview URL.

Update flow:

```bash
git checkout -b update-projects
# edit src/data/content.ts
git add -A
git commit -m "Add case study: site-07"
git push -u origin update-projects
# → Cloudflare Pages gives you a preview URL in the PR
# merge the PR → production deploys automatically
```

For tiny updates (resume swap, typo fix) you can just push straight to `main`.

## Cloudflare Pages config

- Framework preset: **Astro**
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: `22` (set in Pages → Settings → Environment variables:
  `NODE_VERSION=22`) — Astro 6 requires Node >= 22.12

See `DEPLOYMENT.md` for the one-time setup walkthrough.
