import test from "node:test";
import assert from "node:assert/strict";

import { computeObjectiveScore } from "../src/utils/objectiveMarking.js";

const submission = `Teil 1
1. B) Um sieben Uhr
2.b) Um acht Uhr
3.b) Um sechs Uhr
4.b) Um zehn Uhr
5.b) Um neun Uhr
6. c) Nachmittags
7.b) Um sieben Uhr
8.a) Montag
9.b) Am Dienstag und Donnerstag
10.a) Er spielt im Park.

Teil 2
1.b) Um sieben Uhr
2.b) Um acht Uhr
3.b) Um sechs Uhr
4.b) Um zehn Uhr
5.a) Sie geht zur Arbeit.`;

test("A1-7 keeps restarted Teil 2 numbering after the ten Teil 1 answers", () => {
  const result = computeObjectiveScore("A1-7", submission);

  assert.equal(result.totalCount, 20);
  assert.equal(result.correctCount, 14);

  assert.equal(result.details[10].student, "a) Er spielt im Park.");
  assert.equal(result.details[10].correct, false);

  assert.equal(result.details[11].student, "b) Um sieben Uhr");
  assert.equal(result.details[11].correct, true);
  assert.equal(result.details[12].student, "b) Um acht Uhr");
  assert.equal(result.details[12].correct, true);
  assert.equal(result.details[13].student, "b) Um sechs Uhr");
  assert.equal(result.details[13].correct, true);
  assert.equal(result.details[14].student, "b) Um zehn Uhr");
  assert.equal(result.details[14].correct, true);
  assert.equal(result.details[15].student, "a) Sie geht zur Arbeit.");
  assert.equal(result.details[15].correct, true);

  for (const question of [16, 17, 18, 19, 20]) {
    assert.equal(result.details[question].student, "");
    assert.equal(result.details[question].correct, false);
  }
});
