# ECRS Website — Design & Technical Audit

_Date: 2026-06-19 · Branch: `ecrs-initial` · Scope: real ECRS surface only_

This audit covers UX, accessibility, maintainability, SEO, performance, and
monitoring for the live ECRS pages: **home, events (list + detail), about,
contact, donate, membership, privacy, terms, 404**. AstroWind template demos
(`homes/`, `landing/`, `services`, `pricing`, demo blog) are treated as
out-of-scope content slated for deletion (see §2).

Overall the build is in good shape: it already does the hard accessibility work
(skip link, WCAG 2.2.2 video pause toggle, `prefers-reduced-motion` handling,
ARIA labelling, focus-visible rings), ships event `JSON-LD`, and uses
`astro-seo` for per-page metadata, Open Graph, Twitter cards, and canonicals.
Brand colors are already chosen for WCAG AA contrast. The findings below are
refinements, not a rescue.

Severity: 🔴 high · 🟡 medium · 🟢 low/polish

---

## 1. Monitoring (page views + load times) — _not yet in place_

🔴 **No analytics is configured** (`config.yaml` → `analytics.vendors.googleAnalytics.id: null`).
Decision: install **both** Cloudflare Web Analytics (RUM — page views, Core Web
Vitals, real load times, no cookie banner) **and** GA4 (engagement events).

- ✅ **DONE** — Cloudflare Web Analytics beacon wired via config
  (`analytics.vendors.cloudflareWebAnalytics.token`) +
  `CloudflareWebAnalytics.astro` in the head. Cookieless, loads everywhere, no
  consent. Covers page views + Core Web Vitals / load times. Token currently
  scoped to `website-alc.pages.dev`; add `ecrs.org` to the same CF site at cutover.
- ✅ **DONE** — GA4 (`G-RE9RDKP35W`) wired via `Analytics.astro`, consent-gated.
  A Cloudflare Pages Function (`functions/_middleware.js`) stamps
  `data-consent-region` on `<html>` at the edge; policy is **gate everywhere
  except the US** (unknown country defaults to gated). `ConsentBanner.astro`
  shows only in gated regions until the visitor chooses; GA4 loads only after
  Accept (US loads immediately). Choice persisted in `localStorage`; page_view
  re-sent on View Transition navigations; skipped on localhost.

---

## 2. Maintainability — dead template content (approved for deletion)

🔴 Unused AstroWind demo content currently builds into the site and is listed in
the sitemap (indexable):

| Item                | Path                                                                       |
| ------------------- | -------------------------------------------------------------------------- |
| Services demo       | `src/pages/services.astro`                                                 |
| Pricing demo        | `src/pages/pricing.astro`                                                  |
| Home demos (4)      | `src/pages/homes/*`                                                        |
| Landing demos (6)   | `src/pages/landing/*`                                                      |
| Demo blog posts (6) | `src/data/post/*`                                                          |
| Orphan analytics    | `src/components/common/SplitbeeAnalytics.astro` (Splitbee service defunct) |

- Disable blog in `config.yaml` (`apps.blog.isEnabled: false`); `rss.xml.ts`
  already 404s when blog is off.
- **Orphaned widgets** to remove _after_ verifying zero real-page usage:
  `Pricing`, `Brands`, `Testimonials`, `Hero2`, `Features3`, `Steps2`, `Note`,
  `Announcement`, `BlogLatestPosts`, `Steps`, `FAQs`, `Timeline`, `Form`.
  The blog subsystem (`src/components/blog/*`, incl. `RelatedPosts` →
  `BlogHighlightedPosts`) is self-contained — its only "real" usage is internal,
  so it removes cleanly with the blog teardown.
  **Keep** (used by real pages): `Content`, `Features`, `Features2`, `Stats`,
  `Hero`/`HeroText`, `VideoHero`, `EventCard`, `CognitoForm`, `CallToAction`,
  `Header`, `Footer`. Verify each individually before deleting.
- Removing demos also shrinks the sitemap to real pages automatically.

🟢 DRY: the homepage "More Upcoming Events" block hand-rolls a card that
duplicates `EventCard.astro`. Consider rendering `EventCard` instead.

---

## 3. Performance

> ⚠️ This section is **static-analysis inference** (asset weights + code review),
> not measured Core Web Vitals. The Cloudflare Web Analytics RUM added in §1 will
> provide real LCP/INP/CLS field data once deployed; run a Lighthouse pass on
> home + one event page if a point-in-time lab measurement is needed sooner.

