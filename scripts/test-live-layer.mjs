import assert from "node:assert/strict";
import test from "node:test";
import { presentEvent, selectThermalForView } from "../live-layer.js";

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
