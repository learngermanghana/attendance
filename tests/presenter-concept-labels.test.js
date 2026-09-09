import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { presenterConceptLabel, reviewConceptLabels } from "../src/utils/presenterConceptLabels.js";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("maps W-question word order to a student-friendly concept", () => {
  assert.equal(
    presenterConceptLabel("What is the word order in a W-question?"),
    "W‑Fragen — word order",
  );
  assert.equal(
    presenterConceptLabel("What is the concept behind W-Wörter in German?"),
    "W‑Fragen — question words",
  );
});

test("maps common German grammar concepts without exposing raw question wording", () => {
  assert.equal(presenterConceptLabel("How do modal verbs affect sentence structure?"), "Modal verbs — sentence structure");
  assert.equal(presenterConceptLabel("When do we use reflexive verbs with sich?"), "Reflexive verbs");
  assert.equal(presenterConceptLabel("Explain the dative case."), "Dative case");
  assert.equal(presenterConceptLabel("Why is the conjugated verb in position 2?"), "Verb conjugation — present tense");
});

test("review concepts only come from needs-review responses and are deduplicated", () => {
  const labels = reviewConceptLabels([
    { result: "correct", question: "Explain the dative case." },
    { result: "needs_review", question: "What is the word order in a W-question?" },
    { result: "needs_review", sourceQuestion: "What is the word order in a W-question?" },
  ]);
  assert.deepEqual(labels, ["W‑Fragen — word order"]);
});

test("A1 presenter variants retain the underlying concept label", () => {
  const source = read("src/utils/a1PresenterQuestionPool.js");
  assert.match(source, /conceptLabel: clean\(question\.conceptLabel\) \|\| presenterConceptLabel\(questionText\)/);
  assert.match(source, /conceptLabel: base\.conceptLabel/);
});

test("presenter saves a concept label and reteach grouping prefers it", () => {
  const source = read("src/components/PresenterStudentPicker.jsx");
  assert.match(source, /conceptLabel: currentQuestion\.conceptLabel \|\| presenterConceptLabel/);
  assert.match(source, /response\.conceptLabel \|\| presenterConceptLabel/);
});

test("student-safe participation exposes review concepts and a ready-to-display recommendation", () => {
  const source = read("functions/classParticipationApi.js");
  assert.match(source, /conceptLabel/);
  assert.match(source, /reviewConcepts/);
  assert.match(source, /Review recommended:/);
  assert.doesNotMatch(source, /reviewRecommendation:.*studentName/);
});

test("concept-label patch runs for dev, build, test and Firebase function deploy", () => {
  const pkg = JSON.parse(read("package.json"));
  for (const scriptName of ["predev", "prebuild", "pretest", "deploy:falowenadmin"]) {
    assert.match(pkg.scripts[scriptName], /patchPresenterConceptLabels\.mjs/);
  }
});
