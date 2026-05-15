# siriusganesh.com

Personal portfolio for warehouse-robotics deployment — startup pilot
through enterprise production.

Source is public because the build is reproducible and the source itself
is part of what's being shown.

[Live site →](https://siriusganesh.com)

## Deliberate choices

- No client-side JS by default. One small script powers the bag picker on
  `/coffee/`; everything else is server-rendered at build.
- Lighthouse CI on every PR (mobile + desktop matrix). Budget enforced;
  scores attached to every merge.
- Hand-rolled SVG charting on `/coffee/`. Log-fit regression math runs at
  build time in the page frontmatter, not in the browser.
- Image pipeline: HEIC source → responsive WebP variants, srcset + `sizes`
  tuned per slot, hero preloaded via imagesrcset.
- DOM-size discipline: `/coffee/` keeps inactive bag log rows in
  `<template>` fragments so element count stays flat as the log grows.

## Local

Astro static site, deployed on Cloudflare Pages.

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # output in dist/
```

Content in `src/data/*.ts`. Styles in `src/styles/global.css`.
Cloudflare setup in `DEPLOYMENT.md`.
