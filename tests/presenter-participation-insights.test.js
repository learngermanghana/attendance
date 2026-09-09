import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("presenter fair-pick prioritizes learners with the fewest recorded turns", () => {
  const source = read("src/components/PresenterStudentPicker.jsx");
  assert.match(source, /const minimumTurns = Math\.min/);
  assert.match(source, /const fairCandidates = availableStudents\.filter/);
  assert.match(source, /randomItem\(fairCandidates\)/);
  assert.match(source, /Fair pick on · least turns first/);
});

test("presenter exposes an end-of-class summary without changing grades or attendance", () => {
  const source = read("src/components/PresenterStudentPicker.jsx");
  assert.match(source, /presenter-end-summary/);
  assert.match(source, /End-of-class summary/);
  assert.match(source, /Needs follow-up/);
  assert.match(source, /Reteach recommended/);
  assert.match(source, /Diagnostic teaching insight only/);
  assert.doesNotMatch(source, /saveScore|updateGrade|saveAttendance|updateAttendance/);
});

test("presenter follow-up and reteach thresholds are diagnostic and repeat-based", () => {
  const source = read("src/components/PresenterStudentPicker.jsx");
  assert.match(source, /entry\.needsHelp >= 2/);
  assert.match(source, /response\?\.result === "needs_review"/);
  assert.match(source, /sourceQuestion \|\| response\.question \|\| response\.questionContext/);
  assert.match(source, /item\.count >= 2/);
});

test("class participation admin page surfaces lesson follow-up insights", () => {
  const source = read("src/pages/ClassParticipationPage.jsx");
  assert.match(source, /function buildParticipationInsights/);
  assert.match(source, /class-participation-insights/);
  assert.match(source, /Students to follow up/);
  assert.match(source, /Reteach concepts/);
  assert.match(source, /No turn yet/);
});

test("participation insight patch runs in development, build, and tests", () => {
  const packageJson = JSON.parse(read("package.json"));
  for (const scriptName of ["predev", "prebuild", "pretest"]) {
    assert.match(packageJson.scripts[scriptName], /patchPresenterParticipationInsights\.mjs/);
  }
});
