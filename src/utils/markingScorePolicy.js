export const MARKING_PASS_PERCENT = 60;
export const A2_B1_WRITING_MIN_PERCENT = 40;
export const A2_B1_PART_WEIGHTS = Object.freeze({
  teil2: 40,
  teil3: 30,
  teil4: 30,
});

function clampPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(100, numeric));
}

function roundPoint(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

export function markingLevel(...values) {
  for (const value of values) {
    const match = String(value || "").toUpperCase().match(/\b(A1|A2|B1)\b|^(A1|A2|B1)[-_.]/);
    const level = match?.[1] || match?.[2];
    if (level) return level;
  }
  return "";
}

function detailPartId(key = "", detail = {}) {
  const explicit = String(detail?.partId || detail?.part || "").trim().toLowerCase();
  if (/^teil[34]$/.test(explicit)) return explicit;
  const keyMatch = String(key || "").trim().toLowerCase().match(/^(teil[34])(?:[._-]|$)/);
  return keyMatch?.[1] || "";
}

export function objectivePartStats(objectiveDetails = {}) {
  const stats = {
    teil3: { correct: 0, total: 0, percent: null },
    teil4: { correct: 0, total: 0, percent: null },
  };

  Object.entries(objectiveDetails || {}).forEach(([key, detail]) => {
    if (!detail || typeof detail !== "object") return;
    const partId = detailPartId(key, detail);
    if (!stats[partId]) return;
    stats[partId].total += 1;
    if (detail.correct === true) stats[partId].correct += 1;
  });

  for (const partId of ["teil3", "teil4"]) {
    const part = stats[partId];
    part.percent = part.total ? (part.correct / part.total) * 100 : null;
  }
  return stats;
}

export function calculateWeightedMarkingOutcome({
  level = "",
  assignmentId = "",
  assignmentKey = "",
  writingPercent = null,
  objectiveScore = null,
  objectiveDetails = {},
  hasWriting = writingPercent !== null && writingPercent !== undefined,
} = {}) {
  const resolvedLevel = markingLevel(level, assignmentId, assignmentKey);
  const writing = clampPercent(writingPercent);
  const objective = clampPercent(objectiveScore);
  const partStats = objectivePartStats(objectiveDetails);
  const isA2B1 = resolvedLevel === "A2" || resolvedLevel === "B1";
  const hasBothObjectiveParts = partStats.teil3.total > 0 && partStats.teil4.total > 0;
  const writingAvailable = Boolean(hasWriting && writing !== null);

  let finalScore = 0;
  let policy = "legacy-50-50";
  let scoreBreakdown = null;

  if (isA2B1 && writingAvailable && (hasBothObjectiveParts || objective !== null)) {
    policy = "a2-b1-40-30-30";
    const teil3Percent = hasBothObjectiveParts ? partStats.teil3.percent : objective;
    const teil4Percent = hasBothObjectiveParts ? partStats.teil4.percent : objective;
    const teil2Points = roundPoint((writing / 100) * A2_B1_PART_WEIGHTS.teil2);
    const teil3Points = roundPoint(((teil3Percent ?? 0) / 100) * A2_B1_PART_WEIGHTS.teil3);
    const teil4Points = roundPoint(((teil4Percent ?? 0) / 100) * A2_B1_PART_WEIGHTS.teil4);
    finalScore = Math.round(teil2Points + teil3Points + teil4Points);
    scoreBreakdown = {
      policy,
      passMark: MARKING_PASS_PERCENT,
      writingMinimumPercent: A2_B1_WRITING_MIN_PERCENT,
      teil2: { percent: writing, points: teil2Points, maxPoints: A2_B1_PART_WEIGHTS.teil2 },
      teil3: {
        percent: teil3Percent,
        points: teil3Points,
        maxPoints: A2_B1_PART_WEIGHTS.teil3,
        correct: partStats.teil3.total ? partStats.teil3.correct : null,
        total: partStats.teil3.total || null,
      },
      teil4: {
        percent: teil4Percent,
        points: teil4Points,
        maxPoints: A2_B1_PART_WEIGHTS.teil4,
        correct: partStats.teil4.total ? partStats.teil4.correct : null,
        total: partStats.teil4.total || null,
      },
      finalScore,
    };
  } else if (writingAvailable && objective !== null) {
    finalScore = Math.round((objective + writing) / 2);
  } else if (objective !== null) {
    finalScore = Math.round(objective);
  } else if (writingAvailable) {
    finalScore = Math.round(writing);
  }

  const writingMinimumMet = !isA2B1 || !writingAvailable || writing >= A2_B1_WRITING_MIN_PERCENT;
  const writingRequiredButMissing = isA2B1 && hasBothObjectiveParts && !writingAvailable;
  const passed = finalScore >= MARKING_PASS_PERCENT && writingMinimumMet && !writingRequiredButMissing;

  return {
    level: resolvedLevel,
    finalScore,
    passed,
    policy,
    writingMinimumMet,
    writingRequiredButMissing,
    scoreBreakdown,
    objectivePartStats: partStats,
  };
}
