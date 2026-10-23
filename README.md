# Scorch

Scorch is a static site for comparing public reports of conflict damage, oil fires, and emissions with unconfirmed satellite heat.

The site is https://scorch.jcstein.dev.

## Local Run

```bash
npm ci
npm run build
npx vite preview --host 127.0.0.1 --port 4173
```

`npm run build` downloads `public/data` when those files are missing, then runs Vite. Open `http://127.0.0.1:4173/`.

## Hosting

Cloudflare Pages builds `main` with `npm run build` and publishes `dist`. Leave `NODE_VERSION` at 22. Do not set `SCORCH_BASE` there: the default asset base is `/`.

GitHub Pages still deploys from `.github/workflows/pages.yml`. That workflow sets `SCORCH_BASE=/scorch/` so assets resolve under the project path. Canonical and social tags point at https://scorch.jcstein.dev. The GitHub Pages copy stays usable at https://jcstein.github.io/scorch/ rather than redirecting, so that address keeps working if the Cloudflare deployment is unavailable.

## Data Refresh (Every 6 Hours)

`scripts/refresh-data.mjs` checks source links and builds a live ingest payload from public feeds:

- NASA FIRMS (global 24h thermal anomalies)
- UN News Peace and Security RSS
- CEOBS RSS

Generated files:

- `public/data/refresh.json`
- `public/data/link-health.json`
- `public/data/live-events.json`

Those files are not committed on `main`. The refresh workflow publishes them on `cursor/jcs/source-data-595d`. `scripts/fetch-data.mjs`, which `npm run build` runs first, downloads them from that branch when they are missing. A failed download exits non-zero, so Cloudflare Pages and GitHub Pages both keep the last good deployment. Pull requests should not add or modify `public/data`.

For a local copy without a full build:

```bash
node scripts/fetch-data.mjs
```

Or regenerate it with `mkdir -p public/data && node scripts/refresh-data.mjs`.

Automation lives in `.github/workflows/refresh-data.yml` with cron:

`0 */6 * * *`
