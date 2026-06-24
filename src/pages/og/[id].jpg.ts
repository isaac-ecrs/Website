import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OG_W = 1200;
const OG_H = 630;
const ROOT = process.cwd();

// Fonts loaded once at module level
const FONTS = [
  {
    name: 'Oswald',
    data: readFileSync(resolve(ROOT, 'node_modules/@fontsource/oswald/files/oswald-latin-700-normal.woff')),
    weight: 700 as const,
    style: 'normal' as const,
  },
  {
    name: 'Oswald',
    data: readFileSync(resolve(ROOT, 'node_modules/@fontsource/oswald/files/oswald-latin-400-normal.woff')),
    weight: 400 as const,
    style: 'normal' as const,
  },
];

async function toDataUri(filePath: string): Promise<string> {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  // satori only supports jpeg/png/gif — convert everything else (e.g. webp) to jpeg via Sharp
  if (ext === 'jpg' || ext === 'jpeg') {
    return `data:image/jpeg;base64,${readFileSync(filePath).toString('base64')}`;
  }
  if (ext === 'png') {
    return `data:image/png;base64,${readFileSync(filePath).toString('base64')}`;
  }
  if (ext === 'gif') {
    return `data:image/gif;base64,${readFileSync(filePath).toString('base64')}`;
  }
  // Convert to jpeg
  const jpegBuffer = await sharp(filePath).jpeg({ quality: 90 }).toBuffer();
  return `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;
}

// Dark-mode logo (white highlights on letters) — converted from SVG to PNG for satori
let _darkLogoUri: string | undefined;
const darkLogoUri = async () => {
  if (_darkLogoUri) return _darkLogoUri;
  const pngBuffer = await sharp(resolve(ROOT, 'public/images/ecrs-logo-dark.svg')).png().toBuffer();
  _darkLogoUri = `data:image/png;base64,${pngBuffer.toString('base64')}`;
  return _darkLogoUri;
};

let _lineDanceUri: string | undefined;
const lineDanceUri = async () =>
  (_lineDanceUri ??= await toDataUri(resolve(ROOT, 'src/assets/images/ecrs-line-dance.jpg')));

async function svgToJpeg(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}

// ── Default branded card ──────────────────────────────────────────────────────

async function renderDefaultCard(): Promise<Buffer> {
  const logo = await darkLogoUri();
  const bg = await lineDanceUri();
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: { display: 'flex', width: OG_W, height: OG_H, position: 'relative', fontFamily: 'Oswald' },
        children: [
          // Background photo
          {
            type: 'img',
            props: {
              src: bg,
              style: { position: 'absolute', top: 0, left: 0, width: OG_W, height: OG_H, objectFit: 'cover' },
              width: OG_W,
              height: OG_H,
            },
          },
          // Dark overlay
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                width: OG_W,
                height: OG_H,
                background: 'rgba(0,0,0,0.62)',
              },
            },
          },
          // Centered content
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              },
              children: [
                // Logo — dark SVG is 228×210 (≈1.086:1), so at 200px wide → 184px tall
                {
                  type: 'img',
                  props: {
                    src: logo,
                    width: 200,
                    height: 184,
                    style: { width: 200, height: 184, marginBottom: 28 },
                  },
                },
                // Tagline
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: 56,
                      fontWeight: 700,
                      color: 'white',
                      textAlign: 'center',
                      lineHeight: 1.15,
                    },
                    children: 'Come to Play. Play to Learn.',
                  },
                },
                // URL
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 26, fontWeight: 400, color: 'rgba(255,255,255,0.55)', marginTop: 18 },
                    children: 'ecrs.org',
                  },
                },
              ],
            },
          },
        ],
      },
    },
    { width: OG_W, height: OG_H, fonts: FONTS }
  );

  return svgToJpeg(svg);
}

// ── Per-event card ────────────────────────────────────────────────────────────

// Dark SVG is 228×210 — at width 240: height = round(240 * 210/228) = 221
const DARK_LOGO_W = 240;
const DARK_LOGO_H = 221;

async function renderEventCard(title: string, dateStr: string, location: string): Promise<Buffer> {
  const logo = await darkLogoUri();
  const bg = await lineDanceUri();

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: { display: 'flex', width: OG_W, height: OG_H, position: 'relative', fontFamily: 'Oswald' },
        children: [
          // Background — same line-dance photo as the default card
          {
            type: 'img',
            props: {
              src: bg,
              width: OG_W,
              height: OG_H,
              style: { position: 'absolute', top: 0, left: 0, width: OG_W, height: OG_H, objectFit: 'cover' },
            },
          },
          // Dark overlay
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                width: OG_W,
                height: OG_H,
                background: 'rgba(0,0,0,0.65)',
              },
            },
          },
          // Centered content: logo + title + date
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 80px',
              },
              children: [
                {
                  type: 'img',
                  props: {
                    src: logo,
                    width: DARK_LOGO_W,
                    height: DARK_LOGO_H,
                    style: { width: DARK_LOGO_W, height: DARK_LOGO_H, marginBottom: 28 },
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: 72,
                      fontWeight: 700,
                      color: 'white',
                      textAlign: 'center',
                      lineHeight: 1.1,
                    },
                    children: title,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: 32,
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.75)',
                      marginTop: 16,
                      textAlign: 'center',
                    },
                    children: `${dateStr}  ·  ${location}`,
                  },
                },
                // CTA
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: 26,
                      fontWeight: 700,
                      color: '#bd0f5d',
                      marginTop: 28,
                      letterSpacing: 1,
                    },
                    children: 'Register at ecrs.org →',
                  },
                },
              ],
            },
          },
        ],
      },
    },
    { width: OG_W, height: OG_H, fonts: FONTS }
  );

  return svgToJpeg(svg);
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function formatEventDate(date: Date, endDate?: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
  const start = date.toLocaleDateString('en-US', opts);
  if (!endDate) return start;
  const sm = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const em = endDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const sy = date.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'UTC' });
  const ey = endDate.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'UTC' });
  const d1 = date.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' });
  const d2 = endDate.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' });
  if (sm === em && sy === ey) return `${sm} ${d1}–${d2}, ${sy}`;
  return `${sm} ${d1} – ${em} ${d2}, ${sy}`;
}

// ── Astro static route ────────────────────────────────────────────────────────

export async function getStaticPaths() {
  const events = await getCollection('event');
  return [{ params: { id: 'default' } }, ...events.map((e) => ({ params: { id: e.id }, props: { event: e } }))];
}

export const GET: APIRoute = async ({ params, props }) => {
  let img: Buffer;

  if (params.id === 'default') {
    img = await renderDefaultCard();
  } else {
    const { event } = props as { event: Awaited<ReturnType<typeof getCollection<'event'>>>[number] };
    const { data } = event;
    img = await renderEventCard(data.title, formatEventDate(data.date, data.endDate ?? undefined), data.location);
  }

  return new Response(new Uint8Array(img), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
