import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const appPath = resolve(repoRoot, "app.js");
const refreshPath = resolve(repoRoot, "data", "refresh.json");
const linkHealthPath = resolve(repoRoot, "data", "link-health.json");

const SOURCE_REGEX = /id:\s*"([^"]+)"[\s\S]*?link:\s*"([^"]+)"/g;
const USER_AGENT = "damage-atlas-refresh/1.0 (+https://github.com/jcstein/damage)";
const generatedAt = new Date().toISOString();

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

  const results = [];
  for (const source of sources) {
    const health = await checkUrl(source.url);
    results.push({
      id: source.id,
      url: source.url,
      ...health
    });
  }

  const healthySources = results.filter((result) => result.ok).length;

  const refreshPayload = {
    generatedAt,
    totalSources: sources.length,
    healthySources,
    failingSources: sources.length - healthySources,
    scriptVersion: 1
  };

  const healthPayload = {
    generatedAt,
    results
  };

  await writeFile(refreshPath, `${JSON.stringify(refreshPayload, null, 2)}\n`);
  await writeFile(linkHealthPath, `${JSON.stringify(healthPayload, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
