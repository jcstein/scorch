// Triggers a production deployment of the git-connected Cloudflare Pages
// project and waits until that deployment finishes.
import { pathToFileURL } from "node:url";

export const DEFAULT_ACCOUNT_ID = "7cd7c5099afe29e7bba04aa0fb64e070";
export const PROJECT_NAME = "scorch";
export const PRODUCTION_BRANCH = "main";

const FAILURE_STATUSES = new Set(["failure", "canceled", "cancelled", "skipped"]);
const POLL_INTERVAL_MS = 15_000;
const POLL_TIMEOUT_MS = 20 * 60 * 1000;

export function accountIdFromEnv(env = process.env) {
  const value = String(env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  return value || DEFAULT_ACCOUNT_ID;
}

export function deploymentOutcome(deployment) {
  if (!deployment || typeof deployment !== "object") return "pending";
  if (deployment.is_skipped) return "failure";
  if (deployment.environment === "preview") return "failure";
  const stages = [...(Array.isArray(deployment.stages) ? deployment.stages : []), deployment.latest_stage || null];
  for (const stage of stages) {
    const status = String(stage?.status || "").toLowerCase();
    if (FAILURE_STATUSES.has(status)) return "failure";
  }
  const deployed = stages.some(
    (stage) => String(stage?.name || "").toLowerCase() === "deploy" && String(stage?.status || "").toLowerCase() === "success"
  );
  return deployed ? "success" : "pending";
}

function failureDetail(deployment) {
  const stage = deployment?.latest_stage || {};
  const skipped = deployment?.is_skipped ? `, skipped: ${deployment.skip_reason || "yes"}` : "";
  const environment = deployment?.environment === "preview" ? ", environment preview" : "";
  return `stage ${stage.name || "unknown"} ${stage.status || "unknown"}${skipped}${environment}`;
}

async function readCloudflare(response) {
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!response.ok || body?.success === false) {
    const detail = Array.isArray(body?.errors)
      ? body.errors.map((error) => error?.message).filter(Boolean).join("; ")
      : "";
    throw new Error(detail || `Cloudflare API ${response.status} ${response.statusText}`);
  }
  if (!body?.result) throw new Error("Cloudflare API returned no deployment.");
  return body.result;
}

export async function deployProduction({
  token,
  accountId = DEFAULT_ACCOUNT_ID,
  fetchImpl = fetch,
  sleepImpl = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = () => Date.now(),
  timeoutMs = POLL_TIMEOUT_MS,
  intervalMs = POLL_INTERVAL_MS,
  log = console.log
} = {}) {
  const root = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${PROJECT_NAME}/deployments`;
  const form = new FormData();
  form.append("branch", PRODUCTION_BRANCH);
  const created = await readCloudflare(
    await fetchImpl(root, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form
    })
  );
  if (!created.id) throw new Error("Cloudflare API did not return a deployment id.");
  log(`Cloudflare Pages deployment ${created.id} started${created.url ? ` (${created.url})` : ""}.`);

  const started = now();
  let deployment = created;
  while (true) {
    const outcome = deploymentOutcome(deployment);
    if (outcome === "success") {
      log(`Cloudflare Pages production deployment ${deployment.id} succeeded${deployment.url ? `: ${deployment.url}` : "."}`);
      return deployment;
    }
    if (outcome === "failure") {
      throw new Error(`Cloudflare Pages deployment ${deployment.id} failed (${failureDetail(deployment)}).`);
    }
    if (now() - started > timeoutMs) {
      throw new Error(
        `Cloudflare Pages deployment ${deployment.id} did not finish within ${Math.round(timeoutMs / 1000)}s (${failureDetail(deployment)}).`
      );
    }
    log(`Waiting for deployment ${deployment.id}: ${deployment.latest_stage?.name || "unknown"} ${deployment.latest_stage?.status || "unknown"}.`);
    await sleepImpl(intervalMs);
    deployment = await readCloudflare(
      await fetchImpl(`${root}/${deployment.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    );
  }
}

async function main() {
  const token = String(process.env.CLOUDFLARE_API_TOKEN || "").trim();
  if (!token) {
    console.warn(
      "::warning::CLOUDFLARE_API_TOKEN is not set. Skipping the Cloudflare Pages production deployment of scorch."
    );
    return;
  }
  await deployProduction({
    token,
    accountId: accountIdFromEnv(process.env)
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
