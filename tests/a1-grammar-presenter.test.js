import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { courseDictionary } from "../src/data/courseDictionary.js";
import { A1_GRAMMAR_CHECKS, getA1GrammarChecks } from "../src/data/a1GrammarChecks.js";

test("every real A1 lesson has a dedicated four-item grammar or language mastery check", () => {
  const assignmentIds = Object.values(courseDictionary.A1)
    .map((entry) => String(entry.assignment_id || "").trim())
    .filter((assignmentId) => assignmentId && assignmentId.toUpperCase() !== "A1-TUTORIAL");

  assert.equal(assignmentIds.length, 28, "unexpected A1 lesson count");

  for (const assignmentId of assignmentIds) {
    const checks = getA1GrammarChecks(assignmentId);
    assert.equal(checks.length, 4, `${assignmentId} should have four mastery checks`);
    for (const item of checks) {
      assert.ok(String(item.questionDe || "").trim(), `${assignmentId} has an empty question`);
      assert.ok(String(item.answerDe || "").trim(), `${assignmentId} has an empty answer`);
    }
  }

  assert.equal(Object.keys(A1_GRAMMAR_CHECKS).length, 28);
});

test("A1 presenter is routed separately from A2-C1 and does not depend on speaking questions", () => {
  const page = fs.readFileSync(new URL("../src/pages/TeachingSlidesPage.jsx", import.meta.url), "utf8");
  const presenter = fs.readFileSync(new URL("../src/components/A1GrammarPresenter.jsx", import.meta.url), "utf8");

  assert.match(page, /import A1GrammarPresenter/);
  assert.match(page, /a1GrammarLesson/);
  assert.match(page, /<A1GrammarPresenter/);
  assert.match(page, /A1-TUTORIAL/);

  assert.match(presenter, /Regel verstehen/);
  assert.match(presenter, /Grammatik-Check/);
  assert.match(presenter, /Typische Fehler erkennen/);
  assert.match(presenter, /Exit Check/);
  assert.doesNotMatch(presenter, /studentQuestionsDe/);
  assert.doesNotMatch(presenter, /requiresQuestionModel/);
});
