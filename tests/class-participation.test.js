import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const participationApi = require("../functions/classParticipationApi.js");

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("class participation normalizes presenter outcomes without grades or attendance writes", () => {
  const row = participationApi.normalizeStudent({
    studentCode: " Test123 ",
    studentEmail: "Student@Example.com",
    studentName: "Test Student",
    turns: 2,
    correct: 1,
    needsHelp: 1,
    skipped: 1,
    presenterAbsent: true,
  });

  assert.equal(row.studentCode, "test123");
  assert.equal(row.studentEmailNormalized, "student@example.com");
  assert.equal(row.turns, 2);
  assert.equal(row.correct, 1);
  assert.equal(row.needsReview, 1);
  assert.equal(row.presenterAbsent, true);
});

test("class participation API has staff session routes and a token-scoped student route", () => {
  const source = read("functions/classParticipationApi.js");
  assert.match(source, /classParticipationSessions/);
  assert.match(source, /classParticipationRecords/);
  assert.match(source, /app\.post\("\/class-participation\/session"/);
  assert.match(source, /app\.get\("\/class-participation\/sessions"/);
  assert.match(source, /app\.get\("\/class-participation\/session\/:sessionId"/);
  assert.match(source, /app\.get\("\/class-participation\/me"/);
  assert.match(source, /verifyIdToken/);
  assert.doesNotMatch(source, /req\.query\?\.studentCode|req\.query\?\.studentId/);
});

test("presenter persists diagnostic participation and does not write official attendance", () => {
  const source = read("src/components/PresenterStudentPicker.jsx");
  assert.match(source, /saveClassParticipationSession/);
  assert.match(source, /needsReview/);
  assert.match(source, /presenterAbsent/);
  assert.match(source, /sessionDate: localDateKey\(\)/);
  assert.doesNotMatch(source, /attendanceService|saveAttendance|updateAttendance/);
  assert.doesNotMatch(source, /saveScore|gradeService|updateGrade/);
});

test("admin navigation exposes the Class Participation page", () => {
  const app = read("src/App.jsx");
  const page = read("src/pages/ClassParticipationPage.jsx");
  assert.match(app, /ClassParticipationPage/);
  assert.match(app, /path="\/class-participation"/);
  assert.match(page, /Class Participation/);
  assert.match(page, /never changes grades or official attendance/);
});

test("presenter build hook also registers the participation API", () => {
  const presenterPatch = read("scripts/patchPresenterStudentPicker.mjs");
  const apiPatch = read("scripts/patchClassParticipationApi.mjs");
  assert.match(presenterPatch, /patchClassParticipationApi\.mjs/);
  assert.match(apiPatch, /registerClassParticipationRoutes/);
});

test("class participation is included in Firebase deploys and Vercel proxies it to the API function", () => {
  const firebaseConfig = JSON.parse(read("firebase.json"));
  const functionsConfig = Array.isArray(firebaseConfig.functions)
    ? firebaseConfig.functions.find((entry) => entry?.codebase === "falowenadmin")
    : firebaseConfig.functions;
  const predeploy = Array.isArray(functionsConfig?.predeploy) ? functionsConfig.predeploy : [];
  assert.ok(
    predeploy.includes("node scripts/patchClassParticipationApi.mjs"),
    "Firebase deploy must register class participation routes before deploying the API function",
  );

  const vercelConfig = JSON.parse(read("vercel.json"));
  const rewrite = (vercelConfig.rewrites || []).find(
    (entry) => entry.source === "/api/class-participation/(.*)",
  );
  assert.ok(rewrite, "Vercel must route class participation requests before the generic API router");
  assert.equal(
    rewrite.destination,
    "https://us-central1-falowen-examiner-trainer.cloudfunctions.net/api/class-participation/$1",
  );

  const service = read("src/services/classParticipationService.js");
  assert.match(service, /fetch\("\/api\/class-participation\/session"/);
});
