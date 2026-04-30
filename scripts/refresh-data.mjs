import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const appPath = resolve(repoRoot, "app.js");
const refreshPath = resolve(repoRoot, "public", "data", "refresh.json");
const linkHealthPath = resolve(repoRoot, "public", "data", "link-health.json");
const liveEventsPath = resolve(repoRoot, "public", "data", "live-events.json");

const SOURCE_REGEX = /id:\s*"([^"]+)"[\s\S]*?link:\s*"([^"]+)"/g;
const USER_AGENT = "scorch-refresh/2.0 (+https://github.com/jcstein/damage)";
const generatedAt = new Date().toISOString();
const generatedDate = new Date(generatedAt);
const LIVE_WINDOW_HOURS = 24 * 30;

const INGEST_FEEDS = {
  firms: {
    id: "firms_modis_global_24h",
    label: "NASA FIRMS MODIS (Global 24h CSV)",
    url: "https://firms.modaps.eosdis.nasa.gov/data/active_fire/c6.1/csv/MODIS_C6_1_Global_24h.csv"
  },
  unNews: {
    id: "un_news_peace_security",
    label: "UN News Peace and Security RSS",
    url: "https://news.un.org/feed/subscribe/en/news/topic/peace-and-security/feed/rss.xml"
  },
  ceobs: {
    id: "ceobs_rss",
    label: "CEOBS RSS",
    url: "https://ceobs.org/feed/"
  }
};

const AREAS = [
  {
    id: "iran-gulf",
    region: "Iran / Gulf",
    center: [30.4, 52.2],
    bounds: [
      [23.0, 44.0],
      [37.2, 61.8]
    ],
    keywords: [
      "iran",
      "tehran",
      "hormuz",
      "persian gulf",
      "gulf",
      "kuwait",
      "uae",
      "fujairah",
      "saudi"
    ]
  },
  {
    id: "gaza",
    region: "Gaza",
    center: [31.43, 34.38],
    bounds: [
      [31.18, 34.16],
      [31.64, 34.62]
    ],
    keywords: ["gaza", "palestin", "west bank", "rafah", "khan younis"]
  },
  {
    id: "ukraine",
    region: "Ukraine",
    center: [48.9, 31.4],
    bounds: [
      [44.0, 22.0],
      [52.5, 40.5]
    ],
    keywords: [
      "ukraine",
      "ukrainian",
      "kyiv",
      "kiev",
      "donetsk",
      "zaporizhzhia",
      "odesa",
      "odessa",
      "kharkiv"
    ]
  },
  {
    id: "sudan",
    region: "Sudan",
    center: [15.5, 30.3],
    bounds: [
      [8.0, 21.5],
      [22.4, 38.8]
    ],
    keywords: ["sudan", "darfur", "khartoum"]
  },
  {
    id: "united-states",
    region: "United States",
    center: [31.8, -102.3],
    bounds: [
      [29.0, -105.6],
      [34.8, -99.0]
    ],
    keywords: ["united states", "u.s.", "usa", "texas", "permian", "louisiana"]
  },
  {
    id: "global-hub",
    region: "Global",
    center: [18.0, -28.0],
    keywords: []
  }
];

const AREA_BY_ID = new Map(AREAS.map((area) => [area.id, area]));

function parseSources(appCode) {
  const startMarker = "const sources = [";
  const endMarker = "const preferredSignalOrder = [";
  const start = appCode.indexOf(startMarker);
  const end = appCode.indexOf(endMarker);

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not locate the sources array in app.js.");
  }

  const sourceSection = appCode.slice(start, end);
  const byId = new Map();
  const matches = sourceSection.matchAll(SOURCE_REGEX);

  for (const match of matches) {
    const [, id, url] = match;
    if (!byId.has(id)) {
      byId.set(id, { id, url });
    }
  }

  return [...byId.values()];
}

function withinBounds(lat, lon, bounds) {
  if (!bounds) {
    return false;
  }

  const [[south, west], [north, east]] = bounds;
  return lat >= south && lat <= north && lon >= west && lon <= east;
}

function getArea(areaId) {
  return AREA_BY_ID.get(areaId) || AREA_BY_ID.get("global-hub");
}

function findAreaByPoint(lat, lon) {
  for (const area of AREAS) {
    if (area.id === "global-hub") {
      continue;
    }
    if (withinBounds(lat, lon, area.bounds)) {
      return area.id;
    }
  }
  return "global-hub";
}

function inferAreaFromText(text) {
  const haystack = normalizeWhitespace(text).toLowerCase();
  for (const area of AREAS) {
    if (!area.keywords.length) {
      continue;
    }
    if (area.keywords.some((keyword) => haystack.includes(keyword))) {
      return area.id;
    }
  }
  return "global-hub";
}

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hashString(input) {
  let hash = 0;
  const text = String(input || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function jitterPoint(center, seedText) {
  const seed = hashString(seedText || "");
  const latOffset = ((seed % 2000) / 1000 - 1) * 0.8;
  const lonOffset = ((((seed / 2000) | 0) % 2000) / 1000 - 1) * 1.2;
  return [
    clamp(center[0] + latOffset, -85, 85),
    clamp(center[1] + lonOffset, -180, 180)
  ];
}

function decodeEntities(input) {
  let output = String(input || "");
  const named = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": "\"",
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " "
  };

  for (const [from, to] of Object.entries(named)) {
    output = output.split(from).join(to);
  }

  output = output.replace(/&#(\d+);/g, (_, value) => {
    const code = Number(value);
    return Number.isFinite(code) ? String.fromCharCode(code) : "";
  });

  output = output.replace(/&#x([0-9a-fA-F]+);/g, (_, value) => {
    const code = Number.parseInt(value, 16);
    return Number.isFinite(code) ? String.fromCharCode(code) : "";
  });

  return output;
}

