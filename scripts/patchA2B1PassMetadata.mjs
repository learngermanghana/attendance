import fs from "node:fs";

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`${label} anchor changed; update patchA2B1PassMetadata.mjs`);
  return source.replace(before, after);
}

const target = new URL("../src/services/markingServiceBase.js", import.meta.url);
let source = fs.readFileSync(target, "utf8");
source = replaceOnce(
  source,
  `  return {\n    ...row,\n    objective_score: details.objectiveScore ?? "",`,
  `  return {\n    ...row,\n    passed: typeof details.passed === "boolean" ? details.passed : Number(score) >= 60,\n    writing_minimum_met: typeof details.writingMinimumMet === "boolean" ? details.writingMinimumMet : "",\n    marking_policy: details.markingPolicy || details.scoreBreakdown?.policy || "",\n    objective_score: details.objectiveScore ?? "",`,
  "saved score pass metadata",
);
fs.writeFileSync(target, source);

for (const marker of ["writing_minimum_met:", "marking_policy:", "typeof details.passed === \"boolean\""]) {
  if (!source.includes(marker)) throw new Error(`Saved A2/B1 pass metadata missing marker: ${marker}`);
}

console.log("A2/B1 score rows now persist pass status, writing-minimum status, and marking policy.");
