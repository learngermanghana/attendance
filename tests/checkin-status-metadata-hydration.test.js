import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const apiSource = fs.readFileSync(path.join(repoRoot, "functions", "index.js"), "utf8");
const autoCheckinSource = fs.readFileSync(path.join(repoRoot, "functions", "classSessionAutoCheckin.js"), "utf8");
const pageSource = fs.readFileSync(path.join(repoRoot, "src", "pages", "CheckinPage.jsx"), "utf8");

test("check-in status returns authoritative session metadata for concise links", () => {
  assert.match(apiSource, /checkinMetadataHydrated: true/);
  assert.match(apiSource, /db\.collection\("classSessions"\)\.doc\(sessionId\)/);
  assert.match(apiSource, /assignmentId,/);
  assert.match(apiSource, /sessionLabel,/);
  assert.match(apiSource, /startTime:/);
  assert.match(apiSource, /endTime:/);
  assert.match(apiSource, /startsAt,/);
  assert.match(apiSource, /endsAt,/);
});

test("automatic attendance opening persists class metadata for future status reads", () => {
  assert.match(autoCheckinSource, /classStartsAt: startsAt\.toISOString\(\)/);
  assert.match(autoCheckinSource, /classEndsAt: sessionEnd\(session\)\?\.toISOString\(\) \|\| ""/);
  assert.match(autoCheckinSource, /startTime: formatTime24\(startsAt/);
  assert.match(autoCheckinSource, /endTime: formatTime24\(sessionEnd\(session\)/);
});

test("CheckinPage uses hydrated metadata for display, slides, countdown and submission", () => {
  assert.match(pageSource, /const hydratedAssignmentId/);
  assert.match(pageSource, /getTeachingSlideByAssignmentId\(hydratedAssignmentId\)/);
  assert.match(pageSource, /date: hydratedDate/);
  assert.match(pageSource, /sessionLabel: hydratedSessionLabel/);
  assert.match(pageSource, /assignmentId: hydratedAssignmentId/);
  assert.match(pageSource, /checkinStatus\?\.startsAt/);
  assert.match(pageSource, /\{hydratedAssignmentId \|\| "-"\}/);
});
