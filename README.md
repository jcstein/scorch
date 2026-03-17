# Damage Atlas

Damage Atlas is a static web app/PWA for tracking war damage, oil fires, and emissions through public sources.

## Local Run

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory .
```

Open `http://127.0.0.1:4173/index.html`.

## GitHub Pages

This repo deploys through `.github/workflows/pages.yml` on every push to `main`.

## Data Refresh (Every 6 Hours)

`scripts/refresh-data.mjs` checks source links and writes:

- `data/refresh.json`
- `data/link-health.json`

Automation lives in `.github/workflows/refresh-data.yml` with cron:

`0 */6 * * *`
