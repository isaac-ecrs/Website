# Decap CMS Authentication Setup (GitHub OAuth via Cloudflare Worker)

The CMS no longer uses Netlify Identity / Git Gateway. Authentication now goes
through a GitHub OAuth App, brokered by a small Cloudflare Worker
([`sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth), which also
supports Decap's `github` backend). This works regardless of where the site is
hosted (Netlify or Cloudflare Pages).

Only **repo collaborators** on `isaac-ecrs/Website` can log in and commit, so
add each editor (<5) as a collaborator — no separate access gate is needed.

> ⚠️ **Do not merge the PR that introduces this until the steps below are done.**
> `main` auto-deploys to production (`netlify.toml`), and `config.yml` ships a
> `https://REPLACE-ME.workers.dev` placeholder. Merging before the Worker exists
> and `base_url` is real will break `/admin/` login in production. Complete the
> one-time setup, commit the real Worker URL, **then** merge.

## One-time setup

### 1. Create a GitHub OAuth App

GitHub → Settings → Developer settings → **OAuth Apps** → New OAuth App
(this is an _OAuth App_, NOT a "GitHub App" — they are different).

- **Application name:** ECRS CMS
- **Homepage URL:** `https://ecrs.org`
- **Authorization callback URL:** `https://<worker-subdomain>.workers.dev/callback`

Save, then generate a **Client secret**. Keep the **Client ID** and
**Client secret** for the next step.

### 2. Deploy the OAuth proxy Worker

```sh
git clone https://github.com/sveltia/sveltia-cms-auth.git
cd sveltia-cms-auth
npx wrangler deploy
```

Then set the secrets (never commit these):

```sh
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
# Restrict to this site's origin (recommended by sveltia-cms-auth):
npx wrangler secret put ALLOWED_DOMAINS   # e.g. ecrs.org
```

> Secret names are Worker-specific. The above are for `sveltia-cms-auth`;
> Decap-specific proxies (e.g. `ironshard-decap-oauth-proxy`) use
> `GITHUB_OAUTH_ID` / `GITHUB_OAUTH_SECRET` instead. **Follow the chosen
> Worker's current README** if they diverge.

Note the deployed Worker URL (e.g. `https://ecrs-cms-auth.<account>.workers.dev`).
Go back to the GitHub OAuth App and make sure its callback URL matches
`<worker-url>/callback`.

### 3. Point Decap at the Worker

In `public/admin/config.yml`, set `backend.base_url` to the Worker URL
(replacing the `https://REPLACE-ME.workers.dev` placeholder):

```yaml
backend:
  name: github
  repo: isaac-ecrs/Website
  branch: develop
  base_url: https://ecrs-cms-auth.<account>.workers.dev
```

### 4. Add editors as collaborators

GitHub → repo → Settings → Collaborators → add each editor.

## Verifying

1. Visit `https://ecrs.org/admin/` (or the deploy preview URL).
2. Click **Login with GitHub** → authorize. If the popup 404s or hangs,
   confirm the Worker's auth route matches Decap's `auth_endpoint` (defaults
   to `auth`, which matches `sveltia-cms-auth`'s `/auth` — set it explicitly
   in config.yml if the chosen Worker differs).
3. Make a small edit; confirm it flows through the editorial workflow
   (Draft → In Review → Ready) as a PR against `develop`.

## Local development

Unchanged: `npm run dev:cms` starts Decap with `local_backend: true`, which
bypasses GitHub auth and writes directly to local files. The OAuth proxy is
only used in deployed environments.