🟡 **Hero videos** (`public/videos/`): first `.webm` is ~1.2–2.1 MB and autoplays.
`preload="metadata"` on the first video + `none` on the rest is correct; posters
are present. Acceptable, but it is the single heaviest above-the-fold payload —
keep encodes lean and consider a mobile poster-only fallback.

- ✅ The 7.3 GB `.mov` source files in `public/videos/` are correctly
  `.gitignore`d (`public/videos/*.mov`), so they are not in the repo and CF
  builds (from git) won't ship them. Only risk: a direct local `dist/` deploy.

🟡 **Unoptimized raster images.** Event/Content images use raw `<img src>` with
CMS string paths (e.g. `ecrs-2000s-history.jpg` is 737 KB), so they skip Sharp
(no AVIF/WebP, no responsive `srcset`). `width`/`height` are set (good — no CLS).
Options: pre-compress the source assets, or route CMS images through an
`<Image>`-style optimizer that accepts runtime string paths.

✅ **DONE** — `public/_headers` now sets security headers globally
(`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, HSTS,
`Permissions-Policy`) and caching: `immutable` for hashed `/_astro/*`, a 30-day
cache for `/fonts/*`, and `max-age + stale-while-revalidate` for the
CMS-editable `/images/*` and `/videos/*` (so same-name swaps still refresh).

🟢 Countdown timer rebuilds `innerHTML` every second via `setInterval` — trivial,
but could diff text nodes instead.

---

## 4. Accessibility — _strong; minor gaps_

✅ Already handled: skip-to-content link, `prefers-reduced-motion`, WCAG 2.2.2
video pause/play toggle, `aria-label`/`aria-current`/`role="list"`, focus-visible
rings, semantic headings, dark mode.

🟡 **Muted text contrast.** `--aw-color-text-muted` is `#363031 @ 72%` on white
(~3.9:1) and `66%` in dark mode — below the 4.5:1 AA threshold for normal-size
text. Used for secondary copy/labels. Bump opacity (≈80%+) or restrict to large
text.

🟢 Event-detail description is injected with `Fragment set:html=...` (CMS content,
`\n`→`<br>`). Org-controlled so low risk, but it bypasses sanitization — document
or sanitize.

🟢 Event hero `<img>` sits inside an `aria-hidden="true"` wrapper while carrying
meaningful `alt` text that duplicates the `<h1>`. Fine as decorative, but the
`alt` could be `""` to match intent.

---

## 5. SEO — _strong; small wins_

✅ Per-page `astro-seo` metadata, Open Graph + Twitter cards, canonicals,
`@astrojs/sitemap`, event `JSON-LD`, default OG image, sensible title template.

✅ ~~`robots.txt` does not advertise the sitemap.~~ False alarm — the source
`public/robots.txt` omits it, but the astrowind integration auto-injects
`Sitemap: https://ecrs.org/sitemap-index.xml` into the built `dist/robots.txt`.
Verified post-cleanup; sitemap now lists only the 14 real ECRS URLs.

✅ **DONE** — Added Organization/NGO `JSON-LD` to the homepage (legal name
"Eastern Cooperative Recreation School", `alternateName` ECRS, logo, mission,
`sameAs` → Facebook + Instagram), generated from `site.json`.

🟢 Event `JSON-LD` `eventStatus` ternary returns `EventScheduled` on both
branches — harmless redundancy; past events could map to a distinct status.

---

## 6. UX — _solid_

✅ Clear hero with featured-event card + countdown, sensible CTAs, breadcrumb on
event detail, native share with clipboard fallback, `.ics` calendar export,
maps deep-link with desktop fallback.

🟢 Contact/Donate pages are a thin wrapper around a Cognito iframe — acceptable;
consider a short intro + fallback contact email in case the iframe fails to load.

🟢 **404 page** uses the bare `Layout` (no header/footer), so a lost visitor has
no navigation except the "homepage" button — and that button is a bare `.btn`
with no variant (likely renders under-styled). Switch to `PageLayout` and a
`btn-primary`, optionally add quick links (Events, About, Contact).

---

## Suggested execution order

1. **Cleanup (approved):** delete demo pages/blog/Splitbee + orphan widgets,
   disable blog. _Objective, low-risk._
2. **Monitoring (approved):** Cloudflare Web Analytics + GA4 + consent banner.
3. **Headers & SEO quick wins:** `_headers` (cache + security), `robots.txt`
   sitemap line, homepage Organization JSON-LD.
4. **Accessibility:** muted-text contrast bump.
5. **Performance:** image compression/optimization pass.
6. **Polish (optional):** EventCard DRY, countdown diffing, Cognito fallbacks.
   </content>
   </invoke>
