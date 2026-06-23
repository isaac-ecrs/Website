/**
 * Post-build SRI injection.
 *
 * Scans every HTML file in dist/, finds <script src="https://..."> tags that
 * are missing an integrity attribute, fetches each URL once, computes its
 * SHA-384 hash, and writes the attribute back into the file.
 *
 * Run automatically via the "build" npm script: astro build && node scripts/inject-sri.mjs
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const distDir = new URL('../dist', import.meta.url).pathname;

async function findHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries.filter((e) => e.isFile() && e.name.endsWith('.html')).map((e) => join(e.parentPath, e.name));
}

// Cache Promises so each URL is fetched exactly once even with parallel files.
const hashCache = new Map();

function fetchSri(url) {
  if (hashCache.has(url)) return hashCache.get(url);
  const promise = fetch(url).then(async (res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    const sri = `sha384-${createHash('sha384').update(bytes).digest('base64')}`;
    console.log(`  ${url}\n    → ${sri}`);
    return sri;
  });
  hashCache.set(url, promise);
  return promise;
}

// Matches any opening <script ...> tag so we can inspect its attributes.
const SCRIPT_TAG_RE = /<script\b([^>]*)>/gi;

async function processFile(filePath) {
  let html = await readFile(filePath, 'utf8');
  const matches = [...html.matchAll(SCRIPT_TAG_RE)];

  // Collect tags that need hashing before mutating the string.
  const pending = [];
  for (const match of matches) {
    const attrs = match[1];
    if (attrs.includes('integrity=')) continue;
    const src = attrs.match(/\bsrc="(https:\/\/[^"]+)"/)?.[1];
    if (src) pending.push({ match, src });
  }
  if (pending.length === 0) return;

  // Fetch all needed hashes in parallel for this file.
  const results = await Promise.allSettled(pending.map(({ src }) => fetchSri(src)));

  // Apply replacements from end → start so earlier string indices stay valid.
  for (let i = pending.length - 1; i >= 0; i--) {
    const result = results[i];
    const { match, src } = pending[i];
    if (result.status === 'rejected') {
      console.warn(`  WARN: could not hash ${src}: ${result.reason.message}`);
      continue;
    }
    const newTag = `<script${match[1]} integrity="${result.value}" crossorigin="anonymous">`;
    html = html.slice(0, match.index) + newTag + html.slice(match.index + match[0].length);
  }

  await writeFile(filePath, html);
}

const files = await findHtmlFiles(distDir);
console.log(`inject-sri: scanning ${files.length} HTML files…`);
await Promise.all(files.map(processFile));
console.log('inject-sri: done');
