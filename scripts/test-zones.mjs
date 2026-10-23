import assert from "node:assert/strict";
import test from "node:test";
import { nameZone } from "./zone-names.mjs";
import {
  CLOSE_AFTER_HOURS,
  clusterDetections,
  parseZoneHash,
  PRUNE_CLOSED_AFTER_HOURS,
  renderZoneFeed,
  SERIES_LIMIT,
  sparklineGeometry,
  updateZones,
  zoneShareHash
} from "../zones.js";

function blob(lat, lon, count, frp = 10) {
  const cols = Math.ceil(Math.sqrt(count));
  const points = [];
  for (let i = 0; i < count; i += 1) {
    points.push({
      lat: lat + (i % cols) * 0.03,
      lon: lon + Math.floor(i / cols) * 0.03,
      frp
    });
  }
  return points;
}

function hoursLater(iso, hours) {
  return new Date(new Date(iso).getTime() + hours * 36e5);
}

const T0 = "2026-10-20T00:00:00.000Z";

function nameFor(lat, _lon, taken) {
  const base = lat >= 0 ? "North" : "South";
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
}

test("clusters detections within 25 km and drops one-off blips", () => {
  const near = blob(30, 50, 8, 12);
  const far = blob(-20, 40, 8, 4);
  const blip = blob(10, 10, 3, 90);
  const clusters = clusterDetections([...near, ...far, ...blip]);
  assert.equal(clusters.length, 2);
  assert.equal(clusters[0].count, 8);
  assert.equal(clusters[1].count, 8);
  const centers = clusters.map((cluster) => cluster.centroid.map((value) => Math.round(value)));
  assert.deepEqual(centers.sort((a, b) => a[0] - b[0]), [
    [-20, 40],
    [30, 50]
  ]);
});

test("a 25 km link does not chain a long fire line into one zone", () => {
  const chain = [];
  for (let i = 0; i < 10; i += 1) {
    chain.push({ lat: 0, lon: i * 0.22, frp: 5 });
  }
  const clusters = clusterDetections(chain, { minDetections: 1 });
  assert.ok(clusters.length >= 2);
  for (const cluster of clusters) {
    const span = cluster.bbox[3] - cluster.bbox[1];
    assert.ok(span < 0.7, `zone span ${span} degrees is wider than a local hotspot`);
  }
});

test("detections across the antimeridian can share a zone", () => {
  const points = [];
  for (let i = 0; i < 8; i += 1) {
    let lon = 179.97 + (i - 3.5) * 0.012;
    if (lon > 180) lon -= 360;
    points.push({ lat: (i % 2) * 0.02, lon, frp: 6 });
  }
  const clusters = clusterDetections(points);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].count, 8);
  assert.ok(clusters[0].bbox[1] > 170);
  assert.ok(clusters[0].bbox[3] < -170);
});

test("the same hotspot keeps its id across runs and a distant one is new", () => {
  const first = updateZones({
    detections: blob(30.2, 50.2, 8),
    now: T0,
    nameFor
  });
  assert.equal(first.document.zones.length, 1);
  assert.equal(first.document.zones[0].status, "new");
  assert.equal(first.document.zones[0].name, "North");
  const id = first.document.zones[0].id;
  assert.equal(id, "z-30n-50e");

  const shifted = blob(30.2, 50.2, 8).map((point) => ({
    ...point,
    lat: point.lat + 0.08,
    lon: point.lon + 0.08
  }));
  const second = updateZones({
    previous: first.document,
    detections: [...shifted, ...blob(-12, 28, 8)],
    now: hoursLater(T0, 6),
    nameFor
  });
  const kept = second.document.zones.find((zone) => zone.id === id);
  const added = second.document.zones.find((zone) => zone.id !== id);
  assert.ok(kept);
  assert.equal(kept.name, "North");
  assert.equal(added.name, "South");
  assert.notEqual(added.id, id);
  assert.equal(second.opened.length, 1);
  assert.equal(second.opened[0], added.id);
});

