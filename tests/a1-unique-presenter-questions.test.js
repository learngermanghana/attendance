import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { buildA1PresenterQuestionPool } from "../src/utils/a1PresenterQuestionPool.js";

const require = createRequire(import.meta.url);
const participationApi = require("../functions/classParticipationApi.js");
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const BASE = [
  { questionDe: "What is the concept behind W-Wörter in German?", answerDe: "They ask for specific information." },
  { questionDe: "Where does the verb go in a W-question?", answerDe: "Directly after the W-word." },
  { questionDe: "What is the difference between a W-question and a yes/no question?", answerDe: "One asks for specific information; the other can be answered yes or no." },
];

test("A1 presenter expands curated concept checks to the class roster size", () => {
  const pool = buildA1PresenterQuestionPool(BASE, 12, "A1-1.1-grammar-check");
  assert.equal(pool.length, 12);
  assert.equal(new Set(pool.map((question) => question.id)).size, 12);
  assert.equal(new Set(pool.map((question) => question.questionDe)).size, 12);
  assert.ok(pool.every((question) => question.answerDe));
  assert.ok(pool.every((question) => !/___|\bfill in\b|\bsetze ein\b|\bergänze\b/i.test(question.questionDe)));
});

test("A1 question IDs stay stable for saved participation evidence", () => {
  const first = buildA1PresenterQuestionPool(BASE, 10, "A1-1.1-grammar-check");
  const second = buildA1PresenterQuestionPool(BASE, 10, "A1-1.1-grammar-check");
  assert.deepEqual(first.map((question) => question.id), second.map((question) => question.id));
});

test("question-level outcomes are normalized and student view hides presenter-only results", () => {
  const row = participationApi.normalizeStudent({
    studentCode: "Gifty123",
    turns: 2,
    correct: 1,
    needsReview: 1,
    presenterAbsent: true,
    questionResponses: [
      { questionId: "q1", question: "What is a W-question?", result: "correct", recordedAt: "2026-09-09T10:00:00.000Z" },
      { questionId: "q2", question: "Where does the verb go?", result: "needsHelp", recordedAt: "2026-09-09T10:01:00.000Z" },
      { questionId: "q3", question: "", result: "absent", recordedAt: "2026-09-09T10:02:00.000Z" },
    ],
  });
  assert.equal(row.questionResponses.length, 3);
  assert.equal(row.questionResponses[1].result, "needs_review");
  assert.equal(row.questionResponses[2].result, "presenter_absent");

  const safe = participationApi.studentSafeParticipationRecord({
    id: "record1",
    studentName: "Gifty Antwi",
    studentEmail: "gifty@example.com",
    presenterAbsent: true,
    ...row,
  });
  assert.deepEqual(safe.questionResponses.map((response) => response.result), ["correct", "needs_review"]);
  assert.equal("presenterAbsent" in safe, false);
  assert.equal("studentName" in safe, false);
  assert.equal("studentEmail" in safe, false);
});

test("A1 grammar stage uses the participation picker as the question controller", () => {
  const presenter = read("src/components/A1GrammarPresenter.jsx");
  const picker = read("src/components/PresenterStudentPicker.jsx");
  assert.match(presenter, /participationCheckMode/);
  assert.match(presenter, /questions=\{participationCheckMode \? stage\.items : \[\]\}/);
  assert.match(presenter, /renderQuestionExternally/);
  assert.match(picker, /questionResponses/);
  assert.match(picker, /Record result first/);
  assert.match(picker, /buildA1PresenterQuestionPool/);
});
