import assert from "node:assert/strict";
import test from "node:test";
import { applyZoneAlerts } from "./apply-zone-alerts.mjs";
import {
  alertBody,
  alertMarker,
  alertTitle,
  DEFAULT_GROWTH_MIN,
  DEFAULT_OPEN_MIN,
  parseThreshold,
  planZoneAlerts,
  withAlertResults
} from "./zone-alerts.mjs";

function zone(overrides = {}) {
  return {
    id: "z-1n-2e",
    name: "North",
    status: "steady",
    count: 10,
    peak_count: 10,
    peak_frp: 12.5,
    first_seen: "2026-10-20T00:00:00.000Z",
    last_seen: "2026-10-23T00:00:00.000Z",
    ...overrides
  };
}

function doc(zones, alerts = null) {
  return { zones, alerts };
}

function reasons(plan) {
  return plan.creates.map((item) => `${item.zoneId}:${item.reason}`);
}

test("the first run seeds existing zones and does not open issues", () => {
  const existing = [
    zone({ id: "z-a", name: "Alpha", count: 80, peak_count: 80, status: "steady" }),
    zone({ id: "z-b", name: "Beta", count: 12, peak_count: 12, status: "new" })
  ];
  const plan = planZoneAlerts({
    previous: doc(existing),
    current: doc(existing)
  });
  assert.equal(plan.creates.length, 0);
  assert.equal(plan.closes.length, 0);
  assert.equal(plan.alerts.seeded, true);
  assert.deepEqual(
    plan.alerts.sent.map((record) => [record.zoneId, record.reason, record.issue]),
    [
      ["z-a", "growth", null],
      ["z-a", "open", null],
      ["z-b", "open", null]
    ]
  );
});

test("a missing baseline seeds the current zones instead of flooding", () => {
  const current = [
    zone({ id: "z-a", count: 90, peak_count: 90, status: "new" }),
    zone({ id: "z-b", count: 40, peak_count: 40, status: "new" })
  ];
  const plan = planZoneAlerts({
    previous: doc([], { seeded: false, sent: [] }),
    current: doc(current)
  });
  assert.equal(plan.creates.length, 0);
  assert.equal(plan.alerts.sent.filter((record) => record.zoneId === "z-a").length, 2);
  assert.equal(plan.alerts.sent.some((record) => record.zoneId === "z-b" && record.reason === "growth"), false);
});

test("a zone that opens on the first seeded refresh can still alert", () => {
  const previous = [zone({ id: "z-old", count: 9, peak_count: 9 })];
  const current = [
    ...previous,
    zone({ id: "z-new", name: "Delta", status: "new", count: DEFAULT_OPEN_MIN, peak_count: DEFAULT_OPEN_MIN })
  ];
  const plan = planZoneAlerts({ previous: doc(previous), current: doc(current) });
  assert.deepEqual(reasons(plan), ["z-new:open"]);
  assert.equal(plan.alerts.sent.some((record) => record.zoneId === "z-new"), false);
});

test("an open alert requires the threshold and is not repeated", () => {
  const below = zone({ id: "z-low", status: "new", count: DEFAULT_OPEN_MIN - 1, peak_count: DEFAULT_OPEN_MIN - 1 });
  const above = zone({ id: "z-high", name: "High", status: "new", count: DEFAULT_OPEN_MIN, peak_count: DEFAULT_OPEN_MIN });
  const first = planZoneAlerts({
    previous: doc([], { seeded: true, sent: [] }),
    current: doc([below, above])
  });
  assert.deepEqual(reasons(first), ["z-high:open"]);

  const recorded = withAlertResults(first.alerts, { created: [{ zoneId: "z-high", reason: "open", issue: 41 }] });
  const second = planZoneAlerts({
    previous: doc([below, above], recorded),
    current: doc([
      zone({ ...below, status: "steady", count: 20, peak_count: 20 }),
      zone({ ...above, status: "steady", count: 30, peak_count: 30 })
    ])
  });
  assert.equal(second.creates.length, 0);
  assert.equal(second.alerts.sent.find((record) => record.zoneId === "z-high").issue, 41);
});

