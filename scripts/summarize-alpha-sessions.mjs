import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const inputPath = resolve(process.argv[2] ?? "evals/alpha-session-results.json");
const fields = [
  "sessionId", "testerCode", "date", "moderated", "device", "browser",
  "startedClaimBuilder", "terminalStage", "completedClaimWorkflow",
  "producedUsableStatement", "minutesToUsableStatement", "attemptedSaveResume",
  "saveResumeSucceeded", "attemptedExport", "exportSucceeded",
  "confidenceBefore", "confidenceAfter", "feedbackIds",
];
const stageValues = new Set([
  "splash", "login", "dashboard", "workspace", "upload", "claim-builder",
  "review", "package", "export", "account-deletion", "completed",
]);

function fail(message) {
  console.error(`Alpha session data is invalid: ${message}`);
  process.exit(1);
}

function validateScore(value, field, id) {
  if (value !== null && (!Number.isInteger(value) || value < 1 || value > 5)) {
    fail(`${id}.${field} must be null or an integer from 1 to 5.`);
  }
}

function validateSession(session, index, seenIds) {
  if (!session || Array.isArray(session) || typeof session !== "object") fail(`sessions[${index}] must be an object.`);
  for (const key of Object.keys(session)) {
    if (!fields.includes(key)) fail(`${session.sessionId ?? `sessions[${index}]`} contains unsupported field "${key}". Free text is not allowed.`);
  }
  for (const field of fields) if (!(field in session)) fail(`sessions[${index}] is missing ${field}.`);

  const id = session.sessionId;
  if (!/^AS-\d{4}$/.test(id)) fail(`sessions[${index}].sessionId must match AS-####.`);
  if (seenIds.has(id)) fail(`${id} appears more than once.`);
  seenIds.add(id);
  if (!/^T-(?:\d{3}|UNASSIGNED)$/.test(session.testerCode)) fail(`${id}.testerCode must match T-### or T-UNASSIGNED.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(session.date)) fail(`${id}.date must use YYYY-MM-DD.`);
  if (typeof session.moderated !== "boolean") fail(`${id}.moderated must be true or false.`);
  if (!new Set(["mobile", "tablet", "desktop"]).has(session.device)) fail(`${id}.device is not recognized.`);
  if (!new Set(["Chrome", "Safari", "Edge", "Firefox", "Other"]).has(session.browser)) fail(`${id}.browser is not recognized.`);
  if (typeof session.startedClaimBuilder !== "boolean") fail(`${id}.startedClaimBuilder must be boolean.`);
  if (!stageValues.has(session.terminalStage)) fail(`${id}.terminalStage is not recognized.`);
  if (typeof session.completedClaimWorkflow !== "boolean") fail(`${id}.completedClaimWorkflow must be boolean.`);
  if (![true, false, null].includes(session.producedUsableStatement)) fail(`${id}.producedUsableStatement must be true, false, or null.`);
  if (session.minutesToUsableStatement !== null && (!Number.isInteger(session.minutesToUsableStatement) || session.minutesToUsableStatement < 1 || session.minutesToUsableStatement > 240)) fail(`${id}.minutesToUsableStatement must be null or 1-240.`);
  if (typeof session.attemptedSaveResume !== "boolean") fail(`${id}.attemptedSaveResume must be boolean.`);
  if (![true, false, null].includes(session.saveResumeSucceeded)) fail(`${id}.saveResumeSucceeded must be true, false, or null.`);
  if (typeof session.attemptedExport !== "boolean") fail(`${id}.attemptedExport must be boolean.`);
  if (![true, false, null].includes(session.exportSucceeded)) fail(`${id}.exportSucceeded must be true, false, or null.`);
  validateScore(session.confidenceBefore, "confidenceBefore", id);
  validateScore(session.confidenceAfter, "confidenceAfter", id);
  if (!Array.isArray(session.feedbackIds) || session.feedbackIds.some((value) => !/^AF-\d{4}$/.test(value))) fail(`${id}.feedbackIds must contain only AF-#### identifiers.`);

  if (!session.startedClaimBuilder && session.completedClaimWorkflow) fail(`${id} cannot complete a workflow it did not start.`);
  if (session.completedClaimWorkflow !== (session.terminalStage === "completed")) fail(`${id}.terminalStage and completedClaimWorkflow disagree.`);
  if (!session.attemptedSaveResume && session.saveResumeSucceeded !== null) fail(`${id}.saveResumeSucceeded must be null when not attempted.`);
  if (!session.attemptedExport && session.exportSucceeded !== null) fail(`${id}.exportSucceeded must be null when not attempted.`);
  if (session.producedUsableStatement !== true && session.minutesToUsableStatement !== null) fail(`${id}.minutesToUsableStatement requires a usable statement.`);
}

function ratio(numerator, denominator) {
  return denominator ? `${numerator}/${denominator} (${((numerator / denominator) * 100).toFixed(1)}%)` : "No data";
}

function mean(values) {
  return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2) : "No data";
}

