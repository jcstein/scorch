import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeThermalPoint,
  packThermalEvents,
  presentEvent,
  selectThermalCells,
  selectThermalForView,
  tilesForBounds
} from "../live-layer.js";

function heat(id, lat, lon, frp = 1) {
  return { id, type: "thermal", lat, lon, frp, eventTime: "2026-10-22T00:00:00.000Z" };
}

test("world view clusters instead of drawing every thermal point", () => {
  const events = [];
  for (let i = 0; i < 8000; i += 1) {
    events.push(heat(`h-${i}`, -40 + (i % 80) * 0.9, -170 + (i % 120) * 2.5, i % 50));
  }
  const selection = selectThermalForView(events, {
    zoom: 2,
    bounds: { south: -85, west: -180, north: 85, east: 180 }
  });
  assert.equal(selection.mode, "clusters");
  assert.ok(selection.shown.length <= 220);
  assert.ok(selection.shown.length < selection.totalInView);
  assert.ok(selection.shown[0].count >= selection.shown.at(-1).count);
});

test("zoomed view returns individual points and keeps a pinned id", () => {
  const events = [];
  for (let i = 0; i < 900; i += 1) {
    events.push(heat(`p-${i}`, 30 + (i % 30) * 0.05, 50 + (i % 40) * 0.05, i));
  }
  const selection = selectThermalForView(events, {
    zoom: 7,
    bounds: { south: 28, west: 48, north: 34, east: 56 },
    pinId: "p-1"
  });
  assert.equal(selection.mode, "points");
  assert.ok(selection.shown.length <= 400);
  assert.ok(selection.shown.some((event) => event.id === "p-1"));
  assert.ok(selection.capped);
});

test("thermal copy stays unconfirmed and reports stay approximate", () => {
  const heatView = presentEvent({
    type: "thermal",
    summary: "FRP 12.0 MW",
    signals: ["Thermal", "Oil Fires", "Satellite"]
  });
  assert.equal(heatView.title, "Unconfirmed heat");
  assert.match(heatView.summary, /not a damage assessment/i);
  assert.deepEqual(heatView.signals, ["Thermal", "Unconfirmed"]);

  const reportView = presentEvent({
    type: "conflict",
    title: "Port strike report",
    locationPrecision: "approximate",
    summary: "A reported strike."
  });
  assert.equal(reportView.approximate, true);
  assert.match(reportView.locationNote, /Approximate location/);

  const exactView = presentEvent({
    type: "conflict",
    title: "Mapped site",
    locationPrecision: "exact"
  });
  assert.equal(exactView.approximate, false);
  assert.equal(exactView.locationNote, "");
});

test("packed cells and tiles keep the thermal count", () => {
  const events = [
    heat("a", 30.14, 50.16, 12.44),
    heat("b", 30.16, 50.14, 3),
    heat("c", -12.2, 40.2, 8),
    { id: "report", type: "conflict", lat: 30, lon: 50 }
  ];
  events[0].areaId = "iran-gulf";
  events[0].severity = "high";
  events[1].areaId = "iran-gulf";
  events[2].areaId = "global-hub";
  const packed = packThermalEvents(events);
  assert.equal(packed.total, 3);
  assert.equal(
    packed.cells[1].reduce((sum, cell) => sum + cell.count, 0),
    3
  );
  assert.equal(
    packed.tiles.reduce((sum, tile) => sum + tile.points.length, 0),
    3
  );
  const iran = packed.cells[1].find((cell) => cell.areas["iran-gulf"]);
  assert.equal(iran.areas["iran-gulf"], 2);
  assert.equal(iran.lat, 30.5);
  assert.equal(iran.lon, 50.5);

  const selection = selectThermalCells(packed.cells[1], {
    bounds: { south: 20, west: 40, north: 40, east: 60 },
    countFor: (cell) => cell.areas["iran-gulf"] || 0
  });
  assert.equal(selection.totalInView, 2);
  assert.equal(selection.shown[0].count, 2);

  const point = decodeThermalPoint(packed.tiles.flatMap((tile) => tile.points)[0], packed.areas, "2026-10-23T00:00:00.000Z");
  assert.equal(point.type, "thermal");
  assert.equal(point.signals[1], "Unconfirmed");
  assert.equal(point.eventTime, "2026-10-23T00:00:00.000Z");
});

test("tile lookup follows the viewport and the antimeridian", () => {
  const known = ["30_50", "30_170", "-10_-180"];
  assert.deepEqual(
    tilesForBounds({ south: 28, west: 48, north: 36, east: 55 }, known),
    ["30_50"]
  );
  assert.deepEqual(
    tilesForBounds({ south: 20, west: 165, north: 35, east: -170 }, known).sort(),
    ["30_170"]
  );
});
