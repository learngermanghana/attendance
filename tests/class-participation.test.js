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
