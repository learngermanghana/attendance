import fs from "node:fs";

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`${label} anchor changed; update patchSharedWritingScoreRecovery.mjs`);
  return source.replace(search, replacement);
}

const finalFeedbackPath = new URL("../src/utils/finalDeterministicFeedback.js", import.meta.url);
let finalFeedback = fs.readFileSync(finalFeedbackPath, "utf8");
finalFeedback = replaceOnce(
  finalFeedback,
  `    writingScore: recoveredWritingScore,\n    writingScorePercent: recoveredWritingScore,`,
  `    writingScore: recoveredWritingScore,\n    writingScorePercent: recoveredWritingScore,\n    maxWritingScore: 100,`,
  "recovered writing max normalization",
);
fs.writeFileSync(finalFeedbackPath, finalFeedback);

const markingServicePath = new URL("../src/services/markingService.js", import.meta.url);
let markingService = fs.readFileSync(markingServicePath, "utf8");
markingService = replaceOnce(
  markingService,
  `import * as base from "./markingServiceBase.js";`,
  `import * as base from "./markingServiceBase.js";\nimport { recoverZeroWritingScore } from "../utils/finalDeterministicFeedback.js";`,
  "shared recovery import",
);

const recoveryInvocation = `  primary = recoverZeroWritingScore(primary, originalSubmissionText);`;
if (!markingService.includes(recoveryInvocation)) {
  const plainRoute = `  primary = routeMissedWritingToReview(primary, originalSubmissionText);`;
  const naturalRoute = `  primary = applyNaturalStudentFeedback(routeMissedWritingToReview(primary, originalSubmissionText), options, originalSubmissionText);`;

  if (markingService.includes(naturalRoute)) {
    markingService = markingService.replace(
      naturalRoute,
      `${recoveryInvocation}\n${naturalRoute}`,
    );
  } else if (markingService.includes(plainRoute)) {
    markingService = markingService.replace(
      plainRoute,
      `${recoveryInvocation}\n${plainRoute}`,
    );
  } else {
    throw new Error("shared recovery invocation anchor changed; update patchSharedWritingScoreRecovery.mjs");
  }
}

fs.writeFileSync(markingServicePath, markingService);

console.log("Shared marking now recovers malformed-boundary writing scores and normalizes recovered percentages to /100.");
await import("./patchA2B1MarkingWeights.mjs");
