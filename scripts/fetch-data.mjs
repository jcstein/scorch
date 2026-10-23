import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const DATA_FILES = ["refresh.json", "link-health.json", "live-events.json"];
export const DATA_BRANCH = "cursor/jcs/source-data-595d";

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

export async function ensureSourceData({
  dest = resolve(repoRoot, "public", "data"),
  files = DATA_FILES,
  fetchImpl = fetch,
  branch = DATA_BRANCH
} = {}) {
  await mkdir(dest, { recursive: true });
  const needed = [];
  for (const name of files) {
    if (!(await isUsableJson(resolve(dest, name)))) needed.push(name);
  }
  if (!needed.length) return { fetched: [] };

  const fetched = [];
  for (const name of needed) {
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
    await writeFile(resolve(dest, name), text.endsWith("\n") ? text : `${text}\n`);
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