function stripHtml(value) {
  const noTags = String(value || "").replace(/<[^>]*>/g, " ");
  return normalizeWhitespace(decodeEntities(noTags));
}

function parseRssTag(itemBlock, tag) {
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = itemBlock.match(pattern);
  if (!match) {
    return "";
  }

  const raw = match[1]
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "");
  return normalizeWhitespace(decodeEntities(raw));
}

function parseRssItems(xmlText) {
  const items = [];
  const matches = String(xmlText).matchAll(/<item>([\s\S]*?)<\/item>/gi);
  for (const match of matches) {
    items.push(match[1]);
  }
  return items;
}

function summarize(text, max = 220) {
  const clean = normalizeWhitespace(text);
  if (!clean || clean.length <= max) {
    return clean;
  }
  return `${clean.slice(0, max - 1).trimEnd()}...`;
}

function parseCsvRows(csvText) {
  const lines = String(csvText || "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(",").map((header) => header.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = lines[i].split(",");
    if (values.length !== headers.length) {
      continue;
    }
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    rows.push(row);
  }

  return rows;
}

function parseFirmsTimestamp(acqDate, acqTime) {
  const datePart = normalizeWhitespace(acqDate);
  const timePart = String(acqTime || "").padStart(4, "0");
  if (!datePart || timePart.length !== 4) {
    return null;
  }
  const iso = `${datePart}T${timePart.slice(0, 2)}:${timePart.slice(2)}:00Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function normalizeIsoDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function inferSeverityFromFirms(frp) {
  if (frp >= 80) {
    return "high";
  }
  if (frp >= 30) {
    return "medium";
  }
  return "low";
}

function inferSeverityFromText(text) {
  const haystack = normalizeWhitespace(text).toLowerCase();
  if (
    /(killed|dead|strike|airstrike|bomb|attack|surge|hospital|massive fire|explosion)/i.test(
      haystack
    )
  ) {
    return "high";
  }
  if (/(warning|concern|risk|ceasefire|security council|talks)/i.test(haystack)) {
    return "medium";
  }
  return "low";
}

function enrichSignals(baseSignals, text) {
  const signals = [...baseSignals];
  const haystack = normalizeWhitespace(text).toLowerCase();

  if (/(oil|refinery|depot|fuel|pipeline|flare)/i.test(haystack)) {
    signals.push("Oil Fires");
  }
  if (/(fire|wildfire|burn|thermal|smoke)/i.test(haystack)) {
    signals.push("Thermal");
  }
  if (/(methane|emission|flaring)/i.test(haystack)) {
    signals.push("Methane");
  }
  if (/(civilian|casualt|displac)/i.test(haystack)) {
    signals.push("Civilian Harm");
  }
  if (/(water|pollution|environment|contaminat)/i.test(haystack)) {
    signals.push("Environmental Risk");
  }

  return [...new Set(signals)];
}

function buildEventId(prefix, ...parts) {
  return `${prefix}-${hashString(parts.join("|")).toString(16)}`;
}

function dedupeById(events) {
  const byId = new Map();
  for (const event of events) {
    if (!byId.has(event.id)) {
      byId.set(event.id, event);
    }
  }
  return [...byId.values()];
}

function sortEventsByTime(events) {
  return [...events].sort((a, b) => {
    const timeA = new Date(a.eventTime).getTime();
    const timeB = new Date(b.eventTime).getTime();
    return timeB - timeA;
  });
}

function dedupeFirmsGrid(events) {
  const byCell = new Map();
  for (const event of events) {
    const key = `${event.areaId}:${event.lat.toFixed(1)}:${event.lon.toFixed(1)}`;
    const current = byCell.get(key);
    if (!current || Number(event.frp || 0) > Number(current.frp || 0)) {
      byCell.set(key, event);
    }
  }
  return [...byCell.values()];
}

function sampleFirmsEvents(events) {
  const deduped = dedupeFirmsGrid(events);
  return sortEventsByTime(deduped);
}

function withinWindow(isoTime) {
  const millis = new Date(isoTime).getTime();
  if (Number.isNaN(millis)) {
    return false;
  }
  const ageHours = (generatedDate.getTime() - millis) / (1000 * 60 * 60);
  return ageHours <= LIVE_WINDOW_HOURS;
}

async function fetchText(url, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": USER_AGENT },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Fetch failed (${response.status}) for ${url}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function ingestFirms() {
  const feed = INGEST_FEEDS.firms;
  const text = await fetchText(feed.url);
  const rows = parseCsvRows(text);
  const events = [];

  for (const row of rows) {
    const lat = Number(row.latitude);
    const lon = Number(row.longitude);
    const frp = Number(row.frp);
    const brightness = Number(row.brightness);
    const eventTime = parseFirmsTimestamp(row.acq_date, row.acq_time);

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !eventTime) {
      continue;
    }

    const areaId = findAreaByPoint(lat, lon);
    const area = getArea(areaId);
    const summaryBits = [];
    if (Number.isFinite(frp)) {
      summaryBits.push(`FRP ${frp.toFixed(1)} MW`);
    }
    if (Number.isFinite(brightness)) {
      summaryBits.push(`brightness ${brightness.toFixed(1)} K`);
    }
    if (row.satellite) {
      summaryBits.push(`satellite ${row.satellite}`);
    }

    events.push({
      id: buildEventId("firms", row.acq_date, row.acq_time, lat.toFixed(3), lon.toFixed(3)),
      type: "thermal",
      severity: inferSeverityFromFirms(frp),
      title: "FIRMS thermal anomaly",
      summary: summarize(summaryBits.join(", ")),
      region: area.region,
      groups: [...new Set([area.region, "Global"])],
      areaId,
      lat,
      lon,
      eventTime,
      sourceName: "NASA FIRMS",
      sourceUrl: feed.url,
      link: "https://firms.modaps.eosdis.nasa.gov/map/",
      signals: ["Thermal", "Oil Fires", "Satellite"],
      frp: Number.isFinite(frp) ? frp : null
    });
  }

  const sampled = sampleFirmsEvents(events);
  return {
    source: {
      id: feed.id,
      label: feed.label,
      url: feed.url,
      ok: true,
      count: sampled.length,
      fetchedAt: generatedAt
    },
    events: sampled
  };
}

async function ingestUnNews() {
  const feed = INGEST_FEEDS.unNews;
  const xml = await fetchText(feed.url);
  const itemBlocks = parseRssItems(xml);
  const events = [];

  for (const block of itemBlocks) {
    const title = parseRssTag(block, "title");
    const link = parseRssTag(block, "link");
    const description = stripHtml(parseRssTag(block, "description"));
    const pubDate = normalizeIsoDate(parseRssTag(block, "pubDate"));
    if (!title || !link || !pubDate) {
      continue;
    }
    if (!withinWindow(pubDate)) {
      continue;
    }

    const text = `${title} ${description}`;
    const areaId = inferAreaFromText(text);
    const area = getArea(areaId);
    const [lat, lon] = jitterPoint(area.center, title);

    events.push({
      id: buildEventId("un", title, pubDate, link),
      type: "conflict",
      severity: inferSeverityFromText(text),
      title,
      summary: summarize(description, 240),
      region: area.region,
      groups: [...new Set([area.region, "Global"])],
      areaId,
      lat,
      lon,
      eventTime: pubDate,
      sourceName: "UN News",
      sourceUrl: feed.url,
      link,
      signals: enrichSignals(["Conflict Events", "Civilian Harm"], text)
    });
  }

  const selected = sortEventsByTime(dedupeById(events));
  return {
    source: {
      id: feed.id,
      label: feed.label,
      url: feed.url,
      ok: true,
      count: selected.length,
      fetchedAt: generatedAt
    },
    events: selected
  };
}

async function ingestCeobs() {
  const feed = INGEST_FEEDS.ceobs;
  const xml = await fetchText(feed.url);
  const itemBlocks = parseRssItems(xml);
  const events = [];

  for (const block of itemBlocks) {
    const title = parseRssTag(block, "title");
    const link = parseRssTag(block, "link");
    const description = stripHtml(parseRssTag(block, "description"));
    const pubDate = normalizeIsoDate(parseRssTag(block, "pubDate"));
    if (!title || !link || !pubDate) {
      continue;
    }
    if (!withinWindow(pubDate)) {
      continue;
    }

    const text = `${title} ${description}`;
    const areaId = inferAreaFromText(text);
    const area = getArea(areaId);
    const [lat, lon] = jitterPoint(area.center, link);

    events.push({
      id: buildEventId("ceobs", title, pubDate, link),
      type: "analysis",
      severity: inferSeverityFromText(text),
      title,
      summary: summarize(description, 240),
      region: area.region,
      groups: [...new Set([area.region, "Global"])],
      areaId,
      lat,
      lon,
      eventTime: pubDate,
      sourceName: "CEOBS",
      sourceUrl: feed.url,
      link,
      signals: enrichSignals(["Environmental Risk", "Oil Fires", "Air", "Water"], text)
    });
  }

  const selected = sortEventsByTime(dedupeById(events));
  return {
    source: {
      id: feed.id,
      label: feed.label,
      url: feed.url,
      ok: true,
      count: selected.length,
      fetchedAt: generatedAt
    },
    events: selected
  };
}

async function readPreviousLivePayload() {
  try {
    const text = await readFile(liveEventsPath, "utf8");
    const payload = JSON.parse(text);
    if (!payload || !Array.isArray(payload.events)) {
      return null;
    }
    return payload;
  } catch (_) {
    return null;
  }
}

function computeLiveStats(events) {
  const byType = {};
  const byArea = {};
  let newestEventAt = null;

  for (const event of events) {
    byType[event.type] = (byType[event.type] || 0) + 1;
    byArea[event.areaId] = (byArea[event.areaId] || 0) + 1;
    if (!newestEventAt || new Date(event.eventTime) > new Date(newestEventAt)) {
      newestEventAt = event.eventTime;
    }
  }

  return {
    totalEvents: events.length,
    byType,
    byArea,
    newestEventAt
  };
}

async function checkUrl(url) {
  const startedAt = Date.now();

  async function attempt(method) {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      headers: { "user-agent": USER_AGENT }
    });

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      finalUrl: response.url,
      method,
      lastModified: response.headers.get("last-modified"),
      etag: response.headers.get("etag"),
      cacheControl: response.headers.get("cache-control"),
      contentType: response.headers.get("content-type"),
      checkedAt: generatedAt,
      responseTimeMs: Date.now() - startedAt
    };
  }

  try {
    const head = await attempt("HEAD");
    if (head.ok || head.status === 405 || head.status === 403) {
      return head;
    }
  } catch (_) {
  }

  try {
    return await attempt("GET");
  } catch (error) {
    return {
      ok: false,
      status: null,
      statusText: null,
      finalUrl: null,
      method: "GET",
      lastModified: null,
      etag: null,
      cacheControl: null,
      contentType: null,
      checkedAt: generatedAt,
      responseTimeMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main() {
  const appCode = await readFile(appPath, "utf8");
  const sources = parseSources(appCode);

  if (!sources.length) {
    throw new Error("No sources were parsed from app.js.");
  }

  const healthResults = [];
  for (const source of sources) {
    const health = await checkUrl(source.url);
    healthResults.push({
      id: source.id,
      url: source.url,
      ...health
    });
  }

  const healthySources = healthResults.filter((result) => result.ok).length;

  const ingestSources = [];
  let liveEvents = [];

  const pipelines = [
    { run: ingestFirms, feed: INGEST_FEEDS.firms },
    { run: ingestUnNews, feed: INGEST_FEEDS.unNews },
    { run: ingestCeobs, feed: INGEST_FEEDS.ceobs }
  ];
  for (const pipeline of pipelines) {
    try {
      const result = await pipeline.run();
      ingestSources.push(result.source);
      liveEvents.push(...result.events);
    } catch (error) {
      ingestSources.push({
        id: pipeline.feed.id,
        label: pipeline.feed.label,
        url: pipeline.feed.url,
        ok: false,
        count: 0,
        fetchedAt: generatedAt,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  liveEvents = sortEventsByTime(dedupeById(liveEvents));

  let reusedPreviousEvents = false;
  if (!liveEvents.length) {
    const previous = await readPreviousLivePayload();
    if (previous?.events?.length) {
      liveEvents = previous.events;
      reusedPreviousEvents = true;
    }
  }

  const liveStats = computeLiveStats(liveEvents);
  const healthyLiveSources = ingestSources.filter((entry) => entry.ok).length;

  const refreshPayload = {
    generatedAt,
    totalSources: sources.length,
    healthySources,
    failingSources: sources.length - healthySources,
    liveEventsTotal: liveStats.totalEvents,
    liveEventsByType: liveStats.byType,
    liveSourcesHealthy: healthyLiveSources,
    liveSourcesTotal: ingestSources.length,
    scriptVersion: 2
  };

  const healthPayload = {
    generatedAt,
    results: healthResults
  };

  const livePayload = {
    generatedAt,
    windowHours: LIVE_WINDOW_HOURS,
    reusedPreviousEvents,
    sources: ingestSources,
    stats: liveStats,
    events: liveEvents
  };

  await writeFile(refreshPath, `${JSON.stringify(refreshPayload, null, 2)}\n`);
  await writeFile(linkHealthPath, `${JSON.stringify(healthPayload, null, 2)}\n`);
  await writeFile(liveEventsPath, `${JSON.stringify(livePayload, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
