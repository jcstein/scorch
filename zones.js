// Hotspot zones built from unconfirmed satellite detections.
// A detection joins the nearest zone whose center is within LINKAGE_KM.
// That keeps a zone a local hotspot. A 25 km single-link chain would
// otherwise merge a whole burning region into one identity.

export const LINKAGE_KM = 25;
export const MIN_DETECTIONS = 8;
export const CLOSE_AFTER_HOURS = 72;
export const PRUNE_CLOSED_AFTER_HOURS = 24 * 14;
export const SERIES_LIMIT = 16;
export const MATCH_KM = 30;
export const NOTICE_LIMIT = 200;
const NOTICE_KEEP_HOURS = 24 * 21;
export const SITE_URL = "https://scorch.jcstein.dev/";

export const ZONE_STATUS_RANK = {
  new: 0,
  growing: 1,
  steady: 2,
  fading: 3,
  closed: 4
};

export const ZONE_STATUS_LABEL = {
  new: "New",
  growing: "Growing",
  steady: "Steady",
  fading: "Fading",
  closed: "Closed"
};

const EARTH_KM = 6371.0088;
const CELL_DEGREES = 1;

export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = Math.PI / 180;
  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;
  const dPhi = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const h =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function normalizeLon(lon) {
  let value = Number(lon) || 0;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

function roundTo(value, places) {
  const factor = 10 ** places;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function hoursBetween(earlier, later) {
  const start = new Date(earlier).getTime();
  const end = later instanceof Date ? later.getTime() : new Date(later).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return Infinity;
  return (end - start) / 36e5;
}

function cellKey(lat, lon) {
  return `${Math.floor(lat / CELL_DEGREES)}:${Math.floor(normalizeLon(lon) / CELL_DEGREES)}`;
}

function indexKeys(lat, lon) {
  const lonN = normalizeLon(lon);
  const keys = new Set([cellKey(lat, lonN)]);
  if (lonN > 170) keys.add(cellKey(lat, lonN - 360));
  if (lonN < -170) keys.add(cellKey(lat, lonN + 360));
  return [...keys];
}

export function clusterDetections(detections, options = {}) {
  const linkageKm = options.linkageKm ?? LINKAGE_KM;
  const minDetections = options.minDetections ?? MIN_DETECTIONS;
  const points = [];

  for (const detection of detections || []) {
    const lat = Number(detection?.lat);
    const lon = Number(detection?.lon);
    const frp = Number(detection?.frp);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;
    points.push({ lat, lon, frp: Number.isFinite(frp) ? frp : 0 });
  }

  points.sort((a, b) => b.frp - a.frp || a.lat - b.lat || a.lon - b.lon);

  const clusters = [];
  const grid = new Map();

  const unlink = (index) => {
    const cluster = clusters[index];
    for (const key of cluster.keys || []) {
      const bucket = grid.get(key);
      if (!bucket) continue;
      const at = bucket.indexOf(index);
      if (at >= 0) bucket.splice(at, 1);
      if (!bucket.length) grid.delete(key);
    }
    cluster.keys = [];
  };

  const link = (index) => {
    const cluster = clusters[index];
    const keys = indexKeys(cluster.centroid[0], cluster.centroid[1]);
    cluster.keys = keys;
    for (const key of keys) {
      let bucket = grid.get(key);
      if (!bucket) {
        bucket = [];
        grid.set(key, bucket);
      }
      bucket.push(index);
    }
  };

  const candidates = (lat, lon) => {
    const found = [];
    const seen = new Set();
    const lonN = normalizeLon(lon);
    const longs = [lonN];
    if (lonN > 170) longs.push(lonN - 360);
    if (lonN < -170) longs.push(lonN + 360);
    const dLat = linkageKm / 111.32 + CELL_DEGREES;
    const cos = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
    const dLon = linkageKm / (111.32 * cos) + CELL_DEGREES;
    for (const lon0 of longs) {
      const y0 = Math.floor((lat - dLat) / CELL_DEGREES);
      const y1 = Math.floor((lat + dLat) / CELL_DEGREES);
      const x0 = Math.floor((lon0 - dLon) / CELL_DEGREES);
      const x1 = Math.floor((lon0 + dLon) / CELL_DEGREES);
      for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) {
          const bucket = grid.get(`${y}:${x}`);
          if (!bucket) continue;
          for (const index of bucket) {
            if (seen.has(index)) continue;
            seen.add(index);
            found.push(index);
          }
        }
      }
    }
    return found;
  };

  for (const point of points) {
    let best = -1;
    let bestDist = Infinity;
    for (const index of candidates(point.lat, point.lon)) {
      const cluster = clusters[index];
      const dist = haversineKm(point.lat, point.lon, cluster.centroid[0], cluster.centroid[1]);
      if (dist > linkageKm) continue;
      if (dist < bestDist - 1e-6 || (Math.abs(dist - bestDist) <= 1e-6 && (best === -1 || index < best))) {
        best = index;
        bestDist = dist;
      }
    }

    if (best === -1) {
      clusters.push({
        count: 1,
        sumLat: point.lat,
        sumLon: point.lon,
        refLon: point.lon,
        maxFrp: point.frp,
        south: point.lat,
        north: point.lat,
        west: point.lon,
        east: point.lon,
        centroid: [point.lat, point.lon],
        keys: []
      });
      link(clusters.length - 1);
      continue;
    }

    const cluster = clusters[best];
    unlink(best);
    let lon = point.lon;
    while (lon - cluster.refLon > 180) lon -= 360;
    while (cluster.refLon - lon > 180) lon += 360;
    cluster.count += 1;
    cluster.sumLat += point.lat;
    cluster.sumLon += lon;
    if (point.frp > cluster.maxFrp) cluster.maxFrp = point.frp;
    cluster.south = Math.min(cluster.south, point.lat);
    cluster.north = Math.max(cluster.north, point.lat);
    cluster.west = Math.min(cluster.west, lon);
    cluster.east = Math.max(cluster.east, lon);
    cluster.centroid = [
      cluster.sumLat / cluster.count,
      normalizeLon(cluster.sumLon / cluster.count)
    ];
    link(best);
  }

  return clusters
    .filter((cluster) => cluster.count >= minDetections)
    .map((cluster) => {
      const west = normalizeLon(cluster.west);
      const east = normalizeLon(cluster.east);
      return {
        count: cluster.count,
        maxFrp: roundTo(cluster.maxFrp, 1),
        centroid: [roundTo(cluster.centroid[0], 2), roundTo(cluster.centroid[1], 2)],
        bbox: [
          roundTo(cluster.south, 2),
          roundTo(west, 2),
          roundTo(cluster.north, 2),
          roundTo(east, 2)
        ]
      };
    })
    .sort((a, b) => b.count - a.count || b.maxFrp - a.maxFrp || a.centroid[0] - b.centroid[0] || a.centroid[1] - b.centroid[1]);
}

