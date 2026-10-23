// Hours of RSS history kept by scripts/refresh-data.mjs (UN News and CEOBS).
// FIRMS is ingested from a 24-hour CSV and is not filtered by this window.
// The client reads windowHours from public/data/live-events.json and falls
// back to this value when that field is missing.
export const LIVE_WINDOW_HOURS = 24 * 30;
