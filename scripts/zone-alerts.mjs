// Decides which hotspot zones become GitHub issues.
// The refresh workflow stores the returned `alerts` document on the data
// branch (public/data/zone-alerts.json) and uses it to avoid filing twice.
import { SITE_URL } from "../zones.js";

export const DEFAULT_OPEN_MIN = 15;
export const DEFAULT_GROWTH_MIN = 50;
export const ALERT_LABEL = "zone-alert";

const REASONS = ["open", "growth"];

export function parseThreshold(value, fallback) {
  if (value == null || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return number;
}

export function alertMarker(zoneId, reason) {
  return `zone-alert:${zoneId}:${reason}`;
}

export function alertTitle(reason, zone) {
  const count = Number(zone?.count) || 0;
  const name = zone?.name || zone?.id || "Unnamed hotspot";
  const label = reason === "growth" ? "Growing zone" : "New zone";
  return `${label}: ${name} (${count} detections)`;
}

export function alertBody(reason, zone) {
  const marker = alertMarker(zone.id, reason);
  const count = Number(zone?.count) || 0;
  const peakCount = Number(zone?.peak_count) || count;
  const peakFrp = Number(zone?.peak_frp) || 0;
  return [
    `<!-- ${marker} -->`,
    "",
    `**Status:** ${zone?.status || "unknown"}`,
    `**Detections:** ${count}`,
    `**Peak detections:** ${peakCount}`,
    `**Peak FRP:** ${peakFrp} MW`,
    `**First seen:** ${zone?.first_seen || "unknown"}`,
    "",
    `${SITE_URL}#zone=${encodeURIComponent(zone.id)}`,
    "",
    marker
  ].join("\n");
}

export function closeComment(zone) {
  const id = zone?.id;
  return [
    "This zone has closed, so this alert is done.",
    "",
    `**Status:** ${zone?.status || "closed"}`,
    `**Detections:** ${Number(zone?.count) || 0}`,
    `**Peak FRP:** ${Number(zone?.peak_frp) || 0} MW`,
    `**First seen:** ${zone?.first_seen || "unknown"}`,
    "",
    id ? `${SITE_URL}#zone=${encodeURIComponent(id)}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function zonesOf(doc) {
  return (Array.isArray(doc?.zones) ? doc.zones : []).filter((zone) => zone && zone.id);
}

function recordKey(zoneId, reason) {
  return `${zoneId}\n${reason}`;
}

function copyRecord(record) {
  const issue = Number.isInteger(record.issue) ? record.issue : null;
  return {
    zoneId: record.zoneId,
    reason: record.reason,
    issue,
    closed: Boolean(record.closed)
  };
}

function sortedRecords(records) {
  return [...records].sort((a, b) => {
    const byZone = String(a.zoneId).localeCompare(String(b.zoneId));
    if (byZone) return byZone;
    return String(a.reason).localeCompare(String(b.reason));
  });
}

function seenCount(zone) {
  return Math.max(Number(zone?.count) || 0, Number(zone?.peak_count) || 0);
}

export function planZoneAlerts({
  previous = null,
  current = null,
  openMin = DEFAULT_OPEN_MIN,
  growthMin = DEFAULT_GROWTH_MIN
} = {}) {
  const openAt = parseThreshold(openMin, DEFAULT_OPEN_MIN);
  const growthAt = parseThreshold(growthMin, DEFAULT_GROWTH_MIN);
  const previousZones = zonesOf(previous);
  const currentZones = zonesOf(current);
  const previousById = new Map(previousZones.map((zone) => [zone.id, zone]));
  const currentById = new Map(currentZones.map((zone) => [zone.id, zone]));
  const sent = new Map();
  const pending = new Map();

  for (const record of previous?.alerts?.sent || []) {
    if (!record?.zoneId || !REASONS.includes(record.reason)) continue;
    sent.set(recordKey(record.zoneId, record.reason), copyRecord(record));
  }
  for (const item of previous?.alerts?.pending || []) {
    if (!item?.zoneId || !REASONS.includes(item.reason)) continue;
    pending.set(recordKey(item.zoneId, item.reason), { zoneId: item.zoneId, reason: item.reason });
  }

  const seeded = previous?.alerts?.seeded === true;
  // The first run records zones that already exist and files nothing for them.
  // An empty previous file means there is no earlier baseline, so the current
  // zones are that baseline. Zones that appear after seeding can still alert.
  if (!seeded) {
    const seedZones = previousZones.length ? previousZones : currentZones;
    for (const zone of seedZones) {
      const openKey = recordKey(zone.id, "open");
      if (!sent.has(openKey)) {
        sent.set(openKey, { zoneId: zone.id, reason: "open", issue: null, closed: false });
      }
      const growthKey = recordKey(zone.id, "growth");
      if (seenCount(zone) >= growthAt && !sent.has(growthKey)) {
        sent.set(growthKey, { zoneId: zone.id, reason: "growth", issue: null, closed: false });
      }
    }
  }

  const blockNewAlerts = !seeded && previousZones.length === 0;
  const creates = [];
  const queue = (zone, reason) => {
    const key = recordKey(zone.id, reason);
    if (sent.has(key)) return;
    if (!creates.some((item) => item.zoneId === zone.id && item.reason === reason)) {
      creates.push({ zoneId: zone.id, reason, zone });
    }
    pending.set(key, { zoneId: zone.id, reason });
  };

  for (const zone of currentZones) {
    if (zone.status === "closed") continue;
    const prev = previousById.get(zone.id) || null;
    const count = Number(zone.count) || 0;
    const prevCount = prev ? Number(prev.count) || 0 : 0;
    const newlyOpened = !blockNewAlerts && (!prev || prev.status === "closed");
    const openKey = recordKey(zone.id, "open");

    if (!sent.has(openKey) && newlyOpened && count >= openAt) {
      queue(zone, "open");
    }

    const growthKey = recordKey(zone.id, "growth");
    if (sent.has(growthKey) || pending.has(growthKey)) continue;
    const crossed = count >= growthAt && prevCount < growthAt;
    if (zone.status === "growing" && crossed) {
      queue(zone, "growth");
      continue;
    }
    if (count >= growthAt || seenCount(zone) >= growthAt || (prev && seenCount(prev) >= growthAt)) {
      sent.set(growthKey, { zoneId: zone.id, reason: "growth", issue: null, closed: false });
    }
  }

  for (const [key, item] of [...pending.entries()]) {
    if (sent.has(key)) {
      pending.delete(key);
      continue;
    }
    const zone = currentById.get(item.zoneId);
    if (!zone || zone.status === "closed") {
      pending.delete(key);
      continue;
    }
    if (!creates.some((entry) => entry.zoneId === item.zoneId && entry.reason === item.reason)) {
      creates.push({ zoneId: item.zoneId, reason: item.reason, zone });
    }
  }

  const closes = [];
  for (const record of sent.values()) {
    if (!record.issue || record.closed) continue;
    const zone = currentById.get(record.zoneId);
    if (zone && zone.status !== "closed") continue;
    const subject = zone || previousById.get(record.zoneId) || { id: record.zoneId };
    closes.push({
      zoneId: record.zoneId,
      reason: record.reason,
      issue: record.issue,
      zone: { ...subject, id: record.zoneId, status: "closed" }
    });
  }

  return {
    creates,
    closes,
    alerts: {
      seeded: true,
      sent: sortedRecords(sent.values()),
      pending: sortedRecords(pending.values()).map((item) => ({ zoneId: item.zoneId, reason: item.reason }))
    }
  };
}

export function withAlertResults(alerts, { created = [], closed = [] } = {}) {
  const sent = new Map(
    (alerts?.sent || []).map((record) => [recordKey(record.zoneId, record.reason), copyRecord(record)])
  );
  const pending = new Map(
    (alerts?.pending || [])
      .filter((item) => item?.zoneId && REASONS.includes(item.reason))
      .map((item) => [recordKey(item.zoneId, item.reason), { zoneId: item.zoneId, reason: item.reason }])
  );
  for (const item of created) {
    if (!item?.zoneId || !REASONS.includes(item.reason) || !Number.isInteger(item.issue)) continue;
    sent.set(recordKey(item.zoneId, item.reason), {
      zoneId: item.zoneId,
      reason: item.reason,
      issue: item.issue,
      closed: false
    });
    pending.delete(recordKey(item.zoneId, item.reason));
  }
  for (const item of closed) {
    const record = item ? sent.get(recordKey(item.zoneId, item.reason)) : null;
    if (!record) continue;
    record.closed = true;
  }
  return {
    seeded: true,
    sent: sortedRecords(sent.values()),
    pending: sortedRecords(pending.values()).map((item) => ({ zoneId: item.zoneId, reason: item.reason }))
  };
}
