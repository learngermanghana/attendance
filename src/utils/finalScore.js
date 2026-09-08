import { calculateWeightedMarkingOutcome } from "./markingScorePolicy.js";

export function calculateFinalScore(objectivePercentage, schreibenMark = "", options = {}) {
  const objectiveScore = Number(objectivePercentage);
  const safeObjectiveScore = Number.isFinite(objectiveScore) ? objectiveScore : 0;

  if (schreibenMark === "" || schreibenMark === null || schreibenMark === undefined) {
    return safeObjectiveScore;
  }

  const writingScore = Number(schreibenMark);
  if (!Number.isFinite(writingScore)) return safeObjectiveScore;

  const level = options.level || options.assignmentId || options.assignmentKey || "";
  if (/\b(?:A2|B1)\b/i.test(String(level))) {
    return calculateWeightedMarkingOutcome({
      level,
      assignmentId: options.assignmentId,
      assignmentKey: options.assignmentKey,
      writingPercent: writingScore,
      objectiveScore: safeObjectiveScore,
      objectiveDetails: options.objectiveDetails || {},
      hasWriting: true,
    }).finalScore;
  }

  return Math.ceil((safeObjectiveScore + writingScore) / 2);
}
