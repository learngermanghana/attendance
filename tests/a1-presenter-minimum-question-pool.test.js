import test from "node:test";
import assert from "node:assert/strict";
import { buildA1PresenterQuestionPool } from "../src/utils/a1PresenterQuestionPool.js";

const BASE = [
  { questionDe: "What pattern helps you build German numbers above 20?", answerDe: "ones + und + tens" },
  { questionDe: "What does halb mean in German time expressions?", answerDe: "half an hour before the next hour" },
  { questionDe: "How are euros and cents normally expressed?", answerDe: "Say the euro and cent amounts clearly" },
  { questionDe: "What is the difference between kostet and kosten?", answerDe: "kostet is singular; kosten is plural" },
];

test("A1 presenter keeps at least 10 questions for small classes", () => {
  assert.equal(buildA1PresenterQuestionPool(BASE, 6, "A1-3.5").length, 10);
  assert.equal(buildA1PresenterQuestionPool(BASE, 8, "A1-3.5").length, 10);
  assert.equal(buildA1PresenterQuestionPool(BASE, 10, "A1-3.5").length, 10);
});

test("A1 presenter grows the pool to match larger class rosters", () => {
  assert.equal(buildA1PresenterQuestionPool(BASE, 14, "A1-3.5").length, 14);
  assert.equal(buildA1PresenterQuestionPool(BASE, 20, "A1-3.5").length, 20);
});

test("expanded A1 questions remain unique in one pool", () => {
  const pool = buildA1PresenterQuestionPool(BASE, 20, "A1-3.5");
  assert.equal(new Set(pool.map((question) => question.id)).size, 20);
  assert.equal(new Set(pool.map((question) => question.questionDe)).size, 20);
});
