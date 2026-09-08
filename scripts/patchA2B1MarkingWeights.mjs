import fs from "node:fs";

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`${label} anchor changed; update patchA2B1MarkingWeights.mjs`);
  return source.replace(before, after);
}

function addImport(source, anchor, importLine, label) {
  if (source.includes(importLine)) return source;
  if (!source.includes(anchor)) throw new Error(`${label} import anchor changed; update patchA2B1MarkingWeights.mjs`);
  return source.replace(anchor, `${anchor}\n${importLine}`);
}

// Browser marking page: use 40/30/30 for A2/B1 and keep the manual score preview consistent.
const markingPagePath = new URL("../src/pages/MarkingPage.jsx", import.meta.url);
let markingPage = fs.readFileSync(markingPagePath, "utf8");
markingPage = addImport(
  markingPage,
  'import { calculateFinalScore } from "../utils/finalScore.js";',
  'import { calculateWeightedMarkingOutcome } from "../utils/markingScorePolicy.js";',
  "MarkingPage weighting",
);
markingPage = replaceOnce(
  markingPage,
  `  let finalScore;\n  if (hasObjective && hasWriting) {\n    finalScore = Math.round((objectivePercent + writingPercent) / 2);\n  } else if (hasObjective) {\n    finalScore = Math.round(objectivePercent);\n  } else {\n    finalScore = Math.round(writingPercent || Number(result.finalScore ?? result.score ?? 0));\n  }`,
  `  const weightedOutcome = calculateWeightedMarkingOutcome({\n    level: result.level || result.assignmentKey || result.assignmentId || "",\n    assignmentId: result.assignmentId,\n    assignmentKey: result.assignmentKey,\n    writingPercent: hasWriting ? writingPercent : null,\n    objectiveScore: hasObjective ? objectivePercent : null,\n    objectiveDetails: objectiveResult.details || {},\n    hasWriting,\n  });\n  const finalScore = weightedOutcome.finalScore;`,
  "MarkingPage combined score",
);
markingPage = replaceOnce(
  markingPage,
  `    maxWritingScore: getMaxWritingScore(result),\n    aiOriginalScore: result.aiOriginalScore ?? result.finalScore ?? result.score ?? null,`,
  `    maxWritingScore: getMaxWritingScore(result),\n    passed: weightedOutcome.passed,\n    scoreBreakdown: weightedOutcome.scoreBreakdown || result.scoreBreakdown || null,\n    writingMinimumMet: weightedOutcome.writingMinimumMet,\n    markingPolicy: weightedOutcome.policy,\n    aiOriginalScore: result.aiOriginalScore ?? result.finalScore ?? result.score ?? null,`,
  "MarkingPage score metadata",
);
markingPage = replaceOnce(
  markingPage,
  `  const calculatedFinalScore = calculateFinalScore(objectiveScorePercent, schreibenMark);`,
  `  const calculatedFinalScore = calculateFinalScore(objectiveScorePercent, schreibenMark, {\n    level: selectedStudent?.level || referenceEntry?.level || inferLevel(assignmentValue || objectiveAssignmentId),\n    assignmentId: objectiveAssignmentId,\n    objectiveDetails: objectiveMarkingResult.details || {},\n  });`,
  "MarkingPage manual preview",
);
fs.writeFileSync(markingPagePath, markingPage);

