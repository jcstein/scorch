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
- `public/data/live-summary.json` — reports, counts, and pre-aggregated heat cells for the first view
- `public/data/zones.json` — hotspot zones with a stable id, place name, and a short detection history
- `public/data/thermal/<tile>.json` — sensor points for one 10° tile, loaded when the map is zoomed in

`npm run build` also writes `public/feed.xml` from `zones.json`. The feed gains an item when a zone opens or closes. Zone history is carried forward from the previous `data` branch copy. A zone closes after 72 hours without detections and is dropped 14 days after it closes.

Run `npm test` for the zone, tile, and fetch checks.

Those files are not committed on `main`. The refresh workflow publishes them on `data`. `scripts/fetch-data.mjs`, which `npm run build` runs first, downloads the summary from that branch and then each tile it lists. A failed download exits non-zero, so Cloudflare Pages and GitHub Pages both keep the last good deployment. Pull requests should not add or modify `public/data`.

For a local copy without a full build:

```bash
node scripts/fetch-data.mjs
```

Or regenerate it with `mkdir -p public/data && node scripts/refresh-data.mjs`.

Automation lives in `.github/workflows/refresh-data.yml` with cron:

`0 */6 * * *`

That workflow also files zone alerts and redeploys Cloudflare Pages. Thresholds are `ZONE_ALERT_OPEN_MIN` (default 15) and `ZONE_ALERT_GROWTH_MIN` (default 50) at the top of the workflow file.

The first alert run records zones that already exist and does not open issues for them. It opens a `zone-alert` issue when a zone newly opens at or above the open threshold, or when a growing zone crosses the growth threshold for the first time. The same zone and reason are not filed twice. When a zone closes, the workflow comments on its open issue and closes it. Remembered ids live on the `data` branch in `public/data/zone-alerts.json`, separate from the small `zones.json` the map downloads.

After a data push, and on a manual run, the workflow deploys the Cloudflare Pages project `scorch` from `main` and fails the job if that deployment fails. It uses the `CLOUDFLARE_API_TOKEN` secret (Pages edit). `CLOUDFLARE_ACCOUNT_ID` can be a repository variable or secret; otherwise the deploy script uses its built-in account id. A missing `CLOUDFLARE_API_TOKEN` skips the deploy with a warning.
