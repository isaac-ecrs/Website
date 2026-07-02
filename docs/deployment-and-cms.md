# Deployment & CMS

How the ECRS site gets content, builds, and deploys. Read this before
changing CI, the CMS config, or anything touching `main`.

## Hosting & deploys

- **Cloudflare Pages** builds and deploys via its native Git integration:
  every push to `main` triggers `npm run build` on CF's side. GitHub Actions
  does **not** deploy.
- **GitHub Actions is validation-only and does not gate deploys.** The real
  safety net is the build itself: the zod schemas in `src/content.config.ts`
  make `astro build` fail on invalid content, and Cloudflare keeps serving
  the last successful deployment when a build fails.
- **Do not add branch protection or required status checks to `main`.**
  Sveltia CMS commits directly to `main` (see below); required checks would
  block every content edit.
- **Weekly rebuild** (`.github/workflows/scheduled-deploy.yml`): Mondays
  08:00 UTC, a Cloudflare deploy hook rebuilds the site. The site is static,
  so date-dependent output (upcoming vs. past events) only changes at build
  time — the cron rolls events over even when nothing is committed.
- **Path-aware CI** (`.github/workflows/actions.yaml`): commits that only
  touch content (`src/data/**`, `public/images/**` — i.e. every Sveltia
  edit) run just the fast validators (`check` + `build`). Code changes also
  run unit tests, Playwright e2e (against the built site), and Lighthouse
  (accessibility/best-practices/SEO enforced at ≥ 0.9).
- `functions/_middleware.js` is a Cloudflare Pages Function that stamps a
  consent region onto the HTML at the edge for GA4 gating. It deploys
  automatically because it lives in `functions/`.

## CMS (Sveltia)

- Editors use **Sveltia CMS** at `/admin`. Configuration lives in
  `public/admin/config.yml` (GitHub backend, repo
  `EasternCooperative/Website`, branch `main`, media in `public/images/`).
- **Sveltia commits directly to `main`.** It does not support Decap's
  `editorial_workflow` (PR-based review), and nothing in this repo should
  assume PR-based content review.
- **OAuth** runs through an external Cloudflare Worker
  (`sveltia-cms-auth.isaac-cd9.workers.dev`) — not part of this repo.
- **The Sveltia bundle is version-pinned via npm**, not loaded from a CDN:
  `@sveltia/cms` is a devDependency, and `scripts/copy-sveltia-cms.mjs`
  (run by the `predev`/`prestart`/`prebuild` npm scripts) copies the bundle
  to `public/admin/sveltia-cms.js` (gitignored). Dependabot proposes
  upgrades like any other package. Never reintroduce an unpinned CDN URL.
- `local_backend: true` lets you edit against the local repo: run
  `npm run dev` and open `http://localhost:4321/admin`.

## Content model

| CMS collection | Target                                                   | Consumed via                                   |
| -------------- | -------------------------------------------------------- | ---------------------------------------------- |
| Events         | `src/data/events/*.md`                                   | `event` content collection                     |
| Leaders        | `src/data/leaders/*.md`                                  | `leader` content collection                    |
| Venues         | `src/data/sites/*.md`                                    | `site` content collection                      |
| Testimonials   | `src/data/testimonials/*.md`                             | `testimonial` content collection               |
| Pages → Home   | `src/data/settings/landing.md`                           | `landingSettings` content collection           |
| Pages → others | `src/data/settings/*.json`, `src/data/pages/people.json` | direct ESM import by the page                  |
| Site Settings  | `src/data/settings/{site,navigation,footer}.json`        | direct ESM import by header/footer/event pages |

When adding or changing a CMS field, update **both** sides: the field in
`public/admin/config.yml` and the zod schema in `src/content.config.ts`
(plus the component that renders it). A field that exists only in the CMS
saves to the file but is silently stripped by Astro and renders nowhere.

## E2E fixtures

`src/data/events/e2e-*.md` are `draft: true` fixtures used by the Playwright
suite (`e2e-past-event`, `e2e-future-event`, `e2e-popover-fixture`). Drafts
are excluded from listings, and the sitemap filters `/events/e2e-`. Don't
delete them, and keep new fixtures on the `e2e-` prefix.
