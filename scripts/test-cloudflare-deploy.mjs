import assert from "node:assert/strict";
import test from "node:test";
import { accountIdFromEnv, DEFAULT_ACCOUNT_ID, deploymentOutcome, deployProduction } from "./cloudflare-pages-deploy.mjs";

function deployment(overrides = {}) {
  return {
    id: "dep-1",
    environment: "production",
    is_skipped: false,
    latest_stage: { name: "build", status: "active" },
    stages: [
      { name: "queued", status: "success" },
      { name: "build", status: "active" },
      { name: "deploy", status: "idle" }
    ],
    ...overrides
  };
}

test("a production deploy is finished only when the deploy stage succeeds", () => {
  assert.equal(deploymentOutcome(deployment()), "pending");
  assert.equal(
    deploymentOutcome(
      deployment({
        latest_stage: { name: "deploy", status: "success" },
        stages: [{ name: "deploy", status: "success" }]
      })
    ),
    "success"
  );
});

test("failure, cancel, skip, and preview deploys fail the job", () => {
  assert.equal(deploymentOutcome(deployment({ latest_stage: { name: "build", status: "failure" } })), "failure");
  assert.equal(deploymentOutcome(deployment({ latest_stage: { name: "deploy", status: "canceled" } })), "failure");
  assert.equal(deploymentOutcome(deployment({ latest_stage: { name: "queued", status: "skipped" } })), "failure");
  assert.equal(deploymentOutcome(deployment({ is_skipped: true, skip_reason: "production_deployments_disabled" })), "failure");
  assert.equal(deploymentOutcome(deployment({ environment: "preview", latest_stage: { name: "deploy", status: "success" } })), "failure");
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

test("deploy posts branch main and fails the job when the deployment fails", async () => {
  const calls = [];
  await assert.rejects(
    () =>
      deployProduction({
        token: "secret-token",
        accountId: "acct",
        sleepImpl: async () => {},
        now: () => 0,
        timeoutMs: 50,
        log: () => {},
        fetchImpl: async (url, options = {}) => {
          calls.push({ url, method: options.method || "GET", body: options.body, authorization: options.headers?.Authorization });
          if (options.method === "POST") {
            return jsonResponse({
              success: true,
              result: {
                id: "dep-9",
                environment: "production",
                latest_stage: { name: "queued", status: "idle" },
                stages: []
              }
            });
          }
          return jsonResponse({
            success: true,
            result: {
              id: "dep-9",
              environment: "production",
              latest_stage: { name: "build", status: "failure" },
              stages: [{ name: "build", status: "failure" }]
            }
          });
        }
      }),
    /Cloudflare Pages deployment dep-9 failed/
  );
  assert.equal(calls[0].method, "POST");
  assert.match(calls[0].url, /\/accounts\/acct\/pages\/projects\/scorch\/deployments$/);
  assert.equal(calls[0].authorization, "Bearer secret-token");
  assert.equal(calls[0].body.get("branch"), "main");
  assert.match(calls[1].url, /\/deployments\/dep-9$/);
});

test("the account id falls back to the public default", () => {
  assert.equal(accountIdFromEnv({}), DEFAULT_ACCOUNT_ID);
  assert.equal(accountIdFromEnv({ CLOUDFLARE_ACCOUNT_ID: " " }), DEFAULT_ACCOUNT_ID);
  assert.equal(accountIdFromEnv({ CLOUDFLARE_ACCOUNT_ID: "abc" }), "abc");
  assert.equal(DEFAULT_ACCOUNT_ID, "7cd7c5099afe29e7bba04aa0fb64e070");
});
