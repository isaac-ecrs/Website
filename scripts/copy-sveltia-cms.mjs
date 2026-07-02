/**
 * Copy the Sveltia CMS bundle from node_modules into public/admin/ so the
 * admin page serves it same-origin at a version pinned by package.json
 * (updated via Dependabot) instead of a floating CDN URL.
 *
 * Runs via the predev/prebuild npm scripts. The copy is gitignored.
 */

import { copyFile } from 'node:fs/promises';

const src = new URL('../node_modules/@sveltia/cms/dist/sveltia-cms.js', import.meta.url);
const dest = new URL('../public/admin/sveltia-cms.js', import.meta.url);

await copyFile(src, dest);
console.log('copy-sveltia-cms: copied sveltia-cms.js to public/admin/');