test("a growing zone alerts once when it crosses 50", () => {
  const before = zone({ id: "z-grow", name: "East", status: "steady", count: 40, peak_count: 40 });
  const after = zone({ id: "z-grow", name: "East", status: "growing", count: DEFAULT_GROWTH_MIN, peak_count: DEFAULT_GROWTH_MIN, peak_frp: 80 });
  const first = planZoneAlerts({
    previous: doc([before], { seeded: true, sent: [{ zoneId: "z-grow", reason: "open", issue: null, closed: false }] }),
    current: doc([after])
  });
  assert.deepEqual(reasons(first), ["z-grow:growth"]);
  assert.equal(alertTitle("growth", after), "Growing zone: East (50 detections)");

  const recorded = withAlertResults(first.alerts, { created: [{ zoneId: "z-grow", reason: "growth", issue: 9 }] });
  const dipped = zone({ id: "z-grow", name: "East", status: "fading", count: 30, peak_count: 50 });
  const recrossed = zone({ id: "z-grow", name: "East", status: "growing", count: 70, peak_count: 70 });
  const again = planZoneAlerts({
    previous: doc([dipped], recorded),
    current: doc([recrossed])
  });
  assert.equal(again.creates.length, 0);
});

test("a new zone at 60 gets an open issue and does not later alert for growth", () => {
  const opened = zone({
    id: "z-big",
    name: "Big",
    status: "new",
    count: 60,
    peak_count: 60,
    peak_frp: 44
  });
  const first = planZoneAlerts({
    previous: doc([], { seeded: true, sent: [] }),
    current: doc([opened])
  });
  assert.deepEqual(reasons(first), ["z-big:open"]);
  const recorded = withAlertResults(first.alerts, { created: [{ zoneId: "z-big", reason: "open", issue: 3 }] });
  assert.equal(
    recorded.sent.some((record) => record.zoneId === "z-big" && record.reason === "growth" && record.issue == null),
    true
  );

  const later = planZoneAlerts({
    previous: doc([opened], recorded),
    current: doc([zone({ ...opened, status: "growing", count: 80, peak_count: 80 })])
  });
  assert.equal(later.creates.length, 0);
});

test("already being over 50 without a growing crossing does not alert", () => {
  const before = zone({ id: "z-steady", status: "steady", count: 52, peak_count: 52 });
  const after = zone({ id: "z-steady", status: "steady", count: 58, peak_count: 58 });
  const plan = planZoneAlerts({
    previous: doc([before], { seeded: true, sent: [] }),
    current: doc([after])
  });
  assert.equal(plan.creates.length, 0);
  assert.equal(
    plan.alerts.sent.some((record) => record.zoneId === "z-steady" && record.reason === "growth" && record.issue == null),
    true
  );
});

test("a seeded zone does not alert again when it reopens", () => {
  const seeded = {
    seeded: true,
    sent: [{ zoneId: "z-old", reason: "open", issue: null, closed: false }]
  };
  const plan = planZoneAlerts({
    previous: doc([zone({ id: "z-old", status: "closed", count: 0, peak_count: 20 })], seeded),
    current: doc([zone({ id: "z-old", status: "new", count: 22, peak_count: 22 })])
  });
  assert.equal(plan.creates.length, 0);
});