// Local auto-marking: preserve each objective Teil as its own 30-point component.
const autoMarkingPath = new URL("../src/utils/autoMarking.js", import.meta.url);
let autoMarking = fs.readFileSync(autoMarkingPath, "utf8");
if (!autoMarking.includes('import { calculateWeightedMarkingOutcome } from "./markingScorePolicy.js";')) {
  autoMarking = `import { calculateWeightedMarkingOutcome } from "./markingScorePolicy.js";\n${autoMarking}`;
}
autoMarking = replaceOnce(
  autoMarking,
  `function aggregatePartResults(parts = []) {`,
  `function aggregatePartResults(parts = [], level = "") {`,
  "autoMarking aggregate signature",
);
autoMarking = replaceOnce(
  autoMarking,
  `  const availableScores = [objectivePercentage, writingScore].filter((value) => value !== null);\n  const finalScore = availableScores.length ? Math.round(availableScores.reduce((sum, value) => sum + value, 0) / availableScores.length) : 0;`,
  `  const objectiveDetails = Object.fromEntries(objectiveResults.flatMap((part) =>\n    Object.entries(part.result?.details || {}).map(([key, detail]) => {\n      const normalizedKey = /^teil[34][._-]/i.test(key) ? key : \`\${part.partId}.\${key}\`;\n      return [normalizedKey, { ...(detail || {}), partId: detail?.partId || part.partId }];\n    }),\n  ));\n  const weightedOutcome = calculateWeightedMarkingOutcome({\n    level,\n    writingPercent: writingScore,\n    objectiveScore: objectivePercentage,\n    objectiveDetails,\n    hasWriting: writingScore !== null,\n  });\n  const finalScore = weightedOutcome.finalScore;`,
  "autoMarking weighted aggregate",
);
autoMarking = replaceOnce(
  autoMarking,
  `  return { objectiveCorrect, objectiveTotal, objectivePercentage, writingScore, finalScore, confidence };`,
  `  return {\n    objectiveCorrect,\n    objectiveTotal,\n    objectivePercentage,\n    objectiveDetails,\n    writingScore,\n    finalScore,\n    passed: weightedOutcome.passed,\n    scoreBreakdown: weightedOutcome.scoreBreakdown,\n    writingMinimumMet: weightedOutcome.writingMinimumMet,\n    markingPolicy: weightedOutcome.policy,\n    confidence,\n  };`,
  "autoMarking aggregate metadata",
);
autoMarking = replaceOnce(
  autoMarking,
  `  const aggregate = aggregatePartResults(parts);`,
  `  const aggregate = aggregatePartResults(parts, level);`,
  "autoMarking aggregate invocation",
);
autoMarking = replaceOnce(
  autoMarking,
  `    passed: aggregate.finalScore >= 60,`,
  `    passed: aggregate.passed,`,
  "autoMarking pass rule",
);
autoMarking = replaceOnce(
  autoMarking,
  `    objectiveTotal: aggregate.objectiveTotal,\n    writingScore: aggregate.writingScore,\n    finalScore: aggregate.finalScore,`,
  `    objectiveTotal: aggregate.objectiveTotal,\n    objectiveDetails: aggregate.objectiveDetails,\n    writingScore: aggregate.writingScore,\n    writingScorePercent: aggregate.writingScore,\n    finalScore: aggregate.finalScore,\n    scoreBreakdown: aggregate.scoreBreakdown,\n    writingMinimumMet: aggregate.writingMinimumMet,\n    markingPolicy: aggregate.markingPolicy,`,
  "autoMarking result metadata",
);
fs.writeFileSync(autoMarkingPath, autoMarking);

// Final deterministic reconciliation: do not let later feedback recovery revert to 50/50.
const deterministicPath = new URL("../src/utils/finalDeterministicFeedback.js", import.meta.url);
let deterministic = fs.readFileSync(deterministicPath, "utf8");
deterministic = addImport(
  deterministic,
  'import { buildNaturalStudentFeedback } from "./naturalMarkingFeedback.js";',
  'import { calculateWeightedMarkingOutcome } from "./markingScorePolicy.js";',
  "final deterministic weighting",
);
deterministic = replaceOnce(
  deterministic,
  `  const objectiveScore = numeric(result.objectiveScore, NaN);\n  const finalScore = Number.isFinite(objectiveScore)\n    ? Math.round((objectiveScore + recoveredWritingScore) / 2)\n    : recoveredWritingScore;`,
  `  const objectiveScore = numeric(result.objectiveScore, NaN);\n  const weightedOutcome = calculateWeightedMarkingOutcome({\n    level: detectedLevel(result),\n    assignmentId: result.assignmentId,\n    assignmentKey: result.assignmentKey,\n    writingPercent: recoveredWritingScore,\n    objectiveScore: Number.isFinite(objectiveScore) ? objectiveScore : null,\n    objectiveDetails: result.objectiveDetails || {},\n    hasWriting: true,\n  });\n  const finalScore = weightedOutcome.finalScore;`,
  "recovered writing weighted score",
);
deterministic = replaceOnce(
  deterministic,
  `    passed: finalScore >= 60,\n    writingScore: recoveredWritingScore,`,
  `    passed: weightedOutcome.passed,\n    scoreBreakdown: weightedOutcome.scoreBreakdown || result.scoreBreakdown || null,\n    writingMinimumMet: weightedOutcome.writingMinimumMet,\n    markingPolicy: weightedOutcome.policy,\n    writingScore: recoveredWritingScore,`,
  "recovered writing pass rule",
);
deterministic = replaceOnce(
  deterministic,
  `  const reconciled = recoverZeroWritingScore({\n    ...result,\n    objectiveScore,`,
  `  const weightedOutcome = calculateWeightedMarkingOutcome({\n    level: detectedLevel(result),\n    assignmentId: result.assignmentId,\n    assignmentKey: result.assignmentKey,\n    writingPercent: result.writingScorePercent ?? result.writingScore ?? null,\n    objectiveScore,\n    objectiveDetails,\n    hasWriting: result.writingScorePercent !== null && result.writingScorePercent !== undefined\n      ? Number.isFinite(Number(result.writingScorePercent))\n      : result.writingScore !== null && result.writingScore !== undefined && Number.isFinite(Number(result.writingScore)),\n  });\n\n  const reconciled = recoverZeroWritingScore({\n    ...result,\n    score: weightedOutcome.finalScore,\n    finalScore: weightedOutcome.finalScore,\n    passed: weightedOutcome.passed,\n    scoreBreakdown: weightedOutcome.scoreBreakdown || result.scoreBreakdown || null,\n    writingMinimumMet: weightedOutcome.writingMinimumMet,\n    markingPolicy: weightedOutcome.policy,\n    objectiveScore,`,
  "final deterministic authoritative weighting",
);
fs.writeFileSync(deterministicPath, deterministic);

