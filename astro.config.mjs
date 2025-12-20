import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

export default defineConfig({
  site: 'https://ecrs.org',
  output: 'static',
  adapter: netlify({
    edgeMiddleware: false,
  }),
});