test("status moves from new to growing, steady, fading, and closed", () => {
  let result = updateZones({
    detections: blob(15, 32, 8, 20),
    now: T0,
    nameFor
  });
  const id = result.document.zones[0].id;
  assert.equal(result.document.zones[0].status, "new");
  assert.deepEqual(result.opened, [id]);

  result = updateZones({
    previous: result.document,
    detections: blob(15, 32, 16, 40),
    now: hoursLater(T0, 6),
    nameFor
  });
  assert.equal(result.document.zones[0].status, "growing");
  assert.equal(result.document.zones[0].peak_frp, 40);
  assert.equal(result.document.zones[0].peak_count, 16);
  assert.deepEqual(result.opened, []);

  result = updateZones({
    previous: result.document,
    detections: blob(15, 32, 16, 18),
    now: hoursLater(T0, 12),
    nameFor
  });
  assert.equal(result.document.zones[0].status, "steady");
  assert.equal(result.document.zones[0].peak_frp, 40);

  result = updateZones({
    previous: result.document,
    detections: blob(15, 32, 8, 9),
    now: hoursLater(T0, 18),
    nameFor
  });
  assert.equal(result.document.zones[0].status, "fading");

  const lastSeen = result.document.zones[0].last_seen;
  result = updateZones({
    previous: result.document,
    detections: [],
    now: hoursLater(lastSeen, CLOSE_AFTER_HOURS + 1),
    nameFor
  });
  assert.equal(result.document.zones.length, 1);
  assert.equal(result.document.zones[0].status, "closed");
  assert.equal(result.document.zones[0].id, id);
  assert.deepEqual(result.closed, [id]);
  assert.ok(result.document.zones[0].closed_at);

  const closedDoc = result.document;
  const again = updateZones({
    previous: closedDoc,
    detections: [],
    now: hoursLater(closedDoc.generatedAt, 6),
    nameFor
  });
  assert.equal(again.document.zones[0].status, "closed");
  assert.deepEqual(again.closed, []);
  assert.equal(again.document.notices.filter((notice) => notice.type === "close").length, 1);

  const feed = renderZoneFeed(again.document);
  assert.match(feed, /Zone opened: North/);
  assert.match(feed, /Zone closed: North/);
  assert.match(feed, new RegExp(`#zone=${id}`));
  assert.equal(feed.startsWith("<?xml"), true);

  const pruned = updateZones({
    previous: again.document,
    detections: [],
    now: hoursLater(again.document.zones[0].closed_at, PRUNE_CLOSED_AFTER_HOURS + 1),
    nameFor
  });
  assert.equal(pruned.document.zones.length, 0);
});

test("a closed zone reopens with the same id and one new notice", () => {
  let result = updateZones({
    detections: blob(5, 5, 8),
    now: T0,
    nameFor
  });
  const id = result.document.zones[0].id;
  result = updateZones({
    previous: result.document,
    detections: [],
    now: hoursLater(T0, CLOSE_AFTER_HOURS + 2),
    nameFor
  });
  assert.equal(result.document.zones[0].status, "closed");
  const reopened = updateZones({
    previous: result.document,
    detections: blob(5.05, 5.05, 9),
    now: hoursLater(result.document.generatedAt, 6),
    nameFor
  });
  assert.equal(reopened.document.zones[0].id, id);
  assert.equal(reopened.document.zones[0].status, "new");
  assert.equal(reopened.document.zones[0].closed_at, undefined);
  assert.deepEqual(reopened.opened, [id]);
  assert.equal(reopened.document.notices.filter((notice) => notice.type === "open").length, 2);
});

test("detection history is capped", () => {
  let previous = null;
  let now = new Date(T0);
  for (let i = 0; i < SERIES_LIMIT + 9; i += 1) {
    previous = updateZones({
      previous: previous?.document || null,
      detections: blob(1, 1, 8),
      now,
      nameFor
    });
    now = hoursLater(now.toISOString(), 6);
  }
  assert.equal(previous.document.zones[0].series.length, SERIES_LIMIT);
  assert.equal(previous.document.zones[0].series.at(-1)[1], 8);
});

test("names and share hashes stay readable", () => {
  assert.equal(nameZone(31.5, 34.4, new Set()), "Gaza");
  assert.equal(nameZone(50.45, 30.52, new Set()), "Ukraine");
  assert.equal(nameZone(32.4, 53.2, new Set()), "Iran / Gulf");
  assert.equal(nameZone(-8.5, -55, new Set()), "Brazil");
  const eastern = nameZone(48.4, 37.6, new Set(["Ukraine"]));
  assert.equal(eastern, "Ukraine, east");
  const placed = nameZone(48.4, 37.6, new Set(["Ukraine", "Ukraine, east"]));
  assert.equal(placed, "Ukraine · 48°N 38°E");
  const finer = nameZone(48.4, 37.6, new Set(["Ukraine", "Ukraine, east", "Ukraine · 48°N 38°E"]));
  assert.equal(finer, "Ukraine · 48.4°N 37.6°E");
  assert.equal(zoneShareHash("z-30n-50e"), "zone=z-30n-50e");
  assert.equal(parseZoneHash("#zone=z-30n-50e"), "z-30n-50e");
  assert.equal(parseZoneHash(""), null);
  const spark = sparklineGeometry([
    ["2026-10-20T00:00:00.000Z", 4],
    ["2026-10-20T06:00:00.000Z", 8]
  ]);
  assert.match(spark.label, /4, 8/);
  assert.ok(spark.points.includes(","));
});

test("feed text escapes names", () => {
  const feed = renderZoneFeed({
    generatedAt: T0,
    closeAfterHours: 72,
    notices: [
      {
        id: "open:z-1:t",
        type: "open",
        zoneId: "z-1",
        name: "A & B <north>",
        at: T0,
        count: 8,
        peak_frp: 12
      }
    ]
  });
  assert.match(feed, /A &amp; B &lt;north&gt;/);
  assert.doesNotMatch(feed, /A & B/);
});