// Browser marking service: normalize and persist the same policy used by the UI/API.
const servicePath = new URL("../src/services/markingServiceBase.js", import.meta.url);
let service = fs.readFileSync(servicePath, "utf8");
service = addImport(
  service,
  'import { buildManualScoreCorrection } from "../utils/manualScoreCorrection.js";',
  'import { calculateWeightedMarkingOutcome } from "../utils/markingScorePolicy.js";',
  "marking service weighting",
);
service = service.replace('const OBJECTIVE_WEIGHT = 0.5;\nconst WRITING_WEIGHT = 0.5;\n', "");
service = replaceOnce(
  service,
  `    scoreBreakdown: Array.isArray(result.scoreBreakdown) ? result.scoreBreakdown : [],`,
  `    scoreBreakdown: result.scoreBreakdown && typeof result.scoreBreakdown === "object" ? result.scoreBreakdown : [],`,
  "marking service score breakdown normalization",
);
service = replaceOnce(
  service,
  `  const objectiveScore = deterministicObjective.objectiveScore;\n  const hasWritingScore = writingScore !== null && Number.isFinite(writingScore);\n  const finalScore = hasWritingScore ? Math.round((objectiveScore * OBJECTIVE_WEIGHT) + (writingScore * WRITING_WEIGHT)) : objectiveScore;`,
  `  const objectiveScore = deterministicObjective.objectiveScore;\n  const hasWritingScore = writingScore !== null && Number.isFinite(writingScore);\n  const weightedOutcome = calculateWeightedMarkingOutcome({\n    level: aiResult.level || aiResult.assignmentKey || aiResult.assignmentId || "",\n    assignmentId: aiResult.assignmentId,\n    assignmentKey: aiResult.assignmentKey,\n    writingPercent: hasWritingScore ? writingScore : null,\n    objectiveScore,\n    objectiveDetails: deterministicObjective.details || deterministicObjective.objectiveDetails || {},\n    hasWriting: hasWritingScore,\n  });\n  const finalScore = weightedOutcome.finalScore;`,
  "marking service deterministic combine",
);
service = replaceOnce(
  service,
  `    score: finalScore,\n    passed: finalScore >= 60,`,
  `    score: finalScore,\n    passed: weightedOutcome.passed,\n    scoreBreakdown: weightedOutcome.scoreBreakdown || aiResult.scoreBreakdown || null,\n    writingMinimumMet: weightedOutcome.writingMinimumMet,\n    markingPolicy: weightedOutcome.policy,`,
  "marking service pass rule",
);
service = replaceOnce(
  service,
  `      deterministicObjectiveWeight: hasWritingScore ? OBJECTIVE_WEIGHT : 1,\n      deterministicWritingWeight: hasWritingScore ? WRITING_WEIGHT : 0,`,
  `      deterministicObjectiveWeight: hasWritingScore ? 0.6 : 1,\n      deterministicWritingWeight: hasWritingScore ? 0.4 : 0,\n      deterministicPartWeights: hasWritingScore ? { teil2: 0.4, teil3: 0.3, teil4: 0.3 } : null,`,
  "marking service diagnostic weights",
);
const sheetBreakdownAnchor = `function buildScoreBreakdown(details = {}, row = {}) {\n  if (Array.isArray(details.scoreBreakdown) && details.scoreBreakdown.length) return details.scoreBreakdown;\n  const breakdown = [];`;
const sheetBreakdownReplacement = `function buildScoreBreakdown(details = {}, row = {}) {\n  if (Array.isArray(details.scoreBreakdown) && details.scoreBreakdown.length) return details.scoreBreakdown;\n  if (details.scoreBreakdown?.policy === "a2-b1-40-30-30") {\n    return [\n      { label: "Teil 2 · Schreiben", score: \`\${details.scoreBreakdown.teil2?.points ?? 0}/40\`, reason: \`\${Math.round(details.scoreBreakdown.teil2?.percent ?? 0)}% writing\` },\n      { label: "Teil 3 · Objective", score: \`\${details.scoreBreakdown.teil3?.points ?? 0}/30\`, reason: \`\${details.scoreBreakdown.teil3?.correct ?? "—"}/\${details.scoreBreakdown.teil3?.total ?? "—"} correct\` },\n      { label: "Teil 4 · Objective", score: \`\${details.scoreBreakdown.teil4?.points ?? 0}/30\`, reason: \`\${details.scoreBreakdown.teil4?.correct ?? "—"}/\${details.scoreBreakdown.teil4?.total ?? "—"} correct\` },\n    ];\n  }\n  const breakdown = [];`;
service = replaceOnce(service, sheetBreakdownAnchor, sheetBreakdownReplacement, "sheet 40/30/30 breakdown");
fs.writeFileSync(servicePath, service);

