import fs from "node:fs";

const target = new URL("../src/utils/autoMarking.js", import.meta.url);
let source = fs.readFileSync(target, "utf8");

const oldDetectPartType = `function detectPartType({ partId, text, referenceEntry = {} } = {}) {
  const format = String(referenceEntry?.format || "").toLowerCase();
  if (partId === "teil2") return "writing";
  if (["teil3", "teil4"].includes(partId)) return "objective";
  if (looksLikeWritingTask(text)) return "writing";
  if (format === "objective") return "objective";
  if (format === "writing") return "writing";
  return "objective";
}`;

const newDetectPartType = `function detectPartType({ partId, text, referenceEntry = {} } = {}) {
  const format = String(referenceEntry?.format || "").toLowerCase();
  // Some A1 workbooks (for example A1-12.2) have objective questions in Teil 2.
  // Assignment metadata must win over the legacy convention that Teil 2 is writing.
  if (format === "objective") return "objective";
  if (format === "writing") return "writing";
  if (partId === "teil2") return "writing";
  if (["teil3", "teil4"].includes(partId)) return "objective";
  if (looksLikeWritingTask(text)) return "writing";
  return "objective";
}`;

if (source.includes(oldDetectPartType)) {
  source = source.replace(oldDetectPartType, newDetectPartType);
} else if (!source.includes("Assignment metadata must win over the legacy convention")) {
  throw new Error("Could not find detectPartType patch target in autoMarking.js");
}

const oldObjectivePartFilter = '  return [...new Set(partIds)].filter((partId) => partId !== "teil2");';
const newObjectivePartFilter = '  return [...new Set(partIds)].filter((partId) => partId !== "teil2" || detectPartType({ partId, text: "", referenceEntry }) === "objective");';

if (source.includes(oldObjectivePartFilter)) {
  source = source.replace(oldObjectivePartFilter, newObjectivePartFilter);
} else if (!source.includes(newObjectivePartFilter)) {
  throw new Error("Could not find objective Teil 2 filter patch target in autoMarking.js");
}

fs.writeFileSync(target, source);
console.log("Patched objective Teil 2 review mapping.");

// Keep A1 objective vocabulary normalization in the same build/test lifecycle.
await import("./patchA1VocabularyTolerance.mjs");
// Prefer structured one-box submission payloads whenever the campus provides them.
await import("./patchStructuredSubmissionPayload.mjs");