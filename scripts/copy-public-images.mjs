/**
 * Prebuild step: copy raster images from public/images/ into src/assets/images/
 * so Astro's Sharp optimizer can process CMS-uploaded files.
 *
 * - Runs automatically via the "prebuild" npm script before every `npm run build`.
 * - Safe to re-run: only copies when the source is newer than the destination.
 * - Does NOT modify any content/data files — paths written by the CMS (/images/…)
 *   are remapped by findImage at build time.
 * - During `npm run dev`, images are served directly from public/ (unoptimized but
 *   immediately visible — no copy needed for authoring).
 */

import { cpSync, statSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'public', 'images');
const dest = join(root, 'src', 'assets', 'images');

const RASTER = /\.(jpe?g|png|webp|gif|tiff?)$/i;

let copied = 0;
let skipped = 0;

function copyDir(srcDir, destDir) {
  mkdirSync(destDir, { recursive: true });
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (RASTER.test(entry.name)) {
      const srcMtime = statSync(srcPath).mtimeMs;
      let destMtime = 0;
      try {
        destMtime = statSync(destPath).mtimeMs;
      } catch {
        /* not yet copied */
      }
      if (srcMtime > destMtime) {
        cpSync(srcPath, destPath);
        copied++;
      } else {
        skipped++;
      }
    }
  }
}

copyDir(src, dest);
console.log(`[copy-public-images] copied ${copied}, skipped ${skipped} (up-to-date)`);
