# Scorch

Scorch is a static web app/PWA for tracking war damage, oil fires, and emissions through public sources.

## Local Run

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory .
```

Open `http://127.0.0.1:4173/index.html`.

## GitHub Pages

This repo deploys through `.github/workflows/pages.yml` on every push to `main`.

## Data Refresh (Every 6 Hours)

`scripts/refresh-data.mjs` checks source links and builds a live ingest payload from public feeds:

- NASA FIRMS (global 24h thermal anomalies)
- UN News Peace and Security RSS
- CEOBS RSS

Generated files:

- `public/data/refresh.json`
- `public/data/link-health.json`
- `public/data/live-events.json`

Those files are not committed on `main`. The refresh workflow publishes them on `cursor/jcs/source-data-595d`, and the Pages build copies that branch into `public/data` before `npm run build`. If that copy fails, the Pages job fails and the previous deployment stays up. Pull requests should not add or modify `public/data` (deleting them from `main` is the one-time move in the pipeline change).

For a local copy of the latest payload:

```bash
git fetch origin cursor/jcs/source-data-595d
git checkout origin/cursor/jcs/source-data-595d -- public/data
```

Or regenerate it with `node scripts/refresh-data.mjs` (that creates `public/data` if you `mkdir -p public/data` first).

Automation lives in `.github/workflows/refresh-data.yml` with cron:

`0 */6 * * *`
