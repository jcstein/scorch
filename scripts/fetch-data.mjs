import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const DATA_FILES = ["refresh.json", "link-health.json", "live-summary.json"];
export const DATA_BRANCH = "data";
const TILE_ID = /^-?\d+_-?\d+$/;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function rawDataUrl(name, branch = DATA_BRANCH) {
  return `https://raw.githubusercontent.com/jcstein/scorch/${branch}/public/data/${name}`;
}

async function isUsableJson(path) {
  try {
    const text = await readFile(path, "utf8");
    if (!text.trim()) return false;
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function safePath(dest, name) {
  const root = resolve(dest);
  const path = resolve(dest, name);
  if (path !== root && !path.startsWith(`${root}${sep}`)) {
    throw new Error(`Refusing to write ${name} outside ${root}.`);
  }
  return path;
}

async function fetchJson(name, { dest, fetchImpl, branch }) {
  const url = rawDataUrl(name, branch);
  let response;
  try {
    response = await fetchImpl(url);
  } catch (error) {
    throw new Error(
      `Failed to fetch ${url}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  try {
    JSON.parse(text);
  } catch {
    throw new Error(`Response from ${url} was not JSON.`);
  }
  const path = safePath(dest, name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text.endsWith("\n") ? text : `${text}\n`);
}

export async function ensureSourceData({
  dest = resolve(repoRoot, "public", "data"),
  files = DATA_FILES,
  fetchImpl = fetch,
  branch = DATA_BRANCH
} = {}) {
  await mkdir(dest, { recursive: true });
  const fetched = [];
  for (const name of files) {
    if (await isUsableJson(safePath(dest, name))) continue;
    await fetchJson(name, { dest, fetchImpl, branch });
    fetched.push(name);
  }

  if (!files.includes("live-summary.json")) return { fetched };

  await rm(safePath(dest, "live-events.json"), { force: true });
  const summaryPath = safePath(dest, "live-summary.json");
  if (!(await isUsableJson(summaryPath))) {
    throw new Error("live-summary.json is missing.");
  }
  const summary = JSON.parse(await readFile(summaryPath, "utf8"));
  const tiles = summary?.thermal?.tiles;
  if (!Array.isArray(tiles)) {
    throw new Error("live-summary.json has no thermal tile index.");
  }
  for (const tile of tiles) {
    const id = tile?.id;
    if (!TILE_ID.test(id || "")) {
      throw new Error(`live-summary.json has an invalid thermal tile id: ${id}`);
    }
    const name = `thermal/${id}.json`;
    if (await isUsableJson(safePath(dest, name))) continue;
    await fetchJson(name, { dest, fetchImpl, branch });
    fetched.push(name);
  }
  return { fetched };
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isCli) {
  try {
    const { fetched } = await ensureSourceData();
    if (!fetched.length) {
      console.log("public/data is already present.");
    } else {
      console.log(`Fetched ${fetched.join(", ")} from ${DATA_BRANCH}.`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
