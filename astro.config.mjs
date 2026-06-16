import { defineConfig } from 'astro/config';

// Fully static build — every route is prerendered, so no adapter is needed.
// Cloudflare Pages serves the `dist/` output directly from its CDN (no Pages
// Functions). `site` is the eventual production domain (canonical URLs /
// sitemap); the rebuild currently lives at a *.pages.dev URL.
export default defineConfig({
  site: 'https://ecrs.org',
  output: 'static',
});
