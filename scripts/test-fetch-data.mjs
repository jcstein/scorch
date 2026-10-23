import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { ensureSourceData, rawDataUrl } from "./fetch-data.mjs";

test("raw URL points at the public data branch", () => {
  assert.equal(
    rawDataUrl("live-events.json"),
    "https://raw.githubusercontent.com/jcstein/scorch/cursor/jcs/source-data-595d/public/data/live-events.json"
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
