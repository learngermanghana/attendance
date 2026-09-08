import fs from "node:fs";

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`${label} anchor changed; update patchA2B1WritingScoreNormalization.mjs`);
  return source.replace(before, after);
}

const maxScoreBefore = `  const writingScore = Number(result.writingScore);\n  if (Number.isFinite(writingScore) && writingScore > 0 && writingScore <= 50) return 50;\n  return 100;`;
const maxScoreAfter = `  const levelHint = String(result.level || result.assignmentKey || result.assignmentId || result.assignment || "").toUpperCase();\n  if (/\\b(?:A2|B1)\\b|^(?:A2|B1)[-_.]/.test(levelHint)) return 100;\n\n  const writingScore = Number(result.writingScore);\n  if (Number.isFinite(writingScore) && writingScore > 0 && writingScore <= 50) return 50;\n  return 100;`;

for (const relativePath of ["../src/pages/MarkingPage.jsx", "../src/pages/MarkingQuickPage.jsx"]) {
  const target = new URL(relativePath, import.meta.url);
  let source = fs.readFileSync(target, "utf8");
  source = replaceOnce(source, maxScoreBefore, maxScoreAfter, `${relativePath} A2/B1 writing percentage normalization`);
  fs.writeFileSync(target, source);
}

const quickPath = new URL("../src/pages/MarkingQuickPage.jsx", import.meta.url);
let quick = fs.readFileSync(quickPath, "utf8");
const quickBreakdownBefore = `function buildScoreBreakdown(result = {}) {\n  const rows = [];`;
const quickBreakdownAfter = `function buildScoreBreakdown(result = {}) {\n  if (result.scoreBreakdown?.policy === "a2-b1-40-30-30") {\n    return [\n      { label: "Teil 2 · Schreiben", value: \`\${result.scoreBreakdown.teil2?.points ?? 0}/40\`, detail: \`\${Math.round(result.scoreBreakdown.teil2?.percent ?? 0)}%\` },\n      { label: "Teil 3 · Objective", value: \`\${result.scoreBreakdown.teil3?.points ?? 0}/30\`, detail: result.scoreBreakdown.teil3?.total ? \`\${result.scoreBreakdown.teil3.correct}/\${result.scoreBreakdown.teil3.total} correct\` : "" },\n      { label: "Teil 4 · Objective", value: \`\${result.scoreBreakdown.teil4?.points ?? 0}/30\`, detail: result.scoreBreakdown.teil4?.total ? \`\${result.scoreBreakdown.teil4.correct}/\${result.scoreBreakdown.teil4.total} correct\` : "" },\n    ];\n  }\n\n  const rows = [];`;
quick = replaceOnce(quick, quickBreakdownBefore, quickBreakdownAfter, "quick marking weighted score breakdown");
fs.writeFileSync(quickPath, quick);

for (const relativePath of ["../src/pages/MarkingPage.jsx", "../src/pages/MarkingQuickPage.jsx"]) {
  const source = fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");
  if (!source.includes('if (/\\b(?:A2|B1)\\b|^(?:A2|B1)[-_.]/.test(levelHint)) return 100;')) {
    throw new Error(`A2/B1 writing percentage normalization missing in ${relativePath}`);
  }
}
if (!quick.includes('result.scoreBreakdown?.policy === "a2-b1-40-30-30"')) {
  throw new Error("Quick marking 40/30/30 breakdown renderer is missing");
}

console.log("A2/B1 writing scores are treated as percentages unless an explicit max score is supplied.");
