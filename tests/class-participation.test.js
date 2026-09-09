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

test("class participation API exposes current cloud state and revision-safe staff routes", () => {
  const source = read("functions/classParticipationApi.js");
  assert.match(source, /classParticipationSessions/);
  assert.match(source, /classParticipationRecords/);
  assert.match(source, /app\.post\("\/class-participation\/session"/);
  assert.match(source, /app\.get\("\/class-participation\/current"/);
  assert.match(source, /app\.get\("\/class-participation\/sessions"/);
  assert.match(source, /app\.get\("\/class-participation\/session\/:sessionId"/);
  assert.match(source, /app\.get\("\/class-participation\/me"/);
  assert.match(source, /baseRevision/);
  assert.match(source, /participation_conflict/);
  assert.match(source, /revision: nextRevision/);
  assert.match(source, /verifyIdToken/);
  assert.doesNotMatch(source, /req\.query\?\.studentCode|req\.query\?\.studentId/);
});

test("presenter restores participation from cloud before allowing new marks", () => {
  const source = read("src/components/PresenterStudentPicker.jsx");
  assert.match(source, /getCurrentClassParticipationSession/);
  assert.match(source, /Restoring participation/);
  assert.match(source, /hydratedIdentity !== sessionIdentity/);
  assert.match(source, /baseRevision: cloudRevision/);
  assert.match(source, /visibilitychange/);
  assert.match(source, /Cloud saved/);
  assert.match(source, /Offline · saved on this device/);
  assert.match(source, /saveClassParticipationSession/);
  assert.match(source, /presenterAbsent/);
  assert.match(source, /sessionDate,/);
  assert.doesNotMatch(source, /attendanceService|saveAttendance|updateAttendance/);
  assert.doesNotMatch(source, /saveScore|gradeService|updateGrade/);
});

test("presenter clearly separates class participation from the selected student's metrics", () => {
  const source = read("src/components/PresenterStudentPicker.jsx");
  assert.match(source, /const classParticipatedCount = eligible\.filter/);
  assert.match(source, /const classParticipationPercent = eligible\.length/);
  assert.match(source, /aria-label="Class participation summary"/);
  assert.match(source, /Class participation \{classParticipatedCount\}\/\{eligible\.length\}/);
  assert.match(source, /presenter-student-current-stats/);
  assert.match(source, /Participated \{currentTurns\}/);
  assert.match(source, /Correct \{currentCorrect\}/);
  assert.match(source, /Needs help \{currentNeedsHelp\}/);
  assert.doesNotMatch(source, /Participation \{participatedKeys\.size\}/);
});

test("presenter can return late students to the random rotation without resetting the class", () => {
  const source = read("src/components/PresenterStudentPicker.jsx");
  assert.match(source, /function markJoinedLate/);
  assert.match(source, /next\.delete\(key\)/);
  assert.match(source, />Joined late<\/button>/);
  assert.match(source, /Presenter absent/);
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
  assert.match(presenterPatch, /class-participation-metric-clarity/);
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
  assert.match(service, /\/api\/class-participation\/current/);
});
