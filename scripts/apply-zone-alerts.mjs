// Files and closes zone-alert GitHub issues, then writes alert state.
// The state file is published on the data branch by the refresh workflow.
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  ALERT_LABEL,
  alertBody,
  alertMarker,
  alertTitle,
  closeComment,
  DEFAULT_GROWTH_MIN,
  DEFAULT_OPEN_MIN,
  parseThreshold,
  planZoneAlerts,
  withAlertResults
} from "./zone-alerts.mjs";

const API_ROOT = "https://api.github.com";

async function readJson(path, { required }) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (!required && error && error.code === "ENOENT") return null;
    throw new Error(`Could not read ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function warning(message) {
  console.warn(`::warning::${message}`);
}

async function github(token, path, { method = "GET", body } = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "scorch-zone-alerts",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text.slice(0, 300) };
    }
  }
  if (!response.ok) {
    const message = payload?.message || response.statusText;
    const error = new Error(`${method} ${path} failed (${response.status}): ${message}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function ensureLabel(token, repo) {
  const labelPath = `/repos/${repo}/labels/${encodeURIComponent(ALERT_LABEL)}`;
  try {
    await github(token, labelPath);
    return;
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  try {
    await github(token, `/repos/${repo}/labels`, {
      method: "POST",
      body: {
        name: ALERT_LABEL,
        color: "c2410c",
        description: "Hotspot zone opened or crossed a detection threshold"
      }
    });
  } catch (error) {
    if (error.status !== 422) throw error;
  }
}

async function findExistingIssue(token, repo, zoneId, reason) {
  const marker = alertMarker(zoneId, reason);
  const query = `repo:${repo} is:issue "${marker}" in:body`;
  const result = await github(token, `/search/issues?per_page=5&q=${encodeURIComponent(query)}`);
  const hit = (result.items || []).find((item) => String(item.body || "").includes(marker));
  return Number.isInteger(hit?.number) ? hit.number : null;
}

async function openIssue(token, repo, action) {
  const existing = await findExistingIssue(token, repo, action.zoneId, action.reason);
  if (existing) {
    console.log(`Zone ${action.zoneId} already has ${action.reason} issue #${existing}.`);
    return existing;
  }
  const created = await github(token, `/repos/${repo}/issues`, {
    method: "POST",
    body: {
      title: alertTitle(action.reason, action.zone),
      body: alertBody(action.reason, action.zone),
      labels: [ALERT_LABEL]
    }
  });
  if (!Number.isInteger(created?.number)) {
    throw new Error(`GitHub did not return an issue number for ${action.zoneId}.`);
  }
  console.log(`Opened ${action.reason} issue #${created.number} for ${action.zoneId}.`);
  return created.number;
}

async function closeIssue(token, repo, action) {
  await github(token, `/repos/${repo}/issues/${action.issue}/comments`, {
    method: "POST",
    body: { body: closeComment(action.zone) }
  });
  await github(token, `/repos/${repo}/issues/${action.issue}`, {
    method: "PATCH",
    body: { state: "closed", state_reason: "completed" }
  });
  console.log(`Closed issue #${action.issue} for ${action.zoneId}.`);
}

export async function applyZoneAlerts({
  previousZones,
  currentZones,
  previousAlerts = null,
  openMin = DEFAULT_OPEN_MIN,
  growthMin = DEFAULT_GROWTH_MIN,
  token = "",
  repo = "",
  githubImpl = null
} = {}) {
  const previous = {
    ...(previousZones || {}),
    alerts: previousAlerts || previousZones?.alerts || null
  };
  const plan = planZoneAlerts({
    previous,
    current: currentZones,
    openMin,
    growthMin
  });
  const needsGithub = plan.creates.length > 0 || plan.closes.length > 0;
  if (needsGithub && (!token || !repo)) {
    warning(
      "GITHUB_TOKEN or GITHUB_REPOSITORY is missing. Zone issues were not opened or closed. Seeded zones are still recorded so the first run does not flood later."
    );
    return { alerts: plan.alerts, failed: false, created: [], closed: [] };
  }

  const created = [];
  const closed = [];
  let failed = false;

  if (plan.creates.length) {
    try {
      if (githubImpl) await githubImpl.ensureLabel();
      else await ensureLabel(token, repo);
    } catch (error) {
      failed = true;
      console.error(error instanceof Error ? error.message : String(error));
    }
  }

  if (!failed) {
    for (const action of plan.creates) {
      try {
        const issue = githubImpl ? await githubImpl.openIssue(action) : await openIssue(token, repo, action);
        created.push({ zoneId: action.zoneId, reason: action.reason, issue });
      } catch (error) {
        failed = true;
        console.error(error instanceof Error ? error.message : String(error));
      }
    }
  }

  for (const action of plan.closes) {
    try {
      if (githubImpl) await githubImpl.closeIssue(action);
      else await closeIssue(token, repo, action);
      closed.push({ zoneId: action.zoneId, reason: action.reason });
    } catch (error) {
      failed = true;
      console.error(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    alerts: withAlertResults(plan.alerts, { created, closed }),
    failed,
    created,
    closed
  };
}

async function main() {
  const [previousZonesPath, currentZonesPath, outputPath, previousAlertsPath] = process.argv.slice(2);
  if (!previousZonesPath || !currentZonesPath || !outputPath) {
    console.error(
      "Usage: node scripts/apply-zone-alerts.mjs <previous-zones.json> <current-zones.json> <zone-alerts.json> [previous-alerts.json]"
    );
    process.exit(1);
  }

  const previousZones = await readJson(previousZonesPath, { required: true });
  const currentZones = await readJson(currentZonesPath, { required: true });
  const previousAlerts = previousAlertsPath ? await readJson(previousAlertsPath, { required: false }) : null;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  const repo = process.env.GITHUB_REPOSITORY || "";
  const result = await applyZoneAlerts({
    previousZones,
    currentZones,
    previousAlerts,
    openMin: parseThreshold(process.env.ZONE_ALERT_OPEN_MIN, DEFAULT_OPEN_MIN),
    growthMin: parseThreshold(process.env.ZONE_ALERT_GROWTH_MIN, DEFAULT_GROWTH_MIN),
    token,
    repo
  });
  await writeFile(outputPath, `${JSON.stringify(result.alerts)}\n`);
  console.log(
    `Zone alerts: ${result.created.length} opened, ${result.closed.length} closed, ${result.alerts.sent.length} remembered.`
  );
  if (result.failed) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