function expandBbox(bbox, km) {
  if (!Array.isArray(bbox) || bbox.length < 4) return null;
  const [south, west, north, east] = bbox.map(Number);
  if (![south, west, north, east].every(Number.isFinite)) return null;
  const midLat = (south + north) / 2;
  const dLat = km / 111.32;
  const cos = Math.max(0.2, Math.cos((midLat * Math.PI) / 180));
  const dLon = km / (111.32 * cos);
  return [south - dLat, west - dLon, north + dLat, east + dLon];
}

function pointInBbox(lat, lon, bbox) {
  if (!bbox) return false;
  const [south, west, north, east] = bbox;
  if (lat < south || lat > north) return false;
  const lonN = normalizeLon(lon);
  if (west <= east) return lonN >= west && lonN <= east;
  return lonN >= west || lonN <= east;
}

function canMatch(cluster, zone, matchKm) {
  if (!Array.isArray(zone?.centroid) || zone.centroid.length < 2) return null;
  const dist = haversineKm(cluster.centroid[0], cluster.centroid[1], Number(zone.centroid[0]), Number(zone.centroid[1]));
  if (!Number.isFinite(dist)) return null;
  if (dist <= matchKm) return dist;
  if (pointInBbox(cluster.centroid[0], cluster.centroid[1], expandBbox(zone.bbox, 15))) return dist;
  return null;
}

function matchClusters(clusters, zones, matchKm) {
  const pairs = [];
  zones.forEach((zone, zoneIndex) => {
    clusters.forEach((cluster, clusterIndex) => {
      const dist = canMatch(cluster, zone, matchKm);
      if (dist == null) return;
      pairs.push({ clusterIndex, zoneIndex, dist });
    });
  });
  pairs.sort((a, b) => a.dist - b.dist || a.clusterIndex - b.clusterIndex || a.zoneIndex - b.zoneIndex);
  const clusterUsed = new Set();
  const zoneUsed = new Set();
  const assignment = new Map();
  for (const pair of pairs) {
    if (clusterUsed.has(pair.clusterIndex) || zoneUsed.has(pair.zoneIndex)) continue;
    clusterUsed.add(pair.clusterIndex);
    zoneUsed.add(pair.zoneIndex);
    assignment.set(pair.clusterIndex, zones[pair.zoneIndex]);
  }
  return assignment;
}

