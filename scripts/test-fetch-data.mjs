import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { ensureSourceData, rawDataUrl, writeZoneFeed } from "./fetch-data.mjs";

test("raw URL points at the public data branch", () => {
  assert.equal(
    rawDataUrl("live-summary.json"),
    "https://raw.githubusercontent.com/jcstein/scorch/data/public/data/live-summary.json"
  );
});

test("existing JSON is left in place", async () => {
  const dest = await mkdtemp(resolve(tmpdir(), "scorch-data-"));
  try {
    await writeFile(resolve(dest, "refresh.json"), '{"ok":true}\n');
    let calls = 0;
    const result = await ensureSourceData({
      dest,
      files: ["refresh.json"],
      fetchImpl: async () => {
        calls += 1;
        throw new Error("should not fetch");
      }
    });
    assert.deepEqual(result, { fetched: [] });
    assert.equal(calls, 0);
  } finally {
    await rm(dest, { recursive: true, force: true });
  }
});

test("a failed fetch exits the build", async () => {
  const dest = await mkdtemp(resolve(tmpdir(), "scorch-data-"));
  try {
    await assert.rejects(
      () =>
        ensureSourceData({
          dest,
          files: ["refresh.json"],
          fetchImpl: async () => ({ ok: false, status: 404, statusText: "Not Found" })
        }),
      /404/
    );
    await assert.rejects(readFile(resolve(dest, "refresh.json"), "utf8"));
  } finally {
    await rm(dest, { recursive: true, force: true });
  }
});

test("a successful fetch writes JSON", async () => {
  const dest = await mkdtemp(resolve(tmpdir(), "scorch-data-"));
  try {
    const result = await ensureSourceData({
      dest,
      files: ["refresh.json"],
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => '{"generatedAt":"2026-10-23T00:00:00.000Z"}'
      })
    });
    assert.deepEqual(result, { fetched: ["refresh.json"] });
    const written = JSON.parse(await readFile(resolve(dest, "refresh.json"), "utf8"));
    assert.equal(written.generatedAt, "2026-10-23T00:00:00.000Z");
  } finally {
    await rm(dest, { recursive: true, force: true });
  }
});

test("a summary download also fetches each thermal tile", async () => {
  const dest = await mkdtemp(resolve(tmpdir(), "scorch-data-"));
  const files = {
    "refresh.json": '{"ok":true}\n',
    "link-health.json": '{"results":[]}\n',
    "live-summary.json": `${JSON.stringify({
      thermal: { tiles: [{ id: "10_20", count: 1, maxFrp: 1 }] }
    })}\n`,
    "zones.json": `${JSON.stringify({ zones: [], notices: [] })}\n`,
    "thermal/10_20.json": `${JSON.stringify({ id: "10_20", points: [[10, 20, 1, 0, 0]] })}\n`
  };
  try {
    const result = await ensureSourceData({
      dest,
      fetchImpl: async (url) => {
        const name = url.split("/public/data/")[1];
        const body = files[name];
        if (!body) return { ok: false, status: 404, statusText: "Not Found", text: async () => "" };
        return { ok: true, status: 200, statusText: "OK", text: async () => body };
      }
    });
    assert.ok(result.fetched.includes("thermal/10_20.json"));
    const tile = JSON.parse(await readFile(resolve(dest, "thermal", "10_20.json"), "utf8"));
    assert.equal(tile.points.length, 1);
    await assert.rejects(readFile(resolve(dest, "live-events.json"), "utf8"));
    assert.ok(result.fetched.includes("zones.json"));
  } finally {
    await rm(dest, { recursive: true, force: true });
  }
});

test("the zone file becomes the RSS feed", async () => {
  const dest = await mkdtemp(resolve(tmpdir(), "scorch-feed-"));
  try {
    const zonesPath = resolve(dest, "zones.json");
    const feedPath = resolve(dest, "feed.xml");
    await writeFile(
      zonesPath,
      `${JSON.stringify({
        generatedAt: "2026-10-23T00:00:00.000Z",
        notices: [
          {
            id: "open:z-1:t",
            type: "open",
            zoneId: "z-1",
            name: "Gaza",
            at: "2026-10-23T00:00:00.000Z",
            count: 9,
            peak_frp: 40
          }
        ]
      })}\n`
    );
    await writeZoneFeed({ zonesPath, feedPath });
    const xml = await readFile(feedPath, "utf8");
    assert.match(xml, /<rss version="2.0">/);
    assert.match(xml, /Zone opened: Gaza/);
  } finally {
    await rm(dest, { recursive: true, force: true });
  }
});

test("a missing thermal tile fails the build", async () => {
  const dest = await mkdtemp(resolve(tmpdir(), "scorch-data-"));
  try {
    await writeFile(
      resolve(dest, "live-summary.json"),
      `${JSON.stringify({ thermal: { tiles: [{ id: "1_2" }] } })}\n`
    );
    await assert.rejects(
      () =>
        ensureSourceData({
          dest,
          files: ["live-summary.json"],
          fetchImpl: async () => ({ ok: false, status: 404, statusText: "Not Found" })
        }),
      /404/
    );
  } finally {
    await rm(dest, { recursive: true, force: true });
  }
});