test("closing a zone comments once, and a pruned zone closes its issue too", () => {
  const alerts = {
    seeded: true,
    sent: [
      { zoneId: "z-open", reason: "open", issue: 5, closed: false },
      { zoneId: "z-open", reason: "growth", issue: 6, closed: false },
      { zoneId: "z-gone", reason: "open", issue: 7, closed: false },
      { zoneId: "z-silent", reason: "open", issue: null, closed: false },
      { zoneId: "z-done", reason: "open", issue: 8, closed: true }
    ]
  };
  const current = [
    zone({ id: "z-open", status: "closed", count: 0, peak_count: 40, peak_frp: 15 }),
    zone({ id: "z-silent", status: "closed", count: 0 }),
    zone({ id: "z-done", status: "closed", count: 0 })
  ];
  const plan = planZoneAlerts({
    previous: doc(
      [
        ...current,
        zone({ id: "z-gone", status: "closed", count: 0, name: "Gone" })
      ],
      alerts
    ),
    current: doc(current)
  });
  assert.deepEqual(
    plan.closes.map((item) => [item.issue, item.zoneId, item.reason]),
    [
      [5, "z-open", "open"],
      [6, "z-open", "growth"],
      [7, "z-gone", "open"]
    ]
  );

  const recorded = withAlertResults(plan.alerts, {
    closed: plan.closes.map((item) => ({ zoneId: item.zoneId, reason: item.reason }))
  });
  const again = planZoneAlerts({
    previous: doc(current, recorded),
    current: doc(current)
  });
  assert.equal(again.closes.length, 0);
});

test("thresholds are arguments so the workflow env can change them", () => {
  assert.equal(parseThreshold("15", 1), 15);
  assert.equal(parseThreshold("", 15), 15);
  assert.equal(parseThreshold("nope", 15), 15);
  const opened = zone({ id: "z-small", status: "new", count: 4, peak_count: 4 });
  const plan = planZoneAlerts({
    previous: doc([], { seeded: true, sent: [] }),
    current: doc([opened]),
    openMin: "4",
    growthMin: 9
  });
  assert.deepEqual(reasons(plan), ["z-small:open"]);
});

test("a filing that does not succeed stays pending and retries after the zone is no longer new", async () => {
  const opened = zone({ id: "z-new", name: "Delta", status: "new", count: 18, peak_count: 18 });
  const first = planZoneAlerts({
    previous: doc([], { seeded: true, sent: [], pending: [] }),
    current: doc([opened])
  });
  const saved = withAlertResults(first.alerts, {});
  assert.deepEqual(saved.pending, [{ zoneId: "z-new", reason: "open" }]);

  const steady = zone({ ...opened, status: "steady", count: 18, peak_count: 18 });
  const second = planZoneAlerts({
    previous: doc([steady], saved),
    current: doc([steady])
  });
  assert.deepEqual(reasons(second), ["z-new:open"]);

  const filed = withAlertResults(second.alerts, { created: [{ zoneId: "z-new", reason: "open", issue: 12 }] });
  assert.deepEqual(filed.pending, []);
  assert.equal(filed.sent.find((record) => record.zoneId === "z-new" && record.reason === "open").issue, 12);

  const skipped = await applyZoneAlerts({
    previousZones: { zones: [] },
    currentZones: { zones: [opened] },
    previousAlerts: { seeded: true, sent: [], pending: [] },
    token: "",
    repo: ""
  });
  assert.equal(skipped.created.length, 0);
  assert.deepEqual(skipped.alerts.pending, [{ zoneId: "z-new", reason: "open" }]);
});

test("issue text carries status, counts, peak FRP, first seen, the map link, and the dedupe marker", () => {
  const hotspot = zone({
    id: "z-21s-123e",
    name: "Java",
    status: "new",
    count: 18,
    peak_count: 18,
    peak_frp: 42.5,
    first_seen: "2026-10-23T21:00:25.126Z"
  });
  assert.equal(alertTitle("open", hotspot), "New zone: Java (18 detections)");
  const body = alertBody("open", hotspot);
  assert.match(body, /\*\*Status:\*\* new/);
  assert.match(body, /\*\*Detections:\*\* 18/);
  assert.match(body, /\*\*Peak detections:\*\* 18/);
  assert.match(body, /\*\*Peak FRP:\*\* 42\.5 MW/);
  assert.match(body, /\*\*First seen:\*\* 2026-10-23T21:00:25\.126Z/);
  assert.match(body, /https:\/\/scorch\.jcstein\.dev\/#zone=z-21s-123e/);
  assert.match(body, new RegExp(alertMarker(hotspot.id, "open")));
});
