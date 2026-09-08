import test from "node:test";
import assert from "node:assert/strict";

import { calculateFinalScore } from "../src/utils/finalScore.js";
import {
  A2_B1_PART_WEIGHTS,
  A2_B1_WRITING_MIN_PERCENT,
  calculateWeightedMarkingOutcome,
  objectivePartStats,
} from "../src/utils/markingScorePolicy.js";

function details({ teil3 = [], teil4 = [] } = {}) {
  const rows = {};
  teil3.forEach((correct, index) => {
    rows[`teil3.${index + 1}`] = { partId: "teil3", questionNumber: index + 1, correct };
  });
  teil4.forEach((correct, index) => {
    rows[`teil4.${index + 1}`] = { partId: "teil4", questionNumber: index + 1, correct };
  });
  return rows;
}

test("A2 uses Teil 2 = 40, Teil 3 = 30 and Teil 4 = 30", () => {
  const objectiveDetails = details({
    teil3: [false, true, true, true, true],
    teil4: [true, true, true, true, true],
  });
  const result = calculateWeightedMarkingOutcome({
    level: "A2",
    writingPercent: 75,
    objectiveScore: 90,
    objectiveDetails,
    hasWriting: true,
  });

  assert.deepEqual(A2_B1_PART_WEIGHTS, { teil2: 40, teil3: 30, teil4: 30 });
  assert.equal(result.policy, "a2-b1-40-30-30");
  assert.equal(result.scoreBreakdown.teil2.points, 30);
  assert.equal(result.scoreBreakdown.teil3.points, 24);
  assert.equal(result.scoreBreakdown.teil4.points, 30);
  assert.equal(result.finalScore, 84);
  assert.equal(result.passed, true);
});

test("objective Teile keep equal 30-point weight even when question counts differ", () => {
  const objectiveDetails = details({
    teil3: [true, true, true, true, false],
    teil4: [true, true, true, true, true, true, true, false, false, false],
  });
  const stats = objectivePartStats(objectiveDetails);
  assert.equal(stats.teil3.percent, 80);
  assert.equal(stats.teil4.percent, 70);

  const result = calculateWeightedMarkingOutcome({
    level: "B1",
    writingPercent: 70,
    objectiveScore: 73.3333333,
    objectiveDetails,
    hasWriting: true,
  });

  assert.equal(result.scoreBreakdown.teil2.points, 28);
  assert.equal(result.scoreBreakdown.teil3.points, 24);
  assert.equal(result.scoreBreakdown.teil4.points, 21);
  assert.equal(result.finalScore, 73);
});

test("A2/B1 cannot pass with writing below 40 percent even when the total is above 60", () => {
  const objectiveDetails = details({
    teil3: [true, true, true, true, true],
    teil4: [true, true, true, true, true],
  });
  const result = calculateWeightedMarkingOutcome({
    level: "B1",
    writingPercent: 35,
    objectiveScore: 100,
    objectiveDetails,
    hasWriting: true,
  });

  assert.equal(A2_B1_WRITING_MIN_PERCENT, 40);
  assert.equal(result.finalScore, 74);
  assert.equal(result.writingMinimumMet, false);
  assert.equal(result.passed, false);
});

test("A2/B1 objective-only result with both Teil 3 and Teil 4 present cannot bypass required writing", () => {
  const objectiveDetails = details({
    teil3: [true, true, true, true, true],
    teil4: [true, true, true, true, true],
  });
  const result = calculateWeightedMarkingOutcome({
    level: "A2-6.16",
    writingPercent: null,
    objectiveScore: 100,
    objectiveDetails,
    hasWriting: false,
  });

  assert.equal(result.finalScore, 100);
  assert.equal(result.writingRequiredButMissing, true);
  assert.equal(result.passed, false);
});

test("A2/B1 falls back to 40/60 when deterministic part details are unavailable", () => {
  const result = calculateWeightedMarkingOutcome({
    level: "A2",
    writingPercent: 80,
    objectiveScore: 90,
    objectiveDetails: {},
    hasWriting: true,
  });

  assert.equal(result.finalScore, 86);
  assert.equal(result.scoreBreakdown.teil2.points, 32);
  assert.equal(result.scoreBreakdown.teil3.points, 27);
  assert.equal(result.scoreBreakdown.teil4.points, 27);
});

test("manual score calculator uses the same A2/B1 policy while keeping legacy scoring elsewhere", () => {
  const objectiveDetails = details({
    teil3: [false, true, true, true, true],
    teil4: [true, true, true, true, true],
  });

  assert.equal(calculateFinalScore(90, 75, { level: "A2", objectiveDetails }), 84);
  assert.equal(calculateFinalScore(100, 66), 83);
});
