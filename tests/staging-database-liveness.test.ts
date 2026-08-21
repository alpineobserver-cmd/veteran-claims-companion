import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { isAuthorizedCronRequest } from "../lib/cron-auth";

test("database liveness cron authentication fails closed", () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "fictional-cron-secret";
  try {
    assert.equal(isAuthorizedCronRequest(new Request("https://debrief.example/api/cron/database-liveness")), false);
    assert.equal(isAuthorizedCronRequest(new Request("https://debrief.example/api/cron/database-liveness", { headers: { authorization: "Bearer incorrect-secret" } })), false);
    assert.equal(isAuthorizedCronRequest(new Request("https://debrief.example/api/cron/database-liveness", { headers: { authorization: "Bearer fictional-cron-secret" } })), true);
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});

test("database liveness checks only a constant and never application records", async () => {
  const route = await readFile(path.join(process.cwd(), "app/api/cron/database-liveness/route.ts"), "utf8");
  assert.match(route, /prisma\.\$queryRaw`SELECT 1`/);
  assert.match(route, /process\.env\.APP_ENV !== "staging"/);
  assert.doesNotMatch(route, /prisma\.(claim|document|user|session|auditEvent|upload)\./);
});