function median(values) {
  if (!values.length) return "No data";
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return (sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2).toFixed(1);
}

let data;
try {
  data = JSON.parse(await readFile(inputPath, "utf8"));
} catch (error) {
  fail(`could not read ${inputPath}: ${error.message}`);
}
if (!data || Array.isArray(data) || typeof data !== "object") fail("top-level value must be an object.");
if (Object.keys(data).some((key) => !["schemaVersion", "sessions"].includes(key))) fail("only schemaVersion and sessions are allowed at the top level.");
if (data.schemaVersion !== 1 || !Array.isArray(data.sessions)) fail("schemaVersion must be 1 and sessions must be an array.");

const seenIds = new Set();
data.sessions.forEach((session, index) => validateSession(session, index, seenIds));

const sessions = data.sessions;
const started = sessions.filter((session) => session.startedClaimBuilder);
const completed = started.filter((session) => session.completedClaimWorkflow);
const usable = started.filter((session) => session.producedUsableStatement === true);
const saves = sessions.filter((session) => session.attemptedSaveResume);
const exports = sessions.filter((session) => session.attemptedExport);
const times = sessions.map((session) => session.minutesToUsableStatement).filter((value) => value !== null);
const before = sessions.map((session) => session.confidenceBefore).filter((value) => value !== null);
const after = sessions.map((session) => session.confidenceAfter).filter((value) => value !== null);
const abandonment = new Map();
for (const session of started.filter((item) => !item.completedClaimWorkflow)) {
  abandonment.set(session.terminalStage, (abandonment.get(session.terminalStage) ?? 0) + 1);
}

console.log("Debrief Alpha success summary");
console.log(`Source: ${inputPath}`);
console.log(`Sessions: ${sessions.length}`);
console.log(`Claim Builder starts: ${started.length}`);
console.log(`Workflow completion: ${ratio(completed.length, started.length)}`);
console.log(`Usable statement produced: ${ratio(usable.length, started.length)}`);
console.log(`Median minutes to usable statement: ${median(times)}`);
console.log(`Save/resume success: ${ratio(saves.filter((session) => session.saveResumeSucceeded).length, saves.length)}`);
console.log(`Export success: ${ratio(exports.filter((session) => session.exportSucceeded).length, exports.length)}`);
console.log(`Average confidence before: ${mean(before)}`);
console.log(`Average confidence after: ${mean(after)}`);
console.log(`Average confidence change: ${before.length && before.length === after.length ? (Number(mean(after)) - Number(mean(before))).toFixed(2) : "No paired data"}`);
console.log("Abandonment stages:");
if (!abandonment.size) console.log("- No data");
for (const [stage, count] of [...abandonment.entries()].sort((a, b) => b[1] - a[1])) console.log(`- ${stage}: ${count}`);
if (!sessions.length) console.log("\nBaseline status: pending. Add fictional Alpha session scorecards; do not add free text or sensitive information.");