function mintId(lat, lon, taken) {
  const ns = lat >= 0 ? "n" : "s";
  const ew = lon >= 0 ? "e" : "w";
  const base = `z-${Math.abs(Math.round(lat))}${ns}-${Math.abs(Math.round(lon))}${ew}`;
  let id = base;
  let n = 2;
  while (taken.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  taken.add(id);
  return id;
}

function defaultName(_lat, _lon, taken) {
  const base = "Unnamed hotspot";
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
}

function activeStatus({ isNew, reopened, count, previousCount }) {
  if (isNew || reopened) return "new";
  const before = Number(previousCount) || 0;
  if (count >= before * 1.25 && count >= before + 4) return "growing";
  if (before > 0 && count <= before * 0.75) return "fading";
  return "steady";
}

function appendSeries(zone, nowIso, count, seriesLimit) {
  const series = Array.isArray(zone.series) ? zone.series.map((point) => [point[0], Number(point[1]) || 0]) : [];
  if (series.length && series[series.length - 1][0] === nowIso) {
    series[series.length - 1][1] = count;
  } else {
    series.push([nowIso, count]);
  }
  zone.series = series.slice(-seriesLimit);
}

function cloneZone(zone) {
  return {
    ...zone,
    centroid: Array.isArray(zone.centroid) ? [...zone.centroid] : zone.centroid,
    bbox: Array.isArray(zone.bbox) ? [...zone.bbox] : zone.bbox,
    series: Array.isArray(zone.series) ? zone.series.map((point) => [...point]) : []
  };
}

function pushNotice(notices, notice) {
  if (notices.some((item) => item.id === notice.id)) return;
  notices.push(notice);
}

function sortZones(zones) {
  return [...zones].sort((a, b) => {
    const rank = (ZONE_STATUS_RANK[a.status] ?? 9) - (ZONE_STATUS_RANK[b.status] ?? 9);
    if (rank) return rank;
    if ((b.count || 0) !== (a.count || 0)) return (b.count || 0) - (a.count || 0);
    return String(a.id).localeCompare(String(b.id));
  });
}

export function updateZones({
  previous = null,
  detections = [],
  now = new Date(),
  nameFor = defaultName,
  linkageKm = LINKAGE_KM,
  minDetections = MIN_DETECTIONS,
  closeAfterHours = CLOSE_AFTER_HOURS,
  pruneClosedAfterHours = PRUNE_CLOSED_AFTER_HOURS,
  seriesLimit = SERIES_LIMIT,
  matchKm = MATCH_KM
} = {}) {
  const nowDate = now instanceof Date ? now : new Date(now);
  const nowIso = nowDate.toISOString();
  const prevZones = (Array.isArray(previous?.zones) ? previous.zones : []).filter((zone) => zone && zone.id);
  const notices = (Array.isArray(previous?.notices) ? previous.notices : [])
    .filter((notice) => notice && notice.id)
    .map((notice) => ({ ...notice }));
  const clusters = clusterDetections(detections, { linkageKm, minDetections });
  const assignment = matchClusters(clusters, prevZones, matchKm);
  const takenIds = new Set(prevZones.map((zone) => zone.id));
  const usedNames = new Set(prevZones.map((zone) => zone.name).filter(Boolean));
  const usedZones = new Set();
  const opened = [];
  const closed = [];
  const next = [];

  clusters.forEach((cluster, index) => {
    const prev = assignment.get(index) || null;
    const isNew = !prev;
    const reopened = prev?.status === "closed";
    const previousCount = prev ? Number(prev.count) || 0 : 0;
    const zone = prev ? cloneZone(prev) : { series: [] };
    if (prev) usedZones.add(prev.id);
    if (isNew) {
      zone.id = mintId(cluster.centroid[0], cluster.centroid[1], takenIds);
      zone.first_seen = nowIso;
      zone.name = nameFor(cluster.centroid[0], cluster.centroid[1], usedNames) || zone.id;
      usedNames.add(zone.name);
      zone.peak_frp = 0;
      zone.peak_count = 0;
      zone.series = [];
    }
    if (reopened) delete zone.closed_at;
    zone.centroid = cluster.centroid;
    zone.bbox = cluster.bbox;
    zone.count = cluster.count;
    zone.last_seen = nowIso;
    zone.peak_frp = roundTo(Math.max(Number(zone.peak_frp) || 0, cluster.maxFrp), 1);
    zone.peak_count = Math.max(Number(zone.peak_count) || 0, cluster.count);
    zone.status = activeStatus({ isNew, reopened, count: cluster.count, previousCount });
    appendSeries(zone, nowIso, cluster.count, seriesLimit);
    if (isNew || reopened) {
      const notice = {
        id: `open:${zone.id}:${nowIso}`,
        type: "open",
        zoneId: zone.id,
        name: zone.name,
        at: nowIso,
        count: zone.count,
        peak_frp: zone.peak_frp
      };
      pushNotice(notices, notice);
      opened.push(zone.id);
    }
    next.push(zone);
  });

  for (const prev of prevZones) {
    if (usedZones.has(prev.id)) continue;
    const zone = cloneZone(prev);
    if (zone.status === "closed") {
      next.push(zone);
      continue;
    }
    const quiet = hoursBetween(zone.last_seen, nowDate);
    zone.count = 0;
    if (quiet >= closeAfterHours) {
      zone.status = "closed";
      zone.closed_at = zone.closed_at || nowIso;
      appendSeries(zone, nowIso, 0, seriesLimit);
      const notice = {
        id: `close:${zone.id}:${zone.closed_at}`,
        type: "close",
        zoneId: zone.id,
        name: zone.name,
        at: nowIso,
        count: Number(prev.count) || 0,
        peak_frp: Number(zone.peak_frp) || 0
      };
      pushNotice(notices, notice);
      closed.push(zone.id);
    } else {
      zone.status = "fading";
      appendSeries(zone, nowIso, 0, seriesLimit);
    }
    next.push(zone);
  }

  const zones = sortZones(
    next.filter((zone) => {
      if (zone.status !== "closed") return true;
      const closedAt = zone.closed_at || zone.last_seen;
      return hoursBetween(closedAt, nowDate) <= pruneClosedAfterHours;
    })
  );

  return {
    document: {
      generatedAt: nowIso,
      linkageKm,
      minDetections,
      closeAfterHours,
      zones,
      notices: notices
        .filter((notice) => hoursBetween(notice.at, nowDate) <= NOTICE_KEEP_HOURS)
        .slice(-NOTICE_LIMIT)
    },
    opened,
    closed
  };
}

export function zoneShareHash(id) {
  return `zone=${encodeURIComponent(id)}`;
}

export function parseZoneHash(hash) {
  const text = String(hash || "").replace(/^#/, "");
  if (!text || !text.includes("=")) return null;
  const id = new URLSearchParams(text).get("zone");
  return id || null;
}

export function sparklineGeometry(series, width = 84, height = 28) {
  const counts = (Array.isArray(series) ? series : [])
    .map((point) => Number(point?.[1]))
    .filter((count) => Number.isFinite(count));
  if (!counts.length) {
    return { points: "", dot: null, label: "No detection counts yet" };
  }
  const max = Math.max(...counts, 1);
  const coords = counts.map((count, index) => {
    const x = counts.length === 1 ? width / 2 : 2 + (index / (counts.length - 1)) * (width - 4);
    const y = height - 3 - (count / max) * (height - 6);
    return [roundTo(x, 1), roundTo(y, 1)];
  });
  return {
    points: coords.map((pair) => pair.join(",")).join(" "),
    dot: counts.length === 1 ? coords[0] : null,
    label: `Detection counts over recent refreshes: ${counts.join(", ")}`
  };
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toUTCString();
}

export function renderZoneFeed(payload, options = {}) {
  const site = options.site || SITE_URL;
  const title = options.title || "Scorch hotspot zones";
  const notices = [...(payload?.notices || [])].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const items = notices
    .map((notice) => {
      const link = `${site}#zone=${encodeURIComponent(notice.zoneId || "")}`;
      const verb = notice.type === "close" ? "closed" : "opened";
      const headline = `Zone ${verb}: ${notice.name || notice.zoneId || "Hotspot"}`;
      const detail =
        notice.type === "close"
          ? `${notice.name || "This zone"} has had no unconfirmed heat detections for about ${payload?.closeAfterHours || CLOSE_AFTER_HOURS} hours and is now closed. Peak intensity was ${Number(notice.peak_frp) || 0} MW. This is not a damage assessment.`
          : `${notice.name || "This zone"} opened with ${Number(notice.count) || 0} unconfirmed heat detections. Peak intensity ${Number(notice.peak_frp) || 0} MW. This is not a damage assessment.`;
      return [
        "<item>",
        `<title>${escapeXml(headline)}</title>`,
        `<link>${escapeXml(link)}</link>`,
        `<guid isPermaLink="false">${escapeXml(notice.id)}</guid>`,
        `<pubDate>${escapeXml(rfc822(notice.at))}</pubDate>`,
        `<description>${escapeXml(detail)}</description>`,
        "</item>"
      ].join("");
    })
    .join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "<channel>",
    `<title>${escapeXml(title)}</title>`,
    `<link>${escapeXml(site)}</link>`,
    "<description>Opens and closes for Scorch hotspot zones. A zone is a cluster of unconfirmed satellite heat, not confirmed damage.</description>",
    `<lastBuildDate>${escapeXml(rfc822(payload?.generatedAt))}</lastBuildDate>`,
    items,
    "</channel>",
    "</rss>",
    ""
  ].join("\n");
}
