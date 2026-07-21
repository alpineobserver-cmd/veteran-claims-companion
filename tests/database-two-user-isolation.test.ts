import assert from "node:assert/strict";
import test from "node:test";

const requiredEnvironment = [
  "AUTH_E2E_BASE_URL",
  "E2E_USER_A_SESSION_TOKEN",
  "E2E_USER_B_SESSION_TOKEN",
  "E2E_USER_A_CLAIM_ID",
  "E2E_USER_B_CLAIM_ID",
  "E2E_USER_B_MARKER"
] as const;

const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);
const configuredEnvironment = requiredEnvironment.filter((name) => process.env[name]);
const liveTest = configuredEnvironment.length === 0 ? test.skip : test;

function environment(name: (typeof requiredEnvironment)[number]) {
  const value = process.env[name];
  assert.ok(value, `${name} is required`);
  return value;
}

function sessionCookie(token: string) {
  return `__Secure-authjs.session-token=${encodeURIComponent(token)}`;
}

async function request(path: string, token: string, init: RequestInit = {}) {
  const baseUrl = environment("AUTH_E2E_BASE_URL").replace(/\/$/, "");
  const headers = new Headers(init.headers);
  headers.set("cookie", sessionCookie(token));
  headers.set("accept", "application/json");
  if (init.body) headers.set("content-type", "application/json");
  if (init.method && init.method !== "GET") headers.set("origin", baseUrl);
  return fetch(`${baseUrl}${path}`, { ...init, headers, redirect: "manual" });
}

liveTest("two database sessions remain isolated through real claim and account handlers", async () => {
  const userAToken = environment("E2E_USER_A_SESSION_TOKEN");
  const userBToken = environment("E2E_USER_B_SESSION_TOKEN");
  const claimAId = environment("E2E_USER_A_CLAIM_ID");
  const claimBId = environment("E2E_USER_B_CLAIM_ID");
  const userBMarker = environment("E2E_USER_B_MARKER");

  const listA = await request("/api/claims", userAToken);
  assert.equal(listA.status, 200);
  const listABody = await listA.json() as { claims: Array<{ id: string; title: string }> };
  assert.ok(listABody.claims.some((claim) => claim.id === claimAId));
  assert.ok(!listABody.claims.some((claim) => claim.id === claimBId));
  assert.ok(!JSON.stringify(listABody).includes(userBMarker));

  const listB = await request("/api/claims", userBToken);
  assert.equal(listB.status, 200);
  const listBBody = await listB.json() as { claims: Array<{ id: string }> };
  assert.ok(listBBody.claims.some((claim) => claim.id === claimBId));
  assert.ok(!listBBody.claims.some((claim) => claim.id === claimAId));

  const readForeign = await request(`/api/claims/${claimBId}`, userAToken);
  assert.equal(readForeign.status, 404);

  const patchForeign = await request(`/api/claims/${claimBId}`, userAToken, {
    method: "PATCH",
    body: JSON.stringify({
      title: "Cross-user update must never persist",
      progress: 1,
      version: 1,
      draft: { answers: {}, step: 0 }
    })
  });
  assert.equal(patchForeign.status, 404);

  const deleteForeign = await request(`/api/claims/${claimBId}`, userAToken, { method: "DELETE" });
  assert.equal(deleteForeign.status, 404);

  const exportA = await request("/api/account/export", userAToken);
  assert.equal(exportA.status, 200);
  const exportAText = await exportA.text();
  assert.ok(exportAText.includes(claimAId));
  assert.ok(!exportAText.includes(claimBId));
  assert.ok(!exportAText.includes(userBMarker));

  const verifyB = await request(`/api/claims/${claimBId}`, userBToken);
  assert.equal(verifyB.status, 200);
  const verifyBText = await verifyB.text();
  assert.ok(verifyBText.includes(userBMarker));

  const deleteAccountA = await request("/api/account", userAToken, { method: "DELETE" });
  assert.equal(deleteAccountA.status, 200);

  const verifyBAfterAccountDelete = await request(`/api/claims/${claimBId}`, userBToken);
  assert.equal(verifyBAfterAccountDelete.status, 200);
  assert.ok((await verifyBAfterAccountDelete.text()).includes(userBMarker));
});

test("live isolation harness documents every required fixture when it is skipped", () => {
  assert.deepEqual(requiredEnvironment, [
    "AUTH_E2E_BASE_URL",
    "E2E_USER_A_SESSION_TOKEN",
    "E2E_USER_B_SESSION_TOKEN",
    "E2E_USER_A_CLAIM_ID",
    "E2E_USER_B_CLAIM_ID",
    "E2E_USER_B_MARKER"
  ]);
  assert.ok(
    configuredEnvironment.length === 0 || missingEnvironment.length === 0,
    `Live isolation configuration is incomplete. Missing: ${missingEnvironment.join(", ")}`
  );
});
