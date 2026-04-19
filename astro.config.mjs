import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://siriusganesh.com',
  integrations: [sitemap()],
  build: {
    // Inline all stylesheets into the HTML.
    // Keeps the single-file preview readable when opened via file://
    // and avoids an extra request on deploy for a tiny portfolio.
    inlineStylesheets: 'always',
  },
});