// Vercel API proxy: make the server-side deterministic response authoritative too.
const routerPath = new URL("../api/router.js", import.meta.url);
let router = fs.readFileSync(routerPath, "utf8");
router = addImport(
  router,
  'import { autoMarkSubmission } from "../src/utils/autoMarking.js";',
  'import { calculateWeightedMarkingOutcome } from "../src/utils/markingScorePolicy.js";',
  "API weighting",
);
router = router.replace('const OBJECTIVE_WEIGHT = 0.5;\nconst WRITING_WEIGHT = 0.5;\n', "");
router = replaceOnce(
  router,
  `  const objectiveScore = deterministicObjective.objectiveScore;\n  const finalScore = hasWriting ? Math.round((objectiveScore * OBJECTIVE_WEIGHT) + (writingScore * WRITING_WEIGHT)) : objectiveScore;`,
  `  const objectiveScore = deterministicObjective.objectiveScore;\n  const weightedOutcome = calculateWeightedMarkingOutcome({\n    level: referenceEntry.level || payload.level || existingResult.level || referenceEntry.assignmentKey || payload.assignmentKey || "",\n    assignmentId: referenceEntry.assignmentId || payload.assignmentId,\n    assignmentKey: referenceEntry.assignmentKey || payload.assignmentKey,\n    writingPercent: hasWriting ? writingScore : null,\n    objectiveScore,\n    objectiveDetails: deterministicObjective.details || deterministicObjective.objectiveDetails || {},\n    hasWriting,\n  });\n  const finalScore = weightedOutcome.finalScore;`,
  "API deterministic score",
);
router = replaceOnce(
  router,
  `    score: finalScore,\n    passed: finalScore >= 60,`,
  `    score: finalScore,\n    passed: weightedOutcome.passed,\n    scoreBreakdown: weightedOutcome.scoreBreakdown || existingResult.scoreBreakdown || null,\n    writingMinimumMet: weightedOutcome.writingMinimumMet,\n    markingPolicy: weightedOutcome.policy,`,
  "API pass rule",
);
router = replaceOnce(
  router,
  `    objectiveTotal: deterministicObjective.objectiveTotal,\n    wrongAnswers: deterministicObjective.wrongAnswers,`,
  `    objectiveTotal: deterministicObjective.objectiveTotal,\n    objectiveDetails: deterministicObjective.details || deterministicObjective.objectiveDetails || null,\n    wrongAnswers: deterministicObjective.wrongAnswers,`,
  "API objective details",
);
router = replaceOnce(
  router,
  `      deterministicObjectiveWeight: hasWriting ? OBJECTIVE_WEIGHT : 1,\n      deterministicWritingWeight: hasWriting ? WRITING_WEIGHT : 0,`,
  `      deterministicObjectiveWeight: hasWriting ? 0.6 : 1,\n      deterministicWritingWeight: hasWriting ? 0.4 : 0,\n      deterministicPartWeights: hasWriting ? { teil2: 0.4, teil3: 0.3, teil4: 0.3 } : null,`,
  "API diagnostic weights",
);
fs.writeFileSync(routerPath, router);

for (const [path, required] of [
  [markingPagePath, ["calculateWeightedMarkingOutcome", "writingMinimumMet", "calculateFinalScore(objectiveScorePercent, schreibenMark, {"]],
  [autoMarkingPath, ["aggregatePartResults(parts = [], level", "passed: aggregate.passed", "objectiveDetails: aggregate.objectiveDetails"]],
  [deterministicPath, ["calculateWeightedMarkingOutcome", "writingMinimumMet: weightedOutcome.writingMinimumMet"]],
  [servicePath, ["deterministicPartWeights", "Teil 2 · Schreiben", "weightedOutcome.passed"]],
  [routerPath, ["deterministicPartWeights", "objectiveDetails: deterministicObjective.details", "weightedOutcome.passed"]],
]) {
  const materialized = fs.readFileSync(path, "utf8");
  for (const marker of required) {
    if (!materialized.includes(marker)) throw new Error(`Weighted marking materialization missing ${marker} in ${path.pathname}`);
  }
}

console.log("A2/B1 marking now uses Teil 2 = 40, Teil 3 = 30, Teil 4 = 30 with a 40% writing minimum.");
